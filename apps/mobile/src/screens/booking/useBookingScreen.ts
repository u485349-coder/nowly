
import { useQuery } from "@tanstack/react-query";
import type {
  MobileBookableSlot,
  MobileBookingProfile,
  MobileGroupSchedulingMessage,
  MobileGroupSchedulingSession,
  SchedulingVoteState,
} from "@nowly/shared";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { bookingApi } from "../../lib/api/booking";
import { useGroupSchedulingRoom } from "../../hooks/realtime/useGroupSchedulingRoom";
import { getSocket } from "../../../lib/socket";
import { hangoutIntentLabel, vibeLabel } from "../../../lib/labels";
import { parseTimeInput } from "../../../lib/recurring-availability";
import { useAppStore } from "../../../store/useAppStore";

export type BookingSharedSetup = {
  sessionShareCode?: string | null;
  format?: string | null;
  title?: string | null;
  description?: string | null;
  locationName?: string | null;
};

type DayGroup = {
  key: string;
  monthKey: string;
  date: Date;
  slots: MobileBookableSlot[];
  recommended: boolean;
};

const WEEKDAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

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

const formatMonthLabel = (date: Date) => date.toLocaleDateString([], { month: "long", year: "numeric" });
const formatTimeLabel = (value: string) => new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const formatSelectionSummary = (slot: MobileBookableSlot) => `${new Date(slot.startsAt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} � ${formatTimeLabel(slot.startsAt)}`;

const buildDateTimeIso = (dateKey: string, minutes: number) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1, Math.floor(minutes / 60), minutes % 60);
  return date.toISOString();
};

const buildTimezoneLabel = () => {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";
  if (zone.includes("New_York")) return "Eastern Time � US & Canada";
  if (zone.includes("Chicago")) return "Central Time � US & Canada";
  if (zone.includes("Denver")) return "Mountain Time � US & Canada";
  if (zone.includes("Los_Angeles")) return "Pacific Time � US & Canada";
  return zone.replaceAll("_", " ");
};

const avatarLabel = (name: string) => (name.trim()[0] ?? "N").toUpperCase();
const sortMessages = (messages: MobileGroupSchedulingMessage[]) => [...messages].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
const mergeMessage = (messages: MobileGroupSchedulingMessage[], nextMessage: MobileGroupSchedulingMessage) => {
  if (messages.some((item) => item.id === nextMessage.id)) {
    return messages;
  }
  return sortMessages([...messages, nextMessage]);
};

const buildVoteDraft = (session: MobileGroupSchedulingSession) =>
  Object.fromEntries(
    session.slots.map((slot) => {
      const currentVote = slot.voters.find((vote) => vote.participantId === session.currentUserParticipantId);
      return [slot.id, currentVote?.status ?? "UNAVAILABLE"];
    }),
  ) as Record<string, SchedulingVoteState>;

type Props = {
  inviteCode: string | null;
  sharedSetup: BookingSharedSetup;
};

