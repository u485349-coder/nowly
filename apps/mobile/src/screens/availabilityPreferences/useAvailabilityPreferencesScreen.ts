
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  hangoutIntentOptions,
  type MobileRecurringAvailabilityWindow,
  type SchedulingDecisionMode,
  type SchedulingVisibilityMode,
  vibeOptions,
} from "@nowly/shared";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Share } from "react-native";
import { track } from "../../../lib/analytics";
import {
  formatMinutesOfDay,
  formatOrdinalDay,
  parseTimeInput,
  toTimeInputValue,
  weekdayOptionLabels,
} from "../../../lib/recurring-availability";
import { hangoutIntentLabel, vibeLabel } from "../../../lib/labels";
import { createBrowserAppUrl, createSmartOpenUrl } from "../../../lib/smart-links";
import { useAppStore } from "../../../store/useAppStore";
import type { DateSpecificAvailabilityWindow } from "../../../types";
import { availabilityApi } from "../../lib/api/availability";

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

const defaultBookingSetup = {
  format: "ONE_ON_ONE" as const,
  title: "Quick catch-up",
  description: "Pick an easy time and we can lock something in.",
  locationName: "",
  durationMinutes: 60,
  participantCap: 5,
  minimumConfirmations: 3,
  decisionMode: "MINIMUM_REQUIRED" as SchedulingDecisionMode,
  visibilityMode: "PUBLIC" as SchedulingVisibilityMode,
  responseDeadlineHours: 24,
  lastGroupSession: null as { shareCode: string; signature: string } | null,
};

const groupDecisionModeOptions: Array<{ value: SchedulingDecisionMode; label: string; hint: string }> = [
  { value: "MINIMUM_REQUIRED", label: "Min required", hint: "Lock once the minimum yes count is reached." },
  { value: "EVERYONE_AGREES", label: "Everyone agrees", hint: "Only finalize when every participant says yes." },
  { value: "HOST_DECIDES", label: "Host decides", hint: "The host can pick the cleanest time once votes land." },
];

const groupVisibilityModeOptions: Array<{ value: SchedulingVisibilityMode; label: string; hint: string }> = [
  { value: "PUBLIC", label: "Public votes", hint: "Everyone can see who picked what." },
  { value: "ANONYMOUS", label: "Anonymous votes", hint: "Only aggregate counts stay visible." },
];

const padDatePart = (value: number) => String(value).padStart(2, "0");

const toDateKey = (value: Date) =>
  `${value.getFullYear()}-${padDatePart(value.getMonth() + 1)}-${padDatePart(value.getDate())}`;

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

const formatSpecificDateLabel = (value: string) => {
  const date = parseDateKey(value);
  return `${date.toLocaleDateString([], { month: "long" })} ${formatOrdinalDay(date.getDate())}, ${date.getFullYear()}`;
};

const sameMonthAs = (dateKey: string, monthDate: Date) => {
  const date = parseDateKey(dateKey);
  return date.getFullYear() === monthDate.getFullYear() && date.getMonth() === monthDate.getMonth();
};

