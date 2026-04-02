import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert } from "react-native";
import type { NotificationIntensity } from "@nowly/shared";
import { pickAvatarImage } from "../../../lib/avatar";
import { weekdayOptionLabels } from "../../../lib/recurring-availability";
import { disconnectSocket } from "../../../lib/socket";
import { useAppStore } from "../../../store/useAppStore";
import { profileApi } from "../../lib/api/profile";

type EnergyKey = "quiet" | "balanced" | "live";

const energyOptions: Array<{
  key: EnergyKey;
  label: string;
  description: string;
}> = [
  {
    key: "quiet",
    label: "Quiet",
    description: "Keep the signal light. Close friends can still see an opening.",
  },
  {
    key: "balanced",
    label: "Balanced",
    description: "The easy middle. People can read your vibe without it feeling loud.",
  },
  {
    key: "live",
    label: "Live",
    description: "Turn the volume up and make it easy for the right people to pull you in.",
  },
];

const notificationIntensityOptions: Array<{
  key: NotificationIntensity;
  label: string;
}> = [
  { key: "QUIET", label: "Quiet" },
  { key: "BALANCED", label: "Balanced" },
  { key: "LIVE", label: "Live" },
];

const mapSignalEnergyToProfileEnergy = (value?: string | null): EnergyKey => {
  switch (value) {
    case "LOW":
      return "quiet";
    case "HIGH":
      return "live";
    default:
      return "balanced";
  }
};

