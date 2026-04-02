import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Alert, Platform, Share } from "react-native";
import { formatDayTime } from "../../../lib/format";
import { track } from "../../../lib/analytics";
import { useAppStore } from "../../../store/useAppStore";
import { recapApi } from "../../lib/api/recap";

const showMessage = (title: string, message: string) => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
};

type Props = {
  hangoutId: string;
};

export const useRecapScreen = ({ hangoutId }: Props) => {
  const router = useRouter();
  const token = useAppStore((state) => state.token);
  const hangouts = useAppStore((state) => state.hangouts);
  const recaps = useAppStore((state) => state.recaps);
  const addRecap = useAppStore((state) => state.addRecap);
  const setHangoutStatus = useAppStore((state) => state.setHangoutStatus);

  const hangout = hangouts.find((item) => item.id === hangoutId) ?? null;
  const recap = recaps.find((item) => item.hangoutId === hangoutId) ?? null;

  const createRecapMutation = useMutation({
    mutationFn: async () => {
      if (!hangoutId) {
        throw new Error("This recap link is missing a hangout id.");
      }

      return recapApi.createRecap(token, hangoutId);
    },
    onSuccess: (nextRecap) => {
      addRecap(nextRecap);
      setHangoutStatus(hangoutId, "COMPLETED");
    },
    onError: (error) => {
      showMessage(
        "Couldn't refresh recap",
        error instanceof Error ? error.message : "Try again in a second.",
      );
    },
  });

  const peopleLine = useMemo(() => {
    const names = (hangout?.participantsInfo ?? [])
      .map((participant) => participant.name.trim())
      .filter(Boolean);

    if (!names.length) {
      return "Your people made time for each other.";
    }

    if (names.length === 1) {
      return `With ${names[0]}.`;
    }

    if (names.length === 2) {
      return `With ${names[0]} and ${names[1]}.`;
    }

    return `With ${names[0]}, ${names[1]}, and ${names.length - 2} more.`;
  }, [hangout?.participantsInfo]);

  const scheduleLine = hangout?.scheduledFor ? formatDayTime(hangout.scheduledFor) : "Whenever you made it happen";
  const locationLine = hangout?.locationName ?? "Somewhere that felt easy to say yes to";
  const title = recap?.title ?? hangout?.activity ?? "Spontaneous win";
  const badge = recap?.badge ?? "Did you hang?";
  const summary =
    recap?.summary ??
    "Confirm the hang and turn it into a soft memory card that makes the next one easier.";
  const streakCount = recap?.streakCount ?? 1;
  const streakLabel =
    streakCount === 1 ? "First warm streak started" : `${streakCount} hangs in your streak`;
  const momentumCopy = recap
    ? "A recap keeps the energy from fading out. It turns a good link-up into a reason to do it again."
    : "Once you confirm the hang, this turns into a warm little proof point that your crew actually follows through.";
  const followUpTitle = recap ? "Keep the momentum warm" : "Wrap the moment while it still feels real";
  const followUpBody = recap
    ? "Share it, save the vibe, and let this stay a soft nudge instead of fading into the week."
    : "A quick recap makes the next invite feel easier because the last one already happened.";

  const refreshLabel = recap ? "Refresh recap" : "Yes, we hung";
  const shareLabel = recap?.shareLabel ?? "Share recap";
  const shareMessage = `We actually linked up on Nowly: ${title}`;

  return {
    status: hangoutId ? ("ready" as const) : ("missing" as const),
    title,
    badge,
    summary,
    peopleLine,
    scheduleLine,
    locationLine,
    streakCount,
    streakLabel,
    followUpTitle,
    followUpBody,
    momentumCopy,
    refreshLabel,
    shareLabel,
    isRefreshing: createRecapMutation.isPending,
    onBack: () => router.back(),
    onRefresh: () => {
      void createRecapMutation.mutateAsync();
    },
    onShare: async () => {
      try {
        await track(token, "recap_shared", { hangoutId });

        if (Platform.OS === "web" && typeof navigator !== "undefined") {
          if (navigator.share) {
            await navigator.share({ text: shareMessage });
            return;
          }

          if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(shareMessage);
            showMessage("Recap copied", "The recap text is in your clipboard.");
            return;
          }
        }

        await Share.share({ message: shareMessage });
      } catch (error) {
        showMessage(
          "Couldn't share recap",
          error instanceof Error ? error.message : "Try again in a second.",
        );
      }
    },
  };
};