const createSpecificDateWindow = (
  dateKey: string,
  overrides: Partial<DateSpecificAvailabilityWindow> = {},
): DateSpecificAvailabilityWindow => ({
  id: `specific-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  dateKey,
  startInput: "6:00 PM",
  endInput: "8:00 PM",
  ...overrides,
});

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

  return parts.length ? parts.slice(0, 2).join(" / ") : "No mood tags yet";
};

const clampNumber = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const buildBookingSharePath = (
  inviteCode: string,
  setup: {
    format: "ONE_ON_ONE" | "GROUP";
    title: string;
    description: string;
    locationName: string;
    sessionShareCode?: string | null;
  },
) => {
  const searchParams = new URLSearchParams();
  searchParams.set("format", setup.format);

  const trimmedTitle = setup.title.trim();
  const trimmedDescription = setup.description.trim();
  const trimmedLocation = setup.locationName.trim();

  if (trimmedTitle) {
    searchParams.set("title", trimmedTitle);
  }

  if (trimmedDescription) {
    searchParams.set("description", trimmedDescription);
  }

  if (trimmedLocation) {
    searchParams.set("location", trimmedLocation);
  }

  if (setup.sessionShareCode) {
    searchParams.set("session", setup.sessionShareCode);
  }

  const query = searchParams.toString();
  return `/booking/${inviteCode}${query ? `?${query}` : ""}`;
};

const buildGroupSessionSignature = ({
  title,
  description,
  locationName,
  durationMinutes,
  participantCap,
  minimumConfirmations,
  decisionMode,
  visibilityMode,
  responseDeadlineHours,
  specificWindows,
}: {
  title: string;
  description: string;
  locationName: string;
  durationMinutes: number;
  participantCap: number;
  minimumConfirmations: number;
  decisionMode: SchedulingDecisionMode;
  visibilityMode: SchedulingVisibilityMode;
  responseDeadlineHours: number;
  specificWindows: DateSpecificAvailabilityWindow[];
}) => {
  const normalizedWindows = [...specificWindows]
    .map((window) => `${window.dateKey}:${window.startInput.trim()}-${window.endInput.trim()}`)
    .sort()
    .join("|");

  return [
    title.trim(),
    description.trim(),
    locationName.trim(),
    durationMinutes,
    participantCap,
    minimumConfirmations,
    decisionMode,
    visibilityMode,
    responseDeadlineHours,
    normalizedWindows,
  ].join("::");
};

const uniqueSuggestedOverlaps = <T extends { matchedUser: { id: string }; score: number }>(items: T[]) => {
  const dedupedByFriend = new Map<string, T>();

  [...items]
    .sort((left, right) => right.score - left.score)
    .forEach((overlap) => {
      const existing = dedupedByFriend.get(overlap.matchedUser.id);
      if (!existing || overlap.score > existing.score) {
        dedupedByFriend.set(overlap.matchedUser.id, overlap);
      }
    });

  return [...dedupedByFriend.values()];
};

const readClipboard = () =>
  (globalThis.navigator as { clipboard?: { writeText?: (text: string) => Promise<void> } } | undefined)?.clipboard;
export const useAvailabilityPreferencesScreen = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const bookingSetup = useAppStore((state) => state.bookingSetup);
  const recurringWindows = useAppStore((state) => state.recurringWindows);
  const scheduledOverlaps = useAppStore((state) => state.scheduledOverlaps);
  const storedDateSpecificWindows = useAppStore((state) => state.dateSpecificWindows);
  const setBookingSetup = useAppStore((state) => state.setBookingSetup);
  const setRecurringWindows = useAppStore((state) => state.setRecurringWindows);
  const setDateSpecificWindows = useAppStore((state) => state.setDateSpecificWindows);
  const setScheduledOverlaps = useAppStore((state) => state.setScheduledOverlaps);

  const safeBookingSetup = bookingSetup ?? defaultBookingSetup;

  const recurringQuery = useQuery({
    queryKey: ["availability", "recurring", user?.id ?? token ?? "guest"],
    enabled: Boolean(token),
    queryFn: () => availabilityApi.fetchRecurringAvailability(token),
  });

  const overlapsQuery = useQuery({
    queryKey: ["availability", "overlaps", user?.id ?? token ?? "guest"],
    enabled: Boolean(token),
    queryFn: () => availabilityApi.fetchScheduledOverlaps(token),
  });

  useEffect(() => {
    if (recurringQuery.data) {
      setRecurringWindows(recurringQuery.data);
    }
  }, [recurringQuery.data, setRecurringWindows]);

  useEffect(() => {
    if (overlapsQuery.data) {
      setScheduledOverlaps(overlapsQuery.data);
    }
  }, [overlapsQuery.data, setScheduledOverlaps]);

  const initialDrafts = useMemo(
    () => (recurringWindows.length ? recurringWindows.map((window) => toDraft(window)) : [createDraftWindow()]),
    [recurringWindows],
  );

  const [drafts, setDrafts] = useState<DraftWindow[]>(initialDrafts);
  const [specificWindows, setSpecificWindowsState] = useState<DateSpecificAvailabilityWindow[]>(storedDateSpecificWindows);
  const [detailTab, setDetailTab] = useState<"PREVIEW" | "SUGGESTED">("PREVIEW");
  const [selectedSpecificDateKey, setSelectedSpecificDateKey] = useState<string | null>(null);
  const [specificMonth, setSpecificMonth] = useState(() => new Date());
  const [hangoutFormat, setHangoutFormat] = useState<"ONE_ON_ONE" | "GROUP">(safeBookingSetup.format);
  const [hangoutTitle, setHangoutTitle] = useState(safeBookingSetup.title);
  const [hangoutDescription, setHangoutDescription] = useState(safeBookingSetup.description);
  const [hangoutLocation, setHangoutLocation] = useState(safeBookingSetup.locationName);
  const [groupDurationMinutes, setGroupDurationMinutes] = useState(safeBookingSetup.durationMinutes);
  const [groupParticipantCap, setGroupParticipantCap] = useState(safeBookingSetup.participantCap);
  const [groupMinimumConfirmations, setGroupMinimumConfirmations] = useState(safeBookingSetup.minimumConfirmations);
  const [groupDecisionMode, setGroupDecisionMode] = useState<SchedulingDecisionMode>(safeBookingSetup.decisionMode);
  const [groupVisibilityMode, setGroupVisibilityMode] = useState<SchedulingVisibilityMode>(safeBookingSetup.visibilityMode);
  const [groupResponseDeadlineHours, setGroupResponseDeadlineHours] = useState(safeBookingSetup.responseDeadlineHours);
  const [feedback, setFeedback] = useState<{ title: string; detail: string } | null>(null);

  useEffect(() => {
    setDrafts(initialDrafts);
  }, [initialDrafts]);

  useEffect(() => {
    setSpecificWindowsState(storedDateSpecificWindows);
  }, [storedDateSpecificWindows]);

  useEffect(() => {
    setHangoutFormat(safeBookingSetup.format);
    setHangoutTitle(safeBookingSetup.title);
    setHangoutDescription(safeBookingSetup.description);
    setHangoutLocation(safeBookingSetup.locationName);
    setGroupDurationMinutes(safeBookingSetup.durationMinutes);
    setGroupParticipantCap(safeBookingSetup.participantCap);
    setGroupMinimumConfirmations(clampNumber(safeBookingSetup.minimumConfirmations, 2, safeBookingSetup.participantCap));
    setGroupDecisionMode(safeBookingSetup.decisionMode);
    setGroupVisibilityMode(safeBookingSetup.visibilityMode);
    setGroupResponseDeadlineHours(safeBookingSetup.responseDeadlineHours);
  }, [safeBookingSetup]);

  const weeklyRows = useMemo(
    () =>
      weekdayOptionLabels.map((label, dayIndex) => ({
        label,
        dayIndex,
        drafts: drafts.filter((draft) => draft.recurrence === "WEEKLY" && draft.dayOfWeek === dayIndex),
      })),
    [drafts],
  );

  const monthlyDrafts = useMemo(() => drafts.filter((draft) => draft.recurrence === "MONTHLY"), [drafts]);

  const bookingSharePath = useMemo(
    () =>
      user?.inviteCode
        ? buildBookingSharePath(user.inviteCode, {
            format: hangoutFormat,
            title: hangoutTitle,
            description: hangoutDescription,
            locationName: hangoutLocation,
          })
        : null,
    [hangoutDescription, hangoutFormat, hangoutLocation, hangoutTitle, user?.inviteCode],
  );

  const currentSpecificMonthPrefix = useMemo(
    () => `${specificMonth.getFullYear()}-${padDatePart(specificMonth.getMonth() + 1)}`,
    [specificMonth],
  );

  const specificDatesSet = useMemo(() => new Set(specificWindows.map((window) => window.dateKey)), [specificWindows]);

  useEffect(() => {
    if (selectedSpecificDateKey && sameMonthAs(selectedSpecificDateKey, specificMonth)) {
      return;
    }

    const firstSpecificInMonth = specificWindows.find((window) => window.dateKey.startsWith(currentSpecificMonthPrefix));
    setSelectedSpecificDateKey(firstSpecificInMonth?.dateKey ?? `${currentSpecificMonthPrefix}-${padDatePart(1)}`);
  }, [currentSpecificMonthPrefix, selectedSpecificDateKey, specificMonth, specificWindows]);

  const selectedSpecificDay = useMemo(
    () => (selectedSpecificDateKey ? parseDateKey(selectedSpecificDateKey) : specificMonth),
    [selectedSpecificDateKey, specificMonth],
  );
  const selectedSpecificDayNumber = selectedSpecificDay.getDate();
  const selectedSpecificLabel = formatSpecificDateLabel(toDateKey(selectedSpecificDay));

  const selectedSpecificWindows = useMemo(
    () => (selectedSpecificDateKey ? specificWindows.filter((window) => window.dateKey === selectedSpecificDateKey) : []),
    [selectedSpecificDateKey, specificWindows],
  );

  const selectedRepeatingDrafts = useMemo(
    () => monthlyDrafts.filter((draft) => (draft.dayOfMonth ?? 15) === selectedSpecificDayNumber),
    [monthlyDrafts, selectedSpecificDayNumber],
  );

  const previewRows = useMemo(
    () =>
      [
        ...specificWindows.map((window) => ({
          id: window.id,
          title: formatSpecificDateLabel(window.dateKey),
          subtitle: `${window.startInput} - ${window.endInput}`,
          meta: "One-off date",
          sortValue: parseDateKey(window.dateKey).getTime(),
        })),
        ...drafts.map((draft) => ({
          id: draft.id,
          title: windowDayLabel(draft),
          subtitle: windowTimeLabel(draft),
          meta: draft.recurrence === "WEEKLY" ? "Repeats weekly" : "Repeats monthly",
          sortValue: draft.recurrence === "WEEKLY" ? draft.dayOfWeek ?? 0 : 10_000 + (draft.dayOfMonth ?? 15),
        })),
      ]
        .slice()
        .sort((left, right) => left.sortValue - right.sortValue)
        .slice(0, 4),
    [drafts, specificWindows],
  );

  const sortedSuggestedTimes = useMemo(() => uniqueSuggestedOverlaps(scheduledOverlaps), [scheduledOverlaps]);

  const specificCalendarCells = useMemo(() => {
    const year = specificMonth.getFullYear();
    const month = specificMonth.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const firstWeekday = new Date(year, month, 1).getDay();

    const cells: Array<{
      key: string;
      dayNumber: number | null;
      available: boolean;
      active: boolean;
      recommended: boolean;
      onPress?: () => void;
    }> = Array.from({ length: firstWeekday }, (_, index) => ({
      key: `specific-blank-${index}`,
      dayNumber: null,
      available: false,
      active: false,
      recommended: false,
    }));

    for (let dayNumber = 1; dayNumber <= totalDays; dayNumber += 1) {
      const dateKey = `${year}-${padDatePart(month + 1)}-${padDatePart(dayNumber)}`;
      cells.push({
        key: `specific-${month}-${dayNumber}`,
        dayNumber,
        available: true,
        active: dateKey === selectedSpecificDateKey,
        recommended: specificDatesSet.has(dateKey),
        onPress: () => setSelectedSpecificDateKey(dateKey),
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({
        key: `specific-trailing-${cells.length}`,
        dayNumber: null,
        available: false,
        active: false,
        recommended: false,
      });
    }

    return cells;
  }, [selectedSpecificDateKey, specificDatesSet, specificMonth]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const utcOffsetMinutes = new Date().getTimezoneOffset();
      const payload: SaveWindowPayload[] = drafts.map((draft) => {
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

      specificWindows.forEach((window) => {
        const startMinute = parseTimeInput(window.startInput);
        const endMinute = parseTimeInput(window.endInput);

        if (startMinute === null || endMinute === null) {
          throw new Error("Use a time like 6:30 PM.");
        }

        if (endMinute <= startMinute) {
          throw new Error("End time must be later than start time.");
        }
      });

      const nextBookingSetup = {
        format: hangoutFormat,
        title: hangoutTitle.trim() || "Quick catch-up",
        description: hangoutDescription.trim() || "Pick an easy time and we can see what sticks.",
        locationName: hangoutLocation.trim(),
        durationMinutes: clampNumber(groupDurationMinutes, 15, 360),
        participantCap: clampNumber(groupParticipantCap, 2, 24),
        minimumConfirmations: clampNumber(groupMinimumConfirmations, 2, groupParticipantCap),
        decisionMode: groupDecisionMode,
        visibilityMode: groupVisibilityMode,
        responseDeadlineHours: clampNumber(groupResponseDeadlineHours, 1, 168),
        lastGroupSession: null,
      };

      const saved = await availabilityApi.saveRecurringAvailability(token, payload);
      const overlaps = await availabilityApi.fetchScheduledOverlaps(token);
      await track(token, "availability_schedule_saved", { windowCount: saved.length });

      return { nextBookingSetup, saved, overlaps };
    },
    onSuccess: ({ nextBookingSetup, saved, overlaps }) => {
      setBookingSetup(nextBookingSetup);
      setDateSpecificWindows(specificWindows);
      setRecurringWindows(saved);
      setScheduledOverlaps(overlaps);
      queryClient.setQueryData(["availability", "recurring", user?.id ?? token ?? "guest"], saved);
      queryClient.setQueryData(["availability", "overlaps", user?.id ?? token ?? "guest"], overlaps);
      setFeedback({
        title: "Hang rhythm saved",
        detail: "Your weekly flow, one-off dates, and booking setup are all updated.",
      });
    },
    onError: (error) => {
      Alert.alert(
        "Could not save hang rhythm",
        error instanceof Error ? error.message : "Try that again.",
      );
    },
  });

  const updateDraft = useCallback((id: string, patch: Partial<DraftWindow>) => {
    setDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
  }, []);

  const updateSpecificWindow = useCallback((id: string, patch: Partial<DateSpecificAvailabilityWindow>) => {
    setSpecificWindowsState((current) => current.map((window) => (window.id === id ? { ...window, ...patch } : window)));
  }, []);

  const toggleWeeklyDay = (dayIndex: number) => {
    const row = weeklyRows.find((item) => item.dayIndex === dayIndex);

    if (row?.drafts.length) {
      setDrafts((current) => current.filter((draft) => !(draft.recurrence === "WEEKLY" && draft.dayOfWeek === dayIndex)));
      return;
    }

    setDrafts((current) => [...current, createDraftWindow("WEEKLY", { dayOfWeek: dayIndex })]);
  };

  const addWeeklyRange = (dayIndex: number) => {
    setDrafts((current) => [...current, createDraftWindow("WEEKLY", { dayOfWeek: dayIndex })]);
  };

  const addRepeatingMonthlyRange = () => {
    setDrafts((current) => [...current, createDraftWindow("MONTHLY", { dayOfMonth: selectedSpecificDayNumber })]);
  };

  const removeRecurringWindow = (id: string) => {
    setDrafts((current) => current.filter((draft) => draft.id !== id));
  };

  const addSpecificDateRange = (dateKey: string) => {
    setSpecificWindowsState((current) => [...current, createSpecificDateWindow(dateKey)]);
    setSelectedSpecificDateKey(dateKey);
  };

  const removeSpecificDateWindow = (id: string) => {
    setSpecificWindowsState((current) => current.filter((window) => window.id !== id));
  };
  const resolveBookingPath = useCallback(
    async (createIfMissing: boolean) => {
      if (!user?.inviteCode) {
        return null;
      }

      if (hangoutFormat === "ONE_ON_ONE") {
        return buildBookingSharePath(user.inviteCode, {
          format: hangoutFormat,
          title: hangoutTitle,
          description: hangoutDescription,
          locationName: hangoutLocation,
        });
      }

      const signature = buildGroupSessionSignature({
        title: hangoutTitle,
        description: hangoutDescription,
        locationName: hangoutLocation,
        durationMinutes: groupDurationMinutes,
        participantCap: groupParticipantCap,
        minimumConfirmations: groupMinimumConfirmations,
        decisionMode: groupDecisionMode,
        visibilityMode: groupVisibilityMode,
        responseDeadlineHours: groupResponseDeadlineHours,
        specificWindows,
      });

      const existingSession = safeBookingSetup.lastGroupSession;
      if (existingSession?.shareCode && existingSession.signature === signature) {
        return buildBookingSharePath(user.inviteCode, {
          format: "GROUP",
          title: hangoutTitle,
          description: hangoutDescription,
          locationName: hangoutLocation,
          sessionShareCode: existingSession.shareCode,
        });
      }

      if (!createIfMissing) {
        return null;
      }

      const dateSpecificPayload = specificWindows
        .map((window) => {
          const startMinute = parseTimeInput(window.startInput);
          const endMinute = parseTimeInput(window.endInput);
          if (startMinute === null || endMinute === null || endMinute <= startMinute) {
            return null;
          }

          return {
            dateKey: window.dateKey,
            startMinute,
            endMinute,
          };
        })
        .filter(Boolean) as Array<{ dateKey: string; startMinute: number; endMinute: number }>;

      if (!dateSpecificPayload.length) {
        Alert.alert(
          "Group link needs date windows",
          "Add at least one date-specific window so your group can vote on real slots.",
        );
        return null;
      }

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const responseDeadline = new Date(
        Date.now() + clampNumber(groupResponseDeadlineHours, 1, 168) * 60 * 60 * 1000,
      ).toISOString();

      const session = await availabilityApi.createGroupSchedulingSession(token, user.inviteCode, {
        title: hangoutTitle.trim() || "Group hangout",
        description: hangoutDescription.trim() || "Pick an easy time and let the crew claim what works.",
        locationName: hangoutLocation.trim() || user.communityTag || user.city || "Nearby",
        durationMinutes: clampNumber(groupDurationMinutes, 15, 360),
        timezone,
        participantCap: clampNumber(groupParticipantCap, 2, 24),
        minimumConfirmations: clampNumber(groupMinimumConfirmations, 2, groupParticipantCap),
        decisionMode: groupDecisionMode,
        visibilityMode: groupVisibilityMode,
        responseDeadline,
        dateSpecificWindows: dateSpecificPayload,
      });

      setBookingSetup({
        lastGroupSession: {
          shareCode: session.session.shareCode,
          signature,
        },
      });

      return buildBookingSharePath(user.inviteCode, {
        format: "GROUP",
        title: hangoutTitle,
        description: hangoutDescription,
        locationName: hangoutLocation,
        sessionShareCode: session.session.shareCode,
      });
    },
    [
      groupDecisionMode,
      groupDurationMinutes,
      groupMinimumConfirmations,
      groupParticipantCap,
      groupResponseDeadlineHours,
      groupVisibilityMode,
      hangoutDescription,
      hangoutFormat,
      hangoutLocation,
      hangoutTitle,
      safeBookingSetup.lastGroupSession,
      setBookingSetup,
      specificWindows,
      token,
      user,
    ],
  );

  const copyOrShareLink = useCallback(
    async (mode: "copy" | "share") => {
      try {
        const bookingPath = await resolveBookingPath(true);
        if (!bookingPath) {
          return;
        }

        const bookingLink = createBrowserAppUrl(bookingPath) ?? createSmartOpenUrl(bookingPath);

        if (mode === "copy") {
          const clipboard = readClipboard();
          if (clipboard?.writeText) {
            await clipboard.writeText(bookingLink);
            setFeedback({
              title: "Link copied",
              detail: "Paste it anywhere and people will land on your booking page.",
            });
            return;
          }
        }

        await Share.share({ message: bookingLink });
        setFeedback({
          title: mode === "copy" ? "Share sheet opened" : "Ready to share",
          detail: "Drop your booking link where your people already talk.",
        });
      } catch (error) {
        Alert.alert(
          "Could not prepare that link",
          error instanceof Error ? error.message : "Try again in a second.",
        );
      }
    },
    [resolveBookingPath],
  );

  const handlePreview = useCallback(async () => {
    try {
      if (hangoutFormat === "GROUP") {
        const sharePath = await resolveBookingPath(false);
        if (!sharePath) {
          Alert.alert(
            "Copy the group link first",
            "Creating a fresh group scheduling session happens the first time you copy or share the link.",
          );
          return;
        }

        router.push(sharePath as never);
        return;
      }

      if (!bookingSharePath) {
        router.push("/now-mode" as never);
        return;
      }

      router.push(bookingSharePath as never);
    } catch (error) {
      Alert.alert(
        "Could not open preview",
        error instanceof Error ? error.message : "Try again in a second.",
      );
    }
  }, [bookingSharePath, hangoutFormat, resolveBookingPath, router]);

  const windowCount = drafts.length + specificWindows.length;
  const recurringSummary = drafts.length
    ? `${drafts.length} repeating ${drafts.length === 1 ? "window" : "windows"}`
    : "No recurring windows yet";
  const specificSummary = specificWindows.length
    ? `${specificWindows.length} one-off ${specificWindows.length === 1 ? "date" : "dates"}`
    : "No date-specific windows yet";
  const suggestedCount = sortedSuggestedTimes.length;

  return {
    status: user ? "ready" : "error",
    isLoading: recurringQuery.isLoading && overlapsQuery.isLoading && !recurringWindows.length && !scheduledOverlaps.length,
    isError: Boolean(recurringQuery.error && !recurringWindows.length),
    feedback,
    title: "Set your hang rhythm",
    subtitle: "Recurring windows, one-off dates, and a booking link that stays easy to trust.",
    heroTitle: "Let timing feel obvious before the moment even happens.",
    heroCopy: "Nowly uses these windows to surface better overlap, cleaner invites, and warmer next steps.",
    heroMeta: [recurringSummary, specificSummary, `${suggestedCount} suggested overlaps`],
    windowCount,
    detailTab,
    setDetailTab,
    weekdayRows: weeklyRows.map((row) => ({
      key: `${row.dayIndex}`,
      label: row.label,
      active: row.drafts.length > 0,
      count: row.drafts.length,
      onToggle: () => toggleWeeklyDay(row.dayIndex),
      onAddRange: () => addWeeklyRange(row.dayIndex),
      drafts: row.drafts.map((draft) => ({
        id: draft.id,
        title: windowDayLabel(draft),
        timeLine: windowTimeLabel(draft),
        moodSummary: windowMoodSummary(draft),
        label: draft.label,
        vibe: draft.vibe,
        hangoutIntent: draft.hangoutIntent,
        startInput: draft.startInput,
        endInput: draft.endInput,
        onChangeLabel: (value: string) => updateDraft(draft.id, { label: value }),
        onChangeStart: (value: string) => updateDraft(draft.id, { startInput: value }),
        onChangeEnd: (value: string) => updateDraft(draft.id, { endInput: value }),
        onChangeVibe: (value: (typeof vibeOptions)[number] | null) => updateDraft(draft.id, { vibe: value }),
        onChangeIntent: (value: (typeof hangoutIntentOptions)[number] | null) => updateDraft(draft.id, { hangoutIntent: value }),
        onRemove: () => removeRecurringWindow(draft.id),
      })),
    })),
    monthlyDrafts: monthlyDrafts.map((draft) => ({
      id: draft.id,
      title: windowDayLabel(draft),
      timeLine: windowTimeLabel(draft),
      moodSummary: windowMoodSummary(draft),
      label: draft.label,
      vibe: draft.vibe,
      hangoutIntent: draft.hangoutIntent,
      startInput: draft.startInput,
      endInput: draft.endInput,
      onChangeLabel: (value: string) => updateDraft(draft.id, { label: value }),
      onChangeStart: (value: string) => updateDraft(draft.id, { startInput: value }),
      onChangeEnd: (value: string) => updateDraft(draft.id, { endInput: value }),
      onChangeDayOfMonth: (value: number) => updateDraft(draft.id, { dayOfMonth: value }),
      onChangeVibe: (value: (typeof vibeOptions)[number] | null) => updateDraft(draft.id, { vibe: value }),
      onChangeIntent: (value: (typeof hangoutIntentOptions)[number] | null) => updateDraft(draft.id, { hangoutIntent: value }),
      onRemove: () => removeRecurringWindow(draft.id),
    })),
    onAddMonthlyRange: addRepeatingMonthlyRange,
    selectedSpecificLabel,
    selectedSpecificWindows: selectedSpecificWindows.map((window) => ({
      id: window.id,
      startInput: window.startInput,
      endInput: window.endInput,
      onChangeStart: (value: string) => updateSpecificWindow(window.id, { startInput: value }),
      onChangeEnd: (value: string) => updateSpecificWindow(window.id, { endInput: value }),
      onRemove: () => removeSpecificDateWindow(window.id),
    })),
    selectedRepeatingDrafts: selectedRepeatingDrafts.map((draft) => ({
      id: draft.id,
      title: windowDayLabel(draft),
      timeLine: windowTimeLabel(draft),
      moodSummary: windowMoodSummary(draft),
    })),
    onAddSpecificDateRange: () => addSpecificDateRange(selectedSpecificDateKey ?? toDateKey(selectedSpecificDay)),
    specificMonthLabel: specificMonth.toLocaleDateString([], { month: "long", year: "numeric" }),
    onPrevSpecificMonth: () => setSpecificMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)),
    onNextSpecificMonth: () => setSpecificMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)),
    specificCalendarCells,
    bookingFormat: hangoutFormat,
    onSetBookingFormat: setHangoutFormat,
    bookingTitle: hangoutTitle,
    onChangeBookingTitle: setHangoutTitle,
    bookingDescription: hangoutDescription,
    onChangeBookingDescription: setHangoutDescription,
    bookingLocation: hangoutLocation,
    onChangeBookingLocation: setHangoutLocation,
    groupDurationMinutes,
    onChangeGroupDurationMinutes: setGroupDurationMinutes,
    groupParticipantCap,
    onChangeGroupParticipantCap: (value: number) => {
      const nextCap = clampNumber(value, 2, 24);
      setGroupParticipantCap(nextCap);
      setGroupMinimumConfirmations((current) => clampNumber(current, 2, nextCap));
    },
    groupMinimumConfirmations,
    onChangeGroupMinimumConfirmations: (value: number) =>
      setGroupMinimumConfirmations(clampNumber(value, 2, groupParticipantCap)),
    groupResponseDeadlineHours,
    onChangeGroupResponseDeadlineHours: setGroupResponseDeadlineHours,
    groupDecisionMode,
    onSetGroupDecisionMode: setGroupDecisionMode,
    groupVisibilityMode,
    onSetGroupVisibilityMode: setGroupVisibilityMode,
    groupDecisionOptions: groupDecisionModeOptions,
    groupVisibilityOptions: groupVisibilityModeOptions,
    previewRows,
    suggestedRows: sortedSuggestedTimes.map((overlap) => ({
      id: overlap.id,
      name: overlap.matchedUser.name,
      title: overlap.label,
      summary: overlap.summary,
      scoreLabel: `${Math.round(overlap.score * 100)}% fit`,
    })),
    canShareLink: Boolean(user?.inviteCode),
    onCopyLink: () => void copyOrShareLink("copy"),
    onShareLink: () => void copyOrShareLink("share"),
    onPreview: () => void handlePreview(),
    onRetry: () => {
      void recurringQuery.refetch();
      void overlapsQuery.refetch();
    },
    onBack: () => router.back(),
    onSave: () => saveMutation.mutate(),
    saveLabel: saveMutation.isPending ? "Saving hang rhythm..." : "Save hang rhythm",
    saveDisabled: saveMutation.isPending,
    formatOptions: [
      {
        key: "ONE_ON_ONE",
        title: "1:1 booking",
        subtitle: "Warm, simple, direct",
        icon: "account-heart-outline" as const,
        selected: hangoutFormat === "ONE_ON_ONE",
        onPress: () => setHangoutFormat("ONE_ON_ONE"),
      },
      {
        key: "GROUP",
        title: "Group scheduling",
        subtitle: "Vote on real slots together",
        icon: "account-group-outline" as const,
        selected: hangoutFormat === "GROUP",
        onPress: () => setHangoutFormat("GROUP"),
      },
    ],
    vibeOptions: vibeOptions.map((option) => ({ key: option, label: vibeLabel(option), value: option })),
    intentOptions: hangoutIntentOptions.map((option) => ({ key: option, label: hangoutIntentLabel(option), value: option })),
  };
};
