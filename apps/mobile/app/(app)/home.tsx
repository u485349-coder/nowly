import { startTransition, useEffect } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { promptActions } from "../../features/prompts/prompt-actions";
import { api } from "../../lib/api";
import { formatDayTime } from "../../lib/format";
import {
  availabilityLabel,
  budgetLabel,
  hangoutIntentLabel,
  microCommitmentLabel,
  vibeLabel,
} from "../../lib/labels";
import { useAppStore } from "../../store/useAppStore";

export default function HomeScreen() {
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const matches = useAppStore((state) => state.matches);
  const hangouts = useAppStore((state) => state.hangouts);
  const recaps = useAppStore((state) => state.recaps);
  const activeSignal = useAppStore((state) => state.activeSignal);
  const scheduledOverlaps = useAppStore((state) => state.scheduledOverlaps);
  const radar = useAppStore((state) => state.radar);
  const setDashboard = useAppStore((state) => state.setDashboard);
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

  const topMatches = matches.slice(0, 3);
  const activeHangouts = hangouts.filter((hangout) => hangout.status !== "COMPLETED");
  const completedHangouts = hangouts.filter((hangout) => hangout.status === "COMPLETED");
  const nearbyLabel = user?.communityTag || user?.city || "your area";
  const availabilityHeadline = topMatches.length
    ? `${topMatches.length} ${topMatches.length === 1 ? "friend is" : "friends are"} free near ${nearbyLabel}.`
    : `No one is fully lined up near ${nearbyLabel} yet.`;

  const openPromptPicker = (promptKey: string) => {
    router.push({
      pathname: "/prompt/[promptKey]",
      params: { promptKey },
    });
  };

  const launchScheduledSuggestion = async (
    suggestion: (typeof scheduledOverlaps)[number],
  ) => {
    const hangout = await api.createHangout(token, {
      activity:
        suggestion.sharedIntent
          ? suggestion.sharedIntent.replaceAll("_", " ").toLowerCase()
          : "hang out",
      microType:
        suggestion.sharedIntent ??
        suggestion.sourceWindow.hangoutIntent ??
        suggestion.matchedWindow.hangoutIntent ??
        "QUICK_CHILL",
      commitmentLevel: "QUICK_WINDOW",
      locationName: user?.communityTag || user?.city || "nearby",
      participantIds: [suggestion.matchedUser.id],
      scheduledFor: suggestion.startsAt,
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
          paddingBottom: 148,
          gap: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-3">
          <View className="flex-row items-center justify-between gap-4">
            <Text className="font-body text-sm uppercase tracking-[2px] text-aqua/80">
              Live radar
            </Text>

            <Pressable
              onPress={() => router.push("/now-mode")}
              className="h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/6"
            >
              <MaterialCommunityIcons name="cog-outline" size={20} color="#F8FAFC" />
            </Pressable>
          </View>
          <View className="max-w-[92%]">
            <Text className="font-display text-[34px] leading-[38px] text-cloud">
              {user?.name
                ? `${user.name}, who can you catch without overthinking it?`
                : "Who can you catch right now?"}
            </Text>
          </View>
        </View>

        <GlassCard className="p-5">
          <View className="gap-4">
            <Text className="font-display text-xl text-cloud">Your live signal</Text>
            <Text className="font-body text-sm leading-6 text-white/60">
              {activeSignal
                ? `${activeSignal.label || availabilityLabel(activeSignal.state)} until ${formatDayTime(activeSignal.expiresAt)}`
                : "No live signal yet. Set one and let Nowly do the overlap work."}
            </Text>
            {activeSignal ? (
              <View className="flex-row flex-wrap gap-2">
                {activeSignal.label ? (
                  <View className="rounded-full bg-aqua/20 px-3 py-2">
                    <Text className="font-body text-xs text-cloud">{activeSignal.label}</Text>
                  </View>
                ) : null}
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

        <GlassCard className="p-5">
          <View className="gap-4">
            <View className="self-start rounded-full border border-white/10 bg-white/6 px-4 py-2.5">
              <Text className="font-body text-xs text-cloud">
                Best hangout window: {radar?.rhythm.bestWindow ?? "happening now"}
              </Text>
            </View>

            <View className="gap-2">
              <Text className="font-display text-[30px] leading-[34px] text-cloud">
                {availabilityHeadline}
              </Text>
              <Text className="max-w-[92%] font-body text-sm leading-6 text-white/68">
                {topMatches.length
                  ? radar?.suggestionLine ??
                    "Send one low-pressure prompt and turn overlap into an actual hangout."
                  : radar?.rhythm.detail ??
                    "Set one live signal or use a prompt to wake the line up."}
              </Text>
            </View>

            {topMatches.length ? (
              <View className="flex-row flex-wrap justify-between gap-y-3">
                {topMatches.map((match) => (
                  <Pressable
                    key={match.id}
                    onPress={() => router.push(`/match/${match.id}`)}
                    className={`${topMatches.length === 1 ? "w-full" : "w-[48%]"} rounded-[24px] border border-white/8 bg-white/[0.03] p-4`}
                  >
                    <Text className="font-display text-lg text-cloud">{match.matchedUser.name}</Text>
                    <Text className="mt-2 font-body text-sm leading-6 text-white/60">
                      {availabilityLabel(match.matchedSignal.state).toLowerCase()} -{" "}
                      {match.reason.travelMinutes ?? 15} min away
                    </Text>
                    <Text className="mt-1 font-body text-sm leading-6 text-aqua/82">
                      {match.insightLabel ?? match.reason.momentumLabel ?? "strong short-notice fit"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <View className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <Text className="font-display text-lg text-cloud">Keep the line warm</Text>
                <Text className="mt-2 font-body text-sm leading-6 text-white/60">
                  Nobody is live yet, but you can still send a low-pressure prompt to a friend and
                  let the timing catch up.
                </Text>
              </View>
            )}

            <View className="gap-3">
              <Text className="font-display text-lg text-cloud">Low-pressure prompts</Text>
              <View className="gap-2.5">
                {promptActions.map((prompt) => (
                  <Pressable
                    key={prompt.key}
                    onPress={() => openPromptPicker(prompt.key)}
                    className="rounded-full border border-white/10 bg-white/6 px-4 py-3.5"
                  >
                    <Text className="font-body text-sm text-cloud">
                      {prompt.label} - {prompt.detail}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </GlassCard>

        <View className="gap-3">
          <View className="gap-1">
            <Text className="font-display text-2xl text-cloud">Planned windows</Text>
            <Text className="font-body text-sm text-aqua/80">
              recurring overlap slots your crew could actually lock in
            </Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-3">
              {scheduledOverlaps.slice(0, 4).map((suggestion) => (
                <View key={suggestion.id} className="w-72">
                  <GlassCard className="p-5">
                    <Text className="font-display text-2xl text-cloud">
                      {suggestion.matchedUser.name}
                    </Text>
                    <Text className="mt-1 font-body text-sm text-aqua/80">
                      {suggestion.label}
                    </Text>
                    <Text className="mt-2 font-body text-sm leading-6 text-white/60">
                      {suggestion.summary}
                    </Text>
                    <View className="mt-4">
                      <PillButton
                        label="Propose this time"
                        variant="secondary"
                        onPress={() => launchScheduledSuggestion(suggestion)}
                      />
                    </View>
                  </GlassCard>
                </View>
              ))}

              {!scheduledOverlaps.length ? (
                <View className="w-72">
                  <GlassCard className="p-5">
                    <Text className="font-display text-xl text-cloud">Set a few windows</Text>
                    <Text className="mt-2 font-body text-sm leading-6 text-white/60">
                      Use the gear in the top-right to add weekly or monthly availability and
                      Nowly will start surfacing the best future overlap here.
                    </Text>
                  </GlassCard>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </View>

        <View className="gap-3">
          <Text className="font-display text-2xl text-cloud">Already moving</Text>
          {activeHangouts.length ? (
            activeHangouts.map((hangout) => (
              <Pressable key={hangout.id} onPress={() => router.push(`/proposal/${hangout.id}`)}>
                <GlassCard className="p-5">
                  <View className="flex-row items-start justify-between">
                    <View className="max-w-[72%]">
                      <Text className="font-display text-xl text-cloud">{hangout.activity}</Text>
                      <Text className="mt-1 font-body text-sm text-white/60">
                        {hangout.locationName} - {formatDayTime(hangout.scheduledFor)}
                      </Text>
                      <Text className="mt-2 font-body text-sm text-aqua/80">
                        {hangout.microType ? hangoutIntentLabel(hangout.microType) : "quick link"} -{" "}
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
            ))
          ) : (
            <GlassCard className="p-5">
              <Text className="font-display text-xl text-cloud">Nothing active right now</Text>
              <Text className="mt-2 font-body text-sm leading-6 text-white/60">
                Once a plan is live or confirmed, it shows up here. Completed hangs move into past
                hangs below.
              </Text>
            </GlassCard>
          )}
        </View>

        <View className="gap-3">
          <Text className="font-display text-2xl text-cloud">Past hangs</Text>
          {completedHangouts.length ? (
            completedHangouts.map((hangout) => {
              const recap = recaps.find((item) => item.hangoutId === hangout.id);

              return (
                <GlassCard key={hangout.id} className="p-5">
                  <View className="gap-3">
                    <View className="flex-row items-start justify-between gap-4">
                      <View className="max-w-[72%]">
                        <Text className="font-display text-xl text-cloud">{hangout.activity}</Text>
                        <Text className="mt-1 font-body text-sm text-white/60">
                          {hangout.locationName} - {formatDayTime(hangout.scheduledFor)}
                        </Text>
                      </View>
                      <View className="rounded-full bg-white/10 px-3 py-2">
                        <Text className="font-body text-xs uppercase tracking-[1px] text-cloud/72">
                          Completed
                        </Text>
                      </View>
                    </View>
                    <Text className="font-body text-sm leading-6 text-white/60">
                      {recap?.summary ??
                        "This hang is done. It drops out of the live flow and lives here as a recap instead."}
                    </Text>
                    <View className="flex-row gap-3">
                      <PillButton
                        label={recap ? "Open recap" : "Add recap"}
                        variant="secondary"
                        onPress={() => router.push(`/recap/${hangout.id}`)}
                      />
                    </View>
                  </View>
                </GlassCard>
              );
            })
          ) : (
            <GlassCard className="p-5">
              <Text className="font-display text-xl text-cloud">No past hangs yet</Text>
              <Text className="mt-2 font-body text-sm leading-6 text-white/60">
                Completed hangs and their recaps will live here once you start confirming them.
              </Text>
            </GlassCard>
          )}
        </View>
      </ScrollView>
    </GradientMesh>
  );
}