export const useBookingScreen = ({ inviteCode, sharedSetup }: Props) => {
  const router = useRouter();
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const bookingSetup = useAppStore((state) => state.bookingSetup);
  const dateSpecificWindows = useAppStore((state) => state.dateSpecificWindows);
  const upsertHangout = useAppStore((state) => state.upsertHangout);

  const bookingQuery = useQuery({
    queryKey: ["booking", inviteCode, sharedSetup.sessionShareCode ?? null, user?.id ?? token ?? "guest"],
    enabled: Boolean(inviteCode),
    queryFn: () => bookingApi.fetchBookingProfileWithSession(token, inviteCode!, sharedSetup.sessionShareCode ?? null),
  });

  const bookingProfile = bookingQuery.data ?? null;
  const isHostViewingOwnLink = Boolean(user?.id && bookingProfile?.host.id && user.id === bookingProfile.host.id);
  const isPreview = isHostViewingOwnLink;
  const timezoneLabel = useMemo(buildTimezoneLabel, []);

  const localPreviewSlots = useMemo<MobileBookableSlot[]>(() => {
    if (!isPreview) {
      return [];
    }

    return dateSpecificWindows.reduce<MobileBookableSlot[]>((list, window) => {
      const startMinute = parseTimeInput(window.startInput);
      const endMinute = parseTimeInput(window.endInput);
      if (startMinute === null || endMinute === null || endMinute <= startMinute) {
        return list;
      }

      const title = bookingSetup.title.trim() || (bookingSetup.format === "GROUP" ? "Group hangout" : "Quick catch-up");
      const description =
        bookingSetup.description.trim() ||
        (bookingSetup.format === "GROUP"
          ? "Share a few times with the crew and let people grab what works."
          : "Pick an easy time and we can see what sticks.");

      return [
        ...list,
        {
          id: `specific-${window.id}`,
          startsAt: buildDateTimeIso(window.dateKey, startMinute),
          endsAt: buildDateTimeIso(window.dateKey, endMinute),
          label: new Date(buildDateTimeIso(window.dateKey, startMinute)).toLocaleDateString([], {
            month: "long",
            day: "numeric",
            weekday: "short",
          }),
          summary: description,
          sourceLabel: title,
          mutualFit: true,
          score: 0.88,
        },
      ];
    }, []);
  }, [bookingSetup.description, bookingSetup.format, bookingSetup.title, dateSpecificWindows, isPreview]);

  const allSlots = useMemo(() => {
    const remoteSlots = bookingProfile?.type === "ONE_ON_ONE" ? bookingProfile.slots : [];
    return [...remoteSlots, ...localPreviewSlots];
  }, [bookingProfile, localPreviewSlots]);

  const dayGroups = useMemo<DayGroup[]>(() => {
    if (!allSlots.length) {
      return [];
    }

    const map = new Map<string, DayGroup>();

    allSlots.forEach((slot) => {
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

    return [...map.values()].sort((left, right) => left.date.getTime() - right.date.getTime());
  }, [allSlots]);

  const monthGroups = useMemo(
    () =>
      dayGroups.reduce<Array<{ key: string; label: string }>>((list, group) => {
        if (list.some((item) => item.key === group.monthKey)) {
          return list;
        }
        return [...list, { key: group.monthKey, label: formatMonthLabel(group.date) }];
      }, []),
    [dayGroups],
  );

  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [session, setSession] = useState<MobileGroupSchedulingSession | null>(
    bookingProfile?.type === "GROUP" ? bookingProfile.session : null,
  );
  const [voteDraft, setVoteDraft] = useState<Record<string, SchedulingVoteState>>(
    bookingProfile?.type === "GROUP" ? buildVoteDraft(bookingProfile.session) : {},
  );
  const [draftDirty, setDraftDirty] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [submittingVotes, setSubmittingVotes] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [locking, setLocking] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  useEffect(() => {
    setSelectedMonthKey(dayGroups[0]?.monthKey ?? null);
    setSelectedDayKey(dayGroups[0]?.key ?? null);
    setSelectedSlotId(null);
  }, [dayGroups]);

  useEffect(() => {
    if (bookingProfile?.type === "GROUP") {
      setSession(bookingProfile.session);
      setVoteDraft(buildVoteDraft(bookingProfile.session));
      setDraftDirty(false);
      setSelectedSlotId(bookingProfile.session.finalSlotId ?? bookingProfile.session.slots[0]?.id ?? null);
    }
  }, [bookingProfile]);

  const visibleDays = useMemo(
    () => (selectedMonthKey ? dayGroups.filter((group) => group.monthKey === selectedMonthKey) : dayGroups),
    [dayGroups, selectedMonthKey],
  );

  useEffect(() => {
    if (visibleDays.length && !visibleDays.some((group) => group.key === selectedDayKey)) {
      setSelectedDayKey(visibleDays[0].key);
    }
  }, [selectedDayKey, visibleDays]);

  const selectedDay = dayGroups.find((group) => group.key === selectedDayKey) ?? visibleDays[0] ?? null;
  const selectedDaySlots = selectedDay?.slots ?? [];
  const selectedSlot = selectedSlotId ? allSlots.find((slot) => slot.id === selectedSlotId) ?? null : null;
  const highlightSlot = allSlots[0] ?? null;

  const groupSession = session;
  const groupSelectedSlot = useMemo(
    () =>
      groupSession?.slots.find((slot) => slot.id === selectedSlotId) ??
      groupSession?.slots.find((slot) => slot.isFinal) ??
      groupSession?.slots[0] ??
      null,
    [groupSession, selectedSlotId],
  );

  const handleSessionUpdate = useCallback(
    (nextSession: MobileGroupSchedulingSession) => {
      setSession(nextSession);
      setSelectedSlotId((current) => current ?? nextSession.finalSlotId ?? nextSession.slots[0]?.id ?? null);
      if (!draftDirty) {
        setVoteDraft(buildVoteDraft(nextSession));
      }
    },
    [draftDirty],
  );

  const handleRoomMessage = useCallback((nextMessage: MobileGroupSchedulingMessage) => {
    setSession((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        messages: mergeMessage(current.messages, nextMessage),
      };
    });
  }, []);

  useGroupSchedulingRoom({
    shareCode: groupSession?.shareCode ?? "",
    token,
    onSessionUpdate: handleSessionUpdate,
    onMessage: handleRoomMessage,
  });

  const goToSignIn = useCallback(() => {
    if (!inviteCode) {
      return;
    }

    router.push({
      pathname: "/onboarding",
      params: {
        bookingInviteCode: inviteCode,
        bookingSessionShareCode: groupSession?.shareCode,
      },
    } as never);
  }, [groupSession?.shareCode, inviteCode, router]);

  const handleBookSlot = async () => {
    if (!inviteCode || !selectedSlot) {
      Alert.alert("Pick a time first", "Choose a time before locking it in.");
      return;
    }

    if (!token) {
      goToSignIn();
      return;
    }

    try {
      setBookingSubmitting(true);
      const locationName =
        (sharedSetup.locationName ?? bookingSetup.locationName).trim() ||
        bookingProfile?.host.communityTag ||
        bookingProfile?.host.city ||
        "Nearby";
      const note = (sharedSetup.title ?? bookingSetup.title).trim() || "Quick catch-up";
      const hangout = await bookingApi.bookSharedAvailability(token, inviteCode, {
        startsAt: selectedSlot.startsAt,
        endsAt: selectedSlot.endsAt,
        note,
        locationName,
      });

      upsertHangout(hangout);
      router.replace(`/proposal/${hangout.id}` as never);
    } catch (error) {
      Alert.alert("Couldn't lock that time", readErrorMessage(error));
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleVoteChange = (status: SchedulingVoteState) => {
    if (!groupSelectedSlot || !groupSession?.currentUserCanEdit) {
      return;
    }

    setDraftDirty(true);
    setVoteDraft((current) => ({
      ...current,
      [groupSelectedSlot.id]: status,
    }));
  };

  const handleSubmitAvailability = async () => {
    if (!groupSession) {
      return;
    }

    if (!token) {
      goToSignIn();
      return;
    }

    try {
      setSubmittingVotes(true);
      const nextSession = await bookingApi.submitGroupSchedulingAvailability(
        token,
        groupSession.shareCode,
        groupSession.slots.map((slot) => ({
          slotId: slot.id,
          status: voteDraft[slot.id] ?? "UNAVAILABLE",
        })),
      );

      setSession(nextSession);
      setVoteDraft(buildVoteDraft(nextSession));
      setDraftDirty(false);
    } catch (error) {
      Alert.alert("Couldn't submit availability", readErrorMessage(error));
    } finally {
      setSubmittingVotes(false);
    }
  };

  const handleFinalize = async () => {
    if (!groupSession || !groupSelectedSlot) {
      return;
    }

    if (!token) {
      goToSignIn();
      return;
    }

    try {
      setFinalizing(true);
      const nextSession = await bookingApi.finalizeGroupSchedulingSession(token, groupSession.shareCode, groupSelectedSlot.id);
      setSession(nextSession);
      setDraftDirty(false);
    } catch (error) {
      Alert.alert("Couldn't lock that time", readErrorMessage(error));
    } finally {
      setFinalizing(false);
    }
  };

  const handleLock = async () => {
    if (!groupSession) {
      return;
    }

    if (!token) {
      goToSignIn();
      return;
    }

    try {
      setLocking(true);
      const nextSession = await bookingApi.lockGroupSchedulingSession(token, groupSession.shareCode);
      setSession(nextSession);
    } catch (error) {
      Alert.alert("Couldn't lock the poll", readErrorMessage(error));
    } finally {
      setLocking(false);
    }
  };

  const handleSendMessage = async () => {
    const trimmed = messageText.trim();
    if (!groupSession || !trimmed) {
      return;
    }

    if (!token) {
      goToSignIn();
      return;
    }

    try {
      setSendingMessage(true);
      const socket = getSocket(token);
      if (socket) {
        socket.emit("schedule:message", { shareCode: groupSession.shareCode, text: trimmed });
      } else {
        const message = await bookingApi.sendGroupSchedulingMessage(token, groupSession.shareCode, trimmed);
        handleRoomMessage(message);
      }
      setMessageText("");
    } catch (error) {
      Alert.alert("Couldn't send that note", readErrorMessage(error));
    } finally {
      setSendingMessage(false);
    }
  };

  const selectedMonthDate = useMemo(() => {
    if (!selectedMonthKey) {
      return monthGroups[0]?.key ? new Date(`${monthGroups[0].key}-01T00:00:00`) : null;
    }
    return new Date(`${selectedMonthKey}-01T00:00:00`);
  }, [monthGroups, selectedMonthKey]);

  const currentMonthIndex = monthGroups.findIndex((group) => group.key === selectedMonthKey);
  const oneOnOneLocked = bookingProfile?.type === "ONE_ON_ONE" ? bookingProfile.oneOnOneLocked : false;
  const emptyState = !bookingQuery.isLoading && !bookingQuery.error && !allSlots.length;

  const title =
    (sharedSetup.title ?? bookingSetup.title).trim() ||
    highlightSlot?.sourceLabel ||
    (highlightSlot?.hangoutIntent ? hangoutIntentLabel(highlightSlot.hangoutIntent) : "Quick catch-up");
  const description =
    (sharedSetup.description ?? bookingSetup.description).trim() ||
    highlightSlot?.summary ||
    ((sharedSetup.format ?? bookingSetup.format) === "GROUP"
      ? "Share a few times with the crew and let people claim what works."
      : "Pick an easy time and we can see what sticks.");
  const locationName =
    (sharedSetup.locationName ?? bookingSetup.locationName).trim() ||
    bookingProfile?.host.communityTag ||
    bookingProfile?.host.city ||
    "Nearby";

  return {
    status: !inviteCode ? "missing" : bookingQuery.isLoading ? "loading" : bookingQuery.isError ? "error" : "ready",
    errorMessage: bookingQuery.error ? readErrorMessage(bookingQuery.error) : "",
    host: bookingProfile?.host ?? user,
    title,
    description,
    locationName,
    timezoneLabel,
    isPreview,
    isGroup: bookingProfile?.type === "GROUP",
    hasEmptyState: emptyState,
    emptyTitle: oneOnOneLocked ? "This 1:1 window was already claimed" : isPreview ? "No hang windows yet" : "No open times right now",
    emptyMessage: oneOnOneLocked
      ? "This link locks after one booking. Ask the host to share a new window."
      : isPreview
        ? "Add weekly hours or one-off date windows in Hang Rhythm so this page becomes bookable."
        : "This booking link does not have any open hang windows right now.",
    onEmptyAction: () =>
      oneOnOneLocked
        ? router.replace((token ? "/home" : "/") as never)
        : isPreview
          ? router.push("/availability-preferences" as never)
          : router.replace((token ? "/home" : "/") as never),
    emptyActionLabel: oneOnOneLocked ? "Back home" : isPreview ? "Set hang rhythm" : "Back home",
    onBack: () => router.back(),
    onRetry: () => void bookingQuery.refetch(),
    oneOnOne: {
      monthLabel: selectedMonthDate ? formatMonthLabel(selectedMonthDate) : "Choose a month",
      weekdayLabels: WEEKDAY_HEADERS,
      calendarCells: selectedMonthDate
        ? (() => {
            const year = selectedMonthDate.getFullYear();
            const month = selectedMonthDate.getMonth();
            const totalDays = new Date(year, month + 1, 0).getDate();
            const firstWeekday = new Date(year, month, 1).getDay();
            const byDayNumber = new Map<number, DayGroup>();
            visibleDays.forEach((group) => byDayNumber.set(group.date.getDate(), group));
            const cells: Array<{ key: string; dayNumber: number | null; available: boolean; active: boolean; recommended?: boolean; onPress?: () => void }> = Array.from({ length: firstWeekday }, (_, index) => ({
              key: `blank-${index}`,
              dayNumber: null,
              available: false,
              active: false,
            }));
            for (let dayNumber = 1; dayNumber <= totalDays; dayNumber += 1) {
              const group = byDayNumber.get(dayNumber) ?? null;
              cells.push({
                key: `${selectedMonthKey ?? "month"}-${dayNumber}`,
                dayNumber,
                available: Boolean(group),
                active: group?.key === selectedDayKey,
                recommended: Boolean(group?.recommended),
                onPress: group ? () => setSelectedDayKey(group.key) : undefined,
              });
            }
            while (cells.length % 7 !== 0) {
              cells.push({ key: `trail-${cells.length}`, dayNumber: null, available: false, active: false });
            }
            return cells;
          })()
        : [],
      onPrevMonth: () => {
        if (currentMonthIndex <= 0) return;
        const previousMonth = monthGroups[currentMonthIndex - 1];
        setSelectedMonthKey(previousMonth.key);
        setSelectedDayKey(dayGroups.find((group) => group.monthKey === previousMonth.key)?.key ?? null);
      },
      onNextMonth: () => {
        if (currentMonthIndex < 0 || currentMonthIndex >= monthGroups.length - 1) return;
        const nextMonth = monthGroups[currentMonthIndex + 1];
        setSelectedMonthKey(nextMonth.key);
        setSelectedDayKey(dayGroups.find((group) => group.monthKey === nextMonth.key)?.key ?? null);
      },
      disablePrevMonth: currentMonthIndex <= 0,
      disableNextMonth: currentMonthIndex < 0 || currentMonthIndex >= monthGroups.length - 1,
      selectedDayLabel: selectedDay ? selectedDay.date.toLocaleDateString([], { weekday: "short", month: "long", day: "numeric" }) : "Choose a day",
      selectedDayHint: selectedDaySlots.length
        ? `${selectedDaySlots.length} ${selectedDaySlots.length === 1 ? "time" : "times"} open`
        : "Pick a day with a live slot",
      slotItems: selectedDaySlots.map((slot) => ({
        id: slot.id,
        label: formatTimeLabel(slot.startsAt),
        active: selectedSlotId === slot.id,
        recommended: slot.mutualFit || (slot.score ?? 0) >= 0.72,
        onPress: () => setSelectedSlotId((current) => (current === slot.id ? null : slot.id)),
      })),
      slotSummary: selectedSlot ? formatSelectionSummary(selectedSlot) : "Choose a time to keep going",
      bookingHint: isPreview
        ? "You뭨e previewing your own link. Share it when the setup feels right."
        : token
          ? "Low pressure either way. You can still respond softly after the proposal is created."
          : "Sign in before locking it in so the proposal lands in the right account.",
      viewerHint: bookingProfile?.viewerHasRecurringSchedule ? "Your saved rhythm is already on file for future invites." : "You can set your own hang rhythm later to speed the next invite up.",
      primaryLabel: isPreview ? "Preview only" : token ? "Lock it in" : "Sign in to lock it in",
      primaryDisabled: isPreview || !selectedSlot || bookingSubmitting,
      primaryLoading: bookingSubmitting,
      onPrimary: () => void handleBookSlot(),
    },
    group: groupSession
      ? {
          title: groupSession.title,
          description: groupSession.description,
          progressSummary: groupSession.progress.summary,
          progressHint: groupSession.progress.decisionHint,
          progressDeadline: groupSession.progress.responseDeadline,
          locationName: groupSession.locationName,
          meta: [
            `${groupSession.durationMinutes} min`,
            groupSession.visibilityMode === "PUBLIC" ? "Public votes" : "Anonymous votes",
            `${groupSession.participantCount}/${groupSession.participantCap} people`,
          ],
          bestFits: groupSession.bestFits.slice(0, 3).map((slot) => ({
            id: slot.id,
            label: slot.label,
            highlightLabel: slot.highlightLabel ?? "Best overall",
            counts: `${slot.yesCount} yes � ${slot.maybeCount} maybe � ${slot.noCount} no`,
            selected: selectedSlotId === slot.id,
            onPress: () => setSelectedSlotId(slot.id),
          })),
          slots: groupSession.slots.map((slot) => ({
            id: slot.id,
            label: slot.label,
            counts: `${slot.yesCount} yes � ${slot.maybeCount} maybe � ${slot.noCount} no`,
            rankLabel: slot.isFinal ? "Locked" : `#${slot.rank}`,
            selected: selectedSlotId === slot.id,
            final: slot.isFinal,
            onPress: () => setSelectedSlotId(slot.id),
            voters: groupSession.visibilityMode === "PUBLIC" ? slot.voters.filter((vote) => vote.status !== "UNAVAILABLE").slice(0, 4).map((vote) => ({ id: vote.participantId, name: vote.name, photoUrl: vote.photoUrl, color: vote.collaborationColor })) : [],
          })),
          selectedSlot: groupSelectedSlot
            ? {
                label: groupSelectedSlot.label,
                counts: `${groupSelectedSlot.yesCount} yes � ${groupSelectedSlot.maybeCount} maybe � ${groupSelectedSlot.noCount} no`,
                currentVote: voteDraft[groupSelectedSlot.id] ?? "UNAVAILABLE",
                voteOptions: [
                  { key: "AVAILABLE", label: "Works" },
                  { key: "MAYBE", label: "Maybe" },
                  { key: "UNAVAILABLE", label: "Can't" },
                ] as Array<{ key: SchedulingVoteState; label: string }>,
                onChangeVote: handleVoteChange,
                voters:
                  groupSession.visibilityMode === "PUBLIC"
                    ? groupSelectedSlot.voters.map((vote) => ({
                        id: vote.participantId,
                        name: vote.name,
                        photoUrl: vote.photoUrl,
                        color: vote.collaborationColor,
                        status: vote.status,
                      }))
                    : [],
                anonymityHint: groupSession.visibilityMode === "ANONYMOUS" ? "Anonymous mode is on. Invitees only see aggregate counts here." : null,
                canEdit: groupSession.currentUserCanEdit,
                canFinalize: groupSelectedSlot.eligible && groupSession.currentUserCanFinalize && !groupSession.finalizedAt,
                finalizeLabel: groupSession.decisionMode === "HOST_DECIDES" ? "Finalize this time" : "Confirm this time",
                onFinalize: () => void handleFinalize(),
                finalizing,
              }
            : null,
          messages: sortMessages(groupSession.messages).map((message) => ({
            id: message.id,
            text: message.text,
            senderName: message.sender?.name ?? "Nowly",
            photoUrl: message.sender?.photoUrl ?? null,
            system: message.type === "SYSTEM",
            time: new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
            color: message.collaborationColor ?? null,
          })),
          messageText,
          onChangeMessageText: setMessageText,
          onSendMessage: () => void handleSendMessage(),
          sendingMessage,
          messagePlaceholder: "I can do after 6, prefer Saturday, driving from campus...",
          canLock: groupSession.currentUserIsHost && !groupSession.hostLocked && !groupSession.finalizedAt,
          onLock: () => void handleLock(),
          locking,
          submitSummary: groupSession.finalizedAt
            ? groupSelectedSlot
              ? `Final slot locked: ${groupSelectedSlot.label}`
              : "This group scheduling link has been finalized."
            : groupSession.currentUserHasSubmittedAvailability
              ? "Availability submitted. You can still update it until the poll closes."
              : "Mark your slots, then submit availability so the crew can compare live.",
          submitLabel: !token ? "Sign in to respond" : submittingVotes ? "Submitting..." : "Submit availability",
          submitDisabled: Boolean(groupSession.finalizedAt) || submittingVotes || (!groupSession.currentUserCanEdit && Boolean(token)),
          onSubmitAvailability: () => void handleSubmitAvailability(),
          openProposal: groupSession.finalHangoutId ? () => router.push(`/proposal/${groupSession.finalHangoutId}` as never) : null,
          finalHangoutId: groupSession.finalHangoutId ?? null,
        }
      : null,
    previewTags: [
      (sharedSetup.format ?? bookingSetup.format) === "GROUP" ? "Group hangout" : "1:1 hangout",
      highlightSlot?.hangoutIntent ? hangoutIntentLabel(highlightSlot.hangoutIntent) : null,
      highlightSlot?.vibe ? vibeLabel(highlightSlot.vibe) : null,
    ].filter(Boolean) as string[],
    hostInitial: avatarLabel((bookingProfile?.host.name ?? user?.name ?? "Nowly") || "Nowly"),
  };
};
