import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { MobileBookableSlot, MobileBookingProfile } from "@nowly/shared";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { PillButton } from "../../components/ui/PillButton";
import { useResponsiveLayout } from "../../components/ui/useResponsiveLayout";
import { nowlyColors } from "../../constants/theme";
import { api } from "../../lib/api";
import { hangoutIntentLabel, vibeLabel } from "../../lib/labels";
import { createSmartOpenUrl } from "../../lib/smart-links";
import { useAppStore } from "../../store/useAppStore";

type BookingSurfaceProps = {
  inviteCode?: string | null;
  mode: "preview" | "booking";
};

type DayGroup = {
  key: string;
  monthKey: string;
  date: Date;
  slots: MobileBookableSlot[];
  recommended: boolean;
};

const weekdayHeaders = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

const readErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "Something went sideways. Try again in a second.";
  }

  try {
    const parsed = JSON.parse(error.message) as { error?: string };
    return parsed.error || error.message;
  } catch {
    return error.message;
  }
};

const toDayKey = (value: string) => {
  const date = new Date(value);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const toMonthKey = (value: string) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const parseMonthKey = (value: string | null) => {
  if (!value) {
    return null;
  }

  const [year, month] = value.split("-").map(Number);
  return year && month ? new Date(year, month - 1, 1) : null;
};

const formatMonthLabel = (date: Date) =>
  date.toLocaleDateString([], { month: "long", year: "numeric" });

const formatTimeLabel = (value: string) =>
  new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const formatSelectionSummary = (slot: MobileBookableSlot) =>
  `${new Date(slot.startsAt).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} - ${formatTimeLabel(slot.startsAt)}`;

const buildTimezoneLabel = () => {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";
  if (zone.includes("New_York")) return "Eastern Time - US & Canada";
  if (zone.includes("Chicago")) return "Central Time - US & Canada";
  if (zone.includes("Denver")) return "Mountain Time - US & Canada";
  if (zone.includes("Los_Angeles")) return "Pacific Time - US & Canada";
  return zone.replaceAll("_", " ");
};

export const BookingSurface = ({ inviteCode, mode }: BookingSurfaceProps) => {
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const bookingSetup = useAppStore((state) => state.bookingSetup);
  const upsertHangout = useAppStore((state) => state.upsertHangout);
  const layout = useResponsiveLayout();
  const [bookingProfile, setBookingProfile] = useState<MobileBookingProfile | null>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isHostViewingOwnLink = Boolean(
    user?.id && bookingProfile?.host.id && user.id === bookingProfile.host.id,
  );
  const isPreview = mode === "preview" || isHostViewingOwnLink;

  useEffect(() => {
    if (!inviteCode) {
      setLoading(false);
      setErrorMessage(mode === "preview" ? "Your booking link is not ready yet." : "This availability link is missing a code.");
      return;
    }

    let active = true;
    setLoading(true);
    setErrorMessage(null);

    api.fetchBookingProfile(token, inviteCode)
      .then((profile) => active && setBookingProfile(profile))
      .catch((error) => active && setErrorMessage(readErrorMessage(error)))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [inviteCode, mode, token]);

  const dayGroups = useMemo<DayGroup[]>(() => {
    if (!bookingProfile) return [];
    const map = new Map<string, DayGroup>();

    bookingProfile.slots.forEach((slot) => {
      const key = toDayKey(slot.startsAt);
      const current = map.get(key);
      if (current) {
        current.slots.push(slot);
        current.recommended = current.recommended || slot.mutualFit || (slot.score ?? 0) >= 0.72;
        return;
      }

      map.set(key, {
        key,
        monthKey: toMonthKey(slot.startsAt),
        date: new Date(slot.startsAt),
        slots: [slot],
        recommended: slot.mutualFit || (slot.score ?? 0) >= 0.72,
      });
    });

    return [...map.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [bookingProfile]);

  const monthGroups = useMemo(
    () =>
      dayGroups.reduce<Array<{ key: string; label: string }>>((list, group) => {
        if (list.some((item) => item.key === group.monthKey)) return list;
        return [...list, { key: group.monthKey, label: formatMonthLabel(group.date) }];
      }, []),
    [dayGroups],
  );

  useEffect(() => {
    setSelectedMonthKey(dayGroups[0]?.monthKey ?? null);
    setSelectedDayKey(dayGroups[0]?.key ?? null);
    setSelectedSlotIds([]);
  }, [dayGroups]);

  const visibleDays = useMemo(
    () => (selectedMonthKey ? dayGroups.filter((group) => group.monthKey === selectedMonthKey) : dayGroups),
    [dayGroups, selectedMonthKey],
  );

  useEffect(() => {
    if (visibleDays.length && !visibleDays.some((group) => group.key === selectedDayKey)) {
      setSelectedDayKey(visibleDays[0].key);
    }
  }, [selectedDayKey, visibleDays]);

  const selectedMonthDate = useMemo(
    () => parseMonthKey(selectedMonthKey ?? monthGroups[0]?.key ?? null),
    [monthGroups, selectedMonthKey],
  );
  const currentMonthIndex = monthGroups.findIndex((group) => group.key === selectedMonthKey);
  const selectedDay = dayGroups.find((group) => group.key === selectedDayKey) ?? visibleDays[0] ?? null;
  const selectedDaySlots = selectedDay?.slots ?? [];
  const selectedSlots = selectedSlotIds
    .map((id) => bookingProfile?.slots.find((slot) => slot.id === id) ?? null)
    .filter(Boolean) as MobileBookableSlot[];
  const highlightSlot = bookingProfile?.slots[0] ?? null;
  const emptyState = !loading && !errorMessage && !bookingProfile?.slots.length;
  const timezoneLabel = useMemo(buildTimezoneLabel, []);
  const title =
    bookingSetup.title.trim() ||
    highlightSlot?.sourceLabel ||
    (highlightSlot?.hangoutIntent ? hangoutIntentLabel(highlightSlot.hangoutIntent) : "Quick catch-up");
  const description =
    bookingSetup.description.trim() ||
    (highlightSlot?.summary ?? "Pick an easy time and we can see what sticks.");
  const previewTags = [
    bookingSetup.format === "GROUP" ? "Group hangout" : "1:1 hangout",
    highlightSlot?.hangoutIntent ? hangoutIntentLabel(highlightSlot.hangoutIntent) : null,
    highlightSlot?.vibe ? vibeLabel(highlightSlot.vibe) : null,
  ].filter(Boolean) as string[];
  const calendarDays = useMemo(() => {
    if (!selectedMonthDate) {
      return [] as Array<{ key: string; dayNumber: number | null; group: DayGroup | null }>;
    }

    const year = selectedMonthDate.getFullYear();
    const month = selectedMonthDate.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay();
    const byDayNumber = new Map<number, DayGroup>();

    visibleDays.forEach((group) => {
      byDayNumber.set(group.date.getDate(), group);
    });

    const cells: Array<{ key: string; dayNumber: number | null; group: DayGroup | null }> =
      Array.from({ length: firstWeekday }, (_, index) => ({
      key: `blank-${index}`,
      dayNumber: null,
      group: null,
      }));

    for (let dayNumber = 1; dayNumber <= totalDays; dayNumber += 1) {
      cells.push({
        key: `${selectedMonthKey ?? "month"}-${dayNumber}`,
        dayNumber,
        group: byDayNumber.get(dayNumber) ?? null,
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({
        key: `trail-${cells.length}`,
        dayNumber: null,
        group: null,
      });
    }

    return cells;
  }, [selectedMonthDate, selectedMonthKey, visibleDays]);

  const timePillWidth =
    ((layout.isDesktop ? layout.rightColumnWidth : layout.shellWidth) - 12) / 2;

  const handleSignIn = () => {
    if (!inviteCode) {
      return;
    }

    router.push(
      {
        pathname: "/onboarding",
        params: { bookingInviteCode: inviteCode },
      } as never,
    );
  };

  const handleShareTimes = async () => {
    if (!inviteCode) {
      return;
    }

    const link = createSmartOpenUrl(`/booking/${inviteCode}`);
    const text = !selectedSlots.length
      ? "A few easy Nowly times are open."
      : selectedSlots.length === 1
        ? `A good time to catch: ${formatSelectionSummary(selectedSlots[0])}.`
        : `A couple of easy options: ${selectedSlots
            .slice(0, 3)
            .map((slot) => formatSelectionSummary(slot))
            .join(", ")}.`;

    await Share.share({
      message: `${text} Pick what works best here: ${link}`,
    });
  };

  const handleBookSlot = async () => {
    if (!inviteCode || !selectedSlots[0]) {
      Alert.alert("Pick a time first", "Choose a time before locking it in.");
      return;
    }

    if (!token) {
      handleSignIn();
      return;
    }

    setSubmitting(true);

    try {
      const slot = selectedSlots[0];
      const hangout = await api.bookSharedAvailability(token, inviteCode, {
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
      });

      upsertHangout(hangout);
      router.replace(`/proposal/${hangout.id}` as never);
    } catch (error) {
      Alert.alert("Couldn't lock that time", readErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSlot = (slot: MobileBookableSlot) => {
    if (isPreview) {
      setSelectedSlotIds((current) =>
        current.includes(slot.id)
          ? current.filter((item) => item !== slot.id)
          : [...current, slot.id],
      );
      return;
    }

    setSelectedSlotIds((current) => (current[0] === slot.id ? [] : [slot.id]));
  };

  const rootStyle = layout.isDesktop
    ? {
        flexDirection: "row" as const,
        alignItems: "flex-start" as const,
        gap: layout.splitGap,
      }
    : undefined;
  const summaryLabel =
    selectedSlots.length === 0
      ? "Pick one or a couple of times."
      : selectedSlots.length === 1
        ? formatSelectionSummary(selectedSlots[0])
        : `Suggest ${selectedSlots.length} times`;
  const primaryLabel = isPreview
    ? "Send hang invite"
    : token
      ? "Lock it in"
      : "Sign in to lock it in";
  return (
    <GradientMesh>
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            alignItems: "center",
            paddingBottom: emptyState ? 120 : 210,
            paddingHorizontal: layout.screenPadding,
            paddingTop: layout.isDesktop ? 28 : 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[{ width: layout.shellWidth, gap: layout.sectionGap }, rootStyle]}>
            <View style={{ width: layout.leftColumnWidth, gap: layout.sectionGap }}>
              <View className="min-h-[52px] flex-row items-center gap-3">
                <Pressable onPress={() => router.back()} style={styles.iconButton}>
                  <MaterialCommunityIcons name="chevron-left" size={24} color="#F7FBFF" />
                </Pressable>

                <View className="flex-1 items-center">
                  <Text className="font-display text-2xl text-cloud">Find a time to hang</Text>
                  <Text className="mt-1 font-body text-[13px] text-white/60">
                    {emptyState
                      ? isPreview
                        ? "No hang windows yet."
                        : "No hang windows open right now."
                      : "Select a date and then a time."}
                  </Text>
                </View>

                {isPreview ? (
                  <Pressable onPress={() => void handleShareTimes()} style={styles.iconButton}>
                    <MaterialCommunityIcons
                      name="share-variant-outline"
                      size={18}
                      color="rgba(247,251,255,0.76)"
                    />
                  </Pressable>
                ) : (
                  <View style={styles.iconButton} />
                )}
              </View>

              <View style={styles.heroShell}>
                <LinearGradient
                  colors={["rgba(20,16,50,0.94)", "rgba(40,28,92,0.82)", "rgba(9,15,28,0.96)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroCard}
                >
                  <View style={styles.heroGlow} pointerEvents="none" />
                  <View className="flex-row items-center gap-4">
                    <View style={styles.avatarShell}>
                      {bookingProfile?.host.photoUrl ? (
                        <Image source={{ uri: bookingProfile.host.photoUrl }} resizeMode="cover" style={styles.avatarImage} />
                      ) : (
                        <View style={styles.avatarFallback}>
                          <Text style={styles.avatarInitial}>
                            {(bookingProfile?.host.name?.[0] ?? user?.name?.[0] ?? "N").toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="font-display text-xl text-cloud">
                        {bookingProfile?.host.name ?? user?.name ?? "Nowly friend"}
                      </Text>
                      <Text className="mt-1 font-body text-[13px] text-white/58">
                        {bookingProfile?.host.communityTag || bookingProfile?.host.city || "Nearby"}
                      </Text>
                    </View>
                  </View>

                  <View className="gap-2">
                    <Text className="font-body text-xs tracking-[2px] text-violet/85">
                      {isPreview ? "BOOKING PREVIEW" : "HANGOUT PROPOSAL"}
                    </Text>
                    <Text className="font-display text-[30px] leading-[34px] text-cloud">{title}</Text>
                    <Text className="font-body text-sm leading-6 text-white/72">{description}</Text>
                  </View>

                  {previewTags.length ? (
                    <View className="flex-row flex-wrap gap-2">
                      {previewTags.map((tag) => (
                        <View key={tag} className="rounded-full bg-white/10 px-3 py-2">
                          <Text className="font-body text-xs text-cloud">{tag}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </LinearGradient>
              </View>

              {loading ? (
                <View className="rounded-[24px] bg-white/5 p-4">
                  <Text className="font-display text-xl text-cloud">Loading open times...</Text>
                </View>
              ) : errorMessage ? (
                <View className="rounded-[24px] bg-white/5 p-4">
                  <Text className="font-display text-xl text-cloud">
                    {mode === "preview" ? "Booking preview is not ready" : "This link is not ready"}
                  </Text>
                  <Text className="mt-2 font-body text-sm leading-6 text-white/64">{errorMessage}</Text>
                  {mode === "preview" ? (
                    <View className="mt-4">
                      <PillButton label="Set your hang rhythm" onPress={() => router.push("/availability-preferences")} />
                    </View>
                  ) : null}
                </View>
              ) : emptyState ? (
                <View className="rounded-[24px] bg-white/5 p-4">
                  <Text className="font-display text-xl text-cloud">Open a hang window</Text>
                  <Text className="mt-2 font-body text-sm leading-6 text-white/64">
                    {isPreview
                      ? "Add weekly hours or date-based hours in Hang Rhythm so this page becomes bookable."
                      : "This booking link does not have any open hang windows right now."}
                  </Text>
                  <View className="mt-4">
                    <PillButton
                      label={isPreview ? "Set your hang rhythm" : "Decline invite"}
                      onPress={() =>
                        isPreview
                          ? router.push("/availability-preferences")
                          : router.replace((token ? "/home" : "/") as never)
                      }
                    />
                  </View>
                </View>
              ) : (
                <View className="gap-4">
                  <View className="gap-1.5">
                    <Text className="font-display text-lg text-cloud">Choose a day</Text>
                    <Text className="font-body text-[13px] leading-5 text-white/58">
                      Use the calendar first, then pick a time below.
                    </Text>
                  </View>

                  <View className="rounded-[28px] bg-white/4 p-[18px]">
                    <View className="flex-row items-center justify-between">
                      <Pressable
                        onPress={() => {
                          if (currentMonthIndex <= 0) return;
                          const previousMonth = monthGroups[currentMonthIndex - 1];
                          setSelectedMonthKey(previousMonth.key);
                          setSelectedDayKey(dayGroups.find((group) => group.monthKey === previousMonth.key)?.key ?? null);
                        }}
                        style={styles.monthAction}
                      >
                        <MaterialCommunityIcons name="chevron-left" size={18} color="#E2E8F0" />
                      </Pressable>
                      <Text className="font-display text-[15px] text-white/88">
                        {selectedMonthDate ? formatMonthLabel(selectedMonthDate) : "Choose a month"}
                      </Text>
                      <Pressable
                        onPress={() => {
                          if (currentMonthIndex < 0 || currentMonthIndex >= monthGroups.length - 1) return;
                          const nextMonth = monthGroups[currentMonthIndex + 1];
                          setSelectedMonthKey(nextMonth.key);
                          setSelectedDayKey(dayGroups.find((group) => group.monthKey === nextMonth.key)?.key ?? null);
                        }}
                        style={styles.monthAction}
                      >
                        <MaterialCommunityIcons name="chevron-right" size={18} color="#E2E8F0" />
                      </Pressable>
                    </View>

                    <View className="mt-4 flex-row gap-2">
                      {weekdayHeaders.map((label) => (
                        <Text key={label} className="flex-1 text-center font-body text-[11px] text-white/42">
                          {label}
                        </Text>
                      ))}
                    </View>

                    <View className="mt-3 flex-row flex-wrap gap-2">
                      {calendarDays.map((cell) => {
                        const active = cell.group?.key === selectedDayKey;
                        const available = Boolean(cell.group);

                        return (
                          <Pressable
                            key={cell.key}
                            disabled={!available}
                            onPress={() => cell.group && setSelectedDayKey(cell.group.key)}
                            style={[
                              styles.calendarCell,
                              active ? styles.calendarCellActive : null,
                              !available ? styles.calendarCellDisabled : null,
                            ]}
                          >
                            {active ? (
                              <LinearGradient
                                colors={["rgba(247,251,255,0.98)", "rgba(231,217,255,0.94)", "rgba(196,181,253,0.9)"]}
                                style={StyleSheet.absoluteFillObject}
                              />
                            ) : null}
                            <Text style={[styles.calendarText, active ? styles.calendarTextActive : null]}>
                              {cell.dayNumber ?? ""}
                            </Text>
                            {cell.group?.recommended ? (
                              <View style={[styles.dot, active ? styles.dotActive : null]} />
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>
              )}
            </View>

            {!loading && !errorMessage && !emptyState ? (
              <View style={{ width: layout.rightColumnWidth, gap: layout.sectionGap }}>
                <View className="gap-1.5">
                  <Text className="font-display text-lg text-cloud">Times that could work</Text>
                  <Text className="font-body text-[13px] leading-5 text-white/58">
                    {isPreview ? "Pick one or a couple to send out." : "Choose one or decline."}
                  </Text>
                </View>

                <Animated.View
                  key={selectedDayKey ?? "empty-day"}
                  entering={FadeIn.duration(160)}
                  exiting={FadeOut.duration(120)}
                  style={styles.timeGrid}
                >
                  {selectedDaySlots.length ? (
                    selectedDaySlots.map((slot) => {
                      const active = selectedSlotIds.includes(slot.id);

                      return (
                        <Pressable
                          key={slot.id}
                          onPress={() => toggleSlot(slot)}
                          style={[
                            styles.timePill,
                            { width: timePillWidth },
                            active ? styles.timePillActive : styles.timePillIdle,
                          ]}
                        >
                          {active ? (
                            <LinearGradient
                              colors={["rgba(247,251,255,0.98)", "rgba(231,217,255,0.94)", "rgba(196,181,253,0.9)"]}
                              style={StyleSheet.absoluteFillObject}
                            />
                          ) : null}
                          <Text style={[styles.timeText, active ? styles.timeTextActive : null]}>
                            {formatTimeLabel(slot.startsAt)}
                          </Text>
                          {active ? (
                            <MaterialCommunityIcons name="check-circle" size={16} color="#081120" />
                          ) : slot.mutualFit ? (
                            <View style={styles.slotGlowDot} />
                          ) : null}
                        </Pressable>
                      );
                    })
                  ) : (
                    <View className="rounded-[24px] bg-white/5 p-4">
                      <Text className="font-body text-sm leading-6 text-white/64">
                        No open times land on this day yet. Try another date.
                      </Text>
                    </View>
                  )}
                </Animated.View>

                <View className="mt-1 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <MaterialCommunityIcons name="earth" size={14} color="rgba(247,251,255,0.58)" />
                    <Text className="font-body text-[13px] text-white/64">{timezoneLabel}</Text>
                  </View>
                  {!isPreview ? (
                    <Pressable onPress={() => router.replace((token ? "/home" : "/") as never)}>
                      <Text className="font-body text-[13px] text-white/66">Decline invite</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>

        {!loading && !errorMessage && !emptyState ? (
          <View pointerEvents="box-none" style={[styles.footerDockWrap, { paddingHorizontal: layout.screenPadding }]}>
            <View style={{ width: layout.shellWidth, alignItems: layout.isDesktop ? "flex-end" : "center" }}>
              <LinearGradient
                colors={["rgba(4,8,20,0.00)", "rgba(4,8,20,0.74)", "rgba(4,8,20,0.94)"]}
                style={[styles.footerFade, { width: layout.isDesktop ? layout.rightColumnWidth : layout.shellWidth }]}
              >
                <View style={styles.footerCard}>
                  <Text className="pb-[10px] text-center font-body text-[13px] text-white/72">
                    {summaryLabel}
                  </Text>
                  <Pressable
                    onPress={() => {
                      if (!selectedSlots.length || submitting || loading) return;
                      if (isPreview) {
                        void handleShareTimes();
                        return;
                      }
                      void handleBookSlot();
                    }}
                    disabled={!selectedSlots.length || submitting || loading}
                    style={[styles.primaryButton, !selectedSlots.length || submitting || loading ? { opacity: 0.74 } : null]}
                  >
                    <LinearGradient
                      colors={
                        !selectedSlots.length || submitting || loading
                          ? ["rgba(255,255,255,0.16)", "rgba(255,255,255,0.12)"]
                          : ["#F7FBFF", "#E7D9FF", "#C4B5FD"]
                      }
                      style={StyleSheet.absoluteFillObject}
                    />
                    <Text style={[styles.primaryButtonText, !selectedSlots.length || submitting || loading ? { color: "rgba(247,251,255,0.68)" } : null]}>
                      {submitting ? "Locking it in..." : primaryLabel}
                    </Text>
                  </Pressable>
                  <Text className="pt-[10px] text-center font-body text-xs text-white/50">
                    {isPreview
                      ? "They'll pick what works best."
                      : "Low pressure either way. You can decline the proposal too."}
                  </Text>
                </View>
              </LinearGradient>
            </View>
          </View>
        ) : null}
      </View>
    </GradientMesh>
  );
};

const styles = StyleSheet.create({
  avatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitial: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 24,
  },
  avatarShell: {
    width: 68,
    height: 68,
    overflow: "hidden",
    borderRadius: 34,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  calendarCell: {
    width: "13.2%",
    aspectRatio: 1,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  calendarCellActive: {
    shadowColor: nowlyColors.glow,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  calendarCellDisabled: {
    opacity: 0.22,
  },
  calendarText: {
    color: "rgba(247,251,255,0.7)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 15,
  },
  calendarTextActive: {
    color: "#081120",
    fontFamily: "SpaceGrotesk_700Bold",
  },
  dot: {
    position: "absolute",
    bottom: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#A78BFA",
  },
  dotActive: {
    backgroundColor: "#081120",
  },
  footerCard: {
    borderRadius: 30,
    backgroundColor: "rgba(8,14,28,0.76)",
    padding: 8,
  },
  footerDockWrap: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
  },
  footerFade: {
    paddingTop: 26,
    paddingBottom: 18,
  },
  heroCard: {
    minHeight: 220,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 18,
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -54,
    right: -32,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(167,139,250,0.14)",
  },
  heroShell: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: nowlyColors.glow,
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  monthAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  primaryButton: {
    height: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  primaryButtonText: {
    color: "#081120",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
  },
  slotGlowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#A78BFA",
    shadowColor: nowlyColors.violet,
    shadowOpacity: 0.48,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  timePill: {
    height: 52,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    overflow: "hidden",
    paddingHorizontal: 14,
  },
  timePillActive: {
    shadowColor: nowlyColors.glow,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  timePillIdle: {
    backgroundColor: "rgba(255,255,255,0.05)",
    opacity: 0.92,
  },
  timeText: {
    color: "rgba(247,251,255,0.88)",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
  },
  timeTextActive: {
    color: "#081120",
  },
});
