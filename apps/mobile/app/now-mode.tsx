import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from "react-native-reanimated";
import { GradientMesh } from "../components/ui/GradientMesh";
import { useResponsiveLayout } from "../components/ui/useResponsiveLayout";
import { AvailabilityComposer } from "../features/availability/AvailabilityComposer";
import { nowlyColors } from "../constants/theme";
import { api } from "../lib/api";
import { track } from "../lib/analytics";
import { availabilityLabel } from "../lib/labels";
import { playMatchFeedback } from "../lib/match-feedback";
import { formatDayTime } from "../lib/format";
import { webPressableStyle } from "../lib/web-pressable";
import { useAppStore } from "../store/useAppStore";

const liveInsight = (
  activeSignal: ReturnType<typeof useAppStore.getState>["activeSignal"],
  scheduledOverlaps: ReturnType<typeof useAppStore.getState>["scheduledOverlaps"],
  matches: ReturnType<typeof useAppStore.getState>["matches"],
) => {
  if (matches.length) {
    return `${matches[0].matchedUser.name} looks like the warmest live overlap.`;
  }

  if (scheduledOverlaps.length) {
    return scheduledOverlaps[0].label;
  }

  if (activeSignal) {
    return `${availabilityLabel(activeSignal.state)} until ${formatDayTime(activeSignal.expiresAt)}.`;
  }

  return "Go live and let overlap find you.";
};

