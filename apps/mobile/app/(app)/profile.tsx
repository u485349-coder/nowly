import { Alert, Image, ScrollView, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { SignalChip } from "../../components/ui/SignalChip";
import { api } from "../../lib/api";
import { pickAvatarImage } from "../../lib/avatar";
import { notificationIntensityLabel } from "../../lib/labels";
import { disconnectSocket } from "../../lib/socket";
import { useAppStore } from "../../store/useAppStore";

const intensityOptions = ["QUIET", "BALANCED", "LIVE"] as const;

export default function ProfileScreen() {
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const radar = useAppStore((state) => state.radar);
  const recaps = useAppStore((state) => state.recaps);
  const notificationsEnabled = useAppStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useAppStore((state) => state.setNotificationsEnabled);
  const updateUser = useAppStore((state) => state.updateUser);
  const clearSession = useAppStore((state) => state.clearSession);

  const currentIntensity = user?.notificationIntensity ?? "BALANCED";

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

  const setIntensity = async (intensity: (typeof intensityOptions)[number]) => {
    setNotificationsEnabled(intensity !== "QUIET");
    const nextUser = await api.updateNotificationPreference(token, intensity);
    updateUser({
      notificationIntensity: nextUser.notificationIntensity,
    });
  };

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
          paddingHorizontal: 20,
          paddingTop: 62,
          paddingBottom: 120,
          gap: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard className="p-5">
          <View className="flex-row items-center gap-4">
            <View className="h-24 w-24 overflow-hidden rounded-full border border-white/12 bg-white/8">
              {user?.photoUrl ? (
                <Image source={{ uri: user.photoUrl }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <Text className="font-display text-4xl text-white/70">
                    {(user?.name?.[0] ?? "N").toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <View className="flex-1">
              <View className="self-start rounded-full border border-white/8 bg-white/[0.045] px-3 py-1.5">
                <Text className="font-body text-[11px] uppercase tracking-[1.5px] text-cloud/88">
                  Your identity layer
                </Text>
              </View>
              <Text className="mt-2 font-display text-3xl text-cloud">{user?.name ?? "Your profile"}</Text>
              <Text className="mt-2 font-body text-sm text-white/66">
                {user?.communityTag || user?.city} - {user?.phone ?? "Phone not set"}
              </Text>
              <Text className="mt-1 font-body text-sm text-aqua/80">
                {user?.discordUsername ? `@${user.discordUsername}` : "Discord optional"}
              </Text>
            </View>
          </View>

          <View className="mt-5 flex-row gap-3">
            <View className="flex-1 rounded-[22px] border border-white/6 bg-white/[0.045] p-4">
              <Text className="font-body text-xs uppercase tracking-[1px] text-white/45">
                Weekly streak
              </Text>
              <Text className="mt-2 font-display text-3xl text-cloud">{user?.streakCount ?? 0}</Text>
            </View>
            <View className="flex-1 rounded-[22px] border border-white/6 bg-white/[0.045] p-4">
              <Text className="font-body text-xs uppercase tracking-[1px] text-white/45">
                Invites sent
              </Text>
              <Text className="mt-2 font-display text-3xl text-cloud">{user?.invitesSent ?? 0}</Text>
            </View>
          </View>

          <View className="mt-4 gap-3 rounded-[24px] border border-white/6 bg-white/[0.03] p-4">
            <Text className="font-display text-lg text-cloud">Profile photo</Text>
            <Text className="font-body text-sm leading-6 text-white/60">
              Pick any image you want. Nowly square-crops and downsizes it automatically to fit.
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <PillButton
                  label={user?.photoUrl ? "Change photo" : "Upload photo"}
                  variant="secondary"
                  onPress={() => void handleChangePhoto()}
                />
              </View>
              {user?.photoUrl ? (
                <View className="flex-1">
                  <PillButton label="Remove" variant="ghost" onPress={() => void handleRemovePhoto()} />
                </View>
              ) : null}
            </View>
          </View>
        </GlassCard>

        <GlassCard className="p-5">
          <Text className="font-display text-xl text-cloud">Social rhythm</Text>
          <Text className="mt-2 font-body text-sm leading-6 text-white/60">
            {radar?.rhythm.detail ??
              "Nowly works best when your signals stay light and your real-world graph stays dense."}
          </Text>
          <Text className="mt-3 font-body text-sm text-aqua/80">
            {radar?.suggestionLine ?? "Keep showing up lightly instead of planning hard."}
          </Text>
        </GlassCard>

        <GlassCard className="p-5">
          <View className="flex-row items-center justify-between">
            <View className="max-w-[68%]">
              <Text className="font-display text-xl text-cloud">Notification energy</Text>
              <Text className="mt-1 font-body text-sm text-white/60">
                Tune the urgency so Nowly feels alive, not loud.
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={(enabled) => {
                if (!enabled) {
                  void setIntensity("QUIET");
                  return;
                }

                void setIntensity(currentIntensity === "QUIET" ? "BALANCED" : currentIntensity);
              }}
            />
          </View>

          <View className="mt-4 flex-row flex-wrap gap-2">
            {intensityOptions.map((option) => (
              <SignalChip
                key={option}
                label={notificationIntensityLabel(option)}
                active={currentIntensity === option}
                onPress={() => void setIntensity(option)}
              />
            ))}
          </View>
        </GlassCard>

        <View className="gap-3">
          <Text className="font-display text-2xl text-cloud">Recap cards</Text>
          {recaps.map((recap) => (
            <GlassCard key={recap.id} className="p-5">
              <Text className="font-display text-xl text-cloud">{recap.title}</Text>
              <Text className="mt-2 font-body text-sm leading-6 text-white/60">{recap.summary}</Text>
              <View className="mt-4">
                <PillButton
                  label="Open recap"
                  variant="secondary"
                  onPress={() => router.push(`/recap/${recap.hangoutId}`)}
                />
              </View>
            </GlassCard>
          ))}
        </View>

        <GlassCard className="p-5">
          <Text className="font-display text-xl text-cloud">Account</Text>
          <Text className="mt-2 font-body text-sm text-white/60">
            Sign out if you want to swap numbers or step out of this account cleanly.
          </Text>
          <View className="mt-4">
            <PillButton label="Log out" variant="secondary" onPress={handleLogout} />
          </View>
        </GlassCard>
      </ScrollView>
    </GradientMesh>
  );
}
