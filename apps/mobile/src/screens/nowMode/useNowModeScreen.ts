import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AvailabilityState,
  BudgetMood,
  encodeSignalLabelMetadata,
  EnergyLevel,
  hangoutIntentOptions,
  HangoutIntent,
  onlineVenueSuggestions,
  SignalCrowdMode,
  signalCrowdModes,
  SignalMeetMode,
  signalMeetModes,
  SocialBattery,
  Vibe,
} from "@nowly/shared";
import { router } from "expo-router";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import type { NowlyToastPayload } from "../../../components/ui/NowlyToast";
import { formatDayTime } from "../../../lib/format";
import { budgetLabel, energyLabel, hangoutIntentLabel, socialBatteryLabel, vibeLabel, availabilityLabel } from "../../../lib/labels";
import { track } from "../../../lib/analytics";
import { playMatchFeedback } from "../../../lib/match-feedback";
import { useAppStore } from "../../../store/useAppStore";
import { dashboardApi } from "../../lib/api/dashboard";
import { liveSignalApi } from "../../lib/api/liveSignal";

const stateOptions: Array<{
  state: AvailabilityState;
  label: string;
  hint: string;
  duration: number;
  icon: "lightning-bolt" | "clock-outline" | "pause-circle-outline" | "weather-sunset";
}> = [
  { state: "FREE_NOW", label: "Free now", hint: "Quick plan, low friction.", duration: 3, icon: "lightning-bolt" },
  { state: "FREE_LATER", label: "Free later", hint: "Later today still feels open.", duration: 6, icon: "clock-outline" },
  { state: "BUSY", label: "Busy", hint: "Quiet the pings for a bit.", duration: 4, icon: "pause-circle-outline" },
  { state: "DOWN_THIS_WEEKEND", label: "Weekend", hint: "Open to something bigger soon.", duration: 48, icon: "weather-sunset" },
];

const vibeOptions: Vibe[] = ["FOOD", "GYM", "CHILL", "PARTY", "COFFEE", "OUTDOORS"];
const radiusOptions = [3, 8, 15];
const energyOptions: EnergyLevel[] = ["LOW", "MEDIUM", "HIGH"];
const batteryOptions: SocialBattery[] = ["LOW_KEY", "OPEN", "SOCIAL"];
const budgetOptions: BudgetMood[] = ["LOW_SPEND", "FLEXIBLE", "TREAT_MYSELF"];
const durationOptions = [0.5, 1, 2, 3, 6, 12, 24, 48];

const meetModeLabels: Record<SignalMeetMode, string> = {
  IN_PERSON: "In person",
  ONLINE: "Online",
  EITHER: "Either",
};

const crowdModeLabels: Record<SignalCrowdMode, string> = {
  ONE_ON_ONE: "1:1",
  GROUP: "Group",
  EITHER: "Either",
};

const clampDurationHours = (value: number) => Math.max(0.25, Math.min(72, value));

const parseDurationInput = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const minutesMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)$/);
  if (minutesMatch) {
    return clampDurationHours(Number(minutesMatch[1]) / 60);
  }

  const hoursMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)?$/);
  if (hoursMatch) {
    return clampDurationHours(Number(hoursMatch[1]));
  }

  return null;
};

const formatDurationInput = (value: number) => {
  if (value < 1) {
    return `${Math.round(value * 60)}m`;
  }

  if (Number.isInteger(value)) {
    return `${value}h`;
  }

  return `${value.toFixed(2).replace(/\.?0+$/, "")}h`;
};

const estimateDuration = (activeSignal: ReturnType<typeof useAppStore.getState>["activeSignal"], fallback: number) => {
  if (!activeSignal) {
    return fallback;
  }

  const diffHours =
    (new Date(activeSignal.expiresAt).getTime() - Date.now()) / (60 * 60 * 1000);

  return clampDurationHours(Math.max(0.25, Math.round(diffHours * 4) / 4));
};

