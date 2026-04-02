import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { hangoutIntentLabel, vibeLabel } from "../../../lib/labels";
import { useAppStore } from "../../../store/useAppStore";
import { matchApi } from "../../lib/api/match";

const FAST_PLANS = [
  {
    key: "pull-up",
    title: "Pull up for a bit",
    hint: "Lowest pressure. Great when you're already in motion.",
    activity: "pull up for a bit",
    microType: "PULL_UP" as const,
    commitmentLevel: "DROP_IN" as const,
  },
  {
    key: "quick-bite",
    title: "Quick bite",
    hint: "A clean yes with an obvious exit point.",
    activity: "grab a quick bite",
    microType: "QUICK_BITE" as const,
    commitmentLevel: "QUICK_WINDOW" as const,
  },
  {
    key: "coffee-run",
    title: "Coffee run",
    hint: "Fast, low-spend, easy to say yes to.",
    activity: "coffee run",
    microType: "COFFEE_RUN" as const,
    commitmentLevel: "QUICK_WINDOW" as const,
  },
  {
    key: "walk-nearby",
    title: "Walk nearby",
    hint: "No venue stress, no big commitment.",
    activity: "walk nearby",
    microType: "WALK_NEARBY" as const,
    commitmentLevel: "DROP_IN" as const,
  },
] as const;

type Props = {
  matchId: string;
};

export const useMatchScreen = ({ matchId }: Props) => {
  const router = useRouter();
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const matches = useAppStore((state) => state.matches);
  const upsertHangout = useAppStore((state) => state.upsertHangout);
  const upsertDirectChat = useAppStore((state) => state.upsertDirectChat);

  const match = matches.find((item) => item.id === matchId) ?? null;
  const isOnlineMatch = match?.reason.meetingStyle === "ONLINE";

  const openChatMutation = useMutation({
    mutationFn: async () => {
      if (!match) {
        throw new Error("This match is no longer available.");
      }
      return matchApi.openDirectChat(token, match.matchedUser.id);
    },
    onSuccess: (chat) => {
      upsertDirectChat(chat);
      router.push({ pathname: "/chat/[chatId]", params: { chatId: chat.id } });
    },
    onError: (error) => {
      Alert.alert("Could not open chat", error instanceof Error ? error.message : "Try again.");
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: async (plan: (typeof FAST_PLANS)[number]) => {
      if (!match) {
        throw new Error("This match is no longer available.");
      }

      return matchApi.createHangout(token, {
        activity: plan.activity,
        microType: plan.microType,
        commitmentLevel: plan.commitmentLevel,
        locationName:
          match.reason.onlineVenue ||
          match.matchedUser.communityTag ||
          match.matchedUser.city ||
          user?.city ||
          "nearby",
        participantIds: [match.matchedUser.id],
        scheduledFor: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });
    },
    onSuccess: (hangout) => {
      upsertHangout(hangout);
      router.push(`/proposal/${hangout.id}`);
    },
    onError: (error) => {
      Alert.alert("Could not start that plan", error instanceof Error ? error.message : "Try again.");
    },
  });

  if (!match) {
    return {
      status: "missing" as const,
      onBack: () => router.back(),
    };
  }

  const reasoningHeadline = isOnlineMatch
    ? `${match.reason.overlapMinutes} minutes line up right now${match.reason.onlineVenue ? ` on ${match.reason.onlineVenue}` : ""}.`
    : `${match.reason.overlapMinutes} minutes line up right now, and you're about ${match.reason.travelMinutes ?? 15} minutes apart.`;

  const reasoningDetail = `${Math.round(match.score * 100)}% chance this actually turns into a real link.`;
  const insight = match.insightLabel ?? match.reason.momentumLabel ?? "Strong short-notice fit";

  const chips = [
    match.reason.sharedIntent ? hangoutIntentLabel(match.reason.sharedIntent) : "quick link",
    match.reason.sharedVibe ? `shared vibe: ${vibeLabel(match.reason.sharedVibe)}` : null,
    match.reason.timingLabel ? `strongest ${match.reason.timingLabel}` : null,
    isOnlineMatch
      ? match.reason.onlineVenue
        ? `online via ${match.reason.onlineVenue}`
        : "online hang"
      : null,
    match.reason.crowdMode === "GROUP" ? "group friendly" : null,
  ].filter(Boolean) as string[];

  const fastPlans = FAST_PLANS.map((plan) => ({
    key: plan.key,
    title: plan.title,
    hint: plan.hint,
    loading: createPlanMutation.isPending && createPlanMutation.variables?.key === plan.key,
    onPress: () => {
      void createPlanMutation.mutateAsync(plan);
    },
  }));

  return {
    status: "ready" as const,
    title: `You and ${match.matchedUser.name} overlap right now`,
    matchedName: match.matchedUser.name,
    reasoningHeadline,
    reasoningDetail,
    insight,
    chips,
    onBack: () => router.back(),
    onStartSomething: () => {
      router.push({
        pathname: "/prompt/[promptKey]",
        params: {
          promptKey: "custom-prompt",
          recipientId: match.matchedUser.id,
        },
      });
    },
    onMessageFirst: () => {
      void openChatMutation.mutateAsync();
    },
    isOpeningChat: openChatMutation.isPending,
    fastPlans,
  };
};
