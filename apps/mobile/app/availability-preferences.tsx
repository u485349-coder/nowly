import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import {
  hangoutIntentOptions,
  MobileRecurringAvailabilityWindow,
  vibeOptions,
} from "@nowly/shared";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
} from "react-native-reanimated";
import { GradientMesh } from "../components/ui/GradientMesh";
import { PillButton } from "../components/ui/PillButton";
import { useResponsiveLayout } from "../components/ui/useResponsiveLayout";
import { nowlyColors } from "../constants/theme";
import { api } from "../lib/api";
import { track } from "../lib/analytics";
import {
  formatMinutesOfDay,
  parseTimeInput,
  toTimeInputValue,
  weekdayOptionLabels,
} from "../lib/recurring-availability";
import { hangoutIntentLabel, vibeLabel } from "../lib/labels";
import { createSmartOpenUrl } from "../lib/smart-links";
import { webPressableStyle } from "../lib/web-pressable";
import { useAppStore } from "../store/useAppStore";

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

type SaveWindowPayload = {
  recurrence: "WEEKLY" | "MONTHLY";
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  startMinute: number;
  endMinute: number;
  utcOffsetMinutes: number;
  label?: string | null;
  vibe?: (typeof vibeOptions)[number] | null;
  hangoutIntent?: (typeof hangoutIntentOptions)[number] | null;
};

const createDraftWindow = (recurrence: "WEEKLY" | "MONTHLY" = "WEEKLY"): DraftWindow => ({
  id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  recurrence,
  dayOfWeek: recurrence === "WEEKLY" ? 2 : null,
  dayOfMonth: recurrence === "MONTHLY" ? 15 : null,
  startInput: "18:00",
  endInput: "20:00",
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

const resolveMinutes = (value: string, fallback: number) => parseTimeInput(value) ?? fallback;

const windowDayLabel = (draft: DraftWindow) =>
  draft.recurrence === "WEEKLY"
    ? weekdayOptionLabels[draft.dayOfWeek ?? 0]
    : `Monthly ${draft.dayOfMonth ?? 15}`;

const windowTimeLabel = (draft: DraftWindow) =>
  `${formatMinutesOfDay(resolveMinutes(draft.startInput, 18 * 60))} - ${formatMinutesOfDay(resolveMinutes(draft.endInput, 20 * 60))}`;

const windowMoodSummary = (draft: DraftWindow) => {
  const parts = [
    draft.label.trim() || null,
    draft.hangoutIntent ? hangoutIntentLabel(draft.hangoutIntent) : null,
    draft.vibe ? vibeLabel(draft.vibe) : null,
  ].filter(Boolean) as string[];

  return parts.length ? parts.slice(0, 2).join(" / ") : "Tap to tune the mood";
};

const PreferenceChip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.choiceChip,
      active ? styles.choiceChipActive : styles.choiceChipIdle,
      webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.985 }),
    ]}
  >
    <Text
      className={`font-body text-sm ${active ? "text-cloud" : "text-white/76"}`}
      numberOfLines={1}
    >
      {label}
    </Text>
  </Pressable>
);

