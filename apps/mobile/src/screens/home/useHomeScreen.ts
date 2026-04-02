import { useQuery } from "@tanstack/react-query";
import { startTransition, useEffect, useMemo } from "react";
import { useRouter } from "expo-router";
import { dashboardApi } from "../../lib/api/dashboard";
import { formatDayTime } from "../../../lib/format";
import { availabilityLabel } from "../../../lib/labels";
import { useAppStore } from "../../../store/useAppStore";

const quickPrompts = [
  { key: "quick-bite", label: "Quick bite", route: "/prompt/quick-bite" },
  { key: "walk-nearby", label: "Walk nearby", route: "/prompt/walk-nearby" },
  { key: "study-sprint", label: "Study sprint", route: "/prompt/custom-prompt" },
  { key: "coffee-run", label: "Coffee run", route: "/prompt/coffee-run" },
  { key: "custom-nudge", label: "Custom nudge", route: "/prompt/custom-prompt" },
];

const formatWindowLine = (startsAt?: string | null) => {
  if (!startsAt) {
    return "Tonight around 8pm";
  }

  const date = new Date(startsAt);

  return `${date.toLocaleDateString([], { weekday: "short" })} around ${date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
};

export const useHomeScreen = () => {
  const router = useRouter();
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const setDashboard = useAppStore((state) => state.setDashboard);
  const bootstrapDemo = useAppStore((state) => state.bootstrapDemo);
  const fallbackMatches = useAppStore((state) => state.matches);
  const fallbackRecaps = useAppStore((state) => state.recaps);
  const fallbackOverlaps = useAppStore((state) => state.scheduledOverlaps);
  const fallbackRadar = useAppStore((state) => state.radar);
  const fallbackSignal = useAppStore((state) => state.activeSignal);

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

  useEffect(() => {
    if (dashboardQuery.error) {
      bootstrapDemo();
    }
  }, [bootstrapDemo, dashboardQuery.error]);

  const matches = dashboardQuery.data?.matches ?? fallbackMatches;
  const recaps = dashboardQuery.data?.recaps ?? fallbackRecaps;
  const overlaps = dashboardQuery.data?.scheduledOverlaps ?? fallbackOverlaps;
  const radar = dashboardQuery.data?.radar ?? fallbackRadar;
  const activeSignal = dashboardQuery.data?.activeSignal ?? fallbackSignal;

  const orderedMatches = useMemo(() => [...matches].sort((left, right) => right.score - left.score), [matches]);
  const orderedOverlaps = useMemo(() => [...overlaps].sort((left, right) => right.score - left.score), [overlaps]);

  const warmPeople = useMemo(() => {
    const seen = new Set<string>();

    return [...orderedMatches, ...orderedOverlaps]
      .flatMap((item) => {
        const person = "matchedUser" in item ? item.matchedUser : null;
        if (!person || seen.has(person.id)) {
          return [];
        }
        seen.add(person.id);
        return [person];
      })
      .slice(0, 4);
  }, [orderedMatches, orderedOverlaps]);

  const hero = useMemo(() => {
    const bestMatch = orderedMatches[0];
    const bestOverlap = orderedOverlaps[0];

    if (bestMatch) {
      return {
        eyebrow: "Best match",
        title: `${bestMatch.matchedUser.name} feels like the move right now.`,
        copy: bestMatch.insightLabel ?? bestMatch.reason.momentumLabel ?? "Strong live signal fit.",
        status: `${orderedMatches.length} live ${orderedMatches.length === 1 ? "match" : "matches"}`,
        primaryLabel: "Start something",
        onPrimary: () => router.push(`/match/${bestMatch.id}` as never),
      };
    }

    if (bestOverlap) {
      return {
        eyebrow: "Best overlap",
        title: formatWindowLine(bestOverlap.startsAt),
        copy: bestOverlap.summary,
        status: bestOverlap.label,
        primaryLabel: "View best windows",
        onPrimary: () => router.push("/availability-preferences" as never),
      };
    }

    if (activeSignal) {
      return {
        eyebrow: "Live signal",
        title: `${availabilityLabel(activeSignal.state)} until ${formatDayTime(activeSignal.expiresAt)}`,
        copy: radar?.suggestionLine || "Your light signal is up. Let timing do the rest.",
        status: "Signal live now",
        primaryLabel: "Update signal",
        onPrimary: () => router.push("/now-mode" as never),
      };
    }

    return {
      eyebrow: "Live cluster",
      title: "Who can you catch right now?",
      copy: radar?.rhythm.detail || "Go live or save a hang rhythm to wake the radar up.",
      status: "Radar standing by",
      primaryLabel: "Send light signal",
      onPrimary: () => router.push("/now-mode" as never),
    };
  }, [activeSignal, orderedMatches, orderedOverlaps, radar, router]);

  const promptItems = useMemo(
    () =>
      quickPrompts.map((prompt) => ({
        ...prompt,
        onPress: () => router.push(prompt.route as never),
      })),
    [router],
  );

  const radarItems = useMemo(
    () => [
      ...orderedMatches.map((match) => ({
        id: match.id,
        name: match.matchedUser.name,
        line: match.insightLabel ?? match.reason.momentumLabel ?? "Strong live signal fit",
        detail:
          match.reason.meetingStyle === "ONLINE"
            ? `${Math.round(match.score * 100)}% fit, ${match.reason.overlapMinutes} min overlap, ${match.reason.onlineVenue ?? "online"}`
            : `${Math.round(match.score * 100)}% fit, ${match.reason.overlapMinutes} min overlap, ${match.reason.travelMinutes ?? 15} min away`,
        photoUrl: match.matchedUser.photoUrl,
        action: "Open",
        onPress: () => router.push(`/match/${match.id}` as never),
      })),
      ...orderedOverlaps.slice(0, 2).map((overlap) => ({
        id: overlap.id,
        name: overlap.matchedUser.name,
        line: overlap.label,
        detail: overlap.summary,
        photoUrl: overlap.matchedUser.photoUrl,
        action: "Suggest",
        onPress: () => router.push("/availability-preferences" as never),
      })),
    ],
    [orderedMatches, orderedOverlaps, router],
  );

  const recap = recaps[0]
    ? {
        title: recaps[0].title,
        detail: recaps[0].summary,
        onPress: () => router.push(`/recap/${recaps[0].hangoutId}` as never),
      }
    : null;

  const timingSignal = useMemo(() => {
    const bestOverlap = orderedOverlaps[0];

    if (bestOverlap) {
      return {
        title: formatWindowLine(bestOverlap.startsAt),
        detail: bestOverlap.summary,
        onPress: () => router.push("/availability-preferences" as never),
      };
    }

    if (activeSignal) {
      return {
        title: formatWindowLine(activeSignal.expiresAt),
        detail: `Your signal stays ${availabilityLabel(activeSignal.state).toLowerCase()} until then.`,
        onPress: () => router.push("/availability-preferences" as never),
      };
    }

    return {
      title: "Tonight around 8pm",
      detail: "Open your hang rhythm to tune the next clean window before the moment slips.",
      onPress: () => router.push("/availability-preferences" as never),
    };
  }, [activeSignal, orderedOverlaps, router]);

  const radarHint = orderedMatches.length
    ? `${orderedMatches.length} live ${orderedMatches.length === 1 ? "match is" : "matches are"} strongest right now.`
    : orderedOverlaps.length
      ? "The next good overlap is already lined up for you."
      : activeSignal
        ? "Your live signal is doing the work. The radar will update as people warm up."
        : "Nothing loud yet. The radar will sharpen once you go live or set a hang rhythm.";

  return {
    isLoading: dashboardQuery.isLoading && !dashboardQuery.data,
    isError: Boolean(dashboardQuery.error && !dashboardQuery.data && !fallbackMatches.length && !fallbackOverlaps.length),
    hero,
    warmPeople,
    promptItems,
    radarItems,
    recap,
    timingSignal,
    radarHint,
    openWindows: () => router.push("/availability-preferences" as never),
  };
};
