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
  formatOrdinalDay,
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

const createDraftWindow = (
  recurrence: "WEEKLY" | "MONTHLY" = "WEEKLY",
  overrides: Partial<DraftWindow> = {},
): DraftWindow => ({
  id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  recurrence,
  dayOfWeek: recurrence === "WEEKLY" ? 2 : null,
  dayOfMonth: recurrence === "MONTHLY" ? 15 : null,
  startInput: "6:00 PM",
  endInput: "8:00 PM",
  label: "",
  vibe: null,
  hangoutIntent: null,
  ...overrides,
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
    : `Monthly on the ${formatOrdinalDay(draft.dayOfMonth ?? 15)}`;

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
  const bookingSetup = useAppStore((state) => state.bookingSetup);
  const setBookingSetup = useAppStore((state) => state.setBookingSetup);
  const recurringWindows = useAppStore((state) => state.recurringWindows);
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
  const [selectedSpecificDate, setSelectedSpecificDate] = useState<number | null>(null);
  const [specificMonth, setSpecificMonth] = useState(() => new Date());
  const [hangoutFormat, setHangoutFormat] = useState<"ONE_ON_ONE" | "GROUP">(
    bookingSetup.format,
  );
  const [hangoutTitle, setHangoutTitle] = useState(bookingSetup.title);
  const [hangoutDescription, setHangoutDescription] = useState(bookingSetup.description);

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

  useEffect(() => {
    setHangoutFormat(bookingSetup.format);
    setHangoutTitle(bookingSetup.title);
    setHangoutDescription(bookingSetup.description);
  }, [bookingSetup.description, bookingSetup.format, bookingSetup.title]);

  const weeklyRows = useMemo(
    () =>
      weekdayOptionLabels.map((label, dayIndex) => ({
        label,
        dayIndex,
        drafts: drafts.filter(
          (draft) => draft.recurrence === "WEEKLY" && draft.dayOfWeek === dayIndex,
        ),
      })),
    [drafts],
  );
  const monthlyDrafts = useMemo(
    () => drafts.filter((draft) => draft.recurrence === "MONTHLY"),
    [drafts],
  );
  const bookingLink = user?.inviteCode ? createSmartOpenUrl(`/booking/${user.inviteCode}`) : null;
  const specificDatesSet = useMemo(
    () => new Set(monthlyDrafts.map((draft) => draft.dayOfMonth ?? 15)),
    [monthlyDrafts],
  );
  const selectedSpecificDrafts = useMemo(
    () =>
      selectedSpecificDate === null
        ? []
        : monthlyDrafts.filter((draft) => (draft.dayOfMonth ?? 15) === selectedSpecificDate),
    [monthlyDrafts, selectedSpecificDate],
  );
  const previewWindows = useMemo(
    () =>
      drafts
        .slice()
        .sort((left, right) => {
          const leftOrder = left.recurrence === "WEEKLY" ? left.dayOfWeek ?? 0 : (left.dayOfMonth ?? 31) + 7;
          const rightOrder = right.recurrence === "WEEKLY" ? right.dayOfWeek ?? 0 : (right.dayOfMonth ?? 31) + 7;
          if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
          }

          return resolveMinutes(left.startInput, 0) - resolveMinutes(right.startInput, 0);
        })
        .slice(0, 3),
    [drafts],
  );
  const specificCalendarDays = useMemo(() => {
    const year = specificMonth.getFullYear();
    const month = specificMonth.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay();
    const cells: Array<{ key: string; dayNumber: number | null }> = Array.from(
      { length: firstWeekday },
      (_, index) => ({
      key: `specific-blank-${index}`,
      dayNumber: null,
      }),
    );

    for (let dayNumber = 1; dayNumber <= totalDays; dayNumber += 1) {
      cells.push({
        key: `specific-${month}-${dayNumber}`,
        dayNumber,
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({
        key: `specific-trailing-${cells.length}`,
        dayNumber: null,
      });
    }

    return cells;
  }, [specificMonth]);
  const specificMonthLabel = specificMonth.toLocaleDateString([], {
    month: "long",
    year: "numeric",
  });

  const updateDraft = (id: string, patch: Partial<DraftWindow>) => {
    setDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)),
    );
  };

  useEffect(() => {
    if (selectedSpecificDate !== null && specificDatesSet.has(selectedSpecificDate)) {
      return;
    }

    const [firstSpecificDate] = [...specificDatesSet];
    setSelectedSpecificDate(firstSpecificDate ?? specificMonth.getDate());
  }, [selectedSpecificDate, specificDatesSet, specificMonth]);

  const toggleWeeklyDay = (dayIndex: number) => {
    const row = weeklyRows.find((item) => item.dayIndex === dayIndex);

    if (row?.drafts.length) {
      setDrafts((current) =>
        current.filter(
          (draft) => !(draft.recurrence === "WEEKLY" && draft.dayOfWeek === dayIndex),
        ),
      );
      return;
    }

    const next = createDraftWindow("WEEKLY", { dayOfWeek: dayIndex });
    setDrafts((current) => [...current, next]);
    setExpandedWindowId(next.id);
  };

  const addWeeklyRange = (dayIndex: number) => {
    const next = createDraftWindow("WEEKLY", { dayOfWeek: dayIndex });
    setDrafts((current) => [...current, next]);
    setExpandedWindowId(next.id);
  };

  const addSpecificDateRange = (dayOfMonth: number) => {
    const next = createDraftWindow("MONTHLY", { dayOfMonth });
    setDrafts((current) => [...current, next]);
    setSelectedSpecificDate(dayOfMonth);
    setExpandedWindowId(next.id);
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
      setBookingSetup({
        format: hangoutFormat,
        title: hangoutTitle.trim() || "Quick catch-up",
        description:
          hangoutDescription.trim() || "Pick an easy time and we can see what sticks.",
      });
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
                <Text style={styles.moduleLabel}>WEEKLY HOURS</Text>
                <Text style={styles.linkHint}>
                  Set the default days and times you usually feel open.
                </Text>

                <View style={{ gap: 14 }}>
                  {weeklyRows.map((row) => (
                    <View key={row.label} style={styles.hoursRow}>
                      <Pressable
                        onPress={() => toggleWeeklyDay(row.dayIndex)}
                        style={({ pressed }) => [
                          styles.dayToggle,
                          row.drafts.length ? styles.dayToggleActive : null,
                          webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.98 }),
                        ]}
                      >
                        {row.drafts.length ? (
                          <MaterialCommunityIcons name="check" size={15} color="#081120" />
                        ) : null}
                      </Pressable>

                      <View style={styles.dayLabelWrap}>
                        <Text style={styles.dayLabelText}>{row.label.toUpperCase()}</Text>
                      </View>

                      <View style={{ flex: 1, gap: 10 }}>
                        {row.drafts.length ? (
                          row.drafts.map((draft) => (
                            <View key={draft.id} style={styles.timeRangeRow}>
                              <View style={styles.inlineTimeField}>
                                <TextInput
                                  value={draft.startInput}
                                  onChangeText={(value) => updateDraft(draft.id, { startInput: value })}
                                  autoCapitalize="characters"
                                  autoCorrect={false}
                                  className="font-body text-[15px] text-cloud"
                                  placeholder="9:00 AM"
                                  placeholderTextColor="rgba(248,250,252,0.35)"
                                />
                              </View>
                              <Text style={styles.rangeDash}>-</Text>
                              <View style={styles.inlineTimeField}>
                                <TextInput
                                  value={draft.endInput}
                                  onChangeText={(value) => updateDraft(draft.id, { endInput: value })}
                                  autoCapitalize="characters"
                                  autoCorrect={false}
                                  className="font-body text-[15px] text-cloud"
                                  placeholder="5:00 PM"
                                  placeholderTextColor="rgba(248,250,252,0.35)"
                                />
                              </View>
                              <Pressable
                                onPress={() => removeWindow(draft.id)}
                                style={({ pressed }) => [
                                  styles.inlineIconButton,
                                  webPressableStyle(pressed, {
                                    pressedOpacity: 0.9,
                                    pressedScale: 0.97,
                                  }),
                                ]}
                              >
                                <MaterialCommunityIcons name="close" size={16} color="#E2E8F0" />
                              </Pressable>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.unavailableText}>Unavailable</Text>
                        )}
                      </View>

                      <Pressable
                        onPress={() => addWeeklyRange(row.dayIndex)}
                        style={({ pressed }) => [
                          styles.inlineIconButton,
                          webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                        ]}
                      >
                        <MaterialCommunityIcons name="plus" size={16} color="#E2E8F0" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.linkStrip}>
                <Text style={styles.moduleLabel}>DATE-SPECIFIC HOURS</Text>
                <Text style={styles.linkHint}>
                  Pick dates that should carry their own booking hours.
                </Text>

                <View style={styles.monthPickerRow}>
                  <Pressable
                    onPress={() =>
                      setSpecificMonth(
                        (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
                      )
                    }
                    style={({ pressed }) => [
                      styles.inlineIconButton,
                      webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                    ]}
                  >
                    <MaterialCommunityIcons name="chevron-left" size={18} color="#E2E8F0" />
                  </Pressable>

                  <Text style={styles.monthPickerLabel}>{specificMonthLabel}</Text>

                  <Pressable
                    onPress={() =>
                      setSpecificMonth(
                        (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
                      )
                    }
                    style={({ pressed }) => [
                      styles.inlineIconButton,
                      webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                    ]}
                  >
                    <MaterialCommunityIcons name="chevron-right" size={18} color="#E2E8F0" />
                  </Pressable>
                </View>

                <View style={styles.weekdayCalendarHeader}>
                  {weekdayOptionLabels.map((day) => (
                    <Text key={day} style={styles.weekdayHeaderText}>
                      {day.toUpperCase()}
                    </Text>
                  ))}
                </View>

                <View style={styles.specificCalendarGrid}>
                  {specificCalendarDays.map((cell) => {
                    const active = cell.dayNumber !== null && cell.dayNumber === selectedSpecificDate;
                    const hasHours = cell.dayNumber !== null && specificDatesSet.has(cell.dayNumber);

                    return (
                      <Pressable
                        key={cell.key}
                        disabled={cell.dayNumber === null}
                        onPress={() => cell.dayNumber !== null && setSelectedSpecificDate(cell.dayNumber)}
                        style={({ pressed }) => [
                          styles.specificCalendarCell,
                          active ? styles.specificCalendarCellActive : null,
                          hasHours ? styles.specificCalendarCellFilled : null,
                          cell.dayNumber === null ? styles.specificCalendarCellBlank : null,
                          webPressableStyle(pressed, {
                            disabled: cell.dayNumber === null,
                            pressedOpacity: 0.92,
                            pressedScale: 0.98,
                          }),
                        ]}
                      >
                        <Text
                          style={[
                            styles.specificCalendarText,
                            active ? styles.specificCalendarTextActive : null,
                          ]}
                        >
                          {cell.dayNumber ?? ""}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={{ gap: 10 }}>
                  {selectedSpecificDrafts.length ? (
                    selectedSpecificDrafts.map((draft) => (
                      <View key={draft.id} style={styles.timeRangeRow}>
                        <View style={styles.inlineTimeField}>
                          <TextInput
                            value={draft.startInput}
                            onChangeText={(value) => updateDraft(draft.id, { startInput: value })}
                            autoCapitalize="characters"
                            autoCorrect={false}
                            className="font-body text-[15px] text-cloud"
                            placeholder="9:00 AM"
                            placeholderTextColor="rgba(248,250,252,0.35)"
                          />
                        </View>
                        <Text style={styles.rangeDash}>-</Text>
                        <View style={styles.inlineTimeField}>
                          <TextInput
                            value={draft.endInput}
                            onChangeText={(value) => updateDraft(draft.id, { endInput: value })}
                            autoCapitalize="characters"
                            autoCorrect={false}
                            className="font-body text-[15px] text-cloud"
                            placeholder="5:00 PM"
                            placeholderTextColor="rgba(248,250,252,0.35)"
                          />
                        </View>
                        <Pressable
                          onPress={() => removeWindow(draft.id)}
                          style={({ pressed }) => [
                            styles.inlineIconButton,
                            webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                          ]}
                        >
                          <MaterialCommunityIcons name="close" size={16} color="#E2E8F0" />
                        </Pressable>
                      </View>
                    ))
                  ) : (
                    <Pressable
                      onPress={() => addSpecificDateRange(selectedSpecificDate ?? specificMonth.getDate())}
                      style={({ pressed }) => [
                        styles.linkPill,
                        webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.985 }),
                      ]}
                    >
                      <Text style={styles.linkPillText}>Add hours for this date</Text>
                    </Pressable>
                  )}
                </View>
              </View>

              <View style={styles.previewShell}>
                <Text style={styles.moduleLabel}>HANGOUT SETUP</Text>
                <Text style={styles.linkHint}>
                  Name the hangout, add a description, and preview the booking link.
                </Text>

                <View style={styles.formatRow}>
                  {[
                    {
                      key: "ONE_ON_ONE",
                      title: "1:1 hangout",
                      subtitle: "One host with one invitee",
                      icon: "account-switch-outline",
                    },
                    {
                      key: "GROUP",
                      title: "Group hangout",
                      subtitle: "One host with multiple people",
                      icon: "account-group-outline",
                    },
                  ].map((option) => (
                    <Pressable
                      key={option.key}
                      onPress={() => setHangoutFormat(option.key as "ONE_ON_ONE" | "GROUP")}
                      style={({ pressed }) => [
                        styles.formatCard,
                        hangoutFormat === option.key ? styles.formatCardActive : null,
                        webPressableStyle(pressed, { pressedOpacity: 0.94, pressedScale: 0.985 }),
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={option.icon as "account-switch-outline" | "account-group-outline"}
                        size={20}
                        color="#F8FAFC"
                      />
                      <Text style={styles.formatCardTitle}>{option.title}</Text>
                      <Text style={styles.formatCardSubtitle}>{option.subtitle}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.noteField}>
                  <TextInput
                    value={hangoutTitle}
                    onChangeText={setHangoutTitle}
                    className="font-body text-base text-cloud"
                    placeholder="Coffee run, quick bite, after class walk..."
                    placeholderTextColor="rgba(248,250,252,0.35)"
                  />
                </View>

                <View style={styles.descriptionField}>
                  <TextInput
                    value={hangoutDescription}
                    onChangeText={setHangoutDescription}
                    multiline
                    textAlignVertical="top"
                    className="font-body text-base leading-6 text-cloud"
                    placeholder="Say what you're proposing to do and keep the vibe clear."
                    placeholderTextColor="rgba(248,250,252,0.35)"
                  />
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

                <View style={styles.previewBookingCard}>
                  <View style={styles.previewBookingHeader}>
                    <View style={styles.previewAvatar}>
                      <Text style={styles.previewAvatarText}>
                        {(user?.name?.[0] ?? "N").toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.previewName}>{user?.name ?? "You"}</Text>
                      <Text style={styles.previewTitleLarge}>
                        {hangoutTitle.trim() || "Quick catch-up"}
                      </Text>
                      <Text style={styles.previewDescriptionText}>
                        {hangoutDescription.trim() ||
                          "Pick an easy time and we can see what sticks."}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.previewCalendarBlock}>
                    <Text style={styles.previewMonthLabel}>{specificMonthLabel}</Text>
                    <View style={styles.weekdayCalendarHeader}>
                      {weekdayOptionLabels.map((day) => (
                        <Text key={day} style={styles.weekdayHeaderText}>
                          {day.toUpperCase()}
                        </Text>
                      ))}
                    </View>
                    <View style={styles.specificCalendarGrid}>
                      {specificCalendarDays.map((cell) => {
                        const filled =
                          cell.dayNumber !== null &&
                          (specificDatesSet.has(cell.dayNumber) || cell.dayNumber === selectedSpecificDate);

                        return (
                          <View
                            key={`preview-${cell.key}`}
                            style={[
                              styles.previewCalendarCell,
                              filled ? styles.previewCalendarCellFilled : null,
                            ]}
                          >
                            <Text style={styles.previewCalendarText}>{cell.dayNumber ?? ""}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.previewTimesRow}>
                    {previewWindows.length ? (
                      previewWindows.map((draft) => (
                        <View key={draft.id} style={styles.previewTimePill}>
                          <Text style={styles.previewTimeText}>
                            {windowDayLabel(draft)} - {windowTimeLabel(draft)}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.previewEmpty}>
                        Your booking preview will fill in as soon as you add hours.
                      </Text>
                    )}
                  </View>
                </View>
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
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    className="font-body text-base text-cloud"
                                    placeholder="6:00 PM"
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
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    className="font-body text-base text-cloud"
                                    placeholder="8:00 PM"
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
  previewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(124,58,237,0.24)",
  },
  previewAvatarText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
  },
  previewBookingBlock: {
    gap: 12,
  },
  previewBookingCard: {
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  previewBookingHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  previewCalendarBlock: {
    gap: 10,
  },
  previewCalendarCell: {
    width: "13.2%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  previewCalendarCellFilled: {
    backgroundColor: "rgba(124,58,237,0.18)",
  },
  previewCalendarText: {
    color: "rgba(248,250,252,0.78)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
  },
  previewDescriptionText: {
    color: "rgba(248,250,252,0.66)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  previewMonthLabel: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
  },
  previewTimePill: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  previewTimesRow: {
    gap: 8,
  },
  previewTimeText: {
    color: "rgba(248,250,252,0.82)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  previewTitleLarge: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
    lineHeight: 24,
  },
  screen: {
    flex: 1,
  },
  dayLabelText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 13,
  },
  dayLabelWrap: {
    width: 44,
  },
  dayToggle: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(248,250,252,0.22)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  dayToggleActive: {
    borderColor: "rgba(231,217,255,0.92)",
    backgroundColor: "#E7D9FF",
  },
  descriptionField: {
    minHeight: 120,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  formatCard: {
    flex: 1,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  formatCardActive: {
    backgroundColor: "rgba(124,58,237,0.18)",
    shadowColor: nowlyColors.violet,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10,
    },
  },
  formatCardSubtitle: {
    color: "rgba(248,250,252,0.62)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  formatCardTitle: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
  },
  formatRow: {
    flexDirection: "row",
    gap: 12,
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  inlineIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  inlineTimeField: {
    minWidth: 82,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  monthPickerLabel: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
  },
  monthPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rangeDash: {
    color: "rgba(248,250,252,0.58)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 16,
    paddingTop: 10,
  },
  specificCalendarCell: {
    width: "13.2%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  specificCalendarCellActive: {
    backgroundColor: "#E7D9FF",
  },
  specificCalendarCellBlank: {
    backgroundColor: "transparent",
  },
  specificCalendarCellFilled: {
    backgroundColor: "rgba(124,58,237,0.16)",
  },
  specificCalendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  specificCalendarText: {
    color: "rgba(248,250,252,0.78)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 14,
  },
  specificCalendarTextActive: {
    color: "#081120",
    fontFamily: "SpaceGrotesk_700Bold",
  },
  timeRangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  unavailableText: {
    color: "rgba(248,250,252,0.48)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    paddingTop: 10,
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
  weekdayCalendarHeader: {
    flexDirection: "row",
    gap: 8,
  },
  weekdayHeaderText: {
    flex: 1,
    textAlign: "center",
    color: "rgba(248,250,252,0.4)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 11,
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