export default function AvailabilityPreferencesScreen() {
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const recurringWindows = useAppStore((state) => state.recurringWindows);
  const scheduledOverlaps = useAppStore((state) => state.scheduledOverlaps);
  const setRecurringWindows = useAppStore((state) => state.setRecurringWindows);
  const setScheduledOverlaps = useAppStore((state) => state.setScheduledOverlaps);
  const layout = useResponsiveLayout();
  const initialDrafts = useMemo(
    () =>
      recurringWindows.length
        ? recurringWindows.map((window) => toDraft(window))
        : [createDraftWindow()],
    [recurringWindows],
  );
  const [drafts, setDrafts] = useState<DraftWindow[]>(initialDrafts);
  const [expandedWindowId, setExpandedWindowId] = useState<string | null>(null);

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

  useEffect(() => {
    setDrafts(initialDrafts);
    setExpandedWindowId(null);
  }, [initialDrafts]);

  const weeklyCounts = useMemo(() => {
    const counts = Array.from({ length: 7 }, () => 0);

    drafts.forEach((draft) => {
      if (draft.recurrence === "WEEKLY" && draft.dayOfWeek !== null) {
        counts[draft.dayOfWeek] += 1;
      }
    });

    return counts;
  }, [drafts]);

  const monthlyCount = drafts.filter((draft) => draft.recurrence === "MONTHLY").length;
  const bookingLink = user?.inviteCode ? createSmartOpenUrl(`/booking/${user.inviteCode}`) : null;
  const peakWeeklyCount = Math.max(...weeklyCounts, 1);

  const updateDraft = (id: string, patch: Partial<DraftWindow>) => {
    setDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)),
    );
  };

  const addWindow = () => {
    const next = createDraftWindow("WEEKLY");
    setDrafts((current) => [...current, next]);
    setExpandedWindowId(next.id);
  };

  const removeWindow = (id: string) => {
    setDrafts((current) =>
      current.length > 1 ? current.filter((draft) => draft.id !== id) : current,
    );
    setExpandedWindowId((current) => (current === id ? null : current));
  };

  const handleSaveRecurringAvailability = async (windows: SaveWindowPayload[]) => {
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

  const saveDrafts = async () => {
    const utcOffsetMinutes = new Date().getTimezoneOffset();
    const payload = drafts.map((draft) => {
      const startMinute = parseTimeInput(draft.startInput);
      const endMinute = parseTimeInput(draft.endInput);

      if (startMinute === null || endMinute === null) {
        throw new Error("Use 24-hour time like 18:30.");
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
      await handleSaveRecurringAvailability(payload);
      setExpandedWindowId(null);
    } catch (error) {
      Alert.alert(
        "Could not save hang rhythm",
        error instanceof Error ? error.message : "Try that again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = async () => {
    if (!bookingLink) {
      Alert.alert("Booking link not ready", "Save your rhythm first and your share link will show up here.");
      return;
    }

    const clipboard = (
      globalThis.navigator as { clipboard?: { writeText?: (text: string) => Promise<void> } } | undefined
    )?.clipboard;

    if (clipboard?.writeText) {
      await clipboard.writeText(bookingLink);
      Alert.alert("Booking link copied", "Share it wherever your people already talk.");
      return;
    }

    await Share.share({
      message: bookingLink,
    });
  };

  const handlePreviewLink = () => {
    if (!user?.inviteCode) {
      router.push("/now-mode");
      return;
    }

    router.push(`/booking/${user.inviteCode}`);
  };

  return (
    <GradientMesh>
      <View style={styles.screen}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            alignItems: "center",
            paddingHorizontal: layout.screenPadding,
            paddingTop: layout.isDesktop ? 40 : 60,
            paddingBottom: 190,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.contentShell,
              {
                width: layout.shellWidth,
              },
              layout.isDesktop ? styles.desktopContentShell : null,
            ]}
          >
            <View style={{ width: layout.leftColumnWidth, gap: layout.sectionGap }}>
              <View style={styles.headerRow}>
                <View style={{ gap: 10, flex: 1 }}>
                  <Text style={styles.eyebrow}>HANG RHYTHM</Text>
                  <Text style={styles.heroTitle}>Set your hang rhythm</Text>
                  <Text style={styles.heroHint}>Nowly will line people up around this.</Text>
                </View>

                <Pressable
                  onPress={() => router.back()}
                  style={({ pressed }) => [
                    styles.closeButton,
                    webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                  ]}
                >
                  <MaterialCommunityIcons name="close" size={20} color="#F8FAFC" />
                </Pressable>
              </View>

              <View style={styles.visualizerShell}>
                <LinearGradient
                  colors={[
                    "rgba(255,255,255,0.08)",
                    "rgba(255,255,255,0.02)",
                    "rgba(255,255,255,0.00)",
                  ]}
                  start={{ x: 0.04, y: 0 }}
                  end={{ x: 0.82, y: 0.94 }}
                  style={StyleSheet.absoluteFillObject}
                  pointerEvents="none"
                />

                <Text style={styles.moduleLabel}>WEEKLY SHAPE</Text>

                <View className="flex-row items-end justify-between gap-2">
                  {weekdayOptionLabels.map((day, index) => {
                    const count = weeklyCounts[index];
                    const fillHeight = count ? 12 + (count / peakWeeklyCount) * 18 : 8;

                    return (
                      <View key={day} className="flex-1 items-center gap-2">
                        <View style={styles.visualizerTrack}>
                          <LinearGradient
                            colors={
                              count
                                ? ["rgba(165,243,252,0.88)", "rgba(34,211,238,0.24)"]
                                : ["rgba(255,255,255,0.14)", "rgba(255,255,255,0.05)"]
                            }
                            start={{ x: 0.5, y: 0 }}
                            end={{ x: 0.5, y: 1 }}
                            style={[
                              styles.visualizerFill,
                              {
                                height: fillHeight,
                                opacity: count ? 1 : 0.7,
                              },
                            ]}
                          />
                        </View>
                        <Text className="font-body text-[11px] text-cloud/58">{day}</Text>
                      </View>
                    );
                  })}
                </View>

                {monthlyCount ? (
                  <Text className="mt-4 font-body text-[12px] leading-5 text-cloud/54">
                    {monthlyCount} monthly {monthlyCount === 1 ? "window is" : "windows are"} layered
                    in too.
                  </Text>
                ) : null}
              </View>

              <View style={styles.linkStrip}>
                <View style={{ gap: 6, flex: 1 }}>
                  <Text style={styles.moduleLabel}>SHARE BOOKING LINK</Text>
                  <Text style={styles.linkHint}>
                    {bookingLink
                      ? "Keep your share link close so a good overlap can turn into action fast."
                      : "Your share link will show up here as soon as your booking flow is ready."}
                  </Text>
                </View>

                <View style={styles.linkActions}>
                  <Pressable
                    onPress={() => void handleCopyLink()}
                    style={({ pressed }) => [
                      styles.linkPill,
                      webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.985 }),
                    ]}
                  >
                    <Text style={styles.linkPillText}>Copy link</Text>
                  </Pressable>
                  <Pressable
                    onPress={handlePreviewLink}
                    style={({ pressed }) => [
                      styles.linkPill,
                      webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.985 }),
                    ]}
                  >
                    <Text style={styles.linkPillText}>Preview link</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.previewShell}>
                <Text style={styles.moduleLabel}>BEST MUTUAL WINDOWS</Text>

                <View style={styles.previewTimeline}>
                  {(scheduledOverlaps.length ? scheduledOverlaps.slice(0, 3) : [null, null, null]).map(
                    (overlap, index) => (
                      <View key={overlap?.id ?? `empty-${index}`} style={styles.previewTrack}>
                        <View
                          style={[
                            styles.previewGlow,
                            {
                              top: overlap ? 8 + index * 10 : 30,
                              height: overlap ? 26 + index * 10 : 12,
                              opacity: overlap ? 1 : 0.35,
                            },
                          ]}
                        />
                      </View>
                    ),
                  )}
                </View>

                {scheduledOverlaps.length ? (
                  <View style={{ gap: 12 }}>
                    {scheduledOverlaps.slice(0, 2).map((overlap) => (
                      <View key={overlap.id} style={styles.previewRow}>
                        <Text style={styles.previewName}>{overlap.matchedUser.name}</Text>
                        <Text style={styles.previewDetail}>{overlap.label}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.previewEmpty}>
                    When your crew saves rhythm too, the strongest mutual windows will glow here.
                  </Text>
                )}
              </View>
            </View>

            <View style={{ width: layout.rightColumnWidth, gap: 16 }}>
            {drafts.map((draft) => {
              const expanded = draft.id === expandedWindowId;
              const dayLabel = windowDayLabel(draft);
              const timeLabel = windowTimeLabel(draft);

              return (
                <Animated.View key={draft.id} layout={LinearTransition.duration(220)}>
                  <View style={styles.windowCardShadow}>
                    <LinearGradient
                      colors={[
                        "rgba(12,17,31,0.94)",
                        "rgba(18,39,58,0.86)",
                        "rgba(9,12,24,0.95)",
                      ]}
                      locations={[0, 0.52, 1]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.windowCard, expanded ? styles.windowCardExpanded : null]}
                    >
                      <LinearGradient
                        colors={[
                          "rgba(255,255,255,0.08)",
                          "rgba(255,255,255,0.02)",
                          "rgba(255,255,255,0.00)",
                        ]}
                        start={{ x: 0.04, y: 0 }}
                        end={{ x: 0.82, y: 0.9 }}
                        style={StyleSheet.absoluteFillObject}
                        pointerEvents="none"
                      />
                      <View style={styles.windowGlow} pointerEvents="none" />
                      <View style={styles.windowStroke} pointerEvents="none" />

                      <Pressable
                        onPress={() => setExpandedWindowId(expanded ? null : draft.id)}
                        style={({ pressed }) =>
                          webPressableStyle(pressed, {
                            pressedOpacity: 0.96,
                            pressedScale: 0.995,
                          })
                        }
                      >
                        <View className="flex-row items-center gap-4">
                          <View className="min-w-0 flex-1 gap-1.5">
                            <Text className="font-display text-[20px] leading-[24px] text-cloud">
                              {dayLabel}
                            </Text>
                            <Text className="font-body text-sm text-cloud/76">{timeLabel}</Text>
                            <Text className="font-body text-[12px] leading-5 text-aqua/82">
                              {windowMoodSummary(draft)}
                            </Text>
                          </View>

                          <View style={styles.chevronShell}>
                            <MaterialCommunityIcons
                              name={expanded ? "chevron-up" : "chevron-right"}
                              size={20}
                              color="#E2E8F0"
                            />
                          </View>
                        </View>
                      </Pressable>

                      {expanded ? (
                        <Animated.View
                          entering={FadeInDown.duration(220)}
                          exiting={FadeOutUp.duration(180)}
                          className="gap-6 pt-6"
                        >
                          <View className="gap-3">
                            <Text className="font-body text-[12px] uppercase tracking-[2px] text-cloud/55">
                              Repeats
                            </Text>
                            <View className="flex-row gap-2.5">
                              {(["WEEKLY", "MONTHLY"] as const).map((option) => (
                                <PreferenceChip
                                  key={option}
                                  label={option === "WEEKLY" ? "Weekly" : "Monthly"}
                                  active={draft.recurrence === option}
                                  onPress={() =>
                                    updateDraft(draft.id, {
                                      recurrence: option,
                                      dayOfWeek: option === "WEEKLY" ? draft.dayOfWeek ?? 2 : null,
                                      dayOfMonth:
                                        option === "MONTHLY" ? draft.dayOfMonth ?? 15 : null,
                                    })
                                  }
                                />
                              ))}
                            </View>
                          </View>

                          {draft.recurrence === "WEEKLY" ? (
                            <View className="gap-3">
                              <Text className="font-body text-[12px] uppercase tracking-[2px] text-cloud/55">
                                Day
                              </Text>
                              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View className="flex-row gap-2.5 pr-2">
                                  {weekdayOptionLabels.map((day, dayIndex) => (
                                    <PreferenceChip
                                      key={day}
                                      label={day}
                                      active={draft.dayOfWeek === dayIndex}
                                      onPress={() =>
                                        updateDraft(draft.id, { dayOfWeek: dayIndex })
                                      }
                                    />
                                  ))}
                                </View>
                              </ScrollView>
                            </View>
                          ) : (
                            <View className="gap-3">
                              <Text className="font-body text-[12px] uppercase tracking-[2px] text-cloud/55">
                                Day of month
                              </Text>
                              <View style={styles.compactInputWrap}>
                                <TextInput
                                  value={String(draft.dayOfMonth ?? 15)}
                                  onChangeText={(value) => {
                                    const digits = value.replace(/[^0-9]/g, "").slice(0, 2);
                                    updateDraft(draft.id, {
                                      dayOfMonth: digits
                                        ? Math.max(1, Math.min(31, Number(digits)))
                                        : 15,
                                    });
                                  }}
                                  keyboardType="number-pad"
                                  className="font-body text-base text-cloud"
                                  placeholder="15"
                                  placeholderTextColor="rgba(248,250,252,0.35)"
                                />
                              </View>
                            </View>
                          )}

                          <View className="gap-3">
                            <Text className="font-body text-[12px] uppercase tracking-[2px] text-cloud/55">
                              Time
                            </Text>
                            <View className="flex-row gap-3">
                              <View className="flex-1 gap-2">
                                <Text className="font-body text-[12px] text-cloud/58">Start</Text>
                                <View style={styles.timeField}>
                                  <TextInput
                                    value={draft.startInput}
                                    onChangeText={(value) =>
                                      updateDraft(draft.id, { startInput: value })
                                    }
                                    autoCapitalize="none"
                                    className="font-body text-base text-cloud"
                                    placeholder="18:00"
                                    placeholderTextColor="rgba(248,250,252,0.35)"
                                  />
                                </View>
                              </View>

                              <View className="flex-1 gap-2">
                                <Text className="font-body text-[12px] text-cloud/58">End</Text>
                                <View style={styles.timeField}>
                                  <TextInput
                                    value={draft.endInput}
                                    onChangeText={(value) =>
                                      updateDraft(draft.id, { endInput: value })
                                    }
                                    autoCapitalize="none"
                                    className="font-body text-base text-cloud"
                                    placeholder="20:00"
                                    placeholderTextColor="rgba(248,250,252,0.35)"
                                  />
                                </View>
                              </View>
                            </View>
                          </View>

                          <View className="gap-3">
                            <Text className="font-body text-[12px] uppercase tracking-[2px] text-cloud/55">
                              Window note
                            </Text>
                            <View style={styles.noteField}>
                              <TextInput
                                value={draft.label}
                                onChangeText={(value) => updateDraft(draft.id, { label: value })}
                                className="font-body text-base text-cloud"
                                placeholder="After class, Friday reset, Sunday recharge..."
                                placeholderTextColor="rgba(248,250,252,0.35)"
                              />
                            </View>
                          </View>

                          <View className="gap-3">
                            <Text className="font-body text-[12px] uppercase tracking-[2px] text-cloud/55">
                              Best for
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                              <View className="flex-row gap-2.5 pr-2">
                                {hangoutIntentOptions.map((option) => (
                                  <PreferenceChip
                                    key={option}
                                    label={hangoutIntentLabel(option)}
                                    active={draft.hangoutIntent === option}
                                    onPress={() =>
                                      updateDraft(draft.id, {
                                        hangoutIntent:
                                          draft.hangoutIntent === option ? null : option,
                                      })
                                    }
                                  />
                                ))}
                              </View>
                            </ScrollView>
                          </View>

                          <View className="gap-3">
                            <Text className="font-body text-[12px] uppercase tracking-[2px] text-cloud/55">
                              Vibe
                            </Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                              <View className="flex-row gap-2.5 pr-2">
                                {vibeOptions.map((option) => (
                                  <PreferenceChip
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
                            </ScrollView>
                          </View>

                          <View className="flex-row items-center justify-between gap-4">
                            <Text className="min-w-0 flex-1 font-body text-[12px] leading-5 text-cloud/52">
                              Preview: {windowDayLabel(draft)} - {windowTimeLabel(draft)}
                            </Text>

                            {drafts.length > 1 ? (
                              <Pressable
                                onPress={() => removeWindow(draft.id)}
                                style={({ pressed }) =>
                                  webPressableStyle(pressed, {
                                    pressedOpacity: 0.86,
                                    pressedScale: 0.98,
                                  })
                                }
                              >
                                <Text className="font-body text-sm text-aqua/82">Remove</Text>
                              </Pressable>
                            ) : null}
                          </View>
                        </Animated.View>
                      ) : null}
                    </LinearGradient>
                  </View>
                </Animated.View>
              );
            })}
              <View className="items-center pt-2">
                <Pressable
                  onPress={addWindow}
                  style={({ pressed }) => [
                    styles.addWindowPill,
                    webPressableStyle(pressed, { pressedOpacity: 0.94, pressedScale: 0.985 }),
                  ]}
                >
                  <MaterialCommunityIcons name="plus" size={16} color="#E2E8F0" />
                  <Text className="font-display text-[15px] text-cloud">Add another window</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>

        <LinearGradient
          colors={["rgba(5,8,19,0.00)", "rgba(5,8,19,0.84)", "rgba(5,8,19,0.96)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[
            styles.stickyFooter,
            {
              paddingHorizontal: layout.screenPadding,
            },
          ]}
          pointerEvents="box-none"
        >
          <View
            style={{
              width: layout.shellWidth,
              alignSelf: "center",
              alignItems: layout.isDesktop ? "flex-end" : "stretch",
            }}
          >
            <View
              style={[
                styles.stickyFooterInner,
                layout.isDesktop
                  ? {
                      width: layout.rightColumnWidth,
                    }
                  : null,
              ]}
            >
              <PillButton
                label={saving || loadingSuggestions ? "Saving hang rhythm..." : "Save hang rhythm"}
                onPress={() => void saveDrafts()}
                disabled={saving || loadingSuggestions}
              />
            </View>
          </View>
        </LinearGradient>
      </View>
    </GradientMesh>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    marginTop: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  contentShell: {
    gap: 24,
  },
  desktopContentShell: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 28,
  },
  eyebrow: {
    color: "rgba(139,234,255,0.8)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
    letterSpacing: 2.4,
  },
  heroHint: {
    color: "rgba(248,250,252,0.68)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 340,
  },
  heroTitle: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 34,
    lineHeight: 38,
    maxWidth: 360,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  linkActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  linkHint: {
    color: "rgba(248,250,252,0.68)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    lineHeight: 21,
  },
  linkPill: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  linkPillText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 13,
  },
  linkStrip: {
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
  },
  moduleLabel: {
    color: "rgba(248,250,252,0.56)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
    letterSpacing: 2,
  },
  previewDetail: {
    color: "rgba(139,234,255,0.82)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  previewEmpty: {
    color: "rgba(248,250,252,0.6)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    lineHeight: 22,
  },
  previewGlow: {
    position: "absolute",
    left: 2,
    right: 2,
    borderRadius: 999,
    backgroundColor: "rgba(124,235,255,0.92)",
    shadowColor: nowlyColors.aqua,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 0,
    },
  },
  previewName: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
  },
  previewRow: {
    gap: 4,
  },
  previewShell: {
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
  },
  previewTimeline: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingTop: 4,
  },
  previewTrack: {
    position: "relative",
    height: 72,
    width: 18,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
  },
  screen: {
    flex: 1,
  },
  visualizerShell: {
    overflow: "hidden",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(10,14,28,0.62)",
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: "#020617",
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    elevation: 8,
  },
  visualizerTrack: {
    height: 36,
    width: 18,
    justifyContent: "flex-end",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    overflow: "hidden",
  },
  visualizerFill: {
    width: "100%",
    borderRadius: 18,
  },
  windowCardShadow: {
    shadowColor: "#67E8F9",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: {
      width: 0,
      height: 14,
    },
    elevation: 10,
  },
  windowCard: {
    minHeight: 84,
    borderRadius: 26,
    overflow: "hidden",
    padding: 20,
  },
  windowCardExpanded: {
    minHeight: 84,
  },
  windowGlow: {
    position: "absolute",
    right: -42,
    top: -56,
    height: 170,
    width: 170,
    borderRadius: 170,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  windowStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  chevronShell: {
    height: 36,
    width: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  choiceChip: {
    minHeight: 40,
    justifyContent: "center",
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  choiceChipIdle: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  choiceChipActive: {
    backgroundColor: "rgba(34,211,238,0.18)",
    shadowColor: "#67E8F9",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 4,
  },
  compactInputWrap: {
    width: 90,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  timeField: {
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  noteField: {
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  addWindowPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: "#67E8F9",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 4,
  },
  stickyFooter: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 18,
  },
  stickyFooterInner: {
    borderRadius: 28,
    backgroundColor: "rgba(8,11,20,0.72)",
    padding: 6,
  },
});
