import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text as RNText, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { useResponsiveLayout } from "../../components/ui/useResponsiveLayout";
import { ProfileMobileScreen } from "../../features/mobile/screens/ProfileMobileScreen";
import { api } from "../../lib/api";
import { pickAvatarImage } from "../../lib/avatar";
import { disconnectSocket } from "../../lib/socket";
import { weekdayOptionLabels } from "../../lib/recurring-availability";
import { useAppStore } from "../../store/useAppStore";

const SLIDER_THUMB = 24;
const energyOptions = ["quiet", "balanced", "live"] as const;
type EnergyLevel = (typeof energyOptions)[number];

const energyFeedback: Record<EnergyLevel, string> = {
  quiet: "Low visibility. Only close friends see you.",
  balanced: "Casual availability. Friends can reach you.",
  live: "High visibility. You're discoverable now.",
};

const nearbyFriendsByEnergy: Record<EnergyLevel, number> = { quiet: 1, balanced: 2, live: 3 };
const mockFriendsLive = 3;
const mockUser = { name: "Zyon", energy: "balanced" as EnergyLevel, hangsLastWeek: 3, lastHangDaysAgo: 2 };
const mockFriendStack = [{ id: "todd", name: "Todd" }, { id: "maya", name: "Maya" }, { id: "kai", name: "Kai" }];

const progressForEnergy = (energy: EnergyLevel) => energyOptions.indexOf(energy) / (energyOptions.length - 1);
const energyLabel = (energy: EnergyLevel) => energy.charAt(0).toUpperCase() + energy.slice(1);
const momentumTier = (hangsLastWeek: number) => (hangsLastWeek <= 1 ? "Cold" : hangsLastWeek <= 3 ? "Warm" : hangsLastWeek <= 6 ? "Active" : "Hot");
const rhythmPeriod = (startMinute: number) => (startMinute < 12 * 60 ? "mornings" : startMinute < 17 * 60 ? "afternoons" : startMinute < 22 * 60 ? "evenings" : "late nights");

const Text = (props: ComponentProps<typeof RNText>) => (
  <RNText {...props} style={[styles.defaultText, props.style]} />
);

const notificationIntensityOptions = [
  { key: "QUIET", label: "Quiet" },
  { key: "BALANCED", label: "Balanced" },
  { key: "LIVE", label: "Live" },
] as const;

const ToggleRow = ({
  label,
  detail,
  value,
  onPress,
}: {
  label: string;
  detail: string;
  value: boolean;
  onPress: () => void;
}) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.toggleRow, pressed ? styles.toggleRowPressed : null]}>
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Text style={styles.toggleDetail}>{detail}</Text>
    </View>
    <View style={[styles.togglePill, value ? styles.togglePillActive : null]}>
      <View style={[styles.toggleKnob, value ? styles.toggleKnobActive : null]} />
    </View>
  </Pressable>
);

