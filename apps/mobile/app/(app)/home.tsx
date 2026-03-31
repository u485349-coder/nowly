import { startTransition, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { PillButton } from "../../components/ui/PillButton";
import { useResponsiveLayout } from "../../components/ui/useResponsiveLayout";
import { nowlyColors } from "../../constants/theme";
import { HomeMobileScreen } from "../../features/mobile/screens/HomeMobileScreen";
import { api } from "../../lib/api";
import { formatDayTime } from "../../lib/format";
import { availabilityLabel } from "../../lib/labels";
import { webPressableStyle } from "../../lib/web-pressable";
import { useAppStore } from "../../store/useAppStore";

const quickPrompts = [
  { key: "quick-bite", label: "Quick bite", route: "/prompt/quick-bite" },
  { key: "walk-nearby", label: "Walk nearby", route: "/prompt/walk-nearby" },
  { key: "study-sprint", label: "Study sprint", route: "/prompt/custom-prompt" },
  { key: "coffee-run", label: "Coffee run", route: "/prompt/coffee-run" },
  { key: "custom-nudge", label: "Custom nudge", route: "/prompt/custom-prompt" },
];

const AvatarChip = ({ name, photoUrl }: { name: string; photoUrl?: string | null }) => (
  <View style={styles.avatarChip}>
    {photoUrl ? (
      <Image source={{ uri: photoUrl }} style={styles.avatarImage} resizeMode="cover" />
    ) : (
      <View style={styles.avatarFallback}>
        <Text style={styles.avatarInitial}>{(name[0] ?? "N").toUpperCase()}</Text>
      </View>
    )}
  </View>
);

const formatWindowLine = (startsAt?: string | null) => {
  if (!startsAt) {
    return "Tonight around 8pm.";
  }

  const date = new Date(startsAt);

  return `${date.toLocaleDateString([], {
    weekday: "short",
  })} around ${date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}.`;
};

export default function HomeScreen() {
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const matches = useAppStore((state) => state.matches);
  const activeSignal = useAppStore((state) => state.activeSignal);
  const recaps = useAppStore((state) => state.recaps);
  const scheduledOverlaps = useAppStore((state) => state.scheduledOverlaps);
  const radar = useAppStore((state) => state.radar);
  const setDashboard = useAppStore((state) => state.setDashboard);
  const bootstrapDemo = useAppStore((state) => state.bootstrapDemo);
  const layout = useResponsiveLayout();
  const useMobileFrontend = Platform.OS !== "web" && layout.isMobile;
  const pulse = useRef(new Animated.Value(0)).current;
  const orderedLiveMatches = useMemo(
    () => [...matches].sort((left, right) => right.score - left.score),
    [matches],
  );
  const orderedScheduledOverlaps = useMemo(
    () => [...scheduledOverlaps].sort((left, right) => right.score - left.score),
    [scheduledOverlaps],
  );
  const openBookingPreview = () => {
    router.push("/availability-preferences");
  };

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
      .catch(() => {
        bootstrapDemo();
      });

    return () => {
      active = false;
    };
  }, [bootstrapDemo, setDashboard, token, user]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulse]);

  const warmPeople = useMemo(() => {
    const seen = new Set<string>();

    return [...orderedLiveMatches, ...orderedScheduledOverlaps]
      .flatMap((item) => {
        const person = "matchedUser" in item ? item.matchedUser : null;

        if (!person || seen.has(person.id)) {
          return [];
        }

        seen.add(person.id);
        return [person];
      })
      .slice(0, 4);
  }, [orderedLiveMatches, orderedScheduledOverlaps]);

  const liveRadarRows = useMemo(
    () => [
      ...orderedLiveMatches.map((match) => ({
        id: match.id,
        name: match.matchedUser.name,
        line: match.insightLabel ?? match.reason.momentumLabel ?? "Strong live signal fit",
        detail:
          match.reason.meetingStyle === "ONLINE"
            ? `${Math.round(match.score * 100)}% fit · ${match.reason.overlapMinutes} min overlap · ${match.reason.onlineVenue ?? "online"}`
            : `${Math.round(match.score * 100)}% fit · ${match.reason.overlapMinutes} min overlap · ${match.reason.travelMinutes ?? 15} min away`,
        action: "Open",
        onPress: () => router.push(`/match/${match.id}` as never),
      })),
      ...orderedScheduledOverlaps.slice(0, 2).map((overlap) => ({
        id: overlap.id,
        name: overlap.matchedUser.name,
        line: overlap.label,
        detail: overlap.summary,
        action: "Suggest",
        onPress: openBookingPreview,
      })),
    ],
    [openBookingPreview, orderedLiveMatches, orderedScheduledOverlaps],
  );

  const statusLine = orderedLiveMatches.length
    ? activeSignal
      ? `${availabilityLabel(activeSignal.state)} until ${formatDayTime(activeSignal.expiresAt)}`
      : `${orderedLiveMatches[0].matchedUser.name} is the strongest live match right now.`
    : orderedScheduledOverlaps.length
      ? activeSignal
        ? `${availabilityLabel(activeSignal.state)} until ${formatDayTime(activeSignal.expiresAt)}`
        : orderedScheduledOverlaps[0].label
      : activeSignal
        ? `${availabilityLabel(activeSignal.state)} until ${formatDayTime(activeSignal.expiresAt)}`
        : radar?.rhythm.detail || "No overlap yet.";

  const heroSupport = orderedLiveMatches.length
    ? `${orderedLiveMatches.length} ${orderedLiveMatches.length === 1 ? "friend looks" : "friends look"} warm on the line.`
    : orderedScheduledOverlaps.length
      ? orderedScheduledOverlaps[0].summary
      : matches.length
        ? `${matches.length} ${matches.length === 1 ? "friend looks" : "friends look"} warm on the line.`
      : activeSignal
        ? `Your light signal is up and ${availabilityLabel(activeSignal.state).toLowerCase()} still feels easy.`
        : radar?.suggestionLine || "Wake the radar up and let timing do the rest.";

  const plannedWindowLine = formatWindowLine(
    orderedScheduledOverlaps[0]?.startsAt ?? (activeSignal ? activeSignal.expiresAt : null),
  );
  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 3.8],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 0.24, 1],
    outputRange: [0, 0.36, 0],
  });
  const heroHeight = Math.max(
    layout.height * (layout.isCompactPhone ? 0.31 : 0.35),
    layout.isDesktop ? 360 : layout.isCompactPhone ? 286 : 320,
  );
  const shellStyle = layout.isDesktop
    ? {
        flexDirection: "row" as const,
        alignItems: "flex-start" as const,
        gap: layout.splitGap,
      }
    : undefined;
  const heroEyebrow = orderedLiveMatches.length
    ? "Best match"
    : orderedScheduledOverlaps.length
      ? "Best overlap"
      : activeSignal
        ? "Live signal"
        : "Live cluster";
  const heroTitle = orderedLiveMatches.length
    ? `${orderedLiveMatches[0].matchedUser.name} feels like the move right now.`
    : orderedScheduledOverlaps.length
      ? plannedWindowLine
      : warmPeople.length
        ? `${warmPeople.length} people could be worth nudging.`
        : heroSupport;
  const heroCopy = orderedLiveMatches.length
    ? statusLine
    : orderedScheduledOverlaps.length
      ? orderedScheduledOverlaps[0].summary
      : heroSupport;

  if (useMobileFrontend) {
    return (
      <HomeMobileScreen
        heroEyebrow={heroEyebrow}
        heroTitle={heroTitle}
        heroCopy={heroCopy}
        heroStatus={
          orderedLiveMatches.length
            ? `${orderedLiveMatches.length} live ${orderedLiveMatches.length === 1 ? "match" : "matches"}`
            : activeSignal
              ? "Signal live now"
              : "Radar standing by"
        }
        warmPeople={warmPeople}
        primaryActionLabel={orderedLiveMatches.length || orderedScheduledOverlaps.length ? "Start something" : "Send light signal"}
        secondaryActionLabel="Best windows"
        onPrimaryAction={() => {
          if (orderedLiveMatches.length) {
            router.push(`/match/${orderedLiveMatches[0].id}` as never);
            return;
          }
          if (orderedScheduledOverlaps.length) {
            openBookingPreview();
            return;
          }
          router.push("/now-mode");
        }}
        onSecondaryAction={openBookingPreview}
        prompts={quickPrompts.map((prompt) => ({
          ...prompt,
          onPress: () => router.push(prompt.route as never),
        }))}
        radarRows={liveRadarRows.slice(0, 4)}
        recap={
          recaps[0]
            ? {
                title: recaps[0].title,
                detail: recaps[0].summary,
                onPress: () => router.push(`/recap/${recaps[0].hangoutId}`),
              }
            : null
        }
      />
    );
  }

  return (
    <GradientMesh>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          alignItems: "center",
          paddingBottom: 170,
          paddingHorizontal: layout.screenPadding,
          paddingTop: layout.topPadding + (layout.isDesktop ? 0 : 18),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[{ width: layout.shellWidth, gap: layout.sectionGap }, shellStyle]}>
          <View style={{ width: layout.leftColumnWidth, gap: layout.isCompactPhone ? 18 : 22 }}>
            <View style={styles.heroHeader}>
              <View style={{ gap: 10, maxWidth: layout.isDesktop ? 380 : undefined }}>
                <Text style={styles.eyebrow}>LIVE RADAR</Text>
                <Text
                  style={[
                    styles.heroTitle,
                    {
                      fontSize: layout.heroTitleSize,
                      lineHeight: layout.heroTitleLineHeight,
                    },
                  ]}
                >
                  Who can you catch right now?
                </Text>
              </View>

              <Pressable
                onPress={() => router.push("/availability-preferences")}
                style={({ pressed }) => [
                  styles.heroUtility,
                  webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                ]}
              >
                <MaterialCommunityIcons name="cog-outline" size={20} color="#F7FBFF" />
              </Pressable>
            </View>

            <View
              style={[
                styles.heroShell,
                { minHeight: heroHeight, borderRadius: layout.cardRadius + 4 },
              ]}
            >
              <LinearGradient
                colors={["rgba(24,17,56,0.95)", "rgba(36,31,90,0.82)", "rgba(8,14,29,0.98)"]}
                start={{ x: 0.08, y: 0.02 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.heroPanel,
                  {
                    borderRadius: layout.cardRadius + 4,
                    paddingHorizontal: layout.isCompactPhone ? 18 : 22,
                    paddingVertical: layout.isCompactPhone ? 18 : 22,
                  },
                ]}
              >
                <View style={styles.heroGlowA} pointerEvents="none" />
                <View style={styles.heroGlowB} pointerEvents="none" />

                <View style={{ gap: 14 }}>
                  <Text
                    style={[
                      styles.heroPanelTitle,
                      {
                        fontSize: layout.isCompactPhone ? 24 : 29,
                        lineHeight: layout.isCompactPhone ? 29 : 34,
                      },
                    ]}
                  >
                    Who can you catch right now?
                  </Text>
                  <Text
                    style={[
                      styles.heroSupport,
                      {
                        fontSize: layout.isCompactPhone ? 14 : 15,
                        lineHeight: layout.isCompactPhone ? 22 : 24,
                      },
                    ]}
                  >
                    {heroSupport}
                  </Text>

                  <View style={styles.heroClusterRow}>
                    {warmPeople.length ? (
                      warmPeople.map((person) => (
                        <AvatarChip key={person.id} name={person.name} photoUrl={person.photoUrl} />
                      ))
                    ) : (
                      <View style={styles.ambientDot} />
                    )}
                  </View>
                </View>

                <View style={styles.heroActions}>
                  <PillButton label="Send light signal" onPress={() => router.push("/now-mode")} />
                  <Pressable
                    onPress={openBookingPreview}
                    style={({ pressed }) => [
                      styles.ghostAction,
                      webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.985 }),
                    ]}
                  >
                    <Text style={styles.ghostActionText}>View best windows</Text>
                  </Pressable>
                </View>

                <View
                  style={[
                    styles.pulseField,
                    {
                      right: layout.isCompactPhone ? 22 : 34,
                      bottom: layout.isCompactPhone ? 18 : 26,
                    },
                  ]}
                  pointerEvents="none"
                >
                  <View style={styles.pulseCore} />
                  <Animated.View
                    style={[
                      styles.pulseRing,
                      {
                        opacity: pulseOpacity,
                        transform: [{ scale: pulseScale }],
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.pulseRingSecondary,
                      {
                        opacity: pulseOpacity.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 0.28],
                        }),
                        transform: [
                          {
                            scale: pulse.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1.1, 4.6],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                </View>
              </LinearGradient>
            </View>
          </View>

          <View style={{ width: layout.rightColumnWidth, gap: layout.sectionGap }}>
            <View style={styles.statusStrip}>
              <Text style={styles.statusText}>{statusLine}</Text>
            </View>

            <View style={{ gap: 12 }}>
              <Text style={styles.sectionLabel}>LIVE RADAR</Text>

              {liveRadarRows.length ? (
                liveRadarRows.slice(0, 5).map((item) => (
                  <View key={item.id} style={styles.radarRow}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.radarName}>{item.name}</Text>
                      <Text style={styles.radarLine}>{item.line}</Text>
                      <Text style={styles.radarDetail}>{item.detail}</Text>
                    </View>

                    <Pressable
                      onPress={item.onPress}
                      style={({ pressed }) => [
                        styles.radarAction,
                        webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.985 }),
                      ]}
                    >
                      <Text style={styles.radarActionText}>{item.action}</Text>
                    </Pressable>
                  </View>
                ))
              ) : (
                <Text style={styles.radarEmpty}>
                  Go live or save a hang rhythm and the radar feed will stack your best fits here.
                </Text>
              )}
            </View>

            <View style={{ gap: 12 }}>
              <Text style={styles.sectionLabel}>LOW PRESSURE PROMPTS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.promptRow}>
                  {quickPrompts.map((prompt) => (
                    <Pressable
                      key={prompt.key}
                      onPress={() => router.push(prompt.route as never)}
                      style={({ pressed }) => [
                        styles.promptChip,
                        pressed ? styles.promptChipPressed : null,
                        webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.985 }),
                      ]}
                    >
                      <Text style={styles.promptChipText}>{prompt.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            <Pressable
              onPress={openBookingPreview}
              style={({ pressed }) => [
                styles.teaserCard,
                webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.99 }),
              ]}
            >
              <Text style={styles.sectionLabel}>BEST UPCOMING WINDOW</Text>
              <Text style={styles.teaserTitle}>{plannedWindowLine}</Text>
              <Text style={styles.teaserMeta}>Tap to open setup and tune your hang rhythm.</Text>
            </Pressable>

            <View style={{ gap: 12 }}>
              <Text style={styles.sectionLabel}>PAST HANGS</Text>

              {recaps.length ? (
                recaps.slice(0, 3).map((recap, index) => (
                  <Pressable
                    key={recap.id}
                    onPress={() => router.push(`/recap/${recap.hangoutId}`)}
                    style={({ pressed }) => [
                      styles.recapCard,
                      {
                        marginLeft: index * 8,
                        opacity: 1 - index * 0.12,
                      },
                      webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.99 }),
                    ]}
                  >
                    <Text style={styles.recapBadge}>{recap.badge}</Text>
                    <Text style={styles.recapTitle}>{recap.title}</Text>
                    <Text style={styles.recapSummary}>{recap.summary}</Text>
                  </Pressable>
                ))
              ) : (
                <View style={styles.ghostStack}>
                  <Text style={styles.recapSummary}>
                    Your recent hangs will collect here as soft recaps.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </GradientMesh>
  );
}

