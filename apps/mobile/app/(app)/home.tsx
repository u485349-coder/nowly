import { startTransition, useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { AvailabilityComposer } from "../../features/availability/AvailabilityComposer";
import { api } from "../../lib/api";
import { track } from "../../lib/analytics";
import { formatDayTime } from "../../lib/format";
import {
  availabilityLabel,
  budgetLabel,
  hangoutIntentLabel,
  microCommitmentLabel,
  vibeLabel,
} from "../../lib/labels";
import { useAppStore } from "../../store/useAppStore";

const promptActions = [
  {
    label: "Pull up",
    activity: "pull up for a bit",
    microType: "PULL_UP" as const,
    commitmentLevel: "DROP_IN" as const,
  },
  {
    label: "Quick bite",
    activity: "grab a quick bite",
    microType: "QUICK_BITE" as const,
    commitmentLevel: "QUICK_WINDOW" as const,
  },
  {
    label: "Walk nearby",
    activity: "walk nearby",
    microType: "WALK_NEARBY" as const,
    commitmentLevel: "DROP_IN" as const,
  },
];

export default function HomeScreen() {
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const matches = useAppStore((state) => state.matches);
  const hangouts = useAppStore((state) => state.hangouts);
  const activeSignal = useAppStore((state) => state.activeSignal);
  const radar = useAppStore((state) => state.radar);
  const setDashboard = useAppStore((state) => state.setDashboard);
  const setActiveSignal = useAppStore((state) => state.setActiveSignal);
  const upsertHangout = useAppStore((state) => state.upsertHangout);
  const bootstrapDemo = useAppStore((state) => state.bootstrapDemo);

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

  const handleSaveSignal = async (payload: {
    state: "FREE_NOW" | "FREE_LATER" | "BUSY" | "DOWN_THIS_WEEKEND";
    radiusKm: number;
    vibe?: "FOOD" | "GYM" | "CHILL" | "PARTY" | "COFFEE" | "OUTDOORS" | null;
    energyLevel?: "LOW" | "MEDIUM" | "HIGH" | null;
    budgetMood?: "LOW_SPEND" | "FLEXIBLE" | "TREAT_MYSELF" | null;
    socialBattery?: "LOW_KEY" | "OPEN" | "SOCIAL" | null;
    hangoutIntent?:
      | "QUICK_BITE"
      | "COFFEE_RUN"
      | "WALK_NEARBY"
      | "STUDY_SPRINT"
      | "PULL_UP"
      | "WORKOUT"
      | "QUICK_CHILL"
      | null;
    durationHours?: number;
  }) => {
    const signal = await api.setAvailability(token, payload);
    setActiveSignal(signal);
    await track(token, "availability_set", payload);
  };

  const launchPrompt = async (prompt: (typeof promptActions)[number], group = false) => {
    const participantIds = group
      ? matches.slice(0, 3).map((match) => match.matchedUser.id)
      : matches[0]
        ? [matches[0].matchedUser.id]
        : [];

    if (!participantIds.length) {
      return;
    }

    const hangout = await api.createHangout(token, {
      activity: prompt.activity,
      microType: prompt.microType,
      commitmentLevel: prompt.commitmentLevel,
      locationName: user?.communityTag || user?.city || "nearby",
      participantIds,
      scheduledFor: new Date(Date.now() + 35 * 60 * 1000).toISOString(),
    });

    upsertHangout(hangout);
    router.push(`/proposal/${hangout.id}`);
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
        <View className="gap-2">
          <Text className="font-body text-sm uppercase tracking-[2px] text-aqua/80">Live radar</Text>
          <Text className="font-display text-[34px] leading-[38px] text-cloud">
            {user?.name ? `${user.name}, who can you catch without overthinking it?` : "Who can you catch right now?"}
          </Text>
        </View>

        <GlassCard className="p-5">
          <View className="gap-3">
            <Text className="font-display text-[28px] leading-[32px] text-cloud">
              {radar?.rhythm.headline ?? "Your social radar is warming up"}
            </Text>
            <Text className="font-body text-sm leading-6 text-white/68">
              {radar?.rhythm.detail ?? "Set one live signal and Nowly will look for overlap."}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <View className="rounded-full bg-aqua/20 px-3 py-2">
                <Text className="font-body text-xs text-cloud">
                  best window: {radar?.rhythm.bestWindow ?? "tonight"}
                </Text>
              </View>
              <View className="rounded-full bg-white/10 px-3 py-2">
                <Text className="font-body text-xs text-cloud">
                  {radar?.localDensity.densityLabel ?? "local crew building"}
                </Text>
              </View>
            </View>
            <Text className="font-body text-sm text-aqua/80">
              {radar?.rhythm.livePrompt ?? "Use a low-pressure prompt when the window opens."}
            </Text>
          </View>
        </GlassCard>

        <GlassCard className="p-5">
          <View className="gap-3">
            <Text className="font-display text-xl text-cloud">Your live signal</Text>
            <Text className="font-body text-sm text-white/60">
              {activeSignal
                ? `${availabilityLabel(activeSignal.state)} until ${formatDayTime(activeSignal.expiresAt)}`
                : "No live signal yet. Set one and let Nowly do the overlap work."}
            </Text>
            {activeSignal ? (
              <View className="flex-row flex-wrap gap-2">
                <View className="rounded-full bg-white/10 px-3 py-2">
                  <Text className="font-body text-xs text-cloud">
                    {hangoutIntentLabel(activeSignal.hangoutIntent)}
                  </Text>
                </View>
                <View className="rounded-full bg-white/10 px-3 py-2">
                  <Text className="font-body text-xs text-cloud">{vibeLabel(activeSignal.vibe)}</Text>
                </View>
                <View className="rounded-full bg-white/10 px-3 py-2">
                  <Text className="font-body text-xs text-cloud">
                    {budgetLabel(activeSignal.budgetMood)}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </GlassCard>

        <AvailabilityComposer activeSignal={activeSignal} onSave={handleSaveSignal} />

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-display text-2xl text-cloud">Low-pressure prompts</Text>
            <PillButton
              label="Who's free tonight?"
              variant="secondary"
              onPress={() => launchPrompt(promptActions[0], true)}
            />
          </View>
          <Text className="font-body text-sm text-aqua/80">
            {radar?.suggestionLine ?? "Keep it casual"}
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {promptActions.map((prompt, index) => (
              <View key={prompt.label} className="w-[48%]">
                <GlassCard className="p-4">
                  <Text className="font-display text-lg text-cloud">{prompt.label}</Text>
                  <Text className="mt-2 font-body text-sm text-white/60">
                    {index === 0
                      ? "Lowest pressure. Best when someone is already nearby."
                      : index === 1
                        ? "A tighter time window that still feels casual."
                        : "Easy yes, low cost, minimal commitment."}
                  </Text>
                  <View className="mt-4">
                    <PillButton label="Launch" variant="secondary" onPress={() => launchPrompt(prompt)} />
                  </View>
                </GlassCard>
              </View>
            ))}
          </View>
        </View>

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-display text-2xl text-cloud">Live overlaps</Text>
            <Text className="font-body text-sm text-aqua/80">ranked by real likelihood</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-3">
              {matches.map((match) => (
                <Pressable
                  key={match.id}
                  onPress={() => router.push(`/match/${match.id}`)}
                  className="w-72"
                >
                  <GlassCard className="p-5">
                    <Text className="font-display text-2xl text-cloud">{match.matchedUser.name}</Text>
                    <Text className="mt-1 font-body text-sm text-white/60">
                      {match.reason.overlapMinutes} minutes live, {match.reason.travelMinutes ?? 15} min away
                    </Text>
                    <Text className="mt-2 font-body text-sm text-aqua/80">
                      {match.insightLabel ?? match.reason.momentumLabel ?? "strong short-notice fit"}
                    </Text>
                    <View className="mt-4 flex-row flex-wrap gap-2">
                      <View className="rounded-full bg-aqua/20 px-3 py-2">
                        <Text className="font-body text-xs text-cloud">
                          {availabilityLabel(match.matchedSignal.state)}
                        </Text>
                      </View>
                      {match.reason.sharedIntent ? (
                        <View className="rounded-full bg-white/10 px-3 py-2">
                          <Text className="font-body text-xs text-cloud">
                            {hangoutIntentLabel(match.reason.sharedIntent)}
                          </Text>
                        </View>
                      ) : null}
                      {match.reason.sharedVibe ? (
                        <View className="rounded-full bg-white/10 px-3 py-2">
                          <Text className="font-body text-xs text-cloud">
                            vibe: {vibeLabel(match.reason.sharedVibe)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <View className="mt-5">
                      <PillButton
                        label="Start quick link"
                        variant="secondary"
                        onPress={() => router.push(`/match/${match.id}`)}
                      />
                    </View>
                  </GlassCard>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <View className="gap-3">
          <Text className="font-display text-2xl text-cloud">Already moving</Text>
          {hangouts.map((hangout) => (
            <Pressable key={hangout.id} onPress={() => router.push(`/proposal/${hangout.id}`)}>
              <GlassCard className="p-5">
                <View className="flex-row items-start justify-between">
                  <View className="max-w-[72%]">
                    <Text className="font-display text-xl text-cloud">{hangout.activity}</Text>
                    <Text className="mt-1 font-body text-sm text-white/60">
                      {hangout.locationName} - {formatDayTime(hangout.scheduledFor)}
                    </Text>
                    <Text className="mt-2 font-body text-sm text-aqua/80">
                      {hangout.microType ? hangoutIntentLabel(hangout.microType) : "quick link"} ·{" "}
                      {microCommitmentLabel(hangout.commitmentLevel)}
                    </Text>
                  </View>
                  <View className="rounded-full bg-white/10 px-3 py-2">
                    <Text className="font-body text-xs uppercase tracking-[1px] text-aqua">
                      {hangout.status}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </GradientMesh>
  );
}
