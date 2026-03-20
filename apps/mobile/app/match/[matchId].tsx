import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { api } from "../../lib/api";
import { hangoutIntentLabel, vibeLabel } from "../../lib/labels";
import { useAppStore } from "../../store/useAppStore";

const fastPlans = [
  {
    title: "Pull up for a bit",
    hint: "Lowest pressure. Great when you are already in motion.",
    activity: "pull up for a bit",
    microType: "PULL_UP" as const,
    commitmentLevel: "DROP_IN" as const,
  },
  {
    title: "Quick bite",
    hint: "A clean yes with an obvious exit point.",
    activity: "grab a quick bite",
    microType: "QUICK_BITE" as const,
    commitmentLevel: "QUICK_WINDOW" as const,
  },
  {
    title: "Coffee run",
    hint: "Fast, low-spend, easy to say yes to.",
    activity: "coffee run",
    microType: "COFFEE_RUN" as const,
    commitmentLevel: "QUICK_WINDOW" as const,
  },
  {
    title: "Walk nearby",
    hint: "No venue stress, no big commitment.",
    activity: "walk nearby",
    microType: "WALK_NEARBY" as const,
    commitmentLevel: "DROP_IN" as const,
  },
];

export default function MatchDetailScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const matches = useAppStore((state) => state.matches);
  const upsertHangout = useAppStore((state) => state.upsertHangout);

  const match = matches.find((item) => item.id === matchId);

  const handlePropose = async (plan: (typeof fastPlans)[number]) => {
    if (!match) {
      return;
    }

    const hangout = await api.createHangout(token, {
      activity: plan.activity,
      microType: plan.microType,
      commitmentLevel: plan.commitmentLevel,
      locationName:
        match.matchedUser.communityTag || match.matchedUser.city || user?.city || "nearby",
      participantIds: [match.matchedUser.id],
      scheduledFor: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    });

    upsertHangout(hangout);
    router.push(`/proposal/${hangout.id}`);
  };

  if (!match) {
    return (
      <GradientMesh>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="font-display text-3xl text-cloud">Match expired</Text>
          <Text className="mt-3 text-center font-body text-base text-white/60">
            The overlap probably timed out. Head back home and catch the next one.
          </Text>
        </View>
      </GradientMesh>
    );
  }

  return (
    <GradientMesh>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 62,
          paddingBottom: 40,
          gap: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard className="p-6">
          <Text className="font-display text-[34px] leading-[38px] text-cloud">
            You and {match.matchedUser.name} overlap right now
          </Text>
          <Text className="mt-3 font-body text-base leading-6 text-white/60">
            {match.reason.overlapMinutes} minutes live, about {match.reason.travelMinutes ?? 15} min apart, and a {Math.round(match.score * 100)}% likelihood this turns into a real link.
          </Text>

          <View className="mt-5 flex-row flex-wrap gap-2">
            <View className="rounded-full bg-aqua/20 px-3 py-2">
              <Text className="font-body text-sm text-cloud">
                {match.reason.sharedIntent
                  ? hangoutIntentLabel(match.reason.sharedIntent)
                  : "quick link"}
              </Text>
            </View>
            {match.reason.sharedVibe ? (
              <View className="rounded-full bg-white/10 px-3 py-2">
                <Text className="font-body text-sm text-cloud">
                  shared vibe: {vibeLabel(match.reason.sharedVibe)}
                </Text>
              </View>
            ) : null}
            {match.reason.timingLabel ? (
              <View className="rounded-full bg-white/10 px-3 py-2">
                <Text className="font-body text-sm text-cloud">
                  strongest {match.reason.timingLabel}
                </Text>
              </View>
            ) : null}
          </View>

          <Text className="mt-4 font-body text-sm text-aqua/80">
            {match.insightLabel ?? match.reason.momentumLabel ?? "Strong short-notice fit"}
          </Text>
        </GlassCard>

        <View className="gap-3">
          <Text className="font-display text-2xl text-cloud">Pitch a low-stakes move</Text>
          {fastPlans.map((plan) => (
            <GlassCard key={plan.title} className="p-4">
              <View className="gap-3">
                <View className="flex-row items-center justify-between gap-3">
                  <Text className="font-display text-lg text-cloud">{plan.title}</Text>
                  <PillButton
                    label="Send"
                    variant="secondary"
                    onPress={() => handlePropose(plan)}
                  />
                </View>
                <Text className="font-body text-sm leading-6 text-white/60">{plan.hint}</Text>
              </View>
            </GlassCard>
          ))}
        </View>
      </ScrollView>
    </GradientMesh>
  );
}
