import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Share, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import { GradientMesh } from "../components/ui/GradientMesh";
import { GlassCard } from "../components/ui/GlassCard";
import { PillButton } from "../components/ui/PillButton";
import { AvailabilityComposer } from "../features/availability/AvailabilityComposer";
import { RecurringAvailabilityEditor } from "../features/availability/RecurringAvailabilityEditor";
import { api } from "../lib/api";
import { track } from "../lib/analytics";
import {
  availabilityLabel,
  budgetLabel,
  hangoutIntentLabel,
  vibeLabel,
} from "../lib/labels";
import { formatDayTime } from "../lib/format";
import { recurringWindowLabel } from "../lib/recurring-availability";
import { useAppStore } from "../store/useAppStore";

export default function NowModeScreen() {
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const activeSignal = useAppStore((state) => state.activeSignal);
  const recurringWindows = useAppStore((state) => state.recurringWindows);
  const scheduledOverlaps = useAppStore((state) => state.scheduledOverlaps);
  const setActiveSignal = useAppStore((state) => state.setActiveSignal);
  const setRecurringWindows = useAppStore((state) => state.setRecurringWindows);
  const setScheduledOverlaps = useAppStore((state) => state.setScheduledOverlaps);
  const upsertHangout = useAppStore((state) => state.upsertHangout);
  const availabilityShareLink = useMemo(
    () => (user?.inviteCode ? Linking.createURL(`/booking/${user.inviteCode}`) : null),
    [user?.inviteCode],
  );

  useEffect(() => {
    let active = true;

    api
      .fetchRecurringAvailability(token)
      .then((windows) => {
        if (!active) {
          return;
        }

        setRecurringWindows(windows);
      })
      .catch(() => undefined);

    api
      .fetchScheduledOverlaps(token)
      .then((overlaps) => {
        if (!active) {
          return;
        }

        setScheduledOverlaps(overlaps);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [setRecurringWindows, setScheduledOverlaps, token]);

  const handleSaveSignal = async (payload: {
    state: "FREE_NOW" | "FREE_LATER" | "BUSY" | "DOWN_THIS_WEEKEND";
    label?: string | null;
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

  const handleStopSignal = async () => {
    if (!activeSignal) {
      return;
    }

    await api.clearAvailability(token, activeSignal.id);
    setActiveSignal(null);
  };

  const handleSaveRecurringAvailability = async (
    windows: Array<{
      recurrence: "WEEKLY" | "MONTHLY";
      dayOfWeek?: number | null;
      dayOfMonth?: number | null;
      startMinute: number;
      endMinute: number;
      utcOffsetMinutes: number;
      label?: string | null;
      vibe?: "FOOD" | "GYM" | "CHILL" | "PARTY" | "COFFEE" | "OUTDOORS" | null;
      hangoutIntent?:
        | "QUICK_BITE"
        | "COFFEE_RUN"
        | "WALK_NEARBY"
        | "STUDY_SPRINT"
        | "PULL_UP"
        | "WORKOUT"
        | "QUICK_CHILL"
        | null;
    }>,
  ) => {
    const saved = await api.saveRecurringAvailability(token, windows);
    setRecurringWindows(saved);
    await track(token, "availability_schedule_saved", {
      windowCount: saved.length,
    });
    setLoadingSuggestions(true);

    try {
      const overlaps = await api.fetchScheduledOverlaps(token);
      setScheduledOverlaps(overlaps);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const launchScheduledSuggestion = async (suggestion: (typeof scheduledOverlaps)[number]) => {
    try {
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
    } catch (error) {
      Alert.alert(
        "Could not start that plan",
        error instanceof Error ? error.message : "Try that again.",
      );
    }
  };

  const handleShareAvailability = async () => {
    if (!availabilityShareLink) {
      Alert.alert("Finish your account first", "Once your account is ready, you'll get a share link here.");
      return;
    }

    if (!recurringWindows.length) {
      Alert.alert(
        "Add a recurring window first",
        "Save at least one weekly or monthly slot before sharing your availability.",
      );
      return;
    }

    await Share.share({
      message: `Pick a time on Nowly from the windows I already opened up: ${availabilityShareLink}`,
    });
  };

  return (
    <GradientMesh>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 62,
          paddingBottom: 72,
          gap: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-start justify-between gap-4">
          <View className="max-w-[82%] gap-2">
            <Text className="font-body text-sm uppercase tracking-[2px] text-aqua/80">
              Availability setup
            </Text>
            <Text className="font-display text-[34px] leading-[38px] text-cloud">
              Set your recurring free windows once, then let Nowly line people up around them.
            </Text>
            <Text className="font-body text-sm leading-6 text-white/60">
              Keep the spontaneous mode if you want it, but this is where the more Calendly-like
              side of Nowly lives.
            </Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/6"
          >
            <MaterialCommunityIcons name="close" size={20} color="#F8FAFC" />
          </Pressable>
        </View>

        <GlassCard className="p-5">
          <View className="gap-3">
            <Text className="font-display text-xl text-cloud">Current live mode</Text>
            {activeSignal ? (
              <>
                <View className="flex-row flex-wrap gap-2">
                  {activeSignal.label ? (
                    <View className="rounded-full bg-aqua/20 px-3 py-2">
                      <Text className="font-body text-xs text-cloud">{activeSignal.label}</Text>
                    </View>
                  ) : null}
                  <View className="rounded-full bg-aqua/20 px-3 py-2">
                    <Text className="font-body text-xs text-cloud">
                      {availabilityLabel(activeSignal.state)}
                    </Text>
                  </View>
                  {activeSignal.hangoutIntent ? (
                    <View className="rounded-full bg-white/10 px-3 py-2">
                      <Text className="font-body text-xs text-cloud">
                        {hangoutIntentLabel(activeSignal.hangoutIntent)}
                      </Text>
                    </View>
                  ) : null}
                  {activeSignal.vibe ? (
                    <View className="rounded-full bg-white/10 px-3 py-2">
                      <Text className="font-body text-xs text-cloud">
                        vibe: {vibeLabel(activeSignal.vibe)}
                      </Text>
                    </View>
                  ) : null}
                  {activeSignal.budgetMood ? (
                    <View className="rounded-full bg-white/10 px-3 py-2">
                      <Text className="font-body text-xs text-cloud">
                        {budgetLabel(activeSignal.budgetMood)}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text className="font-body text-sm leading-6 text-aqua/80">
                  Live until {formatDayTime(activeSignal.expiresAt)}.
                </Text>
                <View className="self-start">
                  <PillButton
                    label="Stop live now"
                    variant="secondary"
                    onPress={() => void handleStopSignal()}
                  />
                </View>
              </>
            ) : (
              <Text className="font-body text-sm leading-6 text-white/60">
                No mode is live yet. Pick one below and Nowly will start looking for overlap that
                fits the mood.
              </Text>
            )}
          </View>
        </GlassCard>

        <AvailabilityComposer activeSignal={activeSignal} onSave={handleSaveSignal} />

        <RecurringAvailabilityEditor
          windows={recurringWindows}
          onSave={handleSaveRecurringAvailability}
        />

        <GlassCard className="p-5">
          <View className="gap-3">
            <Text className="font-display text-xl text-cloud">Share your booking link</Text>
            <Text className="font-body text-sm leading-6 text-white/60">
              Send one link and let someone pick from the exact recurring windows you already
              opened up. Once they choose a slot, Nowly makes the hangout and reminds both of you.
            </Text>
            <View className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3">
              <Text className="font-body text-sm text-aqua">
                {availabilityShareLink ?? "Your link will show up here after setup."}
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-3">
              <View className="min-w-[150px] flex-1">
                <PillButton
                  label="Share link"
                  variant="secondary"
                  onPress={() => void handleShareAvailability()}
                  disabled={!availabilityShareLink}
                />
              </View>
              {availabilityShareLink ? (
                <View className="min-w-[150px] flex-1">
                  <PillButton
                    label="Preview link"
                    variant="ghost"
                    onPress={() =>
                      user?.inviteCode
                        ? router.push({
                            pathname: "/booking/[inviteCode]",
                            params: { inviteCode: user.inviteCode },
                          })
                        : undefined
                    }
                  />
                </View>
              ) : null}
            </View>
          </View>
        </GlassCard>

        <View className="gap-3">
          <View className="gap-1">
            <Text className="font-display text-2xl text-cloud">Best mutual windows</Text>
            <Text className="font-body text-sm text-aqua/80">
              Friends can get nudged from these, and reminders ride on the actual hangout once you
              lock one in.
            </Text>
          </View>

          {loadingSuggestions ? (
            <GlassCard className="p-5">
              <Text className="font-body text-sm text-white/60">
                Refreshing the best mutual windows...
              </Text>
            </GlassCard>
          ) : scheduledOverlaps.length ? (
            scheduledOverlaps.map((suggestion) => (
              <GlassCard key={suggestion.id} className="p-5">
                <View className="gap-3">
                  <Text className="font-display text-xl text-cloud">
                    {suggestion.matchedUser.name}
                  </Text>
                  <Text className="font-body text-sm text-aqua/80">{suggestion.label}</Text>
                  <Text className="font-body text-sm leading-6 text-white/60">
                    {suggestion.summary}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    <View className="rounded-full bg-white/10 px-3 py-2">
                      <Text className="font-body text-xs text-cloud">
                        your window: {recurringWindowLabel(suggestion.sourceWindow)}
                      </Text>
                    </View>
                    <View className="rounded-full bg-white/10 px-3 py-2">
                      <Text className="font-body text-xs text-cloud">
                        their window: {recurringWindowLabel(suggestion.matchedWindow)}
                      </Text>
                    </View>
                  </View>
                  <View className="self-start">
                    <PillButton
                      label="Propose this time"
                      variant="secondary"
                      onPress={() => launchScheduledSuggestion(suggestion)}
                    />
                  </View>
                </View>
              </GlassCard>
            ))
          ) : (
            <GlassCard className="p-5">
              <Text className="font-body text-sm leading-6 text-white/60">
                Once you save a few recurring windows, Nowly will show the best upcoming mutual
                slots here.
              </Text>
            </GlassCard>
          )}
        </View>
      </ScrollView>
    </GradientMesh>
  );
}
