import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import type { MobileBookableSlot, MobileBookingProfile } from "@nowly/shared";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { useResponsiveLayout } from "../../components/ui/useResponsiveLayout";
import { nowlyColors } from "../../constants/theme";
import { api } from "../../lib/api";
import { hangoutIntentLabel, vibeLabel } from "../../lib/labels";
import { createSmartOpenUrl } from "../../lib/smart-links";
import { webPressableStyle } from "../../lib/web-pressable";
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

const readErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "Something went sideways. Try again in a second.";
  }

  try {
    const parsed = JSON.parse(error.message) as { error?: string };
    if (parsed.error) {
      return parsed.error;
    }
  } catch {
    return error.message;
  }

  return error.message;
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

const formatMonthLabel = (date: Date) =>
  date.toLocaleDateString([], {
    month: "long",
    year: "numeric",
  });

const formatDayAbbr = (date: Date) =>
  date.toLocaleDateString([], {
    weekday: "short",
  });

const formatDayNumber = (date: Date) =>
  date.toLocaleDateString([], {
    day: "numeric",
  });

const formatTimeLabel = (value: string) =>
  new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

const formatSelectionSummary = (slot: MobileBookableSlot) =>
  `${new Date(slot.startsAt).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} · ${formatTimeLabel(slot.startsAt)}`;

const formatShareSlot = (slot: MobileBookableSlot) =>
  `${new Date(slot.startsAt).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} at ${formatTimeLabel(slot.startsAt)}`;

const buildTimezoneLabel = () => {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";

  if (zone.includes("New_York")) {
    return "Eastern Time · US & Canada";
  }

  if (zone.includes("Chicago")) {
    return "Central Time · US & Canada";
  }

  if (zone.includes("Denver")) {
    return "Mountain Time · US & Canada";
  }

  if (zone.includes("Los_Angeles")) {
    return "Pacific Time · US & Canada";
  }

  return zone.replaceAll("_", " ");
};