export default function NowModeScreen() {
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const activeSignal = useAppStore((state) => state.activeSignal);
  const liveSignalPreferences = useAppStore((state) => state.liveSignalPreferences);
  const matches = useAppStore((state) => state.matches);
  const scheduledOverlaps = useAppStore((state) => state.scheduledOverlaps);
  const radar = useAppStore((state) => state.radar);
  const setDashboard = useAppStore((state) => state.setDashboard);
  const setActiveSignal = useAppStore((state) => state.setActiveSignal);
  const setLiveSignalPreferences = useAppStore((state) => state.setLiveSignalPreferences);
  const layout = useResponsiveLayout();
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const safeLiveSignalPreferences = liveSignalPreferences ?? {
    showLocation: false,
    locationLabel: "",
  };
  const [matchToast, setMatchToast] = useState<{
    id: string;
    label: string;
    route: string;
  } | null>(null);
  const previousMatchIdsRef = useRef<string[] | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const orderedLiveMatches = useMemo(
    () => [...matches].sort((left, right) => right.score - left.score),
    [matches],
  );
  const orderedScheduledOverlaps = useMemo(
    () => [...scheduledOverlaps].sort((left, right) => right.score - left.score),
    [scheduledOverlaps],
  );
  const liveMatchRows = useMemo(
    () =>
      orderedLiveMatches.map((match) => ({
        id: match.id,
        name: match.matchedUser.name,
        line: match.insightLabel ?? match.reason.momentumLabel ?? "Strong short-notice fit",
        detail:
          match.reason.meetingStyle === "ONLINE"
            ? `${Math.round(match.score * 100)}% fit · ${match.reason.overlapMinutes} min overlap · ${match.reason.onlineVenue ?? "online"}`
            : `${Math.round(match.score * 100)}% fit · ${match.reason.overlapMinutes} min overlap · ${match.reason.travelMinutes ?? 15} min away`,
        action: "Open",
        actionRoute: `/match/${match.id}`,
      })),
    [orderedLiveMatches],
  );
  const suggestedTimeRows = useMemo(
    () =>
      orderedScheduledOverlaps.slice(0, 4).map((overlap) => ({
        id: overlap.id,
        name: overlap.matchedUser.name,
        line: overlap.label,
        detail: overlap.summary,
        action: "Suggest time",
        onPress: () => {
          if (!user?.inviteCode) {
            router.push("/availability-preferences");
            return;
          }

          router.push(
            {
              pathname: "/booking/[inviteCode]",
              params: { inviteCode: user.inviteCode },
            } as never,
          );
        },
      })),
    [orderedScheduledOverlaps, user?.inviteCode],
  );

  const locationShareLabel =
    safeLiveSignalPreferences.locationLabel.trim() ||
    user?.communityTag ||
    user?.city ||
    "your area";

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    api
      .fetchDashboard(token, user.id)
      .then((payload) => {
        if (!active) {
          return;
        }

        startTransition(() => {
          setDashboard(payload);
        });
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [setDashboard, token, user]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const nextIds = orderedLiveMatches.map((match) => match.id);

    if (previousMatchIdsRef.current === null) {
      previousMatchIdsRef.current = nextIds;
      return;
    }

    const previousIds = new Set(previousMatchIdsRef.current);
    const newMatches = orderedLiveMatches.filter((match) => !previousIds.has(match.id));

    previousMatchIdsRef.current = nextIds;

    if (!newMatches.length) {
      return;
    }

    const topMatch = newMatches[0];
    const label =
      newMatches.length > 1
        ? `${newMatches.length} live matches just landed.`
        : `${topMatch.matchedUser.name} lines up with you right now.`;

    playMatchFeedback();
    setMatchToast({
      id: topMatch.id,
      label,
      route: `/match/${topMatch.id}`,
    });

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = setTimeout(() => {
      setMatchToast(null);
    }, 2800);
  }, [orderedLiveMatches]);

  const refreshDashboard = async () => {
    if (!user) {
      return;
    }

    const payload = await api.fetchDashboard(token, user.id);

    startTransition(() => {
      setDashboard(payload);
    });
  };

  const handleSaveStatus = async (
    payload: Parameters<typeof api.setAvailability>[1],
  ) => {
    try {
      setSaving(true);
      const nextSignal = await api.setAvailability(token, payload);
      setActiveSignal({
        ...nextSignal,
        showLocation: payload.showLocation ?? false,
        locationLabel: payload.locationLabel ?? null,
      });
      setLiveSignalPreferences({
        showLocation: payload.showLocation ?? false,
        locationLabel: payload.locationLabel ?? "",
      });
      await track(token, "availability_set", {
        state: payload.state,
        durationHours: payload.durationHours ?? null,
        showLocation: payload.showLocation ?? false,
      });
      await refreshDashboard();
    } catch (error) {
      Alert.alert(
        "Could not update your status",
        error instanceof Error ? error.message : "Try that again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClearStatus = async () => {
    if (!activeSignal) {
      return;
    }

    try {
      setClearing(true);
      await api.clearAvailability(token, activeSignal.id);
      setActiveSignal(null);
      await refreshDashboard();
    } catch (error) {
      Alert.alert(
        "Could not clear your status",
        error instanceof Error ? error.message : "Try that again.",
      );
    } finally {
      setClearing(false);
    }
  };

  const openBookingPreview = () => {
    if (!user?.inviteCode) {
      router.push("/availability-preferences");
      return;
    }

    router.push(
      {
        pathname: "/booking/[inviteCode]",
        params: { inviteCode: user.inviteCode },
      } as never,
    );
  };

  return (
    <GradientMesh>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          alignItems: "center",
          paddingBottom: 150,
          paddingHorizontal: layout.screenPadding,
          paddingTop: layout.isDesktop ? 34 : 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.shell,
            { width: layout.shellWidth },
            layout.isDesktop ? styles.desktopShell : null,
          ]}
        >
          <View style={{ width: layout.leftColumnWidth, gap: layout.sectionGap }}>
            <View style={styles.appBar}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.iconButton,
                  webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                ]}
              >
                <MaterialCommunityIcons name="chevron-left" size={24} color="#F7FBFF" />
              </Pressable>

              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.eyebrow}>NOW MODE</Text>
                <Text style={styles.title}>Let people know you're open.</Text>
              </View>
            </View>

            <View style={styles.heroShell}>
              <LinearGradient
                colors={["rgba(22,16,56,0.94)", "rgba(32,30,92,0.84)", "rgba(10,16,34,0.96)"]}
                start={{ x: 0.08, y: 0.04 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={styles.heroGlowPrimary} pointerEvents="none" />
                <View style={styles.heroGlowSecondary} pointerEvents="none" />

                <View style={{ gap: 8 }}>
                  <Text style={styles.heroLabel}>LIVE STATUS</Text>
                  <Text style={styles.heroTitle}>
                    {activeSignal ? liveInsight(activeSignal, scheduledOverlaps, matches) : "Set a live signal so Nowly can surface overlap."}
                  </Text>
                  <Text style={styles.heroSupport}>
                    {radar?.suggestionLine ||
                      "Free now, free later, busy, or weekend plans. This is the fast layer that helps you overlap with someone else in the moment."}
                  </Text>
                  {safeLiveSignalPreferences.showLocation ? (
                    <Text style={styles.heroLocationTag}>Sharing location: {locationShareLabel}</Text>
                  ) : null}
                </View>

                <View style={styles.heroActions}>
                  <View style={styles.heroStatusPill}>
                    <Text style={styles.heroStatusText}>
                      {activeSignal ? "Signal live now" : "Pick your status below"}
                    </Text>
                  </View>
                  <Pressable
                    onPress={openBookingPreview}
                    style={({ pressed }) => [
                      styles.heroGhostAction,
                      webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.985 }),
                    ]}
                  >
                    <Text style={styles.heroGhostText}>View best windows</Text>
                  </Pressable>
                </View>
              </LinearGradient>
            </View>

            <AvailabilityComposer
              activeSignal={activeSignal}
              defaultLocationLabel={user?.communityTag || user?.city || null}
              signalPreferences={safeLiveSignalPreferences}
              onSignalPreferencesChange={setLiveSignalPreferences}
              onSave={(payload) => void handleSaveStatus(payload)}
            />

            {activeSignal ? (
              <Pressable
                onPress={() => void handleClearStatus()}
                disabled={clearing}
                style={({ pressed }) => [
                  styles.clearAction,
                  clearing ? styles.clearActionDisabled : null,
                  webPressableStyle(pressed, {
                    disabled: clearing,
                    pressedOpacity: 0.9,
                    pressedScale: 0.985,
                  }),
                ]}
              >
                <Text style={styles.clearActionText}>
                  {clearing ? "Stopping live..." : "Stop live"}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={{ width: layout.rightColumnWidth, gap: layout.sectionGap }}>
            <View style={styles.insightStrip}>
              <Text style={styles.insightStripText}>{liveInsight(activeSignal, scheduledOverlaps, matches)}</Text>
            </View>

            {matchToast ? (
              <Animated.View
                entering={FadeInDown.duration(180)}
                exiting={FadeOutUp.duration(180)}
                layout={LinearTransition.duration(180)}
              >
                <Pressable
                  onPress={() => router.push(matchToast.route as never)}
                  style={({ pressed }) => [
                    styles.matchToast,
                    webPressableStyle(pressed, { pressedOpacity: 0.94, pressedScale: 0.985 }),
                  ]}
                >
                  <View style={styles.matchToastIcon}>
                    <MaterialCommunityIcons name="lightning-bolt" size={18} color="#081120" />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.matchToastLabel}>New live match</Text>
                    <Text style={styles.matchToastText}>{matchToast.label}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#E2E8F0" />
                </Pressable>
              </Animated.View>
            ) : null}

            <View style={styles.overlapShell}>
              <Text style={styles.sectionLabel}>LIVE MATCHES</Text>
              <Text style={styles.sectionHeadline}>
                {liveMatchRows.length
                  ? "Most compatible live people float to the top."
                  : "No live overlap yet. Once your signal is up, the strongest matches will stack here first."}
              </Text>

              {liveMatchRows.length ? (
                liveMatchRows.map((item) => (
                  <View key={item.id} style={styles.overlapRow}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.rowName}>{item.name}</Text>
                      <Text style={styles.rowLine}>{item.line}</Text>
                      <Text style={styles.rowDetail}>{item.detail}</Text>
                    </View>

                    <Pressable
                      onPress={() => router.push(item.actionRoute as never)}
                      style={({ pressed }) => [
                        styles.rowAction,
                        webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.98 }),
                      ]}
                    >
                      <Text style={styles.rowActionText}>{item.action}</Text>
                    </Pressable>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>
                  Set your status, keep the radius tight, and Nowly will start surfacing who feels reachable.
                </Text>
              )}
            </View>

            <View style={styles.overlapShell}>
              <Text style={styles.sectionLabel}>SUGGESTED TIMES</Text>
              <Text style={styles.sectionHeadline}>
                {suggestedTimeRows.length
                  ? "Friends' hangtimes still show up for softer planning."
                  : "Recurring overlap suggestions will show up here once your crew saves hang rhythm."}
              </Text>

              {suggestedTimeRows.length ? (
                suggestedTimeRows.map((item) => (
                  <View key={item.id} style={styles.overlapRow}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.rowName}>{item.name}</Text>
                      <Text style={styles.rowLine}>{item.line}</Text>
                      <Text style={styles.rowDetail}>{item.detail}</Text>
                    </View>

                    <Pressable
                      onPress={item.onPress}
                      style={({ pressed }) => [
                        styles.rowAction,
                        webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.98 }),
                      ]}
                    >
                      <Text style={styles.rowActionText}>{item.action}</Text>
                    </Pressable>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>
                  Saved windows from your people turn into lightweight suggested times here.
                </Text>
              )}
            </View>

            <Pressable
              onPress={openBookingPreview}
              style={({ pressed }) => [
                styles.previewCard,
                webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.99 }),
              ]}
            >
              <Text style={styles.sectionLabel}>BOOKABLE WINDOWS</Text>
              <Text style={styles.previewTitle}>Recurring hang windows still matter too.</Text>
              <Text style={styles.previewCopy}>
                Live status handles right-now overlap. Booking windows cover the softer "later
                tonight" and "later this week" layer.
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </GradientMesh>
  );
}