const styles = StyleSheet.create({
  ambientDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(139,234,255,0.68)",
    shadowColor: nowlyColors.aqua,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  avatarChip: {
    width: 52,
    height: 52,
    overflow: "hidden",
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  avatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitial: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
  },
  eyebrow: {
    color: "rgba(167,139,250,0.86)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
    letterSpacing: 2.4,
  },
  ghostAction: {
    alignSelf: "flex-start",
    paddingVertical: 6,
  },
  ghostActionText: {
    color: "rgba(247,251,255,0.76)",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
  },
  ghostStack: {
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  heroActions: {
    gap: 10,
  },
  mobileActionChip: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(124,58,237,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mobileActionChipText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 12,
  },
  mobileHeaderCopy: {
    color: "rgba(247,251,255,0.68)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 320,
  },
  mobileHeroActions: {
    gap: 10,
  },
  mobileHeroPanelTitle: {
    fontSize: 24,
    lineHeight: 30,
    maxWidth: 290,
  },
  mobilePanelCard: {
    gap: 10,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  mobilePromptInline: {
    paddingVertical: 2,
    paddingRight: 12,
  },
  mobilePromptWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 12,
  },
  mobilePulseWrap: {
    paddingTop: 2,
  },
  mobileRadarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  mobileRecapCard: {
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
  },
  mobileSectionTitle: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 22,
    lineHeight: 27,
  },
  mobileSecondaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(7,13,26,0.58)",
  },
  mobileSecondaryButtonText: {
    color: "rgba(247,251,255,0.88)",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
  },
  mobileSignalPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "rgba(139,234,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mobileSignalPillText: {
    color: "rgba(139,234,255,0.92)",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 12,
  },
  heroClusterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  heroPanel: {
    flex: 1,
    justifyContent: "space-between",
    borderRadius: 34,
    overflow: "hidden",
    paddingHorizontal: 22,
    paddingVertical: 22,
  },
  heroPanelTitle: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    maxWidth: 360,
  },
  heroShell: {
    overflow: "hidden",
    borderRadius: 34,
    shadowColor: nowlyColors.glow,
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: {
      width: 0,
      height: 16,
    },
    elevation: 10,
  },
  heroGlowA: {
    position: "absolute",
    right: -56,
    top: -68,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(167,139,250,0.16)",
  },
  heroGlowB: {
    position: "absolute",
    left: -56,
    bottom: -120,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(124,58,237,0.14)",
  },
  heroSupport: {
    color: "rgba(247,251,255,0.72)",
    fontFamily: "SpaceGrotesk_400Regular",
    maxWidth: 420,
  },
  heroTitle: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  heroUtility: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  promptChip: {
    height: 40,
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 16,
    shadowColor: nowlyColors.glow,
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 10,
    },
  },
  promptChipPressed: {
    backgroundColor: "rgba(255,255,255,0.1)",
    shadowOpacity: 0.18,
  },
  promptChipText: {
    color: "rgba(247,251,255,0.92)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 14,
  },
  promptRow: {
    flexDirection: "row",
    gap: 10,
    paddingRight: 6,
  },
  radarAction: {
    borderRadius: 999,
    backgroundColor: "rgba(124,58,237,0.18)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  radarActionText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 13,
  },
  radarDetail: {
    color: "rgba(247,251,255,0.54)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  radarEmpty: {
    color: "rgba(247,251,255,0.6)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  radarLine: {
    color: "rgba(196,181,253,0.9)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  radarName: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
    lineHeight: 22,
  },
  radarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 4,
  },
  pulseCore: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#B8F3FF",
    shadowColor: nowlyColors.aqua,
    shadowOpacity: 0.66,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  pulseField: {
    position: "absolute",
    right: 34,
    bottom: 26,
    width: 120,
    height: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(139,234,255,0.44)",
  },
  pulseRingSecondary: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(117,207,255,0.22)",
  },
  recapBadge: {
    color: "rgba(196,181,253,0.82)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  recapCard: {
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 8,
  },
  recapSummary: {
    color: "rgba(247,251,255,0.62)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  recapTitle: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
    lineHeight: 22,
  },
  sectionLabel: {
    color: "rgba(247,251,255,0.52)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
    letterSpacing: 2,
  },
  statusStrip: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statusText: {
    color: "rgba(247,251,255,0.82)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 14,
  },
  teaserCard: {
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 8,
  },
  teaserMeta: {
    color: "rgba(247,251,255,0.56)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
  },
  teaserTitle: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
    lineHeight: 24,
  },
});
