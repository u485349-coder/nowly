import { useEffect, useMemo, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import {
  hangoutIntentOptions,
  MobileRecurringAvailabilityWindow,
  vibeOptions,
} from "@nowly/shared";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { SignalChip } from "../../components/ui/SignalChip";
import {
  formatMinutesOfDay,
  formatOrdinalDay,
  parseTimeInput,
  recurringWindowLabel,
  toTimeInputValue,
  weekdayOptionLabels,
} from "../../lib/recurring-availability";
import { hangoutIntentLabel, vibeLabel } from "../../lib/labels";

type DraftWindow = {
  id: string;
  recurrence: "WEEKLY" | "MONTHLY";
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  startInput: string;
  endInput: string;
  label: string;
  vibe: (typeof vibeOptions)[number] | null;
  hangoutIntent: (typeof hangoutIntentOptions)[number] | null;
};

const createDraftWindow = (recurrence: "WEEKLY" | "MONTHLY" = "WEEKLY"): DraftWindow => ({
  id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  recurrence,
  dayOfWeek: recurrence === "WEEKLY" ? 2 : null,
  dayOfMonth: recurrence === "MONTHLY" ? 15 : null,
  startInput: "6:00 PM",
  endInput: "8:00 PM",
  label: "",
  vibe: null,
  hangoutIntent: null,
});

const toDraft = (window: MobileRecurringAvailabilityWindow): DraftWindow => ({
  id: window.id,
  recurrence: window.recurrence,
  dayOfWeek: window.dayOfWeek ?? null,
  dayOfMonth: window.dayOfMonth ?? null,
  startInput: toTimeInputValue(window.startMinute),
  endInput: toTimeInputValue(window.endMinute),
  label: window.label ?? "",
  vibe: window.vibe ?? null,
  hangoutIntent: window.hangoutIntent ?? null,
});

export const RecurringAvailabilityEditor = ({
  windows,
  onSave,
}: {
  windows: MobileRecurringAvailabilityWindow[];
  onSave: (
    windows: Array<{
      recurrence: "WEEKLY" | "MONTHLY";
      dayOfWeek?: number | null;
      dayOfMonth?: number | null;
      startMinute: number;
      endMinute: number;
      utcOffsetMinutes: number;
      label?: string | null;
      vibe?: (typeof vibeOptions)[number] | null;
      hangoutIntent?: (typeof hangoutIntentOptions)[number] | null;
    }>,
  ) => Promise<void>;
}) => {
  const initialDrafts = useMemo(
    () => (windows.length ? windows.map((window) => toDraft(window)) : [createDraftWindow()]),
    [windows],
  );
  const [drafts, setDrafts] = useState<DraftWindow[]>(initialDrafts);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDrafts(initialDrafts);
  }, [initialDrafts]);

  const updateDraft = (id: string, patch: Partial<DraftWindow>) => {
    setDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)),
    );
  };

  const save = async () => {
    const utcOffsetMinutes = new Date().getTimezoneOffset();
    const payload = drafts.map((draft) => {
      const startMinute = parseTimeInput(draft.startInput);
      const endMinute = parseTimeInput(draft.endInput);

      if (startMinute === null || endMinute === null) {
        throw new Error("Use a time like 6:30 PM.");
      }

      if (endMinute <= startMinute) {
        throw new Error("End time must be later than start time.");
      }

      return {
        recurrence: draft.recurrence,
        dayOfWeek: draft.recurrence === "WEEKLY" ? draft.dayOfWeek : null,
        dayOfMonth: draft.recurrence === "MONTHLY" ? draft.dayOfMonth : null,
        startMinute,
        endMinute,
        utcOffsetMinutes,
        label: draft.label.trim() || null,
        vibe: draft.vibe,
        hangoutIntent: draft.hangoutIntent,
      };
    });

    try {
      setSaving(true);
      await onSave(payload);
    } catch (error) {
      Alert.alert(
        "Could not save schedule",
        error instanceof Error ? error.message : "Try that again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="gap-4">
      <View className="gap-2">
        <Text className="font-display text-xl text-cloud">Recurring hang windows</Text>
        <Text className="font-body text-sm leading-6 text-white/60">
          Set weekly or monthly windows once, and Nowly will look for mutual time that actually
          lines up.
        </Text>
      </View>

      {drafts.map((draft, index) => (
        <GlassCard key={draft.id} className="p-5">
          <View className="gap-4">
            <View className="flex-row items-start justify-between gap-4">
              <View className="max-w-[72%] gap-1">
                <Text className="font-display text-lg text-cloud">Window {index + 1}</Text>
                <Text className="font-body text-sm text-aqua/80">
                  {draft.recurrence === "WEEKLY" ? "Repeats every week" : "Repeats every month"}
                </Text>
              </View>
              <PillButton
                label="Remove"
                variant="ghost"
                onPress={() =>
                  setDrafts((current) =>
                    current.length > 1 ? current.filter((item) => item.id !== draft.id) : current,
                  )
                }
              />
            </View>

            <View className="gap-2">
              <Text className="font-display text-base text-cloud">Repeat</Text>
              <View className="flex-row gap-2">
                {(["WEEKLY", "MONTHLY"] as const).map((option) => (
                  <SignalChip
                    key={option}
                    label={option === "WEEKLY" ? "Weekly" : "Monthly"}
                    active={draft.recurrence === option}
                    onPress={() =>
                      updateDraft(draft.id, {
                        recurrence: option,
                        dayOfWeek: option === "WEEKLY" ? draft.dayOfWeek ?? 2 : null,
                        dayOfMonth: option === "MONTHLY" ? draft.dayOfMonth ?? 15 : null,
                      })
                    }
                  />
                ))}
              </View>
            </View>

            {draft.recurrence === "WEEKLY" ? (
              <View className="gap-2">
                <Text className="font-display text-base text-cloud">Day of week</Text>
                <View className="flex-row flex-wrap gap-2">
                  {weekdayOptionLabels.map((label, optionIndex) => (
                    <SignalChip
                      key={label}
                      label={label}
                      active={draft.dayOfWeek === optionIndex}
                      onPress={() => updateDraft(draft.id, { dayOfWeek: optionIndex })}
                    />
                  ))}
                </View>
              </View>
            ) : (
              <View className="gap-2">
                <Text className="font-display text-base text-cloud">Day of month</Text>
                <TextInput
                  value={String(draft.dayOfMonth ?? 15)}
                  onChangeText={(value) =>
                    updateDraft(draft.id, {
                      dayOfMonth: value ? Math.max(1, Math.min(31, Number(value))) : 15,
                    })
                  }
                  keyboardType="number-pad"
                  className="rounded-[22px] border border-white/12 bg-white/6 px-4 py-3 font-body text-cloud"
                  placeholder="15"
                  placeholderTextColor="rgba(248,250,252,0.35)"
                />
              </View>
            )}

            <View className="flex-row gap-3">
              <View className="flex-1 gap-2">
                <Text className="font-display text-base text-cloud">Start</Text>
                <TextInput
                  value={draft.startInput}
                  onChangeText={(value) => updateDraft(draft.id, { startInput: value })}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  className="rounded-[22px] border border-white/12 bg-white/6 px-4 py-3 font-body text-cloud"
                  placeholder="6:00 PM"
                  placeholderTextColor="rgba(248,250,252,0.35)"
                />
              </View>
              <View className="flex-1 gap-2">
                <Text className="font-display text-base text-cloud">End</Text>
                <TextInput
                  value={draft.endInput}
                  onChangeText={(value) => updateDraft(draft.id, { endInput: value })}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  className="rounded-[22px] border border-white/12 bg-white/6 px-4 py-3 font-body text-cloud"
                  placeholder="8:00 PM"
                  placeholderTextColor="rgba(248,250,252,0.35)"
                />
              </View>
            </View>

            <View className="gap-2">
              <Text className="font-display text-base text-cloud">Custom mode name</Text>
              <Text className="font-body text-sm leading-6 text-white/60">
                Name this window however your life actually works, not just the preset tags.
              </Text>
              <TextInput
                value={draft.label}
                onChangeText={(value) => updateDraft(draft.id, { label: value })}
                className="rounded-[22px] border border-white/12 bg-white/6 px-4 py-3 font-body text-cloud"
                placeholder="After class, Friday reset, Sunday recharge..."
                placeholderTextColor="rgba(248,250,252,0.35)"
              />
            </View>

            <View className="gap-2">
              <Text className="font-display text-base text-cloud">Best for</Text>
              <View className="flex-row flex-wrap gap-2">
                {hangoutIntentOptions.map((option) => (
                  <SignalChip
                    key={option}
                    label={hangoutIntentLabel(option)}
                    active={draft.hangoutIntent === option}
                    onPress={() =>
                      updateDraft(draft.id, {
                        hangoutIntent: draft.hangoutIntent === option ? null : option,
                      })
                    }
                  />
                ))}
              </View>
            </View>

            <View className="gap-2">
              <Text className="font-display text-base text-cloud">Vibe</Text>
              <View className="flex-row flex-wrap gap-2">
                {vibeOptions.map((option) => (
                  <SignalChip
                    key={option}
                    label={vibeLabel(option)}
                    active={draft.vibe === option}
                    onPress={() =>
                      updateDraft(draft.id, {
                        vibe: draft.vibe === option ? null : option,
                      })
                    }
                  />
                ))}
              </View>
            </View>

            <Text className="font-body text-sm leading-6 text-aqua/80">
              Preview:{" "}
              {parseTimeInput(draft.startInput) !== null && parseTimeInput(draft.endInput) !== null
                ? `${draft.recurrence === "WEEKLY" ? weekdayOptionLabels[draft.dayOfWeek ?? 0] : `Monthly on the ${formatOrdinalDay(draft.dayOfMonth ?? 15)}`} - ${formatMinutesOfDay(parseTimeInput(draft.startInput) ?? 0)} - ${formatMinutesOfDay(parseTimeInput(draft.endInput) ?? 0)}`
                : recurringWindowLabel({
                    id: draft.id,
                    recurrence: draft.recurrence,
                    dayOfWeek: draft.dayOfWeek,
                    dayOfMonth: draft.dayOfMonth,
                    startMinute: 18 * 60,
                    endMinute: 20 * 60,
                    utcOffsetMinutes: 0,
                    label: null,
                    vibe: draft.vibe,
                    hangoutIntent: draft.hangoutIntent,
                    createdAt: new Date().toISOString(),
                  })}
            </Text>
          </View>
        </GlassCard>
      ))}

      <View className="flex-row gap-3">
        <View className="flex-1">
          <PillButton
            label="Add weekly window"
            variant="secondary"
            onPress={() => setDrafts((current) => [...current, createDraftWindow("WEEKLY")])}
          />
        </View>
        <View className="flex-1">
          <PillButton
            label="Add monthly window"
            variant="secondary"
            onPress={() => setDrafts((current) => [...current, createDraftWindow("MONTHLY")])}
          />
        </View>
      </View>

      <PillButton
        label={saving ? "Saving..." : "Save recurring schedule"}
        onPress={() => void save()}
      />
    </View>
  );
};