const styles = StyleSheet.create({
  appBar: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  clearAction: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  clearActionDisabled: {
    opacity: 0.6,
  },
  clearActionText: {
    color: "rgba(247,251,255,0.78)",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 14,
  },
  desktopShell: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 28,
  },
  emptyText: {
    color: "rgba(247,251,255,0.6)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  eyebrow: {
    color: "rgba(167,139,250,0.86)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
    letterSpacing: 2.4,
  },
  heroActions: {
    alignItems: "flex-start",
    gap: 10,
  },
  heroCard: {
    minHeight: 230,
    borderRadius: 32,
    justifyContent: "space-between",
    overflow: "hidden",
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  heroGhostAction: {
    alignSelf: "flex-start",
    paddingVertical: 6,
  },
  heroGhostText: {
    color: "rgba(247,251,255,0.76)",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
  },
  heroStatusPill: {
    borderRadius: 999,
    backgroundColor: "rgba(124,58,237,0.18)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  heroStatusText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 13,
  },
  heroGlowPrimary: {
    position: "absolute",
    top: -64,
    right: -36,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(167,139,250,0.18)",
  },
  heroGlowSecondary: {
    position: "absolute",
    bottom: -96,
    left: -48,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(92,77,255,0.14)",
  },
  heroLabel: {
    color: "rgba(167,139,250,0.82)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
    letterSpacing: 2,
  },
  heroLocationTag: {
    color: "rgba(139,234,255,0.86)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 13,
    lineHeight: 20,
  },
  heroShell: {
    overflow: "hidden",
    borderRadius: 32,
    shadowColor: nowlyColors.glow,
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: {
      width: 0,
      height: 16,
    },
  },
  heroSupport: {
    color: "rgba(247,251,255,0.72)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 15,
    lineHeight: 24,
  },
  heroTitle: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 30,
    lineHeight: 34,
    maxWidth: 420,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  insightStrip: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  insightStripText: {
    color: "rgba(247,251,255,0.82)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 14,
  },
  matchToast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 24,
    backgroundColor: "rgba(102,237,255,0.12)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: nowlyColors.aqua,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  matchToastIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,234,255,0.94)",
  },
  matchToastLabel: {
    color: "rgba(139,234,255,0.84)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  matchToastText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
    lineHeight: 20,
  },
  overlapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  overlapShell: {
    gap: 12,
  },
  previewCard: {
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 8,
  },
  previewCopy: {
    color: "rgba(247,251,255,0.62)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  previewTitle: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  rowAction: {
    borderRadius: 999,
    backgroundColor: "rgba(124,58,237,0.18)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowActionText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 13,
  },
  rowDetail: {
    color: "rgba(247,251,255,0.54)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
  },
  rowLine: {
    color: "rgba(196,181,253,0.9)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  rowName: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
    lineHeight: 22,
  },
  sectionHeadline: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 24,
    lineHeight: 30,
    maxWidth: 420,
  },
  sectionLabel: {
    color: "rgba(247,251,255,0.52)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
    letterSpacing: 2,
  },
  shell: {
    gap: 24,
  },
  title: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 30,
    lineHeight: 34,
  },
});
