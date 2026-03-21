import { HangoutIntent, RecurringAvailabilityWindow, Vibe } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_MUTUAL_OVERLAP_MINUTES = 30;
const HORIZON_DAYS = 28;

type WindowOccurrence = {
  startsAt: Date;
  endsAt: Date;
};

type BookableSlot = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  label: string;
  summary: string;
  sourceLabel: string | null;
  vibe: Vibe | null;
  hangoutIntent: HangoutIntent | null;
  mutualFit: boolean;
  overlapMinutes: number | null;
  score: number | null;
};

const startOfPseudoLocalDayMs = (offsetMinutes: number) => {
  const pseudoLocalNow = new Date(Date.now() - offsetMinutes * MINUTE_MS);
  return Date.UTC(
    pseudoLocalNow.getUTCFullYear(),
    pseudoLocalNow.getUTCMonth(),
    pseudoLocalNow.getUTCDate(),
  );
};

const listOccurrences = (window: RecurringAvailabilityWindow, horizonDays = HORIZON_DAYS) => {
  const localStartDayMs = startOfPseudoLocalDayMs(window.utcOffsetMinutes);
  const occurrences: WindowOccurrence[] = [];

  for (let index = 0; index < horizonDays; index += 1) {
    const localMidnightMs = localStartDayMs + index * DAY_MS;
    const localDate = new Date(localMidnightMs);
    const dayOfWeek = localDate.getUTCDay();
    const dayOfMonth = localDate.getUTCDate();

    const applies =
      (window.recurrence === "WEEKLY" && window.dayOfWeek === dayOfWeek) ||
      (window.recurrence === "MONTHLY" && window.dayOfMonth === dayOfMonth);

    if (!applies) {
      continue;
    }

    const startsAt = new Date(
      localMidnightMs + (window.startMinute + window.utcOffsetMinutes) * MINUTE_MS,
    );
    const endsAt = new Date(
      localMidnightMs + (window.endMinute + window.utcOffsetMinutes) * MINUTE_MS,
    );

    if (endsAt.getTime() <= Date.now() + 15 * MINUTE_MS) {
      continue;
    }

    occurrences.push({ startsAt, endsAt });
  }

  return occurrences;
};

const toViewerLocal = (date: Date, offsetMinutes: number) =>
  new Date(date.getTime() - offsetMinutes * MINUTE_MS);

const formatViewerLocal = (
  date: Date,
  offsetMinutes: number,
  options: Intl.DateTimeFormatOptions,
) =>
  toViewerLocal(date, offsetMinutes).toLocaleString("en-US", {
    ...options,
    timeZone: "UTC",
  });

const buildSlotLabel = (startsAt: Date, endsAt: Date, viewerOffsetMinutes: number) =>
  `${formatViewerLocal(startsAt, viewerOffsetMinutes, {
    weekday: "short",
  })} - ${formatViewerLocal(startsAt, viewerOffsetMinutes, {
    hour: "numeric",
    minute: "2-digit",
  })} to ${formatViewerLocal(endsAt, viewerOffsetMinutes, {
    hour: "numeric",
    minute: "2-digit",
  })}`;

const humanizeIntent = (intent: HangoutIntent | null) =>
  intent ? intent.replaceAll("_", " ").toLowerCase() : null;

const buildSlotSummary = (
  hostName: string | null | undefined,
  window: RecurringAvailabilityWindow,
  overlapMinutes: number | null,
) => {
  if (window.label) {
    return `${hostName ?? "Your friend"} marked this window as ${window.label.toLowerCase()}.`;
  }

  if (window.hangoutIntent) {
    return `${hostName ?? "Your friend"} usually uses this window for ${humanizeIntent(window.hangoutIntent)}.`;
  }

  if (overlapMinutes && overlapMinutes >= MIN_MUTUAL_OVERLAP_MINUTES) {
    return `This lines up with about ${overlapMinutes} min of your saved schedule too.`;
  }

  return `${hostName ?? "Your friend"} is open here if you want to lock something in.`;
};

const getOverlapMinutes = (left: WindowOccurrence, right: WindowOccurrence) =>
  Math.floor(
    (Math.min(left.endsAt.getTime(), right.endsAt.getTime()) -
      Math.max(left.startsAt.getTime(), right.startsAt.getTime())) /
      MINUTE_MS,
  );

