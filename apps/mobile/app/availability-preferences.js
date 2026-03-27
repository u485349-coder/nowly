import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Animated, { FadeInDown, FadeOutUp, LinearTransition, } from "react-native-reanimated";
import { GradientMesh } from "../components/ui/GradientMesh";
import { NowlyToast } from "../components/ui/NowlyToast";
import { PillButton } from "../components/ui/PillButton";
import { useResponsiveLayout } from "../components/ui/useResponsiveLayout";
import { nowlyColors } from "../constants/theme";
import { api } from "../lib/api";
import { track } from "../lib/analytics";
import { formatMinutesOfDay, formatOrdinalDay, parseTimeInput, toTimeInputValue, weekdayOptionLabels, } from "../lib/recurring-availability";
import { hangoutIntentLabel, vibeLabel } from "../lib/labels";
import { createBrowserAppUrl, createSmartOpenUrl } from "../lib/smart-links";
import { webPressableStyle } from "../lib/web-pressable";
import { useAppStore } from "../store/useAppStore";
const padDatePart = (value) => String(value).padStart(2, "0");
const toDateKey = (value) => `${value.getFullYear()}-${padDatePart(value.getMonth() + 1)}-${padDatePart(value.getDate())}`;
const parseDateKey = (value) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
};
const formatSpecificDateLabel = (value) => {
    const date = parseDateKey(value);
    return `${date.toLocaleDateString([], { month: "long" })} ${formatOrdinalDay(date.getDate())}, ${date.getFullYear()}`;
};
const sameMonthAs = (dateKey, monthDate) => {
    const date = parseDateKey(dateKey);
    return (date.getFullYear() === monthDate.getFullYear() &&
        date.getMonth() === monthDate.getMonth());
};
const createSpecificDateWindow = (dateKey, overrides = {}) => ({
    id: `specific-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    dateKey,
    startInput: "6:00 PM",
    endInput: "8:00 PM",
    ...overrides,
});
const createDraftWindow = (recurrence = "WEEKLY", overrides = {}) => ({
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
const toDraft = (window) => ({
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
const resolveMinutes = (value, fallback) => parseTimeInput(value) ?? fallback;
const windowDayLabel = (draft) => draft.recurrence === "WEEKLY"
    ? weekdayOptionLabels[draft.dayOfWeek ?? 0]
    : `Monthly on the ${formatOrdinalDay(draft.dayOfMonth ?? 15)}`;
const windowTimeLabel = (draft) => `${formatMinutesOfDay(resolveMinutes(draft.startInput, 18 * 60))} - ${formatMinutesOfDay(resolveMinutes(draft.endInput, 20 * 60))}`;
const clampNumber = (value, min, max) => Math.max(min, Math.min(max, value));
const groupDecisionModeOptions = [
    { value: "MINIMUM_REQUIRED", label: "Min required" },
    { value: "EVERYONE_AGREES", label: "Everyone agrees" },
    { value: "HOST_DECIDES", label: "Host decides" },
];
const groupVisibilityModeOptions = [
    { value: "PUBLIC", label: "Public votes" },
    { value: "ANONYMOUS", label: "Anonymous votes" },
];
const windowMoodSummary = (draft) => {
    const parts = [
        draft.label.trim() || null,
        draft.hangoutIntent ? hangoutIntentLabel(draft.hangoutIntent) : null,
        draft.vibe ? vibeLabel(draft.vibe) : null,
    ].filter(Boolean);
    return parts.length ? parts.slice(0, 2).join(" / ") : "Tap to tune the mood";
};
const recurringWindowSummary = (window) => {
    const dayLabel = window.recurrence === "WEEKLY"
        ? weekdayOptionLabels[window.dayOfWeek ?? 0]
        : `Monthly on the ${formatOrdinalDay(window.dayOfMonth ?? 15)}`;
    return `${dayLabel} · ${formatMinutesOfDay(window.startMinute)} - ${formatMinutesOfDay(window.endMinute)}`;
};
const PreferenceChip = ({ label, active, onPress, }) => (_jsx(Pressable, { onPress: onPress, style: ({ pressed }) => [
        styles.choiceChip,
        active ? styles.choiceChipActive : styles.choiceChipIdle,
        webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.985 }),
    ], children: _jsx(Text, { className: `font-body text-sm ${active ? "text-cloud" : "text-white/76"}`, numberOfLines: 1, children: label }) }));
const buildBookingSharePath = (inviteCode, setup) => {
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
const buildGroupSessionSignature = ({ title, description, locationName, durationMinutes, participantCap, minimumConfirmations, decisionMode, visibilityMode, responseDeadlineHours, specificWindows, }) => {
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
export default function AvailabilityPreferencesScreen() {
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [saving, setSaving] = useState(false);
    const token = useAppStore((state) => state.token);
    const user = useAppStore((state) => state.user);
    const bookingSetup = useAppStore((state) => state.bookingSetup);
    const setBookingSetup = useAppStore((state) => state.setBookingSetup);
    const recurringWindows = useAppStore((state) => state.recurringWindows);
    const scheduledOverlaps = useAppStore((state) => state.scheduledOverlaps);
    const storedDateSpecificWindows = useAppStore((state) => state.dateSpecificWindows);
    const setRecurringWindows = useAppStore((state) => state.setRecurringWindows);
    const setDateSpecificWindows = useAppStore((state) => state.setDateSpecificWindows);
    const setScheduledOverlaps = useAppStore((state) => state.setScheduledOverlaps);
    const layout = useResponsiveLayout();
    const safeBookingSetup = bookingSetup ?? {
        format: "ONE_ON_ONE",
        title: "Quick catch-up",
        description: "Pick an easy time and we can lock something in.",
        locationName: "",
        durationMinutes: 60,
        participantCap: 5,
        minimumConfirmations: 3,
        decisionMode: "MINIMUM_REQUIRED",
        visibilityMode: "PUBLIC",
        responseDeadlineHours: 24,
        lastGroupSession: null,
    };
    const initialDrafts = useMemo(() => recurringWindows.length
        ? recurringWindows.map((window) => toDraft(window))
        : [createDraftWindow()], [recurringWindows]);
    const [drafts, setDrafts] = useState(initialDrafts);
    const [specificWindows, setSpecificWindows] = useState(storedDateSpecificWindows);
    const [detailTab, setDetailTab] = useState("PREVIEW");
    const [previewExpanded, setPreviewExpanded] = useState(true);
    const [selectedSpecificDateKey, setSelectedSpecificDateKey] = useState(null);
    const [specificMonth, setSpecificMonth] = useState(() => new Date());
    const [hangoutFormat, setHangoutFormat] = useState(safeBookingSetup.format);
    const [hangoutTitle, setHangoutTitle] = useState(safeBookingSetup.title);
    const [hangoutDescription, setHangoutDescription] = useState(safeBookingSetup.description);
    const [hangoutLocation, setHangoutLocation] = useState(safeBookingSetup.locationName);
    const [groupDurationMinutes, setGroupDurationMinutes] = useState(safeBookingSetup.durationMinutes);
    const [groupParticipantCap, setGroupParticipantCap] = useState(safeBookingSetup.participantCap);
    const [groupMinimumConfirmations, setGroupMinimumConfirmations] = useState(safeBookingSetup.minimumConfirmations);
    const [groupDecisionMode, setGroupDecisionMode] = useState(safeBookingSetup.decisionMode);
    const [groupVisibilityMode, setGroupVisibilityMode] = useState(safeBookingSetup.visibilityMode);
    const [groupResponseDeadlineHours, setGroupResponseDeadlineHours] = useState(safeBookingSetup.responseDeadlineHours);
    const [actionToast, setActionToast] = useState(null);
    const toastTimeoutRef = useRef(null);
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
    }, [initialDrafts]);
    useEffect(() => {
        setSpecificWindows(storedDateSpecificWindows);
    }, [storedDateSpecificWindows]);
    useEffect(() => {
        return () => {
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
            }
        };
    }, []);
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
    }, [
        safeBookingSetup.description,
        safeBookingSetup.decisionMode,
        safeBookingSetup.durationMinutes,
        safeBookingSetup.format,
        safeBookingSetup.locationName,
        safeBookingSetup.minimumConfirmations,
        safeBookingSetup.participantCap,
        safeBookingSetup.responseDeadlineHours,
        safeBookingSetup.title,
        safeBookingSetup.visibilityMode,
    ]);
    const weeklyRows = useMemo(() => weekdayOptionLabels.map((label, dayIndex) => ({
        label,
        dayIndex,
        drafts: drafts.filter((draft) => draft.recurrence === "WEEKLY" && draft.dayOfWeek === dayIndex),
    })), [drafts]);
    const monthlyDrafts = useMemo(() => drafts.filter((draft) => draft.recurrence === "MONTHLY"), [drafts]);
    const bookingSharePath = useMemo(() => user?.inviteCode
        ? buildBookingSharePath(user.inviteCode, {
            format: hangoutFormat,
            title: hangoutTitle,
            description: hangoutDescription,
            locationName: hangoutLocation,
        })
        : null, [hangoutDescription, hangoutFormat, hangoutLocation, hangoutTitle, user?.inviteCode]);
    const currentSpecificMonthPrefix = useMemo(() => `${specificMonth.getFullYear()}-${padDatePart(specificMonth.getMonth() + 1)}`, [specificMonth]);
    const specificDatesSet = useMemo(() => new Set(specificWindows.map((window) => window.dateKey)), [specificWindows]);
    const selectedSpecificDay = useMemo(() => (selectedSpecificDateKey ? parseDateKey(selectedSpecificDateKey) : specificMonth), [selectedSpecificDateKey, specificMonth]);
    const selectedSpecificDayNumber = selectedSpecificDay.getDate();
    const selectedSpecificLabel = formatSpecificDateLabel(toDateKey(selectedSpecificDay));
    const selectedSpecificWindows = useMemo(() => selectedSpecificDateKey === null
        ? []
        : specificWindows.filter((window) => window.dateKey === selectedSpecificDateKey), [selectedSpecificDateKey, specificWindows]);
    const selectedRepeatingDrafts = useMemo(() => monthlyDrafts.filter((draft) => (draft.dayOfMonth ?? 15) === selectedSpecificDayNumber), [monthlyDrafts, selectedSpecificDayNumber]);
    const previewRows = useMemo(() => [
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
            sortValue: draft.recurrence === "WEEKLY"
                ? draft.dayOfWeek ?? 0
                : 10_000 + (draft.dayOfMonth ?? 15),
        })),
    ]
        .slice()
        .sort((left, right) => {
        return left.sortValue - right.sortValue;
    })
        .slice(0, 3), [drafts, specificWindows]);
    const sortedSuggestedTimes = useMemo(() => [...scheduledOverlaps].sort((left, right) => right.score - left.score), [scheduledOverlaps]);
    const specificCalendarDays = useMemo(() => {
        const year = specificMonth.getFullYear();
        const month = specificMonth.getMonth();
        const totalDays = new Date(year, month + 1, 0).getDate();
        const firstWeekday = new Date(year, month, 1).getDay();
        const cells = Array.from({ length: firstWeekday }, (_, index) => ({
            key: `specific-blank-${index}`,
            dayNumber: null,
            dateKey: null,
        }));
        for (let dayNumber = 1; dayNumber <= totalDays; dayNumber += 1) {
            const dateKey = `${year}-${padDatePart(month + 1)}-${padDatePart(dayNumber)}`;
            cells.push({
                key: `specific-${month}-${dayNumber}`,
                dayNumber,
                dateKey,
            });
        }
        while (cells.length % 7 !== 0) {
            cells.push({
                key: `specific-trailing-${cells.length}`,
                dayNumber: null,
                dateKey: null,
            });
        }
        return cells;
    }, [specificMonth]);
    const specificMonthLabel = specificMonth.toLocaleDateString([], {
        month: "long",
        year: "numeric",
    });
    const updateDraft = (id, patch) => {
        setDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
    };
    const showToast = (toast) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setActionToast({ id, ...toast });
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
        }
        toastTimeoutRef.current = setTimeout(() => {
            setActionToast((current) => (current?.id === id ? null : current));
        }, 2600);
    };
    useEffect(() => {
        if (selectedSpecificDateKey &&
            sameMonthAs(selectedSpecificDateKey, specificMonth)) {
            return;
        }
        const firstSpecificInMonth = specificWindows.find((window) => window.dateKey.startsWith(currentSpecificMonthPrefix));
        setSelectedSpecificDateKey(firstSpecificInMonth?.dateKey ??
            `${currentSpecificMonthPrefix}-${padDatePart(1)}`);
    }, [currentSpecificMonthPrefix, selectedSpecificDateKey, specificMonth, specificWindows]);
    const toggleWeeklyDay = (dayIndex) => {
        const row = weeklyRows.find((item) => item.dayIndex === dayIndex);
        if (row?.drafts.length) {
            setDrafts((current) => current.filter((draft) => !(draft.recurrence === "WEEKLY" && draft.dayOfWeek === dayIndex)));
            return;
        }
        const next = createDraftWindow("WEEKLY", { dayOfWeek: dayIndex });
        setDrafts((current) => [...current, next]);
    };
    const addWeeklyRange = (dayIndex) => {
        const next = createDraftWindow("WEEKLY", { dayOfWeek: dayIndex });
        setDrafts((current) => [...current, next]);
    };
    const updateSpecificWindow = (id, patch) => {
        setSpecificWindows((current) => current.map((window) => (window.id === id ? { ...window, ...patch } : window)));
    };
    const addSpecificDateRange = (dateKey) => {
        const next = createSpecificDateWindow(dateKey);
        setSpecificWindows((current) => [...current, next]);
        setSelectedSpecificDateKey(dateKey);
    };
    const removeSpecificDateWindow = (id) => {
        setSpecificWindows((current) => current.filter((window) => window.id !== id));
    };
    const addRepeatingMonthlyRange = () => {
        const next = createDraftWindow("MONTHLY", { dayOfMonth: selectedSpecificDayNumber });
        setDrafts((current) => [...current, next]);
    };
    const removeRecurringWindow = (id) => {
        setDrafts((current) => current.filter((draft) => draft.id !== id));
    };
    const handleSaveRecurringAvailability = async (windows) => {
        const saved = await api.saveRecurringAvailability(token, windows);
        setRecurringWindows(saved);
        await track(token, "availability_schedule_saved", {
            windowCount: saved.length,
        });
        setLoadingSuggestions(true);
        try {
            const overlaps = await api.fetchScheduledOverlaps(token);
            setScheduledOverlaps(overlaps);
        }
        finally {
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
        try {
            setSaving(true);
            setBookingSetup({
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
            });
            setDateSpecificWindows(specificWindows);
            await handleSaveRecurringAvailability(payload);
            showToast({
                title: "Hang rhythm saved",
                message: "Your booking page was updated with these windows.",
                icon: "calendar-check-outline",
            });
        }
        catch (error) {
            Alert.alert("Could not save hang rhythm", error instanceof Error ? error.message : "Try that again.");
        }
        finally {
            setSaving(false);
        }
    };
    const handleCopyLink = async () => {
        const resolveBookingPath = async () => {
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
            const dateSpecificWindows = specificWindows
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
                .filter(Boolean);
            if (!dateSpecificWindows.length) {
                Alert.alert("Group link needs date windows", "Add at least one date-specific window so your group can vote on real slots.");
                return null;
            }
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
            const responseDeadline = new Date(Date.now() + clampNumber(groupResponseDeadlineHours, 1, 168) * 60 * 60 * 1000).toISOString();
            const session = await api.createGroupSchedulingSession(token, user.inviteCode, {
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
                dateSpecificWindows,
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
        };
        try {
            const bookingPath = await resolveBookingPath();
            if (!bookingPath) {
                return;
            }
            const bookingLink = createBrowserAppUrl(bookingPath) ?? createSmartOpenUrl(bookingPath);
            const clipboard = globalThis.navigator?.clipboard;
            if (clipboard?.writeText) {
                await clipboard.writeText(bookingLink);
                showToast({
                    title: "Link copied",
                    message: "Paste it anywhere and people will land on your booking page.",
                    icon: "link-variant",
                });
                return;
            }
            await Share.share({
                message: bookingLink,
            });
            showToast({
                title: "Share sheet opened",
                message: "Drop your booking link where your people already talk.",
                icon: "share-variant-outline",
            });
        }
        catch (error) {
            Alert.alert("Could not prepare that link", error instanceof Error ? error.message : "Try again in a second.");
        }
    };
    const handlePreviewLink = async () => {
        try {
            if (!bookingSharePath && hangoutFormat !== "GROUP") {
                router.push("/now-mode");
                return;
            }
            if (hangoutFormat === "GROUP") {
                const sharePath = await (async () => {
                    if (!user?.inviteCode) {
                        return null;
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
                    return null;
                })();
                if (!sharePath) {
                    Alert.alert("Copy the group link first", "Creating a fresh group scheduling session happens when you copy the link.");
                    return;
                }
                router.push(sharePath);
                return;
            }
            router.push(bookingSharePath);
        }
        catch (error) {
            Alert.alert("Could not open preview", error instanceof Error ? error.message : "Try again in a second.");
        }
    };
    return (_jsx(GradientMesh, { children: _jsxs(View, { style: styles.screen, children: [_jsx(NowlyToast, { toast: actionToast, top: layout.isDesktop ? 22 : 14 }), _jsx(ScrollView, { className: "flex-1", contentContainerStyle: {
                        alignItems: "center",
                        paddingHorizontal: layout.screenPadding,
                        paddingTop: layout.isDesktop ? 40 : 60,
                        paddingBottom: 190,
                    }, keyboardShouldPersistTaps: "handled", showsVerticalScrollIndicator: false, children: _jsxs(View, { style: [
                            styles.contentShell,
                            {
                                width: layout.shellWidth,
                            },
                            layout.isDesktop ? styles.desktopContentShell : null,
                        ], children: [_jsxs(View, { style: { width: layout.leftColumnWidth, gap: layout.sectionGap }, children: [_jsxs(View, { style: styles.headerRow, children: [_jsxs(View, { style: { gap: 10, flex: 1 }, children: [_jsx(Text, { style: styles.eyebrow, children: "HANG RHYTHM" }), _jsx(Text, { style: styles.heroTitle, children: "Set your hang rhythm" }), _jsx(Text, { style: styles.heroHint, children: "Nowly will line people up around this." })] }), _jsx(Pressable, { onPress: () => router.back(), style: ({ pressed }) => [
                                                    styles.closeButton,
                                                    webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                                                ], children: _jsx(MaterialCommunityIcons, { name: "close", size: 20, color: "#F8FAFC" }) })] }), _jsxs(View, { style: styles.visualizerShell, children: [_jsx(Text, { style: styles.moduleLabel, children: "WEEKLY HOURS" }), _jsx(Text, { style: styles.linkHint, children: "Set the default days and times you usually feel open." }), _jsx(View, { style: { gap: 14 }, children: weeklyRows.map((row) => (_jsxs(View, { style: styles.hoursRow, children: [_jsx(Pressable, { onPress: () => toggleWeeklyDay(row.dayIndex), style: ({ pressed }) => [
                                                                styles.dayToggle,
                                                                row.drafts.length ? styles.dayToggleActive : null,
                                                                webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.98 }),
                                                            ], children: row.drafts.length ? (_jsx(MaterialCommunityIcons, { name: "check", size: 15, color: "#081120" })) : null }), _jsx(View, { style: styles.dayLabelWrap, children: _jsx(Text, { style: styles.dayLabelText, children: row.label.toUpperCase() }) }), _jsx(View, { style: { flex: 1, gap: 10 }, children: row.drafts.length ? (row.drafts.map((draft) => (_jsxs(View, { style: styles.timeRangeRow, children: [_jsx(View, { style: styles.inlineTimeField, children: _jsx(TextInput, { value: draft.startInput, onChangeText: (value) => updateDraft(draft.id, { startInput: value }), autoCapitalize: "characters", autoCorrect: false, className: "font-body text-sm text-cloud", placeholder: "9:00 AM", placeholderTextColor: "rgba(248,250,252,0.35)" }) }), _jsx(Text, { style: styles.rangeDash, children: "-" }), _jsx(View, { style: styles.inlineTimeField, children: _jsx(TextInput, { value: draft.endInput, onChangeText: (value) => updateDraft(draft.id, { endInput: value }), autoCapitalize: "characters", autoCorrect: false, className: "font-body text-sm text-cloud", placeholder: "5:00 PM", placeholderTextColor: "rgba(248,250,252,0.35)" }) }), _jsx(Pressable, { onPress: () => removeRecurringWindow(draft.id), style: ({ pressed }) => [
                                                                            styles.inlineIconButton,
                                                                            webPressableStyle(pressed, {
                                                                                pressedOpacity: 0.9,
                                                                                pressedScale: 0.97,
                                                                            }),
                                                                        ], children: _jsx(MaterialCommunityIcons, { name: "close", size: 16, color: "#E2E8F0" }) })] }, draft.id)))) : (_jsx(Text, { style: styles.unavailableText, children: "Unavailable" })) }), _jsx(Pressable, { onPress: () => addWeeklyRange(row.dayIndex), style: ({ pressed }) => [
                                                                styles.inlineIconButton,
                                                                webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                                                            ], children: _jsx(MaterialCommunityIcons, { name: "plus", size: 16, color: "#E2E8F0" }) })] }, row.label))) })] }), _jsxs(View, { style: styles.linkStrip, children: [_jsx(Text, { style: styles.moduleLabel, children: "DATE-SPECIFIC HOURS" }), _jsx(Text, { style: styles.linkHint, children: "Pick dates that should carry their own booking hours." }), _jsxs(View, { style: styles.monthPickerRow, children: [_jsx(Pressable, { onPress: () => setSpecificMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)), style: ({ pressed }) => [
                                                            styles.inlineIconButton,
                                                            webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                                                        ], children: _jsx(MaterialCommunityIcons, { name: "chevron-left", size: 18, color: "#E2E8F0" }) }), _jsx(Text, { style: styles.monthPickerLabel, children: specificMonthLabel }), _jsx(Pressable, { onPress: () => setSpecificMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)), style: ({ pressed }) => [
                                                            styles.inlineIconButton,
                                                            webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                                                        ], children: _jsx(MaterialCommunityIcons, { name: "chevron-right", size: 18, color: "#E2E8F0" }) })] }), _jsx(View, { style: styles.weekdayCalendarHeader, children: weekdayOptionLabels.map((day) => (_jsx(Text, { style: styles.weekdayHeaderText, children: day.toUpperCase() }, day))) }), _jsx(View, { style: styles.specificCalendarGrid, children: specificCalendarDays.map((cell) => {
                                                    const active = cell.dateKey !== null && cell.dateKey === selectedSpecificDateKey;
                                                    const hasHours = cell.dateKey !== null && specificDatesSet.has(cell.dateKey);
                                                    return (_jsx(Pressable, { disabled: cell.dateKey === null, onPress: () => cell.dateKey !== null && setSelectedSpecificDateKey(cell.dateKey), style: ({ pressed }) => [
                                                            styles.specificCalendarCell,
                                                            active ? styles.specificCalendarCellActive : null,
                                                            hasHours ? styles.specificCalendarCellFilled : null,
                                                            cell.dateKey === null ? styles.specificCalendarCellBlank : null,
                                                            webPressableStyle(pressed, {
                                                                disabled: cell.dateKey === null,
                                                                pressedOpacity: 0.92,
                                                                pressedScale: 0.98,
                                                            }),
                                                        ], children: _jsx(Text, { style: [
                                                                styles.specificCalendarText,
                                                                active ? styles.specificCalendarTextActive : null,
                                                            ], children: cell.dayNumber ?? "" }) }, cell.key));
                                                }) }), _jsxs(View, { style: styles.dateCallout, children: [_jsx(Text, { style: styles.dateCalloutLabel, children: selectedSpecificLabel }), _jsx(Text, { style: styles.dateCalloutHint, children: "One-off date only. This does not repeat unless you add a monthly repeat below." })] }), _jsx(View, { style: { gap: 10 }, children: selectedSpecificWindows.length ? (selectedSpecificWindows.map((window) => (_jsxs(View, { style: styles.timeRangeRow, children: [_jsx(View, { style: styles.inlineTimeField, children: _jsx(TextInput, { value: window.startInput, onChangeText: (value) => updateSpecificWindow(window.id, { startInput: value }), autoCapitalize: "characters", autoCorrect: false, className: "font-body text-sm text-cloud", placeholder: "9:00 AM", placeholderTextColor: "rgba(248,250,252,0.35)" }) }), _jsx(Text, { style: styles.rangeDash, children: "-" }), _jsx(View, { style: styles.inlineTimeField, children: _jsx(TextInput, { value: window.endInput, onChangeText: (value) => updateSpecificWindow(window.id, { endInput: value }), autoCapitalize: "characters", autoCorrect: false, className: "font-body text-sm text-cloud", placeholder: "5:00 PM", placeholderTextColor: "rgba(248,250,252,0.35)" }) }), _jsx(Pressable, { onPress: () => removeSpecificDateWindow(window.id), style: ({ pressed }) => [
                                                                styles.inlineIconButton,
                                                                webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                                                            ], children: _jsx(MaterialCommunityIcons, { name: "close", size: 16, color: "#E2E8F0" }) })] }, window.id)))) : (_jsx(Pressable, { onPress: () => addSpecificDateRange(selectedSpecificDateKey ?? `${currentSpecificMonthPrefix}-01`), style: ({ pressed }) => [
                                                        styles.linkPill,
                                                        webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.985 }),
                                                    ], children: _jsx(Text, { style: styles.linkPillText, children: "Add hours for this date" }) })) }), _jsxs(View, { style: styles.repeatShell, children: [_jsxs(View, { style: styles.repeatHeader, children: [_jsxs(View, { style: { flex: 1, gap: 4 }, children: [_jsx(Text, { style: styles.repeatTitle, children: "Repeat this date every month" }), _jsx(Text, { style: styles.repeatHint, children: "Keep repeating windows separate from one-off dates." })] }), _jsx(Pressable, { onPress: addRepeatingMonthlyRange, style: ({ pressed }) => [
                                                                    styles.linkPill,
                                                                    webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.985 }),
                                                                ], children: _jsx(Text, { style: styles.linkPillText, children: "Add repeat" }) })] }), _jsx(View, { style: { gap: 10 }, children: selectedRepeatingDrafts.length ? (selectedRepeatingDrafts.map((draft) => (_jsxs(View, { style: styles.repeatRow, children: [_jsxs(Text, { style: styles.repeatBadge, children: ["Monthly on the ", formatOrdinalDay(selectedSpecificDayNumber)] }), _jsxs(View, { style: styles.timeRangeRow, children: [_jsx(View, { style: styles.inlineTimeField, children: _jsx(TextInput, { value: draft.startInput, onChangeText: (value) => updateDraft(draft.id, { startInput: value }), autoCapitalize: "characters", autoCorrect: false, className: "font-body text-sm text-cloud", placeholder: "9:00 AM", placeholderTextColor: "rgba(248,250,252,0.35)" }) }), _jsx(Text, { style: styles.rangeDash, children: "-" }), _jsx(View, { style: styles.inlineTimeField, children: _jsx(TextInput, { value: draft.endInput, onChangeText: (value) => updateDraft(draft.id, { endInput: value }), autoCapitalize: "characters", autoCorrect: false, className: "font-body text-sm text-cloud", placeholder: "5:00 PM", placeholderTextColor: "rgba(248,250,252,0.35)" }) }), _jsx(Pressable, { onPress: () => removeRecurringWindow(draft.id), style: ({ pressed }) => [
                                                                                styles.inlineIconButton,
                                                                                webPressableStyle(pressed, {
                                                                                    pressedOpacity: 0.9,
                                                                                    pressedScale: 0.97,
                                                                                }),
                                                                            ], children: _jsx(MaterialCommunityIcons, { name: "close", size: 16, color: "#E2E8F0" }) })] })] }, draft.id)))) : (_jsx(Text, { style: styles.repeatHint, children: "No monthly repeat yet. Add one only if this should come back each month." })) })] })] }), _jsxs(View, { style: styles.previewShell, children: [_jsx(Text, { style: styles.moduleLabel, children: "HANGOUT SETUP" }), _jsx(Text, { style: styles.linkHint, children: "Name the hangout, add a description, and preview the booking link." }), _jsx(View, { style: styles.formatRow, children: [
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
                                                ].map((option) => (_jsxs(Pressable, { onPress: () => setHangoutFormat(option.key), style: ({ pressed }) => [
                                                        styles.formatCard,
                                                        hangoutFormat === option.key ? styles.formatCardActive : null,
                                                        webPressableStyle(pressed, { pressedOpacity: 0.94, pressedScale: 0.985 }),
                                                    ], children: [_jsx(MaterialCommunityIcons, { name: option.icon, size: 20, color: "#F8FAFC" }), _jsx(Text, { style: styles.formatCardTitle, children: option.title }), _jsx(Text, { style: styles.formatCardSubtitle, children: option.subtitle })] }, option.key))) }), _jsx(View, { style: styles.noteField, children: _jsx(TextInput, { value: hangoutTitle, onChangeText: setHangoutTitle, className: "font-body text-base text-cloud", placeholder: "Coffee run, quick bite, after class walk...", placeholderTextColor: "rgba(248,250,252,0.35)" }) }), _jsx(View, { style: styles.descriptionField, children: _jsx(TextInput, { value: hangoutDescription, onChangeText: setHangoutDescription, multiline: true, textAlignVertical: "top", className: "font-body text-base leading-6 text-cloud", placeholder: "Say what you're proposing to do and keep the vibe clear.", placeholderTextColor: "rgba(248,250,252,0.35)" }) }), _jsx(View, { style: styles.noteField, children: _jsx(TextInput, { value: hangoutLocation, onChangeText: setHangoutLocation, className: "font-body text-base text-cloud", placeholder: "Place or platform: St. Marks, Discord, Roblox...", placeholderTextColor: "rgba(248,250,252,0.35)" }) }), hangoutFormat === "GROUP" ? (_jsxs(View, { style: styles.groupSettingsShell, children: [_jsx(Text, { style: styles.groupSettingsTitle, children: "Group settings" }), _jsx(Text, { style: styles.groupSettingsHint, children: "Control capacity and decision style for this group booking link." }), _jsxs(View, { style: styles.groupMetricGrid, children: [_jsxs(View, { style: styles.groupMetricCard, children: [_jsx(Text, { style: styles.groupMetricLabel, children: "Duration" }), _jsxs(View, { style: styles.groupStepRow, children: [_jsx(Pressable, { onPress: () => setGroupDurationMinutes((current) => clampNumber(current - 15, 15, 360)), style: styles.groupStepButton, children: _jsx(MaterialCommunityIcons, { name: "minus", size: 16, color: "#E2E8F0" }) }), _jsxs(Text, { style: styles.groupMetricValue, children: [groupDurationMinutes, " min"] }), _jsx(Pressable, { onPress: () => setGroupDurationMinutes((current) => clampNumber(current + 15, 15, 360)), style: styles.groupStepButton, children: _jsx(MaterialCommunityIcons, { name: "plus", size: 16, color: "#E2E8F0" }) })] })] }), _jsxs(View, { style: styles.groupMetricCard, children: [_jsx(Text, { style: styles.groupMetricLabel, children: "Capacity" }), _jsxs(View, { style: styles.groupStepRow, children: [_jsx(Pressable, { onPress: () => setGroupParticipantCap((current) => {
                                                                                    const next = clampNumber(current - 1, 2, 24);
                                                                                    setGroupMinimumConfirmations((minimum) => clampNumber(minimum, 2, next));
                                                                                    return next;
                                                                                }), style: styles.groupStepButton, children: _jsx(MaterialCommunityIcons, { name: "minus", size: 16, color: "#E2E8F0" }) }), _jsx(Text, { style: styles.groupMetricValue, children: groupParticipantCap }), _jsx(Pressable, { onPress: () => setGroupParticipantCap((current) => {
                                                                                    const next = clampNumber(current + 1, 2, 24);
                                                                                    setGroupMinimumConfirmations((minimum) => clampNumber(minimum, 2, next));
                                                                                    return next;
                                                                                }), style: styles.groupStepButton, children: _jsx(MaterialCommunityIcons, { name: "plus", size: 16, color: "#E2E8F0" }) })] })] }), _jsxs(View, { style: styles.groupMetricCard, children: [_jsx(Text, { style: styles.groupMetricLabel, children: "Min confirmations" }), _jsxs(View, { style: styles.groupStepRow, children: [_jsx(Pressable, { onPress: () => setGroupMinimumConfirmations((current) => clampNumber(current - 1, 2, groupParticipantCap)), style: styles.groupStepButton, children: _jsx(MaterialCommunityIcons, { name: "minus", size: 16, color: "#E2E8F0" }) }), _jsx(Text, { style: styles.groupMetricValue, children: groupMinimumConfirmations }), _jsx(Pressable, { onPress: () => setGroupMinimumConfirmations((current) => clampNumber(current + 1, 2, groupParticipantCap)), style: styles.groupStepButton, children: _jsx(MaterialCommunityIcons, { name: "plus", size: 16, color: "#E2E8F0" }) })] })] })] }), _jsx(View, { style: styles.groupOptionRow, children: groupDecisionModeOptions.map((option) => (_jsx(Pressable, { onPress: () => setGroupDecisionMode(option.value), style: [
                                                                styles.groupOptionPill,
                                                                groupDecisionMode === option.value ? styles.groupOptionPillActive : null,
                                                            ], children: _jsx(Text, { style: [
                                                                    styles.groupOptionLabel,
                                                                    groupDecisionMode === option.value ? styles.groupOptionLabelActive : null,
                                                                ], children: option.label }) }, option.value))) }), _jsx(View, { style: styles.groupOptionRow, children: groupVisibilityModeOptions.map((option) => (_jsx(Pressable, { onPress: () => setGroupVisibilityMode(option.value), style: [
                                                                styles.groupOptionPill,
                                                                groupVisibilityMode === option.value ? styles.groupOptionPillActive : null,
                                                            ], children: _jsx(Text, { style: [
                                                                    styles.groupOptionLabel,
                                                                    groupVisibilityMode === option.value ? styles.groupOptionLabelActive : null,
                                                                ], children: option.label }) }, option.value))) })] })) : null, _jsxs(View, { style: styles.linkActions, children: [_jsx(Pressable, { onPress: () => void handleCopyLink(), style: ({ pressed }) => [
                                                            styles.linkPill,
                                                            webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.985 }),
                                                        ], children: _jsx(Text, { style: styles.linkPillText, children: "Copy link" }) }), _jsx(Pressable, { onPress: handlePreviewLink, style: ({ pressed }) => [
                                                            styles.linkPill,
                                                            webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.985 }),
                                                        ], children: _jsx(Text, { style: styles.linkPillText, children: "Preview link" }) })] })] })] }), _jsx(View, { style: { width: layout.rightColumnWidth, gap: 16 }, children: _jsx(Animated.View, { layout: LinearTransition.duration(220), children: _jsx(View, { style: styles.windowCardShadow, children: _jsxs(LinearGradient, { colors: [
                                                "rgba(12,17,31,0.94)",
                                                "rgba(18,39,58,0.86)",
                                                "rgba(9,12,24,0.95)",
                                            ], locations: [0, 0.52, 1], start: { x: 0, y: 0 }, end: { x: 1, y: 1 }, style: [styles.windowCard, previewExpanded ? styles.windowCardExpanded : null], children: [_jsx(LinearGradient, { colors: [
                                                        "rgba(255,255,255,0.08)",
                                                        "rgba(255,255,255,0.02)",
                                                        "rgba(255,255,255,0.00)",
                                                    ], start: { x: 0.04, y: 0 }, end: { x: 0.82, y: 0.9 }, style: StyleSheet.absoluteFillObject, pointerEvents: "none" }), _jsx(View, { style: styles.windowGlow, pointerEvents: "none" }), _jsx(View, { style: styles.windowStroke, pointerEvents: "none" }), _jsxs(View, { style: styles.detailTabRow, children: [_jsx(Pressable, { onPress: () => setDetailTab("PREVIEW"), style: ({ pressed }) => [
                                                                styles.detailTabPill,
                                                                detailTab === "PREVIEW" ? styles.detailTabPillActive : null,
                                                                webPressableStyle(pressed, {
                                                                    pressedOpacity: 0.92,
                                                                    pressedScale: 0.985,
                                                                }),
                                                            ], children: _jsx(Text, { style: [
                                                                    styles.detailTabText,
                                                                    detailTab === "PREVIEW" ? styles.detailTabTextActive : null,
                                                                ], children: "Preview" }) }), _jsx(Pressable, { onPress: () => setDetailTab("SUGGESTED"), style: ({ pressed }) => [
                                                                styles.detailTabPill,
                                                                detailTab === "SUGGESTED" ? styles.detailTabPillActive : null,
                                                                webPressableStyle(pressed, {
                                                                    pressedOpacity: 0.92,
                                                                    pressedScale: 0.985,
                                                                }),
                                                            ], children: _jsx(Text, { style: [
                                                                    styles.detailTabText,
                                                                    detailTab === "SUGGESTED" ? styles.detailTabTextActive : null,
                                                                ], children: "Suggested times" }) })] }), detailTab === "PREVIEW" ? (_jsxs(_Fragment, { children: [_jsx(Pressable, { onPress: () => setPreviewExpanded((current) => !current), style: ({ pressed }) => webPressableStyle(pressed, {
                                                                pressedOpacity: 0.96,
                                                                pressedScale: 0.995,
                                                            }), children: _jsxs(View, { className: "flex-row items-center gap-4", children: [_jsxs(View, { className: "min-w-0 flex-1 gap-1.5", children: [_jsx(Text, { className: "font-display text-[20px] leading-[24px] text-cloud", children: hangoutTitle.trim() || "Quick catch-up" }), _jsx(Text, { className: "font-body text-sm text-cloud/76", children: hangoutFormat === "GROUP"
                                                                                    ? "Group hangout booking preview"
                                                                                    : "1:1 hangout booking preview" }), _jsx(Text, { className: "font-body text-[12px] leading-5 text-aqua/82", children: previewRows[0]?.title ??
                                                                                    "Add a date or recurring window to preview the booking page." })] }), _jsx(View, { style: styles.chevronShell, children: _jsx(MaterialCommunityIcons, { name: previewExpanded ? "chevron-up" : "chevron-right", size: 20, color: "#E2E8F0" }) })] }) }), previewExpanded ? (_jsx(Animated.View, { entering: FadeInDown.duration(220), exiting: FadeOutUp.duration(180), className: "gap-5 pt-6", children: _jsxs(View, { style: styles.previewBookingCard, children: [_jsxs(View, { style: styles.previewBookingHeader, children: [_jsx(View, { style: styles.previewAvatar, children: user?.photoUrl ? (_jsx(Image, { source: { uri: user.photoUrl }, style: styles.previewAvatarImage })) : (_jsx(Text, { style: styles.previewAvatarText, children: (user?.name?.[0] ?? "N").toUpperCase() })) }), _jsxs(View, { style: { flex: 1, gap: 4 }, children: [_jsx(Text, { style: styles.previewName, children: user?.name ?? "You" }), _jsx(Text, { style: styles.previewTitleLarge, children: hangoutTitle.trim() || "Quick catch-up" }), _jsx(Text, { style: styles.previewDescriptionText, children: hangoutDescription.trim() ||
                                                                                            "Pick an easy time and we can see what sticks." }), _jsx(Text, { style: styles.previewLocationText, children: hangoutLocation.trim() ||
                                                                                            user?.communityTag ||
                                                                                            user?.city ||
                                                                                            "Location shared in the booking flow" })] })] }), _jsxs(View, { style: styles.previewModeStrip, children: [_jsx(View, { style: styles.previewModeBadge, children: _jsx(Text, { style: styles.previewModeBadgeText, children: hangoutFormat === "GROUP" ? "GROUP HANGOUT" : "1:1 HANGOUT" }) }), _jsx(Text, { style: styles.previewModeHint, children: hangoutFormat === "GROUP"
                                                                                    ? "Made to share with a few people and let the crew choose what works."
                                                                                    : "Made for one person to pick the easiest time and lock it in." })] }), _jsxs(View, { style: styles.previewCalendarBlock, children: [_jsx(Text, { style: styles.previewMonthLabel, children: specificMonthLabel }), _jsx(View, { style: styles.weekdayCalendarHeader, children: weekdayOptionLabels.map((day) => (_jsx(Text, { style: styles.weekdayHeaderText, children: day.toUpperCase() }, day))) }), _jsx(View, { style: styles.specificCalendarGrid, children: specificCalendarDays.map((cell) => {
                                                                                    const filled = cell.dateKey !== null &&
                                                                                        (specificDatesSet.has(cell.dateKey) ||
                                                                                            cell.dateKey === selectedSpecificDateKey);
                                                                                    return (_jsx(View, { style: [
                                                                                            styles.previewCalendarCell,
                                                                                            filled ? styles.previewCalendarCellFilled : null,
                                                                                        ], children: _jsx(Text, { style: styles.previewCalendarText, children: cell.dayNumber ?? "" }) }, `preview-${cell.key}`));
                                                                                }) })] }), _jsx(View, { style: styles.previewTimesRow, children: previewRows.length ? (previewRows.map((row) => (_jsxs(View, { style: styles.previewTimePill, children: [_jsx(Text, { style: styles.previewTimeText, children: row.title }), _jsx(Text, { style: styles.previewTimeMeta, children: row.subtitle }), _jsx(Text, { style: styles.previewTimeMetaMuted, children: row.meta })] }, row.id)))) : (_jsx(Text, { style: styles.previewEmpty, children: "Your booking preview will fill in as soon as you add hours." })) })] }) })) : null] })) : (_jsxs(Animated.View, { entering: FadeInDown.duration(220), exiting: FadeOutUp.duration(180), className: "gap-4 pt-3", children: [_jsxs(View, { style: { gap: 6 }, children: [_jsx(Text, { style: styles.suggestedTimesTitle, children: "Friends' hangtimes" }), _jsx(Text, { style: styles.linkHint, children: "Suggested times come from saved crew overlap, ranked from strongest fit to weakest." })] }), sortedSuggestedTimes.length ? (sortedSuggestedTimes.map((overlap) => (_jsxs(View, { style: styles.suggestedTimeCard, children: [_jsxs(View, { style: { flex: 1, gap: 4 }, children: [_jsx(Text, { style: styles.suggestedTimeName, children: overlap.matchedUser.name }), _jsx(Text, { style: styles.suggestedTimeLabel, children: overlap.label }), _jsx(Text, { style: styles.suggestedTimeSummary, children: overlap.summary }), _jsxs(Text, { style: styles.suggestedTimeMeta, children: ["Their hangtime: ", recurringWindowSummary(overlap.matchedWindow)] })] }), _jsx(View, { style: styles.suggestedTimeScore, children: _jsxs(Text, { style: styles.suggestedTimeScoreText, children: [Math.round(overlap.score * 100), "%"] }) })] }, overlap.id)))) : (_jsx(Text, { style: styles.previewEmpty, children: "Once friends save weekly hours, their overlapping hangtimes will show up here as suggestions." }))] }))] }) }) }) })] }) }), _jsx(LinearGradient, { colors: ["rgba(5,8,19,0.00)", "rgba(5,8,19,0.84)", "rgba(5,8,19,0.96)"], start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 }, style: [
                        styles.stickyFooter,
                        {
                            paddingHorizontal: layout.screenPadding,
                        },
                    ], pointerEvents: "box-none", children: _jsx(View, { style: {
                            width: layout.shellWidth,
                            alignSelf: "center",
                            alignItems: layout.isDesktop ? "flex-end" : "stretch",
                        }, children: _jsx(View, { style: [
                                styles.stickyFooterInner,
                                layout.isDesktop
                                    ? {
                                        width: layout.rightColumnWidth,
                                    }
                                    : null,
                            ], children: _jsx(PillButton, { label: saving || loadingSuggestions ? "Saving hang rhythm..." : "Save hang rhythm", onPress: () => void saveDrafts(), disabled: saving || loadingSuggestions }) }) }) })] }) }));
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
    dateCallout: {
        borderRadius: 20,
        backgroundColor: "rgba(124,58,237,0.12)",
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 4,
    },
    dateCalloutHint: {
        color: "rgba(248,250,252,0.64)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 12,
        lineHeight: 18,
    },
    dateCalloutLabel: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 15,
    },
    detailTabPill: {
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.05)",
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    detailTabPillActive: {
        backgroundColor: "rgba(124,58,237,0.22)",
        shadowColor: nowlyColors.glow,
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
    },
    detailTabRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 18,
    },
    detailTabText: {
        color: "rgba(248,250,252,0.72)",
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 13,
    },
    detailTabTextActive: {
        color: nowlyColors.cloud,
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
    suggestedTimeCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        borderRadius: 24,
        backgroundColor: "rgba(255,255,255,0.05)",
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    suggestedTimeLabel: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 15,
        lineHeight: 20,
    },
    suggestedTimeMeta: {
        color: "rgba(139,234,255,0.82)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 12,
        lineHeight: 18,
    },
    suggestedTimeName: {
        color: "rgba(248,250,252,0.72)",
        fontFamily: "SpaceGrotesk_500Medium",
        fontSize: 12,
        letterSpacing: 1.6,
        textTransform: "uppercase",
    },
    suggestedTimeScore: {
        minWidth: 56,
        borderRadius: 999,
        backgroundColor: "rgba(124,58,237,0.18)",
        paddingHorizontal: 12,
        paddingVertical: 9,
        alignItems: "center",
        justifyContent: "center",
    },
    suggestedTimeScoreText: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 13,
    },
    suggestedTimeSummary: {
        color: "rgba(248,250,252,0.64)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 13,
        lineHeight: 20,
    },
    suggestedTimesTitle: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 22,
        lineHeight: 28,
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
        overflow: "hidden",
    },
    previewAvatarImage: {
        width: "100%",
        height: "100%",
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
    previewLocationText: {
        color: "rgba(139,234,255,0.82)",
        fontFamily: "SpaceGrotesk_500Medium",
        fontSize: 12,
        lineHeight: 18,
    },
    previewModeBadge: {
        alignSelf: "flex-start",
        borderRadius: 999,
        backgroundColor: "rgba(124,58,237,0.16)",
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    previewModeBadgeText: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 11,
        letterSpacing: 1.2,
    },
    previewModeHint: {
        color: "rgba(248,250,252,0.66)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 12,
        lineHeight: 18,
    },
    previewModeStrip: {
        gap: 8,
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
    previewTimeMeta: {
        color: "rgba(248,250,252,0.72)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 12,
        lineHeight: 18,
    },
    previewTimeMetaMuted: {
        color: "rgba(248,250,252,0.48)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 11,
        lineHeight: 16,
    },
    previewTitleLarge: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 20,
        lineHeight: 24,
    },
    repeatBadge: {
        color: "rgba(139,234,255,0.9)",
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 12,
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    repeatHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    repeatHint: {
        color: "rgba(248,250,252,0.64)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 12,
        lineHeight: 18,
    },
    repeatRow: {
        gap: 8,
    },
    repeatShell: {
        borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.04)",
        paddingHorizontal: 14,
        paddingVertical: 14,
        gap: 12,
    },
    repeatTitle: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 14,
    },
    screen: {
        flex: 1,
    },
    dayLabelText: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 12,
    },
    dayLabelWrap: {
        width: 36,
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
    groupMetricCard: {
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.04)",
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 10,
        flex: 1,
        minWidth: 130,
    },
    groupMetricGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    groupMetricLabel: {
        color: "rgba(248,250,252,0.64)",
        fontFamily: "SpaceGrotesk_500Medium",
        fontSize: 12,
        letterSpacing: 0.6,
        textTransform: "uppercase",
    },
    groupMetricValue: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 15,
    },
    groupOptionLabel: {
        color: "rgba(248,250,252,0.72)",
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 12,
    },
    groupOptionLabelActive: {
        color: "#081120",
    },
    groupOptionPill: {
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.06)",
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    groupOptionPillActive: {
        backgroundColor: "#E7D9FF",
    },
    groupOptionRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    groupSettingsHint: {
        color: "rgba(248,250,252,0.62)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 13,
        lineHeight: 20,
    },
    groupSettingsShell: {
        borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.04)",
        paddingHorizontal: 14,
        paddingVertical: 14,
        gap: 12,
    },
    groupSettingsTitle: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 16,
    },
    groupStepButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.06)",
    },
    groupStepRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    hoursRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
    },
    inlineIconButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.06)",
    },
    inlineTimeField: {
        minWidth: 0,
        flex: 1,
        borderRadius: 14,
        backgroundColor: "rgba(255,255,255,0.06)",
        paddingHorizontal: 10,
        paddingVertical: 8,
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
        fontSize: 14,
        paddingTop: 0,
        textAlignVertical: "center",
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
        width: "100%",
        gap: 6,
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