export const BookingSurface = ({ inviteCode, mode }: BookingSurfaceProps) => {
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
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
      setErrorMessage(
        mode === "preview"
          ? "Your booking link is not ready yet."
          : "This availability link is missing a code.",
      );
      return;
    }

    let active = true;
    setLoading(true);
    setErrorMessage(null);

    api
      .fetchBookingProfile(token, inviteCode)
      .then((profile) => {
        if (!active) {
          return;
        }

        setBookingProfile(profile);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setErrorMessage(readErrorMessage(error));
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [inviteCode, mode, token]);

  const dayGroups = useMemo<DayGroup[]>(() => {
    if (!bookingProfile) {
      return [];
    }

    const map = new Map<string, DayGroup>();

    bookingProfile.slots.forEach((slot) => {
      const key = toDayKey(slot.startsAt);
      const monthKey = toMonthKey(slot.startsAt);
      const current = map.get(key);

      if (current) {
        current.slots.push(slot);
        current.recommended =
          current.recommended || slot.mutualFit || (slot.score ?? 0) >= 0.72;
        return;
      }

      map.set(key, {
        key,
        monthKey,
        date: new Date(slot.startsAt),
        slots: [slot],
        recommended: slot.mutualFit || (slot.score ?? 0) >= 0.72,
      });
    });

    return [...map.values()].sort((left, right) => left.date.getTime() - right.date.getTime());
  }, [bookingProfile]);

  const monthGroups = useMemo(
    () =>
      dayGroups.reduce<Array<{ key: string; label: string }>>((list, group) => {
        if (list.some((item) => item.key === group.monthKey)) {
          return list;
        }

        return [
          ...list,
          {
            key: group.monthKey,
            label: formatMonthLabel(group.date),
          },
        ];
      }, []),
    [dayGroups],
  );

  useEffect(() => {
    setSelectedMonthKey(dayGroups[0]?.monthKey ?? null);
    setSelectedDayKey(dayGroups[0]?.key ?? null);
    setSelectedSlotIds([]);
  }, [dayGroups]);

  const visibleDays = useMemo(
    () =>
      selectedMonthKey
        ? dayGroups.filter((group) => group.monthKey === selectedMonthKey)
        : dayGroups,
    [dayGroups, selectedMonthKey],
  );

  useEffect(() => {
    if (!visibleDays.length) {
      return;
    }

    if (!visibleDays.some((group) => group.key === selectedDayKey)) {
      setSelectedDayKey(visibleDays[0].key);
    }
  }, [selectedDayKey, visibleDays]);

  const currentMonthIndex = monthGroups.findIndex((group) => group.key === selectedMonthKey);
  const selectedDay =
    dayGroups.find((group) => group.key === selectedDayKey) ?? visibleDays[0] ?? null;
  const selectedDaySlots = selectedDay?.slots ?? [];
  const selectedSlots = selectedSlotIds
    .map((id) => bookingProfile?.slots.find((slot) => slot.id === id) ?? null)
    .filter(Boolean) as MobileBookableSlot[];
  const highlightSlot = bookingProfile?.slots[0] ?? null;
  const mutualCount = bookingProfile?.slots.filter((slot) => slot.mutualFit).length ?? 0;
  const timezoneLabel = useMemo(buildTimezoneLabel, []);
  const heroTags = [
    highlightSlot?.hangoutIntent ? hangoutIntentLabel(highlightSlot.hangoutIntent) : null,
    highlightSlot?.vibe ? vibeLabel(highlightSlot.vibe) : null,
    bookingProfile?.host.communityTag || bookingProfile?.host.city || null,
  ].filter(Boolean) as string[];
  const heroTitle = !bookingProfile?.slots.length
    ? "Open a hang window"
    : mutualCount
      ? "Strong overlap tonight"
      : "Easy times to link up";
  const heroSupport = !bookingProfile?.slots.length
    ? isPreview
      ? "Add a couple of windows in Hang Rhythm and your shareable flow will open up here."
      : "There are no shareable times here yet."
    : mutualCount
      ? `${mutualCount} ${mutualCount === 1 ? "friend looks" : "friends look"} especially free after ${highlightSlot ? formatTimeLabel(highlightSlot.startsAt) : "tonight"}.`
      : `${bookingProfile?.slots.length ?? 0} light, low-pressure options are open this week.`;
  const socialLine = mutualCount
    ? `${mutualCount} ${mutualCount === 1 ? "friend likely free tonight." : "friends likely free tonight."}`
    : bookingProfile?.slots.length
      ? `${bookingProfile.slots.length} good times ready to send.`
      : "Pick a day and see what feels easy.";
  const slotColumns = layout.isDesktop ? 4 : 2;
  const slotGap = 12;
  const slotWidth =
    ((layout.isDesktop ? layout.rightColumnWidth : layout.shellWidth) -
      slotGap * (slotColumns - 1)) /
    slotColumns;

  const handleSignIn = () => {
    if (!inviteCode) {
      return;
    }

    router.push({
      pathname: "/onboarding",
      params: { bookingInviteCode: inviteCode },
    });
  };

  const handleShareTimes = async () => {
    if (!inviteCode) {
      return;
    }

    const link = createSmartOpenUrl(`/booking/${inviteCode}`);
    const selectedLine = !selectedSlots.length
      ? "A few easy Nowly times are open."
      : selectedSlots.length === 1
        ? `A good time to catch: ${formatShareSlot(selectedSlots[0])}.`
        : `A few times that feel easy: ${selectedSlots
            .slice(0, 3)
            .map((slot) => formatShareSlot(slot))
            .join(", ")}.`;

    await Share.share({
      message: `${selectedLine} Pick what works best here: ${link}`,
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
      router.replace(`/proposal/${hangout.id}`);
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

  const primaryLabel = isPreview ? "Send hang invite" : token ? "Lock it in" : "Sign in to lock it in";
  const summaryLabel =
    selectedSlots.length === 0
      ? "Pick one or a couple of times."
      : selectedSlots.length === 1
        ? formatSelectionSummary(selectedSlots[0])
        : `Suggest ${selectedSlots.length} times`;

  const handlePrimaryAction = () => {
    if (!selectedSlots.length || submitting || loading) {
      return;
    }

    if (isPreview) {
      void handleShareTimes();
      return;
    }

    void handleBookSlot();
  };

  const topRightIcon =
    mode === "preview" ? "share-variant-outline" : isHostViewingOwnLink ? "share-variant-outline" : null;

  const rootStyle = layout.isDesktop
    ? {
        flexDirection: "row" as const,
        alignItems: "flex-start" as const,
        gap: layout.splitGap,
      }
    : undefined;

  return (
    <GradientMesh>
      <View style={styles.screen}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            alignItems: "center",
            paddingBottom: 190,
            paddingHorizontal: layout.screenPadding,
            paddingTop: layout.isDesktop ? 28 : 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[{ width: layout.shellWidth, gap: layout.sectionGap }, rootStyle]}>
            <View style={{ width: layout.leftColumnWidth, gap: layout.sectionGap }}>
              <View style={styles.appBar}>
                <Pressable
                  onPress={() => router.back()}
                  style={({ pressed }) => [
                    styles.headerAction,
                    webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                  ]}
                >
                  <MaterialCommunityIcons name="chevron-left" size={24} color="#F7FBFF" />
                </Pressable>

                <View style={{ flex: 1, alignItems: layout.isDesktop ? "flex-start" : "center" }}>
                  <Text style={styles.appBarTitle}>Find a time to hang</Text>
                </View>

                {topRightIcon ? (
                  <Pressable
                    onPress={() => void handleShareTimes()}
                    style={({ pressed }) => [
                      styles.headerAction,
                      webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={topRightIcon}
                      size={18}
                      color="rgba(247,251,255,0.76)"
                    />
                  </Pressable>
                ) : (
                  <View style={styles.headerAction} />
                )}
              </View>

              <Text style={styles.socialContextLine}>{socialLine}</Text>

              <View style={styles.heroShell}>
                <LinearGradient
                  colors={["rgba(9,22,40,0.92)", "rgba(16,45,74,0.82)", "rgba(9,15,28,0.96)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroCard}
                >
                  <View style={styles.heroGlow} pointerEvents="none" />

                  <View style={{ gap: 8 }}>
                    <Text style={styles.heroEyebrow}>BEST WINDOW</Text>
                    <Text style={styles.heroTitle}>{heroTitle}</Text>
                    <Text style={styles.heroSupport}>{heroSupport}</Text>
                  </View>

                  {heroTags.length ? (
                    <View style={styles.heroTagRow}>
                      {heroTags.slice(0, 3).map((tag) => (
                        <View key={tag} style={styles.heroTag}>
                          <Text style={styles.heroTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </LinearGradient>
              </View>

              {loading ? (
                <View style={styles.notice}>
                  <Text style={styles.noticeText}>Loading open times...</Text>
                </View>
              ) : errorMessage ? (
                <View style={styles.notice}>
                  <Text style={styles.noticeTitle}>
                    {mode === "preview" ? "Booking preview is not ready" : "This link is not ready"}
                  </Text>
                  <Text style={styles.noticeText}>{errorMessage}</Text>
                  {mode === "preview" ? (
                    <Pressable
                      onPress={() => router.push("/availability-preferences")}
                      style={({ pressed }) => [
                        { alignSelf: "flex-start" },
                        webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.98 }),
                      ]}
                    >
                      <Text style={styles.noticeLink}>Open Hang Rhythm</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <View style={{ gap: 18 }}>
                  <View style={{ gap: 6 }}>
                    <Text style={styles.sectionTitle}>Choose a day</Text>
                    <Text style={styles.sectionSupport}>Pick a day that feels easy.</Text>
                  </View>

                  <View style={styles.monthRow}>
                    <Pressable
                      onPress={() => {
                        if (currentMonthIndex <= 0) {
                          return;
                        }

                        const previousMonth = monthGroups[currentMonthIndex - 1];
                        setSelectedMonthKey(previousMonth.key);
                        setSelectedDayKey(
                          dayGroups.find((group) => group.monthKey === previousMonth.key)?.key ?? null,
                        );
                      }}
                      disabled={currentMonthIndex <= 0}
                      style={({ pressed }) => [
                        styles.monthChevron,
                        currentMonthIndex <= 0 ? styles.monthChevronDisabled : null,
                        webPressableStyle(pressed, {
                          disabled: currentMonthIndex <= 0,
                          pressedOpacity: 0.85,
                          pressedScale: 0.97,
                        }),
                      ]}
                    >
                      <MaterialCommunityIcons name="chevron-left" size={18} color="#E2E8F0" />
                    </Pressable>

                    <Text style={styles.monthLabel}>
                      {monthGroups[currentMonthIndex]?.label ?? "Choose a month"}
                    </Text>

                    <Pressable
                      onPress={() => {
                        if (currentMonthIndex < 0 || currentMonthIndex >= monthGroups.length - 1) {
                          return;
                        }

                        const nextMonth = monthGroups[currentMonthIndex + 1];
                        setSelectedMonthKey(nextMonth.key);
                        setSelectedDayKey(
                          dayGroups.find((group) => group.monthKey === nextMonth.key)?.key ?? null,
                        );
                      }}
                      disabled={currentMonthIndex < 0 || currentMonthIndex >= monthGroups.length - 1}
                      style={({ pressed }) => [
                        styles.monthChevron,
                        currentMonthIndex < 0 || currentMonthIndex >= monthGroups.length - 1
                          ? styles.monthChevronDisabled
                          : null,
                        webPressableStyle(pressed, {
                          disabled: currentMonthIndex < 0 || currentMonthIndex >= monthGroups.length - 1,
                          pressedOpacity: 0.85,
                          pressedScale: 0.97,
                        }),
                      ]}
                    >
                      <MaterialCommunityIcons name="chevron-right" size={18} color="#E2E8F0" />
                    </Pressable>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.dateStrip}>
                      {visibleDays.map((group) => {
                        const active = group.key === selectedDayKey;

                        return (
                          <Pressable
                            key={group.key}
                            onPress={() => setSelectedDayKey(group.key)}
                            style={({ pressed }) => [
                              styles.dateCell,
                              active ? styles.dateCellActive : styles.dateCellIdle,
                              webPressableStyle(pressed, {
                                pressedOpacity: 0.92,
                                pressedScale: active ? 1.01 : 0.99,
                              }),
                            ]}
                          >
                            {active ? (
                              <LinearGradient
                                colors={["rgba(247,251,255,0.98)", "rgba(208,233,255,0.92)"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFillObject}
                              />
                            ) : null}

                            <Text style={[styles.dateDay, active ? styles.activeDarkText : null]}>
                              {formatDayAbbr(group.date)}
                            </Text>
                            <Text style={[styles.dateNumber, active ? styles.activeDarkText : null]}>
                              {formatDayNumber(group.date)}
                            </Text>

                            {group.recommended ? (
                              <View style={[styles.dateDot, active ? styles.dateDotActive : null]} />
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>

            {!loading && !errorMessage ? (
              <View style={{ width: layout.rightColumnWidth, gap: layout.sectionGap }}>
                <View style={{ gap: 6 }}>
                  <Text style={styles.sectionTitle}>Times that could work</Text>
                  <Text style={styles.sectionSupport}>
                    {isPreview ? "Pick one or a couple to send out." : "Pick the one that feels easiest."}
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
                          style={({ pressed }) => [
                            styles.timePill,
                            { width: slotWidth },
                            active ? styles.timePillActive : styles.timePillIdle,
                            webPressableStyle(pressed, {
                              pressedOpacity: 0.94,
                              pressedScale: 0.96,
                            }),
                          ]}
                        >
                          {active ? (
                            <LinearGradient
                              colors={["rgba(247,251,255,0.98)", "rgba(208,233,255,0.92)"]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={StyleSheet.absoluteFillObject}
                            />
                          ) : null}

                          <Text style={[styles.timeText, active ? styles.activeDarkText : null]}>
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
                    <View style={styles.notice}>
                      <Text style={styles.noticeText}>
                        No open times land on this day yet. Try another date.
                      </Text>
                    </View>
                  )}
                </Animated.View>

                <View style={styles.timezoneRow}>
                  <View style={styles.timezoneLeft}>
                    <MaterialCommunityIcons name="earth" size={14} color="rgba(247,251,255,0.58)" />
                    <Text style={styles.timezoneLabel}>{timezoneLabel}</Text>
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>

        {!loading && !errorMessage ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.footerDockWrap,
              {
                paddingHorizontal: layout.screenPadding,
              },
            ]}
          >
            <View
              style={{
                width: layout.shellWidth,
                alignItems: layout.isDesktop ? "flex-end" : "center",
              }}
            >
              <LinearGradient
                colors={["rgba(4,8,20,0.00)", "rgba(4,8,20,0.74)", "rgba(4,8,20,0.94)"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={[
                  styles.footerFade,
                  {
                    width: layout.isDesktop ? layout.rightColumnWidth : layout.shellWidth,
                  },
                ]}
              >
                <View style={styles.footerCard}>
                  <Text style={styles.footerSummary}>{summaryLabel}</Text>
                  <Pressable
                    onPress={handlePrimaryAction}
                    disabled={!selectedSlots.length || submitting || loading}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      !selectedSlots.length || submitting || loading
                        ? styles.primaryButtonDisabled
                        : null,
                      webPressableStyle(pressed, {
                        disabled: !selectedSlots.length || submitting || loading,
                        pressedOpacity: 0.94,
                        pressedScale: 0.985,
                      }),
                    ]}
                  >
                    <LinearGradient
                      colors={
                        !selectedSlots.length || submitting || loading
                          ? ["rgba(255,255,255,0.16)", "rgba(255,255,255,0.12)"]
                          : ["#F7FBFF", "#D7EEFF", "#B9E6FF"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <Text
                      style={[
                        styles.primaryButtonText,
                        !selectedSlots.length || submitting || loading
                          ? styles.primaryButtonTextMuted
                          : null,
                      ]}
                    >
                      {submitting ? "Locking it in..." : primaryLabel}
                    </Text>
                  </Pressable>
                  <Text style={styles.footerHint}>
                    {isPreview ? "They'll pick what works best." : "Nowly will turn it into a real hang."}
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
  activeDarkText: {
    color: "#081120",
  },
  appBar: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  appBarTitle: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 24,
    lineHeight: 30,
  },
  dateCell: {
    width: 58,
    height: 78,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    overflow: "hidden",
  },
  dateCellActive: {
    shadowColor: nowlyColors.glow,
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 10,
    },
  },
  dateCellIdle: {
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  dateDay: {
    color: "rgba(247,251,255,0.45)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
  },
  dateDot: {
    position: "absolute",
    bottom: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#7CEBFF",
  },
  dateDotActive: {
    backgroundColor: "#081120",
  },
  dateNumber: {
    color: "rgba(247,251,255,0.9)",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 22,
  },
  dateStrip: {
    flexDirection: "row",
    gap: 10,
    paddingRight: 8,
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
  footerHint: {
    paddingTop: 10,
    color: "rgba(247,251,255,0.5)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    textAlign: "center",
  },
  footerSummary: {
    paddingBottom: 10,
    color: "rgba(247,251,255,0.72)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 13,
    textAlign: "center",
  },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    minHeight: 108,
    borderRadius: 24,
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 14,
  },
  heroEyebrow: {
    color: "rgba(139,234,255,0.68)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
    letterSpacing: 2,
  },
  heroGlow: {
    position: "absolute",
    right: -40,
    top: -58,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroShell: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: nowlyColors.glow,
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: {
      width: 0,
      height: 14,
    },
  },
  heroSupport: {
    color: "rgba(247,251,255,0.72)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  heroTag: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  heroTagText: {
    color: "rgba(247,251,255,0.88)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
  },
  heroTitle: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 28,
    lineHeight: 32,
    maxWidth: 420,
  },
  monthChevron: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  monthChevronDisabled: {
    opacity: 0.35,
  },
  monthLabel: {
    color: "rgba(247,251,255,0.88)",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  notice: {
    gap: 10,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  noticeLink: {
    color: "rgba(139,234,255,0.92)",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
  },
  noticeText: {
    color: "rgba(247,251,255,0.64)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  noticeTitle: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
    lineHeight: 24,
  },
  primaryButton: {
    height: 56,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  primaryButtonDisabled: {
    opacity: 0.74,
  },
  primaryButtonText: {
    color: "#081120",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
  },
  primaryButtonTextMuted: {
    color: "rgba(247,251,255,0.68)",
  },
  screen: {
    flex: 1,
  },
  sectionSupport: {
    color: "rgba(247,251,255,0.58)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
  },
  sectionTitle: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
  },
  slotGlowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#7CEBFF",
    shadowColor: nowlyColors.aqua,
    shadowOpacity: 0.48,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  socialContextLine: {
    color: "rgba(247,251,255,0.72)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 14,
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  timePill: {
    height: 48,
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
    shadowOffset: {
      width: 0,
      height: 10,
    },
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
  timezoneLabel: {
    color: "rgba(247,251,255,0.64)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
  },
  timezoneLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timezoneRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