const formatLiveState = (value?: string | null) => {
  switch (value) {
    case "FREE_NOW":
      return "Live now";
    case "FREE_LATER":
      return "Free later";
    case "DOWN_THIS_WEEKEND":
      return "Down this weekend";
    case "BUSY":
      return "Busy";
    default:
      return "Offline";
  }
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

type NotificationPreferencePayload = Parameters<
  typeof profileApi.updateNotificationPreference
>[1];

export const useProfileScreen = () => {
  const router = useRouter();
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const activeSignal = useAppStore((state) => state.activeSignal);
  const recurringWindows = useAppStore((state) => state.recurringWindows);
  const scheduledOverlaps = useAppStore((state) => state.scheduledOverlaps);
  const friends = useAppStore((state) => state.friends);
  const clearSession = useAppStore((state) => state.clearSession);
  const updateUser = useAppStore((state) => state.updateUser);

  const [energyKey, setEnergyKey] = useState<EnergyKey>(
    mapSignalEnergyToProfileEnergy(activeSignal?.energyLevel),
  );
  const [photoAction, setPhotoAction] = useState<"change" | "remove" | null>(null);
  const [savingPreferenceKey, setSavingPreferenceKey] = useState<string | null>(null);

  const photoMutation = useMutation({
    mutationFn: (photoUrl: string | null) => profileApi.updatePhoto(token, photoUrl),
  });

  const preferenceMutation = useMutation({
    mutationFn: (payload: NotificationPreferencePayload) =>
      profileApi.updateNotificationPreference(token, payload),
  });

  const rhythmSubtitle = useMemo(() => {
    if (!recurringWindows.length) {
      return "Save a few repeating windows so people know when you are easy to catch.";
    }

    const averageStart =
      recurringWindows.reduce((total, window) => total + window.startMinute, 0) /
      recurringWindows.length;

    return `Usually easiest in the ${rhythmPeriod(averageStart)}.`;
  }, [recurringWindows]);

  const rhythmDays = useMemo(
    () =>
      weekdayOptionLabels.map((label, index) => ({
        label,
        active: recurringWindows.some(
          (window) => window.recurrence === "WEEKLY" && window.dayOfWeek === index,
        ),
      })),
    [recurringWindows],
  );

  const momentumTitle = useMemo(() => {
    if ((user?.streakCount ?? 0) >= 3) {
      return "Warm momentum";
    }
    if (scheduledOverlaps.length > 0) {
      return "You have motion";
    }
    return "Quiet for now";
  }, [scheduledOverlaps.length, user?.streakCount]);

  const momentumCopy = useMemo(() => {
    if ((user?.streakCount ?? 0) >= 3) {
      return `${user?.streakCount ?? 0} hangs in your streak means people already know you are easy to rally.`;
    }
    if (scheduledOverlaps.length > 0) {
      return `${scheduledOverlaps.length} overlap window${scheduledOverlaps.length === 1 ? "" : "s"} already line up with your crew.`;
    }
    return "A saved rhythm plus a live signal makes follow-through feel much easier.";
  }, [scheduledOverlaps.length, user?.streakCount]);

  const notificationIntensity = user?.notificationIntensity ?? "BALANCED";
  const activeCrewReach = Math.max(
    1,
    Math.min(
      friends.length || 1,
      energyKey === "live" ? 6 : energyKey === "balanced" ? 4 : 2,
    ),
  );
  const liveStateLabel = formatLiveState(activeSignal?.state);
  const statusLine = activeSignal?.label?.trim()
    ? activeSignal.label
    : scheduledOverlaps.length
      ? `${scheduledOverlaps.length} overlap window${scheduledOverlaps.length === 1 ? "" : "s"} ahead`
      : "Shape your signal so people know when to pull you in.";

  const handleChangePhoto = async () => {
    try {
      const avatar = await pickAvatarImage();
      if (!avatar) {
        return;
      }

      setPhotoAction("change");
      const nextUser = await photoMutation.mutateAsync(avatar.dataUrl);
      updateUser({ photoUrl: nextUser.photoUrl });
    } catch (error) {
      Alert.alert(
        "Photo update failed",
        error instanceof Error ? error.message : "Try another image in a second.",
      );
    } finally {
      setPhotoAction(null);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      setPhotoAction("remove");
      const nextUser = await photoMutation.mutateAsync(null);
      updateUser({ photoUrl: nextUser.photoUrl });
    } catch (error) {
      Alert.alert(
        "Photo update failed",
        error instanceof Error ? error.message : "We could not remove that photo right now.",
      );
    } finally {
      setPhotoAction(null);
    }
  };

  const handlePreferenceUpdate = async (
    key: string,
    payload: NotificationPreferencePayload,
  ) => {
    try {
      setSavingPreferenceKey(key);
      const nextUser = await preferenceMutation.mutateAsync(payload);
      updateUser(nextUser);
    } catch (error) {
      Alert.alert(
        "Notification update failed",
        error instanceof Error ? error.message : "Try that toggle again in a second.",
      );
    } finally {
      setSavingPreferenceKey(null);
    }
  };

  return {
    name: user?.name ?? "You",
    photoUrl: user?.photoUrl,
    communityLabel: user?.communityTag || user?.city || null,
    discordLabel: user?.discordUsername ? `@${user.discordUsername}` : null,
    liveStateLabel,
    statusLine,
    canRemovePhoto: Boolean(user?.photoUrl),
    photoAction,
    onChangePhoto: () => void handleChangePhoto(),
    onRemovePhoto: () => void handleRemovePhoto(),
    onGoLive: () => router.push("/now-mode"),
    onStartHang: () => router.push("/availability-preferences"),
    energyOptions,
    energyKey,
    onChangeEnergy: setEnergyKey,
    overlapCount: scheduledOverlaps.length,
    crewReach: activeCrewReach,
    rhythmTitle: recurringWindows.length
      ? `${recurringWindows.length} saved hang window${recurringWindows.length === 1 ? "" : "s"}`
      : "Set your usual rhythm",
    rhythmSubtitle,
    rhythmDays,
    onOpenRhythm: () => router.push("/availability-preferences"),
    momentumTitle,
    momentumCopy,
    streakCount: user?.streakCount ?? 0,
    inviteCount: user?.invitesSent ?? 0,
    notificationIntensityOptions: notificationIntensityOptions.map((option) => ({
      ...option,
      selected: notificationIntensity === option.key,
      disabled: savingPreferenceKey === "notificationIntensity",
      onPress: () =>
        void handlePreferenceUpdate("notificationIntensity", {
          notificationIntensity: option.key,
        }),
    })),
    notificationToggles: [
      {
        key: "pushNotificationsEnabled",
        label: "Push notifications",
        description: "Keep pings coming even when you are out of the app.",
        value: user?.pushNotificationsEnabled ?? true,
      },
      {
        key: "inAppNotificationsEnabled",
        label: "In-app notifications",
        description: "Show live banners while you are already inside Nowly.",
        value: user?.inAppNotificationsEnabled ?? true,
      },
      {
        key: "notificationSoundEnabled",
        label: "Notification sound",
        description: "Keep the soft ping on for alerts and banners.",
        value: user?.notificationSoundEnabled ?? true,
      },
      {
        key: "messagePreviewEnabled",
        label: "Message previews",
        description: "Show sender and message preview in notifications.",
        value: user?.messagePreviewEnabled ?? true,
      },
      {
        key: "dmNotificationsEnabled",
        label: "DM notifications",
        description: "Let private and group chats keep your badge and alerts updated.",
        value: user?.dmNotificationsEnabled ?? true,
      },
      {
        key: "pingNotificationsEnabled",
        label: "Hang pings",
        description: "Get alerts for prompts, proposals, threads, and crew movement.",
        value: user?.pingNotificationsEnabled ?? true,
      },
    ].map((toggle) => ({
      ...toggle,
      loading: savingPreferenceKey === toggle.key,
      onPress: () =>
        void handlePreferenceUpdate(toggle.key, {
          [toggle.key]: !toggle.value,
        } as NotificationPreferencePayload),
    })),
    onLogout: () => {
      disconnectSocket();
      clearSession();
      router.replace("/onboarding");
    },
  };
};
