import { startTransition, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { GradientMesh } from "../components/ui/GradientMesh";
import { useResponsiveLayout } from "../components/ui/useResponsiveLayout";
import { AvailabilityComposer } from "../features/availability/AvailabilityComposer";
import { nowlyColors } from "../constants/theme";
import { api } from "../lib/api";
import { track } from "../lib/analytics";
import { availabilityLabel } from "../lib/labels";
import { formatDayTime } from "../lib/format";
import { webPressableStyle } from "../lib/web-pressable";
import { useAppStore } from "../store/useAppStore";

const liveInsight = (
  activeSignal: ReturnType<typeof useAppStore.getState>["activeSignal"],
  scheduledOverlaps: ReturnType<typeof useAppStore.getState>["scheduledOverlaps"],
  matches: ReturnType<typeof useAppStore.getState>["matches"],
) => {
  if (scheduledOverlaps.length) {
    return scheduledOverlaps[0].label;
  }

  if (matches.length) {
    return `${matches[0].matchedUser.name} looks like the warmest live overlap.`;
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
  const matches = useAppStore((state) => state.matches);
  const scheduledOverlaps = useAppStore((state) => state.scheduledOverlaps);
  const radar = useAppStore((state) => state.radar);
  const setDashboard = useAppStore((state) => state.setDashboard);
  const setActiveSignal = useAppStore((state) => state.setActiveSignal);
  const layout = useResponsiveLayout();
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  const overlapRows = useMemo(() => {
    if (scheduledOverlaps.length) {
      return scheduledOverlaps.slice(0, 3).map((overlap) => ({
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
      }));
    }

    return matches.slice(0, 3).map((match) => ({
      id: match.id,
      name: match.matchedUser.name,
      line: match.insightLabel ?? match.reason.momentumLabel ?? "Strong short-notice fit",
      detail: `${match.reason.travelMinutes ?? 15} min away`,
      action: "Open",
      onPress: () => router.push(`/match/${match.id}` as never),
    }));
  }, [matches, scheduledOverlaps, user?.inviteCode]);

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
      setActiveSignal(nextSignal);
      await track(token, "availability_set", {
        state: payload.state,
        durationHours: payload.durationHours ?? null,
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

            <AvailabilityComposer activeSignal={activeSignal} onSave={(payload) => void handleSaveStatus(payload)} />

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
                  {clearing ? "Clearing your signal..." : "Go quiet"}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={{ width: layout.rightColumnWidth, gap: layout.sectionGap }}>
            <View style={styles.insightStrip}>
              <Text style={styles.insightStripText}>{liveInsight(activeSignal, scheduledOverlaps, matches)}</Text>
            </View>

            <View style={styles.overlapShell}>
              <Text style={styles.sectionLabel}>WHO MIGHT OVERLAP</Text>
              <Text style={styles.sectionHeadline}>
                {overlapRows.length
                  ? "The strongest social timing shows up here."
                  : "No live overlap yet. Once your signal is up, this list can light up fast."}
              </Text>

              {overlapRows.length ? (
                overlapRows.map((item) => (
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
                  Set your status, keep the radius tight, and Nowly will start surfacing who feels reachable.
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
