import { Share, ScrollView, Text, View } from "react-native";
import { useEffect } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { useResponsiveLayout } from "../../components/ui/useResponsiveLayout";
import { formatDayTime } from "../../lib/format";
import {
  hangoutIntentLabel,
  microCommitmentLabel,
  microResponseLabel,
} from "../../lib/labels";
import { api } from "../../lib/api";
import { useAppStore } from "../../store/useAppStore";
import { createSmartOpenUrl } from "../../lib/smart-links";

const responseActions = [
  {
    label: "Pull up",
    responseStatus: "ACCEPTED" as const,
    microResponse: "PULLING_UP" as const,
  },
  {
    label: "10 min only",
    responseStatus: "ACCEPTED" as const,
    microResponse: "TEN_MIN_ONLY" as const,
  },
  {
    label: "Maybe later",
    responseStatus: "SUGGESTED_CHANGE" as const,
    microResponse: "MAYBE_LATER" as const,
  },
  {
    label: "Pass",
    responseStatus: "DECLINED" as const,
    microResponse: "PASS" as const,
  },
];

export default function ProposalScreen() {
  const { hangoutId } = useLocalSearchParams<{ hangoutId: string }>();
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const hangouts = useAppStore((state) => state.hangouts);
  const recaps = useAppStore((state) => state.recaps);
  const updateHangoutResponse = useAppStore((state) => state.updateHangoutResponse);
  const layout = useResponsiveLayout();

  const hangout = hangouts.find((item) => item.id === hangoutId);
  const recap = recaps.find((item) => item.hangoutId === hangoutId);
  const isCompleted = hangout?.status === "COMPLETED";
  const confirmationHint =
    hangout && hangout.participants.length <= 2
      ? "This 1:1 locks once both of you are in."
      : "This group hang locks once at least 3 people are in.";

  useEffect(() => {
    if (hangout && isCompleted) {
      router.replace(`/recap/${hangout.id}`);
    }
  }, [hangout, isCompleted]);

  const handleRespond = async (action: (typeof responseActions)[number]) => {
    if (!hangout || !user || isCompleted) {
      return;
    }

    updateHangoutResponse(hangout.id, user.id, action.responseStatus, action.microResponse);
    await api.respondToHangout(token, hangout.id, {
      responseStatus: action.responseStatus,
      microResponse: action.microResponse,
    });
  };

  if (!hangout) {
    return (
      <GradientMesh>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="font-display text-3xl text-cloud">Proposal not found</Text>
        </View>
      </GradientMesh>
    );
  }

  if (isCompleted) {
    return (
      <GradientMesh>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="font-body text-base text-white/60">Opening recap...</Text>
        </View>
      </GradientMesh>
    );
  }

  return (
    <GradientMesh>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: layout.screenPadding,
          paddingTop: layout.topPadding + 20,
          paddingBottom: 40,
          gap: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard className="p-6">
          <View className="flex-row items-start justify-between gap-4">
            <View className="max-w-[76%]">
              <Text
                className="font-display text-cloud"
                style={{ fontSize: layout.pageTitleSize, lineHeight: layout.pageTitleLineHeight }}
              >
                {hangout.activity}
              </Text>
              <Text className="mt-3 font-body text-base leading-6 text-white/60">
                {hangout.locationName} - {formatDayTime(hangout.scheduledFor)}
              </Text>
            </View>
            <View className="rounded-full bg-white/10 px-3 py-2">
              <Text className="font-body text-xs uppercase tracking-[1px] text-aqua">
                {hangout.status}
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row flex-wrap gap-2">
            <View className="rounded-full bg-aqua/20 px-3 py-2">
              <Text className="font-body text-sm text-cloud">
                {hangout.microType ? hangoutIntentLabel(hangout.microType) : "quick link"}
              </Text>
            </View>
            <View className="rounded-full bg-white/10 px-3 py-2">
              <Text className="font-body text-sm text-cloud">
                {microCommitmentLabel(hangout.commitmentLevel)}
              </Text>
            </View>
          </View>

          <Text className="mt-4 font-body text-sm leading-6 text-aqua/80">
            Keep it light. This is meant to feel easy to join, easy to exit, and fast to turn
            into a real link. {confirmationHint}
          </Text>
        </GlassCard>

        <GlassCard className="p-5">
          <Text className="font-display text-xl text-cloud">React with low pressure</Text>
          <View className="mt-4 flex-row flex-wrap gap-3">
            {responseActions.map((action) => (
              <PillButton
                key={action.label}
                label={action.label}
                variant={action.label === "Pass" ? "ghost" : "secondary"}
                onPress={() => handleRespond(action)}
              />
            ))}
          </View>
        </GlassCard>

        <GlassCard className="p-5">
          <Text className="font-display text-xl text-cloud">Crew status</Text>
          <View className="mt-4 gap-3">
            {hangout.participantsInfo.map((participant) => (
              <View key={participant.userId} className="flex-row items-center justify-between gap-4">
                <View className="max-w-[60%]">
                  <Text className="font-display text-base text-cloud">{participant.name}</Text>
                  {participant.microResponse ? (
                    <Text className="mt-1 font-body text-sm text-aqua/80">
                      {microResponseLabel(participant.microResponse)}
                    </Text>
                  ) : null}
                </View>
                <View className="rounded-full bg-white/10 px-3 py-2">
                  <Text className="font-body text-xs uppercase tracking-[1px] text-aqua">
                    {participant.responseStatus}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </GlassCard>

        <GlassCard className="p-5">
          <Text className="font-display text-xl text-cloud">Send it into the thread</Text>
          <Text className="mt-2 font-body text-sm leading-6 text-white/60">
            Once people react, the thread becomes the lightweight room for quick updates, ETA,
            and last-minute pivots.
          </Text>
          <View className="mt-4 flex-row gap-3">
            <PillButton label="Open thread" onPress={() => router.push(`/thread/${hangout.threadId}`)} />
            <PillButton
              label="Share link"
              variant="secondary"
              onPress={() =>
                Share.share({
                  message: `Join our Nowly link-up -> ${createSmartOpenUrl(`/proposal/${hangout.id}`)}`,
                })
              }
            />
          </View>
        </GlassCard>
      </ScrollView>
    </GradientMesh>
  );
}
