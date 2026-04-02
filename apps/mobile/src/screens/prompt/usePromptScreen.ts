import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { availabilityLabel } from "../../../lib/labels";
import { useAppStore } from "../../../store/useAppStore";
import { findPromptAction } from "../../../features/prompts/prompt-actions";
import { promptApi } from "../../lib/api/prompt";

type Props = {
  promptKey: string;
  recipientId?: string | null;
};

export const usePromptScreen = ({ promptKey, recipientId }: Props) => {
  const router = useRouter();
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const matches = useAppStore((state) => state.matches);
  const friends = useAppStore((state) => state.friends);
  const upsertHangout = useAppStore((state) => state.upsertHangout);
  const prompt = findPromptAction(promptKey);

  const [customLabel, setCustomLabel] = useState(prompt?.label ?? "");
  const [customDetail, setCustomDetail] = useState(prompt?.detail ?? "");
  const [customActivity, setCustomActivity] = useState(prompt?.activity ?? "");
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);

  useEffect(() => {
    setCustomLabel(prompt?.label ?? "");
    setCustomDetail(prompt?.detail ?? "");
    setCustomActivity(prompt?.activity ?? "");
  }, [prompt?.activity, prompt?.detail, prompt?.label]);

  const matchByRecipientId = useMemo(
    () => new Map(matches.map((match) => [match.matchedUser.id, match])),
    [matches],
  );

  const recipients = useMemo(() => {
    const seen = new Set<string>();
    const next: Array<{
      id: string;
      name: string;
      photoUrl?: string | null;
      eyebrow: string;
      detail: string;
    }> = [];

    matches.forEach((match) => {
      if (seen.has(match.matchedUser.id)) {
        return;
      }

      seen.add(match.matchedUser.id);
      next.push({
        id: match.matchedUser.id,
        name: match.matchedUser.name,
        photoUrl: match.matchedUser.photoUrl,
        eyebrow:
          match.reason.meetingStyle === "ONLINE"
            ? `${availabilityLabel(match.matchedSignal.state).toLowerCase()} - ${match.reason.onlineVenue ?? "online"}`
            : `${availabilityLabel(match.matchedSignal.state).toLowerCase()} - ${match.reason.travelMinutes ?? 15} min away`,
        detail: match.insightLabel ?? match.reason.momentumLabel ?? "Strong short-notice fit",
      });
    });

    friends.forEach((friend) => {
      if (seen.has(friend.id)) {
        return;
      }

      seen.add(friend.id);
      next.push({
        id: friend.id,
        name: friend.name,
        photoUrl: friend.photoUrl,
        eyebrow: friend.lastSignal ? `${availabilityLabel(friend.lastSignal).toLowerCase()} - crew friend` : "crew friend",
        detail:
          friend.insight?.cadenceNote ??
          friend.sharedLabel ??
          "Send the prompt now and let timing do the rest.",
      });
    });

    return next;
  }, [friends, matches]);

  useEffect(() => {
    if (!recipients.length) {
      setSelectedRecipientId(null);
      return;
    }

    if (recipientId && recipients.some((recipient) => recipient.id === recipientId)) {
      setSelectedRecipientId(recipientId);
      return;
    }

    setSelectedRecipientId((current) =>
      current && recipients.some((recipient) => recipient.id === current) ? current : recipients[0].id,
    );
  }, [recipientId, recipients]);

  const selectedRecipient = recipients.find((recipient) => recipient.id === selectedRecipientId) ?? null;
  const selectedMatch = selectedRecipientId ? matchByRecipientId.get(selectedRecipientId) ?? null : null;

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!prompt || !selectedRecipientId) {
        throw new Error("Pick someone before you send this prompt.");
      }

      const nextActivity = customActivity.trim() || prompt.activity;
      return promptApi.createHangout(token, {
        activity: nextActivity,
        microType: prompt.microType,
        commitmentLevel: prompt.commitmentLevel,
        locationName:
          selectedMatch?.reason.onlineVenue ||
          user?.communityTag ||
          user?.city ||
          "nearby",
        participantIds: [selectedRecipientId],
        scheduledFor: new Date(Date.now() + 35 * 60 * 1000).toISOString(),
      });
    },
    onSuccess: (hangout) => {
      upsertHangout(hangout);
      router.replace(`/proposal/${hangout.id}`);
    },
    onError: (error) => {
      Alert.alert(
        "Could not send that prompt",
        error instanceof Error ? error.message : "Try that again.",
      );
    },
  });

  const recipientItems = recipients.map((recipient) => ({
    ...recipient,
    selected: recipient.id === selectedRecipientId,
    onPress: () => setSelectedRecipientId(recipient.id),
  }));

  return {
    status: prompt ? "ready" : "missing",
    promptLabel: customLabel.trim() || prompt?.label || "Prompt",
    promptDetail: customDetail.trim() || prompt?.detail || "",
    promptActivity: customActivity.trim() || prompt?.activity || "hang out",
    customLabel,
    customDetail,
    customActivity,
    recipients: recipientItems,
    selectedRecipient,
    sendLabel: selectedRecipient ? `Send to ${selectedRecipient.name}` : "Pick someone first",
    sendDisabled: !selectedRecipient || sendMutation.isPending,
    isSending: sendMutation.isPending,
    onBack: () => router.back(),
    onChangeLabel: setCustomLabel,
    onChangeDetail: setCustomDetail,
    onChangeActivity: setCustomActivity,
    onSend: () => void sendMutation.mutateAsync(),
  };
};