const scoreSlot = (startsAt: Date, overlapMinutes: number | null) => {
  const daysAway = Math.max(0, Math.floor((startsAt.getTime() - Date.now()) / DAY_MS));
  const soonness = Math.max(0.2, 1 - daysAway / 21);
  const overlapWeight = overlapMinutes ? Math.min(1, overlapMinutes / 180) : 0;

  return Number((soonness * 0.55 + overlapWeight * 0.45).toFixed(3));
};

export const getBookableAvailability = async (inviteCode: string, viewerId?: string | null) => {
  const host = await prisma.user.findUnique({
    where: { inviteCode },
    select: {
      id: true,
      inviteCode: true,
      name: true,
      city: true,
      communityTag: true,
      photoUrl: true,
      phone: true,
      responsivenessScore: true,
      discordUsername: true,
      sharedServerCount: true,
      notificationIntensity: true,
      onboardingCompleted: true,
    },
  });

  if (!host || !host.onboardingCompleted) {
    return null;
  }

  const hostWindows = await prisma.recurringAvailabilityWindow.findMany({
    where: {
      userId: host.id,
      isActive: true,
    },
    orderBy: [{ recurrence: "asc" }, { startMinute: "asc" }],
  });

  if (!hostWindows.length) {
    return {
      host,
      slots: [] as BookableSlot[],
      viewerHasRecurringSchedule: false,
    };
  }

  const viewerWindows =
    viewerId && viewerId !== host.id
      ? await prisma.recurringAvailabilityWindow.findMany({
          where: {
            userId: viewerId,
            isActive: true,
          },
          orderBy: [{ recurrence: "asc" }, { startMinute: "asc" }],
        })
      : [];

  const viewerHasRecurringSchedule = Boolean(viewerWindows.length);
  const viewerOccurrences = viewerWindows.flatMap((window) => listOccurrences(window));
  const viewerOffsetMinutes =
    viewerWindows[0]?.utcOffsetMinutes ?? hostWindows[0]?.utcOffsetMinutes ?? 0;
  const slotsByKey = new Map<string, BookableSlot>();

  hostWindows.forEach((window) => {
    listOccurrences(window).forEach((occurrence) => {
      const overlapMinutes = viewerOccurrences.length
        ? viewerOccurrences.reduce<number | null>((best, viewerOccurrence) => {
            const overlap = getOverlapMinutes(occurrence, viewerOccurrence);
            if (overlap < MIN_MUTUAL_OVERLAP_MINUTES) {
              return best;
            }

            return best === null ? overlap : Math.max(best, overlap);
          }, null)
        : null;

      const key = `${occurrence.startsAt.toISOString()}:${occurrence.endsAt.toISOString()}`;
      const nextSlot: BookableSlot = {
        id: `${window.id}:${occurrence.startsAt.toISOString()}`,
        startsAt: occurrence.startsAt,
        endsAt: occurrence.endsAt,
        label: buildSlotLabel(occurrence.startsAt, occurrence.endsAt, viewerOffsetMinutes),
        summary: buildSlotSummary(host.name, window, overlapMinutes),
        sourceLabel: window.label ?? null,
        vibe: window.vibe ?? null,
        hangoutIntent: window.hangoutIntent ?? null,
        mutualFit: overlapMinutes !== null,
        overlapMinutes,
        score: scoreSlot(occurrence.startsAt, overlapMinutes),
      };

      const current = slotsByKey.get(key);
      if (!current) {
        slotsByKey.set(key, nextSlot);
        return;
      }

      if ((nextSlot.score ?? 0) > (current.score ?? 0)) {
        slotsByKey.set(key, nextSlot);
      }
    });
  });

  const slots = [...slotsByKey.values()]
    .sort((left, right) => {
      if (left.mutualFit !== right.mutualFit) {
        return left.mutualFit ? -1 : 1;
      }

      if ((right.score ?? 0) !== (left.score ?? 0)) {
        return (right.score ?? 0) - (left.score ?? 0);
      }

      return left.startsAt.getTime() - right.startsAt.getTime();
    })
    .slice(0, 14);

  return {
    host,
    slots,
    viewerHasRecurringSchedule,
  };
};