export default function ProfileScreen() {
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const recurringWindows = useAppStore((state) => state.recurringWindows);
  const scheduledOverlaps = useAppStore((state) => state.scheduledOverlaps);
  const clearSession = useAppStore((state) => state.clearSession);
  const updateUser = useAppStore((state) => state.updateUser);
  const layout = useResponsiveLayout();
  const useMobileFrontend = Platform.OS !== "web" && layout.isMobile;
  const shellWidth = Math.min(layout.shellWidth, layout.isDesktop ? 980 : layout.shellWidth);

  const [sliderWidth, setSliderWidth] = useState(0);
  const [previewEnergy, setPreviewEnergy] = useState<EnergyLevel | null>(null);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>(mockUser.energy);
  const [isLive, setIsLive] = useState(false);
  const [friendsLiveCount, setFriendsLiveCount] = useState(0);
  const [savingPreferenceKey, setSavingPreferenceKey] = useState<string | null>(null);

  const sliderProgress = useSharedValue(progressForEnergy(energyLevel));
  const rippleOpacity = useSharedValue(0);
  const rippleScale = useSharedValue(0.82);

  const activeEnergy = previewEnergy ?? energyLevel;
  const nearbyFriends = nearbyFriendsByEnergy[activeEnergy];
  const tier = momentumTier(mockUser.hangsLastWeek);

  useEffect(() => {
    sliderProgress.value = withTiming(progressForEnergy(energyLevel), { duration: 220 });
  }, [energyLevel, sliderProgress]);

  const rhythmSubtitle = useMemo(() => {
    if (!recurringWindows.length) return "Usually easy evenings";
    const avg = recurringWindows.reduce((t, w) => t + w.startMinute, 0) / recurringWindows.length;
    return `Usually easy ${rhythmPeriod(avg)}`;
  }, [recurringWindows]);

  const weeklyTracks = useMemo(
    () => weekdayOptionLabels.map((day, dayIndex) => ({ day, windows: recurringWindows.filter((w) => w.recurrence === "WEEKLY" && w.dayOfWeek === dayIndex) })),
    [recurringWindows],
  );

  const triggerRipple = () => {
    rippleOpacity.value = 0.36;
    rippleScale.value = 0.82;
    rippleOpacity.value = withTiming(0, { duration: 420 });
    rippleScale.value = withTiming(1.9, { duration: 420 });
  };

  const sliderTrackStyle = useAnimatedStyle(() => {
    const travel = Math.max(sliderWidth - SLIDER_THUMB, 0);
    return { width: SLIDER_THUMB + sliderProgress.value * travel };
  });

  const sliderThumbStyle = useAnimatedStyle(() => {
    const travel = Math.max(sliderWidth - SLIDER_THUMB, 0);
    return { transform: [{ translateX: sliderProgress.value * travel }] };
  });

  const sliderRippleStyle = useAnimatedStyle(() => {
    const travel = Math.max(sliderWidth - SLIDER_THUMB, 0);
    return { opacity: rippleOpacity.value, transform: [{ translateX: sliderProgress.value * travel }, { scale: rippleScale.value }] };
  });

  const moveSliderTo = (locationX: number) => {
    if (!sliderWidth) return;
    const clamped = Math.max(0, Math.min(locationX, sliderWidth));
    const progress = clamped / sliderWidth;
    const nextIndex = Math.round(progress * (energyOptions.length - 1));
    sliderProgress.value = progress;
    setPreviewEnergy(energyOptions[nextIndex]);
  };

  const commitSlider = () => {
    const nextEnergy = energyOptions[Math.round(sliderProgress.value * (energyOptions.length - 1))];
    sliderProgress.value = withTiming(progressForEnergy(nextEnergy), { duration: 160 });
    setPreviewEnergy(null);
    setEnergyLevel(nextEnergy);
    triggerRipple();
  };

  const handleToggleLive = () => {
    setIsLive(true);
    setFriendsLiveCount(mockFriendsLive);
    triggerRipple();
    router.push("/now-mode");
  };

  const handleStartHang = () => {
    router.push("/availability-preferences");
  };

  const handleChangePhoto = async () => {
    try {
      const avatar = await pickAvatarImage();
      if (!avatar) return;
      const nextUser = await api.updateProfile(token, { photoUrl: avatar.dataUrl });
      updateUser({ photoUrl: nextUser.photoUrl });
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "We couldn't update your photo right now.";
      Alert.alert("Photo update failed", message);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      const nextUser = await api.updateProfile(token, { photoUrl: null });
      updateUser({ photoUrl: nextUser.photoUrl });
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : "We couldn't remove your photo right now.";
      Alert.alert("Photo update failed", message);
    }
  };

  const handleLogout = () => {
    disconnectSocket();
    clearSession();
    router.replace("/onboarding");
  };

  const handlePreferenceUpdate = async (
    key: string,
    payload: Parameters<typeof api.updateNotificationPreference>[1],
  ) => {
    try {
      setSavingPreferenceKey(key);
      const nextUser = await api.updateNotificationPreference(token, payload);
      updateUser(nextUser);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "We couldn't update that notification setting right now.";
      Alert.alert("Notification update failed", message);
    } finally {
      setSavingPreferenceKey(null);
    }
  };

  const notificationSection = (
    <View style={{ gap: 12 }}>
      <View style={styles.intensityRow}>
        {notificationIntensityOptions.map((option) => {
          const active = (user?.notificationIntensity ?? "BALANCED") === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => void handlePreferenceUpdate("notificationIntensity", { notificationIntensity: option.key })}
              style={({ pressed }) => [
                styles.intensityChip,
                active ? styles.intensityChipActive : null,
                pressed ? styles.intensityChipPressed : null,
                savingPreferenceKey === "notificationIntensity" ? styles.preferenceDisabled : null,
              ]}
            >
              <Text style={[styles.intensityChipText, active ? styles.intensityChipTextActive : null]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: 10 }}>
        <ToggleRow
          label="Push notifications"
          detail="Allow outside-the-app notifications when messages and pings land."
          value={user?.pushNotificationsEnabled ?? true}
          onPress={() => void handlePreferenceUpdate("pushNotificationsEnabled", { pushNotificationsEnabled: !(user?.pushNotificationsEnabled ?? true) })}
        />
        <ToggleRow
          label="In-app notifications"
          detail="Show live banners and toasts while you are already inside Nowly."
          value={user?.inAppNotificationsEnabled ?? true}
          onPress={() => void handlePreferenceUpdate("inAppNotificationsEnabled", { inAppNotificationsEnabled: !(user?.inAppNotificationsEnabled ?? true) })}
        />
        <ToggleRow
          label="Notification sound"
          detail="Play the ping sound for banners and push notifications when allowed."
          value={user?.notificationSoundEnabled ?? true}
          onPress={() => void handlePreferenceUpdate("notificationSoundEnabled", { notificationSoundEnabled: !(user?.notificationSoundEnabled ?? true) })}
        />
        <ToggleRow
          label="Message previews"
          detail="Show the sender and message preview inside notifications."
          value={user?.messagePreviewEnabled ?? true}
          onPress={() => void handlePreferenceUpdate("messagePreviewEnabled", { messagePreviewEnabled: !(user?.messagePreviewEnabled ?? true) })}
        />
        <ToggleRow
          label="DM notifications"
          detail="Let private and group chat messages trigger alerts and badge activity."
          value={user?.dmNotificationsEnabled ?? true}
          onPress={() => void handlePreferenceUpdate("dmNotificationsEnabled", { dmNotificationsEnabled: !(user?.dmNotificationsEnabled ?? true) })}
        />
        <ToggleRow
          label="Ping notifications"
          detail="Let prompts, proposals, thread updates, and crew movement trigger alerts."
          value={user?.pingNotificationsEnabled ?? true}
          onPress={() => void handlePreferenceUpdate("pingNotificationsEnabled", { pingNotificationsEnabled: !(user?.pingNotificationsEnabled ?? true) })}
        />
      </View>
    </View>
  );

  if (useMobileFrontend) {
    return (
      <ProfileMobileScreen
        name={user?.name ?? mockUser.name}
        photoUrl={user?.photoUrl}
        subtitle={rhythmSubtitle}
        communityTag={user?.communityTag || user?.city}
        statusLine={`${isLive ? "Live now" : "Offline"} • ${scheduledOverlaps.length} overlaps ahead`}
        onChangePhoto={() => void handleChangePhoto()}
        onGoLive={handleToggleLive}
        onStartHang={handleStartHang}
        activeEnergyKey={activeEnergy}
        activeEnergyLabel={energyLabel(activeEnergy)}
        energyFeedback={energyFeedback[activeEnergy]}
        energyOptions={energyOptions.map((option) => ({ key: option, label: energyLabel(option) }))}
        onSelectEnergy={(key) => {
          const nextEnergy = key as EnergyLevel;
          sliderProgress.value = withTiming(progressForEnergy(nextEnergy), { duration: 180 });
          setPreviewEnergy(null);
          setEnergyLevel(nextEnergy);
          triggerRipple();
        }}
        friendsLiveCount={friendsLiveCount}
        overlapCount={scheduledOverlaps.length}
        momentumTitle={`${tier} momentum`}
        momentumDetail={`Last hang ${mockUser.lastHangDaysAgo} days ago. Keep the line moving and the next link gets easier.`}
        rhythmDays={weeklyTracks.map((track) => ({ label: track.day, active: track.windows.length > 0 }))}
        onOpenRhythm={handleStartHang}
        notificationSection={notificationSection}
        onLogout={handleLogout}
      />
    );
  }
  return (
    <GradientMesh>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ alignItems: "center", paddingHorizontal: layout.screenPadding, paddingTop: layout.topPadding + (layout.isDesktop ? 4 : 22), paddingBottom: 136 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: shellWidth, gap: layout.isCompactPhone ? 22 : 30 }}>
          <Animated.View entering={FadeInDown.delay(60).duration(420)}>
            <View style={[styles.heroGrid, layout.isDesktop ? styles.heroGridDesktop : null]}>
              <LinearGradient colors={["rgba(10,15,30,0.9)", "rgba(13,30,47,0.8)", "rgba(8,12,23,0.92)"]} start={{ x: 0.1, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.heroShell, styles.heroIdentityPanel]}>
                <View style={styles.heroGlowLarge} pointerEvents="none" />
                <Pressable onPress={() => void handleChangePhoto()} style={styles.avatarHalo}>
                  <View style={styles.avatarWrap}>
                    {user?.photoUrl ? (
                      <Image source={{ uri: user.photoUrl }} style={styles.avatarImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarFallbackText}>{(user?.name?.[0] ?? mockUser.name[0]).toUpperCase()}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.avatarEditBadge}>
                    <MaterialCommunityIcons name="camera-outline" size={14} color="#0F172A" />
                  </View>
                </Pressable>

                <Text
                  className="mt-5 font-display text-cloud"
                  style={{ fontSize: layout.isCompactPhone ? 28 : 32, lineHeight: layout.isCompactPhone ? 30 : 34 }}
                >
                  {user?.name ?? mockUser.name}
                </Text>
                <Text
                  className="mt-2 font-body text-white/68"
                  style={{ fontSize: layout.isCompactPhone ? 14 : 15 }}
                >
                  {rhythmSubtitle}
                </Text>
                <View className="mt-4 flex-row flex-wrap gap-2">
                  {user?.communityTag || user?.city ? <View style={styles.identityChip}><Text className="font-body text-[12px] text-cloud/88">{user?.communityTag || user?.city}</Text></View> : null}
                  {user?.discordUsername ? <View style={styles.identityChip}><Text className="font-body text-[12px] text-cloud/88">@{user.discordUsername}</Text></View> : null}
                  <View style={styles.identityChip}><Text className="font-body text-[12px] text-cloud/88">{isLive ? "Live now" : "Offline"}</Text></View>
                </View>

                <View style={styles.photoActionsRow}>
                  <Pressable onPress={() => void handleChangePhoto()}><Text className="font-body text-sm text-cloud/84">Change photo</Text></Pressable>
                  {user?.photoUrl ? <Pressable onPress={() => void handleRemovePhoto()}><Text className="font-body text-sm text-cloud/56">Remove</Text></Pressable> : null}
                </View>
              </LinearGradient>

              <LinearGradient colors={["rgba(9,16,34,0.84)", "rgba(13,28,50,0.74)", "rgba(8,12,24,0.88)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.heroShell, styles.profileSignalPanel]}>
                <View style={styles.profileSignalOrb} pointerEvents="none" />
                <Text className="font-body text-[12px] uppercase tracking-[2px] text-aqua/76">PROFILE SIGNAL</Text>
                <Text
                  className="mt-2 font-display text-cloud"
                  style={{ fontSize: layout.isCompactPhone ? 20 : 23, lineHeight: layout.isCompactPhone ? 24 : 28 }}
                >
                  {energyLabel(activeEnergy)} energy right now
                </Text>
                <Text className="mt-2 font-body text-sm leading-6 text-white/66">Your page is your social pulse. Keep this tuned and everything downstream feels cleaner.</Text>
                <View className="mt-6 gap-3">
                  <View style={styles.signalRow}><Text className="font-body text-[11px] uppercase tracking-[1.6px] text-cloud/52">NOW MODE</Text><Text className="font-body text-[13px] text-cloud/86">{isLive ? "LIVE" : "FREE_LATER"}</Text></View>
                  <View style={styles.signalRow}><Text className="font-body text-[11px] uppercase tracking-[1.6px] text-cloud/52">LIVE NOW</Text><Text className="font-body text-[13px] text-cloud/86">{friendsLiveCount} friends</Text></View>
                  <View style={styles.signalRow}><Text className="font-body text-[11px] uppercase tracking-[1.6px] text-cloud/52">OVERLAP</Text><Text className="font-body text-[13px] text-cloud/86">{scheduledOverlaps.length} windows ahead</Text></View>
                </View>
              </LinearGradient>
            </View>

            <View style={[styles.actionRow, layout.isDesktop ? styles.actionRowDesktop : null]}>
              <Pressable
                onPress={handleToggleLive}
                style={({ pressed }) => [
                  styles.actionButtonWrap,
                  pressed ? styles.actionButtonWrapPressed : null,
                ]}
              >
                <LinearGradient colors={["rgba(103,232,249,0.38)", "rgba(38,99,235,0.36)", "rgba(15,23,42,0.92)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionButtonPrimary}>
                  <MaterialCommunityIcons name={isLive ? "lightning-bolt" : "lightning-bolt-outline"} size={17} color="#E2E8F0" />
                  <Text style={styles.actionPrimaryText}>Go Live</Text>
                </LinearGradient>
              </Pressable>
              <Pressable
                onPress={handleStartHang}
                style={({ pressed }) => [
                  styles.actionButtonWrap,
                  pressed ? styles.actionButtonWrapPressed : null,
                ]}
              >
                <LinearGradient colors={["rgba(59,130,246,0.18)", "rgba(30,41,59,0.78)", "rgba(8,12,24,0.9)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionButtonSecondary}>
                  <MaterialCommunityIcons name="message-plus-outline" size={17} color="#E2E8F0" />
                  <Text style={styles.actionSecondaryText}>Start Hang</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(420)}>
            <LinearGradient colors={["rgba(10,14,28,0.92)", "rgba(14,30,50,0.86)", "rgba(8,12,24,0.94)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.energyShell}>
              <View style={styles.energyGlow} pointerEvents="none" />
              <Text className="font-body text-[12px] uppercase tracking-[2px] text-aqua/76">SOCIAL ENERGY</Text>
              <Text
                className="mt-2 font-display text-cloud"
                style={{ fontSize: layout.isCompactPhone ? 20 : 22, lineHeight: layout.isCompactPhone ? 24 : 26 }}
              >
                Tune how live Nowly feels around you
              </Text>
              <Text className="mt-2 font-body text-sm leading-6 text-white/66">{energyFeedback[activeEnergy]}</Text>

              <View
                className="mt-6"
                onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={(event) => moveSliderTo(event.nativeEvent.locationX)}
                onResponderMove={(event) => moveSliderTo(event.nativeEvent.locationX)}
                onResponderRelease={commitSlider}
                onResponderTerminate={commitSlider}
                onResponderTerminationRequest={() => false}
                style={styles.sliderShell}
              >
                <LinearGradient colors={["rgba(15,23,42,0.9)", "rgba(8,47,73,0.85)", "rgba(34,211,238,0.78)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.sliderTrack} />
                <Animated.View style={[styles.sliderTrackFill, sliderTrackStyle]} />
                <Animated.View pointerEvents="none" style={[styles.sliderRipple, sliderRippleStyle]} />
                <Animated.View style={[styles.sliderThumb, sliderThumbStyle]}><View style={styles.sliderThumbCore} /></Animated.View>
              </View>

              <View className="mt-4 self-start rounded-full bg-aqua/12 px-3 py-1.5"><Text className="font-body text-[11px] uppercase tracking-[1.5px] text-aqua/86">{nearbyFriends} friends nearby in {activeEnergy} mode</Text></View>
              <View className="mt-5 flex-row justify-between">
                {energyOptions.map((option) => (
                  <Pressable key={option} onPress={() => { sliderProgress.value = withTiming(progressForEnergy(option), { duration: 180 }); setPreviewEnergy(null); setEnergyLevel(option); triggerRipple(); }}>
                    <Text className={`font-body text-sm ${option === activeEnergy ? "text-cloud" : "text-white/42"}`}>{energyLabel(option)}</Text>
                  </Pressable>
                ))}
              </View>
            </LinearGradient>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(180).duration(420)} style={{ gap: 14 }}>
            <View style={{ gap: 4 }}>
              <Text className="font-body text-[12px] uppercase tracking-[2px] text-cloud/54">MOMENTUM</Text>
              <Text
                className="font-display text-cloud"
                style={{ fontSize: layout.isCompactPhone ? 21 : 24, lineHeight: layout.isCompactPhone ? 25 : 28 }}
              >
                The line feels best when it stays moving
              </Text>
            </View>

            <View style={[styles.momentumGrid, layout.isDesktop ? styles.momentumGridDesktop : null]}>
              <LinearGradient colors={["rgba(9,14,27,0.88)", "rgba(16,36,56,0.78)", "rgba(7,11,22,0.9)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.momentumLeadCard}>
                <View style={styles.momentumLeadGlow} pointerEvents="none" />
                <View className="flex-row items-start justify-between">
                  <View className="gap-1">
                    <Text className="font-body text-[11px] uppercase tracking-[1.8px] text-cloud/56">Momentum</Text>
                    <Text className="font-display text-[34px] leading-[38px] text-cloud">{tier}</Text>
                  </View>
                  <View style={styles.momentumIconBubble}><MaterialCommunityIcons name="fire-circle" size={18} color="#E0F2FE" /></View>
                </View>
                <View className="mt-6 gap-1.5">
                  <Text className="font-display text-[20px] leading-[24px] text-cloud">Momentum: {tier}</Text>
                  <Text className="font-body text-sm leading-6 text-white/68">Last hang: {mockUser.lastHangDaysAgo} days ago</Text>
                </View>
              </LinearGradient>

              <View style={[styles.momentumSecondaryStack, layout.isDesktop ? styles.momentumSecondaryStackDesktop : null]}>
                <LinearGradient colors={["rgba(9,14,26,0.84)", "rgba(15,32,51,0.72)", "rgba(7,11,22,0.88)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.momentumSecondaryCard}>
                  <View className="flex-row items-start justify-between">
                    <Text className="font-body text-[11px] uppercase tracking-[1.7px] text-cloud/52">Signals</Text>
                    <MaterialCommunityIcons name="lightning-bolt-circle" size={16} color="rgba(224,242,254,0.9)" />
                  </View>
                  <Text className="mt-2 font-display text-[28px] leading-[30px] text-cloud">{friendsLiveCount}</Text>
                  <Text className="mt-3 font-display text-[17px] leading-[21px] text-cloud">friends live now</Text>
                  {friendsLiveCount === 0 ? (
                    <View className="mt-2 gap-2">
                      <Text className="font-body text-sm leading-6 text-white/64">No one live yet — be the first</Text>
                      <Pressable onPress={handleToggleLive} style={styles.inlineLiveButton}><Text style={styles.inlineLiveButtonText}>Go Live</Text></Pressable>
                    </View>
                  ) : (
                    <View className="mt-3 flex-row items-center">
                      {mockFriendStack.slice(0, friendsLiveCount).map((friend, index) => (
                        <Pressable key={friend.id} onPress={() => console.log(`Open friend ${friend.name}`)} style={[styles.avatarStackItem, { marginLeft: index === 0 ? 0 : -10 }]}>
                          <Text style={styles.avatarStackText}>{friend.name[0]}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </LinearGradient>

                <LinearGradient colors={["rgba(9,14,26,0.82)", "rgba(14,30,48,0.7)", "rgba(7,11,22,0.86)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.momentumSecondaryCard}>
                  <View className="flex-row items-start justify-between"><Text className="font-body text-[11px] uppercase tracking-[1.7px] text-cloud/52">Overlap</Text><MaterialCommunityIcons name="orbit-variant" size={16} color="rgba(224,242,254,0.9)" /></View>
                  <Text className="mt-2 font-display text-[28px] leading-[30px] text-cloud">{scheduledOverlaps.length}</Text>
                  <Text className="mt-3 font-display text-[17px] leading-[21px] text-cloud">good reads ahead</Text>
                  <Text className="mt-1.5 font-body text-sm leading-6 text-white/64">One light signal is enough to wake the crew up.</Text>
                </LinearGradient>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(240).duration(420)}>
            <LinearGradient colors={["rgba(10,14,28,0.92)", "rgba(13,29,46,0.86)", "rgba(8,12,24,0.94)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.snapshotShell}>
              <View style={styles.snapshotGlow} pointerEvents="none" />
              <View className="flex-row items-start justify-between gap-4">
                <View className="max-w-[70%] gap-2">
                  <Text className="font-body text-[12px] uppercase tracking-[2px] text-aqua/74">RHYTHM SNAPSHOT</Text>
                  <Text
                    className="font-display text-cloud"
                    style={{ fontSize: layout.isCompactPhone ? 20 : 22, lineHeight: layout.isCompactPhone ? 24 : 26 }}
                  >
                    {recurringWindows.length ? `${recurringWindows.length} hang windows saved` : "Set your usual hang rhythm"}
                  </Text>
                  <Text className="font-body text-sm leading-6 text-white/64">You're most active on Tue evenings</Text>
                </View>
                <View style={styles.snapshotArrow}><MaterialCommunityIcons name="arrow-top-right" size={18} color="#E2E8F0" /></View>
              </View>

              <View style={styles.snapshotTimeline}>
                {weeklyTracks.map((track) => (
                  <View key={track.day} style={styles.snapshotDayColumn}>
                    <View style={styles.snapshotTrack}>
                      {track.windows.length
                        ? track.windows.slice(0, 2).map((window, index) => {
                            const top = Math.min(48, Math.max(0, (window.startMinute / 1440) * 58));
                            const height = Math.max(10, Math.min(58 - top, ((window.endMinute - window.startMinute) / 1440) * 58));
                            return <View key={`${window.id}-${index}`} style={[styles.snapshotPulse, { top, height, opacity: index === 0 ? 1 : 0.76 }]} />;
                          })
                        : <View style={styles.snapshotAmbient} />}
                    </View>
                    <Text style={styles.snapshotDayLabel}>{track.day}</Text>
                  </View>
                ))}
              </View>

              <Pressable onPress={() => { console.log("Optimize schedule"); router.push("/availability-preferences"); }} style={styles.optimizeCta}><Text style={styles.optimizeCtaText}>Optimize schedule</Text></Pressable>
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(270).duration(420)}>
            <LinearGradient colors={["rgba(10,14,28,0.94)", "rgba(11,24,40,0.88)", "rgba(8,12,24,0.96)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.preferencesShell}>
              <Text style={styles.preferencesEyebrow}>NOTIFICATIONS</Text>
              <Text style={styles.preferencesTitle}>Tune pings, DMs, sounds, and previews</Text>
              <Text style={styles.preferencesCopy}>Messages can ping with sender + preview, crew activity can stack on the badge, and sounds can stay on or off in and out of app.</Text>

              <View style={styles.intensityRow}>
                {notificationIntensityOptions.map((option) => {
                  const active = (user?.notificationIntensity ?? "BALANCED") === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      onPress={() => void handlePreferenceUpdate("notificationIntensity", { notificationIntensity: option.key })}
                      style={({ pressed }) => [styles.intensityChip, active ? styles.intensityChipActive : null, pressed ? styles.intensityChipPressed : null, savingPreferenceKey === "notificationIntensity" ? styles.preferenceDisabled : null]}
                    >
                      <Text style={[styles.intensityChipText, active ? styles.intensityChipTextActive : null]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ gap: 10 }}>
                <ToggleRow label="Push notifications" detail="Allow outside-the-app notifications when messages and pings land." value={user?.pushNotificationsEnabled ?? true} onPress={() => void handlePreferenceUpdate("pushNotificationsEnabled", { pushNotificationsEnabled: !(user?.pushNotificationsEnabled ?? true) })} />
                <ToggleRow label="In-app notifications" detail="Show live banners and toasts while you are already inside Nowly." value={user?.inAppNotificationsEnabled ?? true} onPress={() => void handlePreferenceUpdate("inAppNotificationsEnabled", { inAppNotificationsEnabled: !(user?.inAppNotificationsEnabled ?? true) })} />
                <ToggleRow label="Notification sound" detail="Play the ping sound for banners and push notifications when allowed." value={user?.notificationSoundEnabled ?? true} onPress={() => void handlePreferenceUpdate("notificationSoundEnabled", { notificationSoundEnabled: !(user?.notificationSoundEnabled ?? true) })} />
                <ToggleRow label="Message previews" detail="Show the sender and message preview inside notifications." value={user?.messagePreviewEnabled ?? true} onPress={() => void handlePreferenceUpdate("messagePreviewEnabled", { messagePreviewEnabled: !(user?.messagePreviewEnabled ?? true) })} />
                <ToggleRow label="DM notifications" detail="Let private and group chat messages trigger alerts and badge activity." value={user?.dmNotificationsEnabled ?? true} onPress={() => void handlePreferenceUpdate("dmNotificationsEnabled", { dmNotificationsEnabled: !(user?.dmNotificationsEnabled ?? true) })} />
                <ToggleRow label="Ping notifications" detail="Let prompts, proposals, thread updates, and crew movement trigger alerts." value={user?.pingNotificationsEnabled ?? true} onPress={() => void handlePreferenceUpdate("pingNotificationsEnabled", { pingNotificationsEnabled: !(user?.pingNotificationsEnabled ?? true) })} />
              </View>
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(420)} className="pt-2">
            <Pressable onPress={handleLogout} style={({ pressed }) => [styles.logoutAction, pressed ? styles.logoutActionPressed : null]}>
              <LinearGradient colors={["rgba(74,29,150,0.28)", "rgba(22,49,122,0.24)", "rgba(7,17,37,0.92)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoutGradient}>
                <View style={styles.logoutIconBubble}><MaterialCommunityIcons name="logout-variant" size={18} color="#F8FAFC" /></View>
                <View style={{ flex: 1, gap: 2 }}><Text style={styles.logoutTitle}>Log out</Text><Text style={styles.logoutSubtitle}>Sign out of this account</Text></View>
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
  defaultText: {
    color: "#F8FAFC",
  },
  eyebrowMobile: {
    color: "rgba(34,211,238,0.76)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
    letterSpacing: 2,
  },
  heroGrid: { gap: 14 },
  heroGridDesktop: { flexDirection: "row", alignItems: "stretch" },
  heroShell: { overflow: "hidden", borderRadius: 30, alignItems: "flex-start", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", paddingHorizontal: 20, paddingVertical: 22, shadowColor: "#020617", shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 7 },
  heroIdentityPanel: { flex: 1.1, minHeight: 288 },
  profileSignalPanel: { flex: 1, justifyContent: "space-between" },
  profileSignalOrb: { position: "absolute", top: -26, right: -18, height: 122, width: 122, borderRadius: 122, backgroundColor: "rgba(34,211,238,0.09)" },
  signalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 14, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: "rgba(255,255,255,0.035)" },
  heroGlowLarge: { position: "absolute", top: -38, right: -26, height: 160, width: 160, borderRadius: 160, backgroundColor: "rgba(34,211,238,0.08)" },
  mobileChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  mobileEnergyMeta: { alignSelf: "flex-start", borderRadius: 999, backgroundColor: "rgba(34,211,238,0.12)", paddingHorizontal: 12, paddingVertical: 6 },
  mobileIdentityRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  mobileMiniCard: { flex: 1, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.04)", paddingHorizontal: 14, paddingVertical: 14, gap: 4 },
  mobileMiniCopy: { color: "rgba(248,250,252,0.62)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 12, lineHeight: 18 },
  mobileMiniGrid: { flexDirection: "row", gap: 10 },
  mobileMiniLabel: { color: "rgba(248,250,252,0.54)", fontFamily: "SpaceGrotesk_500Medium", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  mobileMiniValue: { color: "#F8FAFC", fontFamily: "SpaceGrotesk_700Bold", fontSize: 24, lineHeight: 28 },
  mobileMomentumLead: { borderRadius: 20, backgroundColor: "rgba(255,255,255,0.04)", paddingHorizontal: 14, paddingVertical: 14, gap: 6 },
  mobileMomentumStack: { gap: 10 },
  mobilePrimaryActions: { gap: 10 },
  mobileProfileName: { color: "#F8FAFC", fontFamily: "SpaceGrotesk_700Bold", fontSize: 30, lineHeight: 34 },
  mobileProfileSubtitle: { color: "rgba(248,250,252,0.68)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 14, lineHeight: 20 },
  mobileSectionTitle: { color: "#F8FAFC", fontFamily: "SpaceGrotesk_700Bold", fontSize: 22, lineHeight: 27 },
  mobileSignalCell: { flex: 1, gap: 4, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.035)", paddingHorizontal: 12, paddingVertical: 12 },
  mobileSignalLabel: { color: "rgba(248,250,252,0.52)", fontFamily: "SpaceGrotesk_500Medium", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  mobileSignalStrip: { flexDirection: "row", gap: 10 },
  mobileSignalValue: { color: "#F8FAFC", fontFamily: "SpaceGrotesk_700Bold", fontSize: 13, lineHeight: 18 },
  mobileTextLinkRow: { flexDirection: "row", gap: 18 },
  mobileTimeline: { marginTop: 8, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 6 },
  avatarHalo: { position: "relative", marginTop: 4, shadowColor: "#67E8F9", shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  avatarWrap: { height: 88, width: 88, overflow: "hidden", borderRadius: 44, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "rgba(255,255,255,0.06)" },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  avatarFallbackText: {
    color: "rgba(248,250,252,0.9)",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 42,
    lineHeight: 48,
  },
  avatarEditBadge: { position: "absolute", right: -4, bottom: 0, height: 26, width: 26, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: "#BAE6FD" },
  photoActionsRow: { marginTop: 14, flexDirection: "row", justifyContent: "flex-start", gap: 20 },
  identityChip: { borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 12, paddingVertical: 6 },
  actionRow: { marginTop: 12, gap: 10 },
  actionRowDesktop: { flexDirection: "row" },
  actionButtonWrap: { flex: 1, borderRadius: 999, overflow: "hidden" },
  actionButtonWrapPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  actionButtonPrimary: { minHeight: 50, borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, shadowColor: "#67E8F9", shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  actionButtonSecondary: { minHeight: 50, borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  actionPrimaryText: { color: "#E2E8F0", fontFamily: "SpaceGrotesk_700Bold", fontSize: 15 },
  actionSecondaryText: { color: "#E2E8F0", fontFamily: "SpaceGrotesk_700Bold", fontSize: 15 },
  energyShell: { overflow: "hidden", borderRadius: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 18, shadowColor: "#67E8F9", shadowOpacity: 0.09, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  energyGlow: { position: "absolute", top: -32, right: -24, height: 138, width: 138, borderRadius: 138, backgroundColor: "rgba(34,211,238,0.07)" },
  sliderShell: { position: "relative", height: 28, justifyContent: "center" },
  sliderTrack: { height: 12, borderRadius: 999, opacity: 0.72 },
  sliderTrackFill: { position: "absolute", left: 0, height: 12, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.22)" },
  sliderRipple: { position: "absolute", left: -8, height: 40, width: 40, borderRadius: 20, backgroundColor: "rgba(186,230,253,0.26)" },
  sliderThumb: { position: "absolute", left: 0, height: SLIDER_THUMB, width: SLIDER_THUMB, alignItems: "center", justifyContent: "center", borderRadius: SLIDER_THUMB / 2, backgroundColor: "#F8FAFC", shadowColor: "#BAE6FD", shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  sliderThumbCore: { height: 10, width: 10, borderRadius: 5, backgroundColor: "#0F172A" },
  momentumGrid: { gap: 12 },
  momentumGridDesktop: { flexDirection: "row", alignItems: "stretch" },
  momentumLeadCard: { flex: 1, minHeight: 212, borderRadius: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", paddingHorizontal: 20, paddingVertical: 20, overflow: "hidden", shadowColor: "#020617", shadowOpacity: 0.09, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  momentumLeadGlow: { position: "absolute", right: -36, top: -28, height: 128, width: 128, borderRadius: 128, backgroundColor: "rgba(56,189,248,0.07)" },
  momentumSecondaryStack: { gap: 10, flex: 1 },
  momentumSecondaryStackDesktop: { flex: 0.9 },
  momentumSecondaryCard: { minHeight: 100, borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", paddingHorizontal: 16, paddingVertical: 14, shadowColor: "#020617", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  momentumIconBubble: { height: 36, width: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)" },
  inlineLiveButton: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "rgba(103,232,249,0.2)", borderWidth: 1, borderColor: "rgba(186,230,253,0.34)" },
  inlineLiveButtonText: { color: "#E2E8F0", fontFamily: "SpaceGrotesk_700Bold", fontSize: 12 },
  avatarStackItem: { height: 34, width: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(96,165,250,0.32)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" },
  avatarStackText: { color: "#E2E8F0", fontFamily: "SpaceGrotesk_700Bold", fontSize: 12 },
  snapshotShell: { overflow: "hidden", borderRadius: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16, shadowColor: "#67E8F9", shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  snapshotGlow: { position: "absolute", left: -34, bottom: -58, height: 148, width: 148, borderRadius: 148, backgroundColor: "rgba(34,211,238,0.07)" },
  snapshotArrow: { height: 34, width: 34, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: "rgba(255,255,255,0.06)" },
  snapshotTrack: { position: "relative", height: 60, width: 14, overflow: "hidden", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.05)" },
  snapshotTimeline: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  snapshotDayColumn: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  snapshotDayLabel: {
    color: "rgba(248,250,252,0.74)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 10,
  },
  snapshotPulse: { position: "absolute", left: 2, right: 2, borderRadius: 999, backgroundColor: "rgba(103,232,249,0.92)", shadowColor: "#67E8F9", shadowOpacity: 0.32, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  snapshotAmbient: { position: "absolute", bottom: 8, left: 3, right: 3, height: 10, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)" },
  optimizeCta: { marginTop: 14, alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "rgba(103,232,249,0.16)", borderWidth: 1, borderColor: "rgba(186,230,253,0.34)" },
  optimizeCtaText: { color: "#E2E8F0", fontFamily: "SpaceGrotesk_700Bold", fontSize: 13 },
  preferencesShell: { overflow: "hidden", borderRadius: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16, gap: 14, shadowColor: "#67E8F9", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  preferencesEyebrow: { color: "rgba(34,211,238,0.76)", fontFamily: "SpaceGrotesk_500Medium", fontSize: 12, letterSpacing: 2 },
  preferencesTitle: { color: "#F8FAFC", fontFamily: "SpaceGrotesk_700Bold", fontSize: 22, lineHeight: 28 },
  preferencesCopy: { color: "rgba(248,250,252,0.66)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 14, lineHeight: 22 },
  intensityRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  intensityChip: { borderRadius: 999, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", paddingHorizontal: 14, paddingVertical: 8 },
  intensityChipActive: { backgroundColor: "rgba(34,211,238,0.16)", borderColor: "rgba(103,232,249,0.34)" },
  intensityChipPressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  intensityChipText: { color: "rgba(248,250,252,0.76)", fontFamily: "SpaceGrotesk_700Bold", fontSize: 13 },
  intensityChipTextActive: { color: "#F8FAFC" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", paddingHorizontal: 14, paddingVertical: 13 },
  toggleRowPressed: { opacity: 0.94, transform: [{ scale: 0.99 }] },
  toggleLabel: { color: "#F8FAFC", fontFamily: "SpaceGrotesk_700Bold", fontSize: 15, lineHeight: 20 },
  toggleDetail: { color: "rgba(248,250,252,0.62)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 13, lineHeight: 20 },
  togglePill: { width: 52, height: 30, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)", padding: 3, justifyContent: "center" },
  togglePillActive: { backgroundColor: "rgba(34,211,238,0.32)" },
  toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(248,250,252,0.82)" },
  toggleKnobActive: { alignSelf: "flex-end", backgroundColor: "#BAE6FD" },
  preferenceDisabled: { opacity: 0.55 },
  logoutAction: { overflow: "hidden", borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", shadowColor: "#60A5FA", shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  logoutActionPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  logoutGradient: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  logoutIconBubble: { height: 34, width: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(239,68,68,0.42)" },
  logoutTitle: { color: "#F8FAFC", fontFamily: "SpaceGrotesk_700Bold", fontSize: 16, lineHeight: 20 },
  logoutSubtitle: { color: "rgba(248,250,252,0.66)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 12, lineHeight: 16 },
});






