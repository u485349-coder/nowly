import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Share } from "react-native";
import type { MicroResponse, ParticipantResponse } from "@nowly/shared";
import { formatDayTime } from "../../../lib/format";
import {
  hangoutIntentLabel,
  microCommitmentLabel,
  microResponseLabel,
} from "../../../lib/labels";
import { createSmartOpenUrl } from "../../../lib/smart-links";
import { useAppStore } from "../../../store/useAppStore";
import { proposalApi } from "../../lib/api/proposal";

const RESPONSE_ACTIONS: Array<{
  key: string;
  label: string;
  description: string;
  responseStatus: ParticipantResponse;
  microResponse: MicroResponse;
  destructive?: boolean;
}> = [
  {
    key: "PULLING_UP",
    label: "Pull up",
    description: "You're in and down to make it happen.",
    responseStatus: "ACCEPTED",
    microResponse: "PULLING_UP",
  },
  {
    key: "TEN_MIN_ONLY",
    label: "10 min only",
    description: "You're in, just keeping the window short.",
    responseStatus: "ACCEPTED",
    microResponse: "TEN_MIN_ONLY",
  },
  {
    key: "MAYBE_LATER",
    label: "Maybe later",
    description: "Keep the door open without forcing the timing.",
    responseStatus: "SUGGESTED_CHANGE",
    microResponse: "MAYBE_LATER",
  },
  {
    key: "PASS",
    label: "Pass",
    description: "A soft no, without making it weird.",
    responseStatus: "DECLINED",
    microResponse: "PASS",
    destructive: true,
  },
];

const participantStatusLabel = (status: ParticipantResponse) => {
  switch (status) {
    case "ACCEPTED":
      return "In";
    case "SUGGESTED_CHANGE":
      return "Shift";
    case "DECLINED":
      return "Pass";
    default:
      return "Waiting";
  }
};

type Props = {
  hangoutId: string;
};

export const useProposalScreen = ({ hangoutId }: Props) => {
  const router = useRouter();
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const hangouts = useAppStore((state) => state.hangouts);
  const friends = useAppStore((state) => state.friends);
  const updateHangoutResponse = useAppStore((state) => state.updateHangoutResponse);
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);

  const hangout = hangouts.find((item) => item.id === hangoutId) ?? null;
  const isCompleted = hangout?.status === "COMPLETED";

  useEffect(() => {
    if (hangout?.id && isCompleted) {
      router.replace(`/recap/${hangout.id}`);
    }
  }, [hangout?.id, isCompleted, router]);

  const respondMutation = useMutation({
    mutationFn: (payload: { responseStatus: ParticipantResponse; microResponse: MicroResponse }) =>
      proposalApi.respond(token, hangoutId, payload),
  });

  const currentParticipant = hangout?.participantsInfo.find((participant) => participant.userId === user?.id) ?? null;
  const selectedResponseKey = currentParticipant?.microResponse ?? null;

  const confirmationHint =
    hangout && hangout.participants.length <= 2
      ? "This 1:1 locks once both of you are in."
      : "This group hang locks once a few people are in.";

  const participants = useMemo(
    () =>
      (hangout?.participantsInfo ?? []).map((participant) => {
        const friend = friends.find((entry) => entry.id === participant.userId);
        const isCurrentUser = participant.userId === user?.id;

        return {
          id: participant.userId,
          name: participant.name,
          photoUrl: isCurrentUser ? user?.photoUrl : friend?.photoUrl,
          responseLabel: participant.microResponse
            ? microResponseLabel(participant.microResponse)
            : "Still deciding",
          statusLabel: participantStatusLabel(participant.responseStatus),
          isCurrentUser,
        };
      }),
    [friends, hangout?.participantsInfo, user?.id, user?.photoUrl],
  );

  const responseOptions = useMemo(
    () =>
      RESPONSE_ACTIONS.map((action) => ({
        key: action.key,
        label: action.label,
        description: action.description,
        destructive: action.destructive,
        selected: selectedResponseKey === action.microResponse,
        loading: pendingActionKey === action.key && respondMutation.isPending,
        onPress: async () => {
          if (!hangout || !user || isCompleted || respondMutation.isPending) {
            return;
          }

          setPendingActionKey(action.key);
          updateHangoutResponse(hangout.id, user.id, action.responseStatus, action.microResponse);

          try {
            await respondMutation.mutateAsync({
              responseStatus: action.responseStatus,
              microResponse: action.microResponse,
            });
          } catch (error) {
            Alert.alert(
              "Couldn't save response",
              error instanceof Error ? error.message : "Try again in a second.",
            );
          } finally {
            setPendingActionKey(null);
          }
        },
      })),
    [hangout, isCompleted, pendingActionKey, respondMutation, selectedResponseKey, updateHangoutResponse, user],
  );

  const planLabel = hangout?.activity ?? "Quick hang";
  const peopleSummary = participants.length
    ? participants.length === 1
      ? participants[0].name
      : `${participants[0].name}${participants.length > 1 ? ` +${participants.length - 1}` : ""}`
    : "Your crew";

  return {
    status: !hangoutId ? "missing" : isCompleted ? "redirecting" : hangout ? "ready" : "missing",
    title: planLabel,
    peopleSummary,
    whenLabel: hangout ? formatDayTime(hangout.scheduledFor) : "",
    locationLabel: hangout?.locationName ?? "Somewhere nearby",
    intentLabel: hangout?.microType ? hangoutIntentLabel(hangout.microType) : "quick link",
    commitmentLabel: hangout ? microCommitmentLabel(hangout.commitmentLevel) : "drop-in",
    statusLabel: hangout?.status ?? "PENDING",
    confirmationHint,
    participants,
    responseOptions,
    onBack: () => router.back(),
    onOpenThread: () => {
      if (hangout?.threadId) {
        router.push(`/thread/${hangout.threadId}`);
      }
    },
    onShare: async () => {
      if (!hangout) {
        return;
      }

      await Share.share({
        message: `Join our Nowly link-up -> ${createSmartOpenUrl(`/proposal/${hangout.id}`)}`,
      });
    },
  };
};