const liveInsight = (
  activeSignal: ReturnType<typeof useAppStore.getState>["activeSignal"],
  scheduledOverlaps: ReturnType<typeof useAppStore.getState>["scheduledOverlaps"],
  matches: ReturnType<typeof useAppStore.getState>["matches"],
) => {
  if (matches.length) {
    return `${matches[0].matchedUser.name} looks like the warmest live overlap.`;
  }

  if (scheduledOverlaps.length) {
    return scheduledOverlaps[0].label;
  }

  if (activeSignal) {
    return `${availabilityLabel(activeSignal.state)} until ${formatDayTime(activeSignal.expiresAt)}.`;
  }

  return "Go live and let overlap find you.";
};

const sortByScore = <T extends { score: number }>(items: T[]) => [...items].sort((left, right) => right.score - left.score);

export const useNowModeScreen = () => {
  const queryClient = useQueryClient();
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const activeSignalFallback = useAppStore((state) => state.activeSignal);
  const liveSignalPreferences = useAppStore((state) => state.liveSignalPreferences);
  const matchesFallback = useAppStore((state) => state.matches);
  const scheduledOverlapsFallback = useAppStore((state) => state.scheduledOverlaps);
  const radarFallback = useAppStore((state) => state.radar);
  const setDashboard = useAppStore((state) => state.setDashboard);
  const setActiveSignal = useAppStore((state) => state.setActiveSignal);
  const setLiveSignalPreferences = useAppStore((state) => state.setLiveSignalPreferences);

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => dashboardApi.fetchDashboard(token, user!.id),
  });

  useEffect(() => {
    if (!dashboardQuery.data) {
      return;
    }

    startTransition(() => {
      setDashboard(dashboardQuery.data);
    });
  }, [dashboardQuery.data, setDashboard]);

  const matches = dashboardQuery.data?.matches ?? matchesFallback;
  const scheduledOverlaps = dashboardQuery.data?.scheduledOverlaps ?? scheduledOverlapsFallback;
  const radar = dashboardQuery.data?.radar ?? radarFallback;
  const activeSignal = dashboardQuery.data?.activeSignal ?? activeSignalFallback;
  const safePreferences = liveSignalPreferences ?? { showLocation: false, locationLabel: "" };

  const initialState = stateOptions.find((item) => item.state === activeSignal?.state) ?? stateOptions[0];
  const [state, setState] = useState<AvailabilityState>(initialState.state);
  const [radiusKm, setRadiusKm] = useState(activeSignal?.radiusKm ?? 8);
  const [vibe, setVibe] = useState<Vibe | null>(activeSignal?.vibe ?? "COFFEE");
  const [hangoutIntent, setHangoutIntent] = useState<HangoutIntent | null>(activeSignal?.hangoutIntent ?? "PULL_UP");
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | null>(activeSignal?.energyLevel ?? "MEDIUM");
  const [socialBattery, setSocialBattery] = useState<SocialBattery | null>(activeSignal?.socialBattery ?? "OPEN");
  const [budgetMood, setBudgetMood] = useState<BudgetMood | null>(activeSignal?.budgetMood ?? "LOW_SPEND");
  const [label, setLabel] = useState(activeSignal?.label ?? "");
  const [showLocation, setShowLocation] = useState(safePreferences.showLocation);
  const [locationLabel, setLocationLabel] = useState(safePreferences.locationLabel);
  const [durationHours, setDurationHours] = useState(estimateDuration(activeSignal, initialState.duration));
  const [durationInput, setDurationInput] = useState(formatDurationInput(estimateDuration(activeSignal, initialState.duration)));
  const [meetMode, setMeetMode] = useState<SignalMeetMode>(activeSignal?.meetMode ?? "IN_PERSON");
  const [crowdMode, setCrowdMode] = useState<SignalCrowdMode>(activeSignal?.crowdMode ?? "EITHER");
  const [onlineVenue, setOnlineVenue] = useState(activeSignal?.onlineVenue ?? "");
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [toast, setToast] = useState<NowlyToastPayload | null>(null);
  const previousMatchIdsRef = useRef<string[] | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const nextState = stateOptions.find((item) => item.state === activeSignal?.state) ?? stateOptions[0];
    const nextDuration = estimateDuration(activeSignal, nextState.duration);

    setState(nextState.state);
    setRadiusKm(activeSignal?.radiusKm ?? 8);
    setVibe(activeSignal?.vibe ?? "COFFEE");
    setHangoutIntent(activeSignal?.hangoutIntent ?? "PULL_UP");
    setEnergyLevel(activeSignal?.energyLevel ?? "MEDIUM");
    setSocialBattery(activeSignal?.socialBattery ?? "OPEN");
    setBudgetMood(activeSignal?.budgetMood ?? "LOW_SPEND");
    setLabel(activeSignal?.label ?? "");
    setMeetMode(activeSignal?.meetMode ?? "IN_PERSON");
    setCrowdMode(activeSignal?.crowdMode ?? "EITHER");
    setOnlineVenue(activeSignal?.onlineVenue ?? "");
    setDurationHours(nextDuration);
    setDurationInput(formatDurationInput(nextDuration));
  }, [activeSignal]);

  useEffect(() => {
    setShowLocation(safePreferences.showLocation);
    setLocationLabel(safePreferences.locationLabel);
  }, [safePreferences.locationLabel, safePreferences.showLocation]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const showToast = useCallback((payload: Omit<NowlyToastPayload, "id">) => {
    const nextToast = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...payload,
    };

    setToast(nextToast);

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }

    toastTimeoutRef.current = setTimeout(() => {
      setToast((current) => (current?.id === nextToast.id ? null : current));
    }, 2800);
  }, []);

  const orderedMatches = useMemo(() => sortByScore(matches), [matches]);
  const orderedScheduledOverlaps = useMemo(() => {
    const dedupedByFriend = new Map<string, (typeof scheduledOverlaps)[number]>();

    sortByScore(scheduledOverlaps).forEach((overlap) => {
      const existing = dedupedByFriend.get(overlap.matchedUser.id);
      if (!existing || overlap.score > existing.score) {
        dedupedByFriend.set(overlap.matchedUser.id, overlap);
      }
    });

    return [...dedupedByFriend.values()];
  }, [scheduledOverlaps]);

  useEffect(() => {
    const nextIds = orderedMatches.map((match) => match.id);

    if (previousMatchIdsRef.current === null) {
      previousMatchIdsRef.current = nextIds;
      return;
    }

    const previousIds = new Set(previousMatchIdsRef.current);
    const newMatches = orderedMatches.filter((match) => !previousIds.has(match.id));
    previousMatchIdsRef.current = nextIds;

    if (!newMatches.length) {
      return;
    }

    const topMatch = newMatches[0];
    playMatchFeedback();
    showToast({
      title: "New live match",
      message:
        newMatches.length > 1
          ? `${newMatches.length} live matches just landed.`
          : `${topMatch.matchedUser.name} lines up with you right now.`,
      icon: "lightning-bolt",
      ctaLabel: "Open",
      onPress: () => router.push(`/match/${topMatch.id}` as never),
    });
  }, [orderedMatches, showToast]);

  const refreshDashboard = useCallback(async () => {
    if (!user) {
      return null;
    }

    const payload = await queryClient.fetchQuery({
      queryKey: ["dashboard", user.id],
      queryFn: () => dashboardApi.fetchDashboard(token, user.id),
    });

    startTransition(() => {
      setDashboard(payload);
    });

    return payload;
  }, [queryClient, setDashboard, token, user]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        state,
        label: encodeSignalLabelMetadata(label.trim() || null, {
          meetMode,
          crowdMode,
          onlineVenue,
        }),
        radiusKm,
        showLocation: meetMode === "ONLINE" ? false : showLocation,
        locationLabel:
          meetMode === "ONLINE"
            ? null
            : showLocation
              ? locationLabel.trim() || user?.communityTag || user?.city || null
              : null,
        vibe,
        energyLevel,
        budgetMood,
        socialBattery,
        hangoutIntent,
        durationHours,
      };

      const nextSignal = await liveSignalApi.setAvailability(token, payload);
      setActiveSignal({
        ...nextSignal,
        showLocation: payload.showLocation ?? false,
        locationLabel: payload.locationLabel ?? null,
      });
      setLiveSignalPreferences({
        showLocation: payload.showLocation ?? false,
        locationLabel: payload.locationLabel ?? "",
      });
      await track(token, "availability_set", {
        state: payload.state,
        durationHours: payload.durationHours ?? null,
        showLocation: payload.showLocation ?? false,
      });
      await refreshDashboard();
      showToast({
        title: activeSignal ? "Signal updated" : "You're live",
        message: "Nowly is actively scanning overlap around your signal.",
        icon: "radio-tower",
      });
    } catch (error) {
      Alert.alert(
        "Could not update your signal",
        error instanceof Error ? error.message : "Try that again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!activeSignal) {
      return;
    }

    try {
      setClearing(true);
      await liveSignalApi.clearAvailability(token, activeSignal.id);
      setActiveSignal(null);
      await refreshDashboard();
      showToast({
        title: "Signal cleared",
        message: "Your live aura is quiet again until you turn it back on.",
        icon: "moon-waning-crescent",
      });
    } catch (error) {
      Alert.alert(
        "Could not clear your signal",
        error instanceof Error ? error.message : "Try that again.",
      );
    } finally {
      setClearing(false);
    }
  };

  const locationDisplayLabel =
    (showLocation ? locationLabel.trim() : "") || user?.communityTag || user?.city || "your area";

  const activeTitle = activeSignal
    ? `${availabilityLabel(activeSignal.state)} until ${formatDayTime(activeSignal.expiresAt)}`
    : "Set a live social aura when the moment feels reachable.";

  const activeCopy = activeSignal
    ? liveInsight(activeSignal, orderedScheduledOverlaps, orderedMatches)
    : radar?.suggestionLine ||
      "Free now, free later, busy, or weekend. Keep the signal soft, clear, and easy for someone to act on.";

  const stateSummary = `${stateOptions.find((item) => item.state === state)?.label ?? "Free now"} for ${formatDurationInput(durationHours)}`;
  const vibeSummary = `${hangoutIntentLabel(hangoutIntent)}, ${vibeLabel(vibe)}, ${energyLabel(energyLevel)}`;
  const logisticsSummary = `${meetModeLabels[meetMode]}, ${crowdModeLabels[crowdMode]}${meetMode !== "ONLINE" ? `, ${radiusKm} km` : ""}`;
  const comfortSummary = `${socialBatteryLabel(socialBattery)}, ${budgetLabel(budgetMood)}`;

  const supportsInPerson = meetMode !== "ONLINE";
  const supportsOnline = meetMode !== "IN_PERSON";

  const liveMatches = orderedMatches.map((match) => ({
    id: match.id,
    name: match.matchedUser.name,
    line: match.insightLabel ?? match.reason.momentumLabel ?? "Strong short-notice fit",
    detail:
      match.reason.meetingStyle === "ONLINE"
        ? `${Math.round(match.score * 100)}% fit, ${match.reason.overlapMinutes} min overlap, ${match.reason.onlineVenue ?? "online"}`
        : `${Math.round(match.score * 100)}% fit, ${match.reason.overlapMinutes} min overlap, ${match.reason.travelMinutes ?? 15} min away`,
    action: "Open",
    onPress: () => router.push(`/match/${match.id}` as never),
  }));

  const suggestedTimes = orderedScheduledOverlaps.slice(0, 4).map((overlap) => ({
    id: overlap.id,
    name: overlap.matchedUser.name,
    line: overlap.label,
    detail: overlap.summary,
    action: "Open",
    onPress: () => router.push("/availability-preferences" as never),
  }));

  return {
    status: user ? "ready" : "error",
    toast,
    title: activeTitle,
    copy: activeCopy,
    heroStatus: activeSignal ? "Signal live now" : "Aura standing by",
    locationLabel: showLocation && supportsInPerson ? locationDisplayLabel : null,
    onBack: () => router.back(),
    onOpenWindows: () => router.push("/availability-preferences" as never),
    stateSummary,
    vibeSummary,
    logisticsSummary,
    comfortSummary,
    saveLabel: activeSignal ? `Update signal for ${formatDurationInput(durationHours)}` : `Go live for ${formatDurationInput(durationHours)}`,
    saving,
    clearing,
    hasActiveSignal: Boolean(activeSignal),
    liveMatches,
    suggestedTimes,
    stateOptions: stateOptions.map((option) => ({
      key: option.state,
      label: option.label,
      hint: option.hint,
      icon: option.icon,
      selected: option.state === state,
      onPress: () => setState(option.state),
    })),
    meetModeOptions: signalMeetModes.map((option) => ({
      key: option,
      label: meetModeLabels[option],
      selected: meetMode === option,
      onPress: () => setMeetMode(option),
    })),
    crowdModeOptions: signalCrowdModes.map((option) => ({
      key: option,
      label: crowdModeLabels[option],
      selected: crowdMode === option,
      onPress: () => setCrowdMode(option),
    })),
    intentOptions: hangoutIntentOptions.map((option) => ({
      key: option,
      label: hangoutIntentLabel(option),
      selected: hangoutIntent === option,
      onPress: () => setHangoutIntent(option),
    })),
    vibeOptions: vibeOptions.map((option) => ({
      key: option,
      label: vibeLabel(option),
      selected: vibe === option,
      onPress: () => setVibe(option),
    })),
    energyOptions: energyOptions.map((option) => ({
      key: option,
      label: energyLabel(option),
      selected: energyLevel === option,
      onPress: () => setEnergyLevel(option),
    })),
    batteryOptions: batteryOptions.map((option) => ({
      key: option,
      label: socialBatteryLabel(option),
      selected: socialBattery === option,
      onPress: () => setSocialBattery(option),
    })),
    budgetOptions: budgetOptions.map((option) => ({
      key: option,
      label: budgetLabel(option),
      selected: budgetMood === option,
      onPress: () => setBudgetMood(option),
    })),
    durationOptions: durationOptions.map((option) => ({
      key: `${option}`,
      label: formatDurationInput(option),
      selected: durationHours === option,
      onPress: () => {
        setDurationHours(option);
        setDurationInput(formatDurationInput(option));
      },
    })),
    radiusOptions: radiusOptions.map((option) => ({
      key: `${option}`,
      label: `${option} km`,
      selected: radiusKm === option,
      onPress: () => setRadiusKm(option),
    })),
    onlineVenueSuggestions: onlineVenueSuggestions.map((option) => ({
      key: option,
      label: option,
      selected: onlineVenue.trim().toLowerCase() === option.toLowerCase(),
      onPress: () => setOnlineVenue(option),
    })),
    state,
    label,
    onChangeLabel: setLabel,
    meetMode,
    crowdMode,
    onlineVenue,
    onChangeOnlineVenue: setOnlineVenue,
    showLocation,
    onSelectHideLocation: () => {
      setShowLocation(false);
      setLiveSignalPreferences({ showLocation: false });
    },
    onSelectShowLocation: () => {
      setShowLocation(true);
      setLiveSignalPreferences({ showLocation: true });
    },
    locationInput: locationLabel,
    onChangeLocationLabel: (nextValue: string) => {
      setLocationLabel(nextValue);
      setLiveSignalPreferences({ locationLabel: nextValue });
    },
    durationInput,
    onChangeDurationInput: (value: string) => {
      setDurationInput(value);
      const nextDuration = parseDurationInput(value);
      if (nextDuration !== null) {
        setDurationHours(nextDuration);
      }
    },
    supportsInPerson,
    supportsOnline,
    onSave: () => void handleSave(),
    onClear: () => void handleClear(),
  };
};
