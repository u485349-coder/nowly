import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Animated, {
  Extrapolation,
  FadeInDown,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { useResponsiveLayout } from "../../components/ui/useResponsiveLayout";
import { api } from "../../lib/api";
import { pickAvatarImage } from "../../lib/avatar";
import { notificationIntensityLabel } from "../../lib/labels";
import { disconnectSocket } from "../../lib/socket";
import { weekdayOptionLabels } from "../../lib/recurring-availability";
import { useAppStore } from "../../store/useAppStore";

const intensityOptions = ["QUIET", "BALANCED", "LIVE"] as const;
const SLIDER_THUMB = 24;
const MOMENTUM_GAP = 14;

type MomentumCardData = {
  key: string;
  eyebrow: string;
  value: string;
  title: string;
  detail: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  colors: [string, string, string];
  onPress?: () => void;
};

const progressForIntensity = (intensity: (typeof intensityOptions)[number]) =>
  intensityOptions.indexOf(intensity) / (intensityOptions.length - 1);

const signalPresetForIntensity = (intensity: (typeof intensityOptions)[number]) => {
  if (intensity === "QUIET") {
    return {
      state: "BUSY" as const,
      label: "Quiet mode",
      durationHours: 2,
    };
  }

  if (intensity === "LIVE") {
    return {
      state: "FREE_NOW" as const,
      label: "Live mode",
      durationHours: 3,
    };
  }

  return {
    state: "FREE_LATER" as const,
    label: "Balanced mode",
    durationHours: 3,
  };
};

const rhythmPeriod = (startMinute: number) => {
  if (startMinute < 12 * 60) {
    return "mornings";
  }

  if (startMinute < 17 * 60) {
    return "afternoons";
  }

  if (startMinute < 22 * 60) {
    return "evenings";
  }

  return "late nights";
};

const rhythmSummaryLabel = (
  recurringWindows: ReturnType<typeof useAppStore.getState>["recurringWindows"],
  radar: ReturnType<typeof useAppStore.getState>["radar"],
) => {
  if (recurringWindows.length) {
    const averageStart =
      recurringWindows.reduce((total, window) => total + window.startMinute, 0) /
      recurringWindows.length;
    const tone =
      radar?.rhythm.state === "LIVE"
        ? "Usually warm"
        : radar?.rhythm.state === "WARM"
          ? "Usually open"
          : "Usually easy";

    return `${tone} ${rhythmPeriod(averageStart)}`;
  }

  if (radar?.rhythm.headline) {
    return radar.rhythm.headline;
  }

  return "Light, social, low-pressure";
};

const MomentumCard = ({
  card,
  cardWidth,
  index,
  scrollX,
}: {
  card: MomentumCardData;
  cardWidth: number;
  index: number;
  scrollX: SharedValue<number>;
}) => {
  const pageWidth = cardWidth + MOMENTUM_GAP;
  const cardStyle = useAnimatedStyle(() => {
    const center = index * pageWidth;
    const inputRange = [center - pageWidth, center, center + pageWidth];

    return {
      opacity: interpolate(scrollX.value, inputRange, [0.72, 1, 0.72], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(scrollX.value, inputRange, [10, 0, 10], Extrapolation.CLAMP),
        },
        {
          scale: interpolate(scrollX.value, inputRange, [0.95, 1, 0.95], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const contentStyle = useAnimatedStyle(() => {
    const center = index * pageWidth;
    const inputRange = [center - pageWidth, center, center + pageWidth];

    return {
      transform: [
        {
          translateX: interpolate(scrollX.value, inputRange, [-10, 0, 10], Extrapolation.CLAMP),
        },
      ],
    };
  });

  return (
    <Animated.View style={[{ width: cardWidth }, cardStyle]}>
      <Pressable onPress={card.onPress} disabled={!card.onPress}>
        <LinearGradient colors={card.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.momentumCard}>
          <Animated.View style={contentStyle}>
            <View className="flex-row items-start justify-between">
              <View className="gap-1">
                <Text className="font-body text-[11px] uppercase tracking-[1.8px] text-cloud/56">
                  {card.eyebrow}
                </Text>
                <Text className="font-display text-[32px] leading-[34px] text-cloud">
                  {card.value}
                </Text>
              </View>

              <View style={styles.momentumIconBubble}>
                <MaterialCommunityIcons name={card.icon} size={18} color="#E0F2FE" />
              </View>
            </View>

            <View className="mt-6 gap-1.5">
              <Text className="font-display text-[18px] leading-[22px] text-cloud">
                {card.title}
              </Text>
              <Text className="font-body text-sm leading-6 text-white/68">{card.detail}</Text>
            </View>
          </Animated.View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

export default function ProfileScreen() {
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const activeSignal = useAppStore((state) => state.activeSignal);
  const liveSignalPreferences = useAppStore((state) => state.liveSignalPreferences);
  const radar = useAppStore((state) => state.radar);
  const recaps = useAppStore((state) => state.recaps);
  const recurringWindows = useAppStore((state) => state.recurringWindows);
  const scheduledOverlaps = useAppStore((state) => state.scheduledOverlaps);
  const setNotificationsEnabled = useAppStore((state) => state.setNotificationsEnabled);
  const updateUser = useAppStore((state) => state.updateUser);
  const setActiveSignal = useAppStore((state) => state.setActiveSignal);
  const clearSession = useAppStore((state) => state.clearSession);
  const layout = useResponsiveLayout();
  const shellWidth = Math.min(layout.shellWidth, layout.isDesktop ? 980 : layout.shellWidth);
  const currentIntensity = user?.notificationIntensity ?? "BALANCED";
  const [sliderWidth, setSliderWidth] = useState(0);
  const [previewIntensity, setPreviewIntensity] = useState<(typeof intensityOptions)[number] | null>(null);
  const [pendingIntensity, setPendingIntensity] = useState<(typeof intensityOptions)[number] | null>(null);
  const sliderProgress = useSharedValue(progressForIntensity(currentIntensity));
  const rippleOpacity = useSharedValue(0);
  const rippleScale = useSharedValue(0.82);
  const momentumScrollX = useSharedValue(0);
  const momentumCardWidth = Math.min(
    Math.max(shellWidth - 92, 216),
    layout.isDesktop ? 282 : 246,
  );
  const rhythmSubtitle = useMemo(
    () => rhythmSummaryLabel(recurringWindows, radar),
    [radar, recurringWindows],
  );
  const activeSliderLabel = previewIntensity ?? pendingIntensity ?? currentIntensity;

  useEffect(() => {
    sliderProgress.value = withTiming(progressForIntensity(currentIntensity), {
      duration: 220,
    });
    setPreviewIntensity(null);
    setPendingIntensity(null);
  }, [currentIntensity, sliderProgress]);

  const triggerRipple = () => {
    rippleOpacity.value = 0.36;
    rippleScale.value = 0.82;
    rippleOpacity.value = withTiming(0, { duration: 420 });
    rippleScale.value = withTiming(1.9, { duration: 420 });
  };

  const sliderTrackStyle = useAnimatedStyle(() => {
    const travel = Math.max(sliderWidth - SLIDER_THUMB, 0);
    return {
      width: SLIDER_THUMB + sliderProgress.value * travel,
    };
  });

  const sliderThumbStyle = useAnimatedStyle(() => {
    const travel = Math.max(sliderWidth - SLIDER_THUMB, 0);

    return {
      transform: [{ translateX: sliderProgress.value * travel }],
    };
  });

  const sliderRippleStyle = useAnimatedStyle(() => {
    const travel = Math.max(sliderWidth - SLIDER_THUMB, 0);

    return {
      opacity: rippleOpacity.value,
      transform: [
        { translateX: sliderProgress.value * travel },
        { scale: rippleScale.value },
      ],
    };
  });

  const momentumScrollHandler = useAnimatedScrollHandler((event) => {
    momentumScrollX.value = event.contentOffset.x;
  });

  const handleChangePhoto = async () => {
    try {
      const avatar = await pickAvatarImage();

      if (!avatar) {
        return;
      }

      const nextUser = await api.updateProfile(token, {
        photoUrl: avatar.dataUrl,
      });

      updateUser({
        photoUrl: nextUser.photoUrl,
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "We couldn't update your photo right now.";

      Alert.alert("Photo update failed", message);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      const nextUser = await api.updateProfile(token, {
        photoUrl: null,
      });

      updateUser({
        photoUrl: nextUser.photoUrl,
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "We couldn't remove your photo right now.";

      Alert.alert("Photo update failed", message);
    }
  };

  const syncLiveSignalFromIntensity = async (intensity: (typeof intensityOptions)[number]) => {
    const preset = signalPresetForIntensity(intensity);
    const locationLabel = liveSignalPreferences?.locationLabel?.trim() ?? "";
    const showLocation = liveSignalPreferences?.showLocation ?? false;

    const nextSignal = await api.setAvailability(token, {
      state: preset.state,
      label: preset.label,
      radiusKm: activeSignal?.radiusKm ?? 5,
      durationHours: preset.durationHours,
      showLocation,
      locationLabel: showLocation ? locationLabel || null : null,
      vibe: activeSignal?.vibe ?? null,
      energyLevel: activeSignal?.energyLevel ?? null,
      budgetMood: activeSignal?.budgetMood ?? null,
      socialBattery: activeSignal?.socialBattery ?? null,
      hangoutIntent: activeSignal?.hangoutIntent ?? null,
    });

    setActiveSignal({
      ...nextSignal,
      showLocation,
      locationLabel: showLocation ? locationLabel || null : null,
    });
  };

  const commitIntensity = async (intensity: (typeof intensityOptions)[number]) => {
    if (intensity === currentIntensity) {
      triggerRipple();
      void syncLiveSignalFromIntensity(intensity).catch(() => undefined);
      return;
    }

    const previousIntensity = currentIntensity;
    setPendingIntensity(intensity);
    updateUser({
      notificationIntensity: intensity,
    });
    setNotificationsEnabled(intensity !== "QUIET");
    triggerRipple();

    try {
      const nextUser = await api.updateNotificationPreference(token, intensity);
      updateUser({
        notificationIntensity: nextUser.notificationIntensity,
      });

      try {
        await syncLiveSignalFromIntensity(nextUser.notificationIntensity ?? intensity);
      } catch (error) {
        Alert.alert(
          "Energy updated",
          error instanceof Error && error.message
            ? `${error.message} Your social energy saved, but we couldn't sync the live signal right now.`
            : "Your social energy saved, but we couldn't sync the live signal right now.",
        );
      }
    } catch (error) {
      updateUser({
        notificationIntensity: previousIntensity,
      });
      setNotificationsEnabled(previousIntensity !== "QUIET");
      sliderProgress.value = withTiming(progressForIntensity(previousIntensity), {
        duration: 220,
      });
      setPreviewIntensity(null);
      setPendingIntensity(null);

      const message =
        error instanceof Error && error.message
          ? error.message
          : "We couldn't update your social energy right now.";

      Alert.alert("Social energy update failed", message);
    }
  };

  const moveSliderTo = (locationX: number) => {
    if (!sliderWidth) {
      return intensityOptions.indexOf(currentIntensity);
    }

    const clamped = Math.max(0, Math.min(locationX, sliderWidth));
    const nextProgress = clamped / sliderWidth;
    const nextIndex = Math.round(nextProgress * (intensityOptions.length - 1));

    sliderProgress.value = nextProgress;
    setPreviewIntensity(intensityOptions[nextIndex]);

    return nextIndex;
  };

  const commitSlider = () => {
    const index = Math.round(sliderProgress.value * (intensityOptions.length - 1));
    const nextIntensity = intensityOptions[index];

    sliderProgress.value = withTiming(progressForIntensity(nextIntensity), {
      duration: 160,
    });
    setPreviewIntensity(nextIntensity);
    void commitIntensity(nextIntensity);
  };

  const momentumCards = useMemo<MomentumCardData[]>(
    () => [
      {
        key: "streak",
        eyebrow: "Momentum",
        value: `${user?.streakCount ?? 0}`,
        title: "week streak",
        detail:
          recaps[0]?.title ??
          "Quick hangs keep your line warm and your social graph moving.",
        icon: "flash-triangle-outline",
        colors: ["rgba(11,16,30,0.92)", "rgba(18,41,62,0.84)", "rgba(8,12,23,0.94)"],
        onPress: recaps[0] ? () => router.push(`/recap/${recaps[0].hangoutId}`) : undefined,
      },
      {
        key: "signals",
        eyebrow: "Signals",
        value: `${radar?.rhythm.activeNowCount ?? 0}`,
        title: "friends live now",
        detail:
          radar?.suggestionLine ??
          `${notificationIntensityLabel(currentIntensity)} energy keeps Nowly alive without getting loud.`,
        icon: "lightning-bolt-circle",
        colors: ["rgba(10,15,28,0.92)", "rgba(21,44,69,0.84)", "rgba(7,11,22,0.94)"],
      },
      {
        key: "overlap",
        eyebrow: "Overlap",
        value: `${scheduledOverlaps.length || radar?.localDensity.nearbyFriendsCount || 0}`,
        title: "good reads ahead",
        detail:
          scheduledOverlaps[0]?.label ??
          radar?.rhythm.detail ??
          "Save a hang rhythm to sharpen the overlap forecast.",
        icon: "orbit-variant",
        colors: ["rgba(9,14,26,0.92)", "rgba(18,39,58,0.84)", "rgba(7,11,22,0.94)"],
      },
    ],
    [currentIntensity, radar, recaps, scheduledOverlaps, user?.streakCount],
  );

  const weeklyTracks = useMemo(
    () =>
      weekdayOptionLabels.map((day, dayIndex) => ({
        day,
        windows: recurringWindows.filter(
          (window) => window.recurrence === "WEEKLY" && window.dayOfWeek === dayIndex,
        ),
      })),
    [recurringWindows],
  );

  const monthlyCount = recurringWindows.filter((window) => window.recurrence === "MONTHLY").length;

  const handleLogout = () => {
    disconnectSocket();
    clearSession();
    router.replace("/onboarding");
  };

  return (
    <GradientMesh>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          alignItems: "center",
          paddingHorizontal: layout.screenPadding,
          paddingTop: layout.isDesktop ? 44 : 64,
          paddingBottom: 136,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: shellWidth, gap: 24 }}>
        <Animated.View entering={FadeInDown.delay(60).duration(420)}>
          <LinearGradient
            colors={["rgba(10,15,30,0.92)", "rgba(13,30,47,0.86)", "rgba(8,12,23,0.94)"]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroShell}
          >
            <View style={styles.heroGlowLarge} pointerEvents="none" />

            <Pressable onPress={() => void handleChangePhoto()} style={styles.avatarHalo}>
              <View style={styles.avatarWrap}>
                {user?.photoUrl ? (
                  <Image source={{ uri: user.photoUrl }} className="h-full w-full" resizeMode="cover" />
                ) : (
                  <View className="h-full w-full items-center justify-center bg-white/8">
                    <Text className="font-display text-[42px] text-white/72">
                      {(user?.name?.[0] ?? "N").toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.avatarEditBadge}>
                <MaterialCommunityIcons name="camera-outline" size={14} color="#0F172A" />
              </View>
            </Pressable>

            <Text className="mt-5 font-display text-[32px] leading-[34px] text-cloud">
              {user?.name ?? "Your profile"}
            </Text>
            <Text className="mt-2 font-body text-[15px] text-white/68">{rhythmSubtitle}</Text>

            <View className="mt-4 flex-row flex-wrap justify-center gap-2">
              {user?.communityTag || user?.city ? (
                <View style={styles.identityChip}>
                  <Text className="font-body text-[12px] text-cloud/88">
                    {user?.communityTag || user?.city}
                  </Text>
                </View>
              ) : null}
              {user?.discordUsername ? (
                <View style={styles.identityChip}>
                  <Text className="font-body text-[12px] text-cloud/88">@{user.discordUsername}</Text>
                </View>
              ) : null}
              <View style={styles.identityChip}>
                <Text className="font-body text-[12px] text-aqua/88">
                  {notificationIntensityLabel(currentIntensity)} energy
                </Text>
              </View>
            </View>

            <View style={styles.photoActionsRow}>
              <Pressable onPress={() => void handleChangePhoto()}>
                <Text className="font-body text-sm text-cloud/84">Change photo</Text>
              </Pressable>
              {user?.photoUrl ? (
                <Pressable onPress={() => void handleRemovePhoto()}>
                  <Text className="font-body text-sm text-cloud/56">Remove</Text>
                </Pressable>
              ) : null}
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(420)}>
          <LinearGradient
            colors={["rgba(10,14,28,0.92)", "rgba(14,30,50,0.86)", "rgba(8,12,24,0.94)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.energyShell}
          >
            <View style={styles.energyGlow} pointerEvents="none" />
            <Text className="font-body text-[12px] uppercase tracking-[2px] text-aqua/76">
              SOCIAL ENERGY
            </Text>
            <Text className="mt-2 font-display text-[22px] leading-[26px] text-cloud">
              Tune how live Nowly feels around you
            </Text>
            <Text className="mt-2 font-body text-sm leading-6 text-white/64">
              Slide between quiet, balanced, and live. The glow shifts as soon as it lands.
            </Text>

            <View
              className="mt-6"
              onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(event) => {
                moveSliderTo(event.nativeEvent.locationX);
              }}
              onResponderMove={(event) => {
                moveSliderTo(event.nativeEvent.locationX);
              }}
              onResponderRelease={commitSlider}
              onResponderTerminate={commitSlider}
              onResponderTerminationRequest={() => false}
              style={styles.sliderShell}
            >
              <LinearGradient
                colors={["rgba(15,23,42,0.9)", "rgba(8,47,73,0.85)", "rgba(34,211,238,0.78)"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.sliderTrack}
              />
              <Animated.View style={[styles.sliderTrackFill, sliderTrackStyle]} />
              <Animated.View pointerEvents="none" style={[styles.sliderRipple, sliderRippleStyle]} />
              <Animated.View style={[styles.sliderThumb, sliderThumbStyle]}>
                <View style={styles.sliderThumbCore} />
              </Animated.View>
            </View>

            <View className="mt-5 flex-row justify-between">
              {intensityOptions.map((option) => {
                const active = option === activeSliderLabel;

                return (
                  <Pressable
                    key={option}
                    onPress={() => {
                      sliderProgress.value = withTiming(progressForIntensity(option), {
                        duration: 180,
                      });
                      setPreviewIntensity(option);
                      void commitIntensity(option);
                    }}
                  >
                    <Text
                      className={`font-body text-sm ${active ? "text-cloud" : "text-white/42"}`}
                    >
                      {notificationIntensityLabel(option)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(420)} className="gap-4">
          <View className="gap-1">
            <Text className="font-body text-[12px] uppercase tracking-[2px] text-cloud/54">
              MOMENTUM
            </Text>
            <Text className="font-display text-[24px] leading-[28px] text-cloud">
              The line feels best when it stays moving
            </Text>
          </View>

          <Animated.ScrollView
            horizontal
            decelerationRate="fast"
            disableIntervalMomentum
            onScroll={momentumScrollHandler}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            snapToInterval={momentumCardWidth + MOMENTUM_GAP}
            contentContainerStyle={{
              paddingRight: 12,
            }}
          >
            <View className="flex-row gap-[14px]">
              {momentumCards.map((card, index) => (
                <MomentumCard
                  key={card.key}
                  card={card}
                  cardWidth={momentumCardWidth}
                  index={index}
                  scrollX={momentumScrollX}
                />
              ))}
            </View>
          </Animated.ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).duration(420)}>
          <Pressable onPress={() => router.push("/availability-preferences")}>
            <LinearGradient
              colors={["rgba(10,14,28,0.92)", "rgba(13,29,46,0.86)", "rgba(8,12,24,0.94)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.snapshotShell}
            >
              <View style={styles.snapshotGlow} pointerEvents="none" />

              <View className="flex-row items-start justify-between gap-4">
                <View className="max-w-[60%] gap-2">
                  <Text className="font-body text-[12px] uppercase tracking-[2px] text-aqua/74">
                    RHYTHM SNAPSHOT
                  </Text>
                  <Text className="font-display text-[22px] leading-[26px] text-cloud">
                    {recurringWindows.length
                      ? `${recurringWindows.length} hang windows saved`
                      : "Set your usual hang rhythm"}
                  </Text>
                  <Text className="font-body text-sm leading-6 text-white/64">
                    Tap to tune the weekly shape behind your booking flow.
                  </Text>
                </View>

                <View style={styles.snapshotArrow}>
                  <MaterialCommunityIcons name="arrow-top-right" size={18} color="#E2E8F0" />
                </View>
              </View>

              <View className="mt-5 flex-row items-end justify-between gap-2">
                {weeklyTracks.map((track) => (
                  <View key={track.day} className="flex-1 items-center gap-2">
                    <View style={styles.snapshotTrack}>
                      {track.windows.length ? (
                        track.windows.slice(0, 2).map((window, index) => {
                          const top = Math.min(48, Math.max(0, (window.startMinute / 1440) * 58));
                          const height = Math.max(
                            10,
                            Math.min(58 - top, ((window.endMinute - window.startMinute) / 1440) * 58),
                          );

                          return (
                            <View
                              key={`${window.id}-${index}`}
                              style={[
                                styles.snapshotPulse,
                                {
                                  top,
                                  height,
                                  opacity: index === 0 ? 1 : 0.76,
                                },
                              ]}
                            />
                          );
                        })
                      ) : (
                        <View style={styles.snapshotAmbient} />
                      )}
                    </View>
                    <Text className="font-body text-[10px] text-cloud/46">{track.day}</Text>
                  </View>
                ))}
              </View>

              {monthlyCount ? (
                <View className="mt-4 self-start rounded-full bg-white/8 px-3 py-1.5">
                  <Text className="font-body text-[11px] text-cloud/74">
                    +{monthlyCount} monthly {monthlyCount === 1 ? "window" : "windows"}
                  </Text>
                </View>
              ) : null}
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(420)} className="pt-2">
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.logoutAction, pressed ? styles.logoutActionPressed : null]}
          >
            <LinearGradient
              colors={["rgba(74,29,150,0.28)", "rgba(22,49,122,0.24)", "rgba(7,17,37,0.92)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoutGradient}
            >
              <View style={styles.logoutIconBubble}>
                <MaterialCommunityIcons name="logout-variant" size={18} color="#F8FAFC" />
              </View>

              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.logoutTitle}>Log out</Text>
                <Text style={styles.logoutSubtitle}>Sign out of this account</Text>
              </View>

              <MaterialCommunityIcons name="chevron-right" size={18} color="rgba(248,250,252,0.68)" />
            </LinearGradient>
          </Pressable>
        </Animated.View>
        </View>
      </ScrollView>
    </GradientMesh>
  );
}

const styles = StyleSheet.create({
  heroShell: {
    overflow: "hidden",
    borderRadius: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: "#020617",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 7,
  },
  heroGlowLarge: {
    position: "absolute",
    top: -38,
    right: -26,
    height: 160,
    width: 160,
    borderRadius: 160,
    backgroundColor: "rgba(34,211,238,0.08)",
  },
  avatarHalo: {
    position: "relative",
    marginTop: 4,
    shadowColor: "#67E8F9",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 6,
  },
  avatarWrap: {
    height: 88,
    width: 88,
    overflow: "hidden",
    borderRadius: 44,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  avatarEditBadge: {
    position: "absolute",
    right: -4,
    bottom: 0,
    height: 26,
    width: 26,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#BAE6FD",
  },
  photoActionsRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
  },
  identityChip: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  energyShell: {
    overflow: "hidden",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    shadowColor: "#67E8F9",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 6,
  },
  energyGlow: {
    position: "absolute",
    top: -32,
    right: -24,
    height: 138,
    width: 138,
    borderRadius: 138,
    backgroundColor: "rgba(34,211,238,0.07)",
  },
  sliderShell: {
    position: "relative",
    height: 28,
    justifyContent: "center",
  },
  sliderTrack: {
    height: 12,
    borderRadius: 999,
    opacity: 0.72,
  },
  sliderTrackFill: {
    position: "absolute",
    left: 0,
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  sliderRipple: {
    position: "absolute",
    left: -8,
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: "rgba(186,230,253,0.26)",
  },
  sliderThumb: {
    position: "absolute",
    left: 0,
    height: SLIDER_THUMB,
    width: SLIDER_THUMB,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SLIDER_THUMB / 2,
    backgroundColor: "#F8FAFC",
    shadowColor: "#BAE6FD",
    shadowOpacity: 0.38,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 6,
  },
  sliderThumbCore: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: "#0F172A",
  },
  momentumCard: {
    minHeight: 184,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: "#020617",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 6,
  },
  momentumIconBubble: {
    height: 36,
    width: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  snapshotShell: {
    overflow: "hidden",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: "#67E8F9",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 6,
  },
  snapshotGlow: {
    position: "absolute",
    left: -34,
    bottom: -58,
    height: 148,
    width: 148,
    borderRadius: 148,
    backgroundColor: "rgba(34,211,238,0.1)",
  },
  snapshotArrow: {
    height: 34,
    width: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  snapshotTrack: {
    position: "relative",
    height: 60,
    width: 14,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  snapshotPulse: {
    position: "absolute",
    left: 2,
    right: 2,
    borderRadius: 999,
    backgroundColor: "rgba(103,232,249,0.92)",
    shadowColor: "#67E8F9",
    shadowOpacity: 0.42,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 4,
  },
  snapshotAmbient: {
    position: "absolute",
    bottom: 8,
    left: 3,
    right: 3,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  logoutAction: {
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#60A5FA",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 6,
  },
  logoutActionPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  logoutGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  logoutIconBubble: {
    height: 34,
    width: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.42)",
  },
  logoutTitle: {
    color: "#F8FAFC",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
    lineHeight: 20,
  },
  logoutSubtitle: {
    color: "rgba(248,250,252,0.66)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
});
