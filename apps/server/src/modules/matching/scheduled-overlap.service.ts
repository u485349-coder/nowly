import {
  HangoutIntent,
  NotificationPriority,
  NotificationType,
  RecurringAvailabilityWindow,
  User,
  Vibe,
} from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import {
  deriveFriendInsight,
  loadSocialContext,
} from "../intelligence/social-intelligence.service.js";
import { sendPushToUser, wasRecentlySent } from "../notifications/push.service.js";

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_OVERLAP_MINUTES = 30;
const HORIZON_DAYS = 35;

type WindowWithUser = RecurringAvailabilityWindow & {
  user: User;
};

type WindowOccurrence = {
  startsAt: Date;
  endsAt: Date;
};

export type ScheduledOverlapSuggestion = {
  id: string;
  score: number;
  startsAt: Date;
  endsAt: Date;
  overlapMinutes: number;
  matchedUser: User;
  sourceWindow: RecurringAvailabilityWindow;
  matchedWindow: RecurringAvailabilityWindow;
  label: string;
  summary: string;
  sharedVibe: Vibe | null;
  sharedIntent: HangoutIntent | null;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

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

const humanizeIntent = (intent: HangoutIntent | null) =>
  intent ? intent.replaceAll("_", " ").toLowerCase() : null;

const buildSuggestionLabel = (
  startsAt: Date,
  endsAt: Date,
  viewerOffsetMinutes: number,
) =>
  `${formatViewerLocal(startsAt, viewerOffsetMinutes, {
    weekday: "short",
  })} · ${formatViewerLocal(startsAt, viewerOffsetMinutes, {
    hour: "numeric",
    minute: "2-digit",
  })} - ${formatViewerLocal(endsAt, viewerOffsetMinutes, {
    hour: "numeric",
    minute: "2-digit",
  })}`;

const buildSuggestionSummary = (
  friendName: string | null | undefined,
  overlapMinutes: number,
  sharedIntent: HangoutIntent | null,
  sharedVibe: Vibe | null,
  cadenceNote: string,
) => {
  if (sharedIntent) {
    return `${friendName ?? "A friend"} also tends to be down for ${humanizeIntent(sharedIntent)} during this window.`;
  }

  if (sharedVibe) {
    return `${friendName ?? "A friend"} overlaps on ${sharedVibe.toLowerCase()} energy here. ${cadenceNote}.`;
  }

  return `${friendName ?? "A friend"} shares about ${overlapMinutes} min with you here. ${cadenceNote}.`;
};

const scoreOverlap = (input: {
  overlapMinutes: number;
  startsAt: Date;
  relationshipScore: number;
  hangoutLikelihood: number;
  responsivenessScore: number;
  sharedIntent: HangoutIntent | null;
  sharedVibe: Vibe | null;
}) => {
  const daysAway = Math.max(
    0,
    Math.floor((input.startsAt.getTime() - Date.now()) / DAY_MS),
  );
  const overlapWeight = clamp(input.overlapMinutes / 150, 0, 1);
  const soonnessWeight = clamp(1 - daysAway / 21, 0.15, 1);
  const identityBonus =
    (input.sharedIntent ? 0.09 : 0) + (input.sharedVibe ? 0.05 : 0);

  const score =
    overlapWeight * 0.34 +
    input.relationshipScore * 0.26 +
    input.hangoutLikelihood * 0.18 +
    input.responsivenessScore * 0.1 +
    soonnessWeight * 0.12 +
    identityBonus;

  return Number(score.toFixed(3));
};

export const getScheduledOverlapsForUser = async (userId: string) => {
  const viewerWindows = await prisma.recurringAvailabilityWindow.findMany({
    where: {
      userId,
      isActive: true,
      user: {
        onboardingCompleted: true,
      },
    },
    include: {
      user: true,
    },
    orderBy: [{ recurrence: "asc" }, { startMinute: "asc" }],
  });

  if (!viewerWindows.length) {
    return [] as ScheduledOverlapSuggestion[];
  }

  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    select: {
      userAId: true,
      userBId: true,
    },
  });

  const friendIds = friendships.map((friendship) =>
    friendship.userAId === userId ? friendship.userBId : friendship.userAId,
  );

  if (!friendIds.length) {
    return [] as ScheduledOverlapSuggestion[];
  }

  const friendWindows = await prisma.recurringAvailabilityWindow.findMany({
    where: {
      userId: {
        in: friendIds,
      },
      isActive: true,
      user: {
        onboardingCompleted: true,
      },
    },
    include: {
      user: true,
    },
    orderBy: [{ startMinute: "asc" }],
  });

  if (!friendWindows.length) {
    return [] as ScheduledOverlapSuggestion[];
  }

  const context = await loadSocialContext([userId, ...friendIds]);
  const viewerOffsetMinutes = viewerWindows[0]?.utcOffsetMinutes ?? 0;
  const viewerOccurrences = new Map<string, WindowOccurrence[]>();
  const friendOccurrences = new Map<string, WindowOccurrence[]>();
  const suggestionByKey = new Map<string, ScheduledOverlapSuggestion>();

  viewerWindows.forEach((window) => {
    viewerOccurrences.set(window.id, listOccurrences(window));
  });

  friendWindows.forEach((window) => {
    friendOccurrences.set(window.id, listOccurrences(window));
  });

  for (const sourceWindow of viewerWindows) {
    for (const matchedWindow of friendWindows) {
      if (matchedWindow.userId === sourceWindow.userId) {
        continue;
      }

      const insight = deriveFriendInsight(context, userId, matchedWindow.userId);
      const leftOccurrences = viewerOccurrences.get(sourceWindow.id) ?? [];
      const rightOccurrences = friendOccurrences.get(matchedWindow.id) ?? [];
      const sharedIntent =
        sourceWindow.hangoutIntent &&
        matchedWindow.hangoutIntent &&
        sourceWindow.hangoutIntent === matchedWindow.hangoutIntent
          ? sourceWindow.hangoutIntent
          : null;
      const sharedVibe =
        sourceWindow.vibe && matchedWindow.vibe && sourceWindow.vibe === matchedWindow.vibe
          ? sourceWindow.vibe
          : null;

      for (const left of leftOccurrences) {
        for (const right of rightOccurrences) {
          const startsAt = new Date(
            Math.max(left.startsAt.getTime(), right.startsAt.getTime()),
          );
          const endsAt = new Date(Math.min(left.endsAt.getTime(), right.endsAt.getTime()));
          const overlapMinutes = Math.floor(
            (endsAt.getTime() - startsAt.getTime()) / MINUTE_MS,
          );

          if (overlapMinutes < MIN_OVERLAP_MINUTES) {
            continue;
          }

          const score = scoreOverlap({
            overlapMinutes,
            startsAt,
            relationshipScore: insight.relationshipScore,
            hangoutLikelihood: insight.hangoutLikelihood,
            responsivenessScore: matchedWindow.user.responsivenessScore,
            sharedIntent,
            sharedVibe,
          });

          const suggestionKey = `${matchedWindow.userId}:${startsAt.toISOString()}`;
          const current = suggestionByKey.get(suggestionKey);
          if (current && current.score >= score) {
            continue;
          }

          suggestionByKey.set(suggestionKey, {
            id: `scheduled-${sourceWindow.userId}-${matchedWindow.userId}-${startsAt.getTime()}`,
            score,
            startsAt,
            endsAt,
            overlapMinutes,
            matchedUser: matchedWindow.user,
            sourceWindow,
            matchedWindow,
            label: buildSuggestionLabel(startsAt, endsAt, viewerOffsetMinutes),
            summary: buildSuggestionSummary(
              matchedWindow.user.name,
              overlapMinutes,
              sharedIntent,
              sharedVibe,
              insight.cadenceNote,
            ),
            sharedVibe,
            sharedIntent,
          });
        }
      }
    }
  }

  return [...suggestionByKey.values()]
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.startsAt.getTime() - right.startsAt.getTime();
    })
    .slice(0, 8);
};

export const sendScheduledOverlapNudges = async () => {
  const users = await prisma.user.findMany({
    where: {
      onboardingCompleted: true,
      recurringWindows: {
        some: {
          isActive: true,
        },
      },
    },
    select: {
      id: true,
    },
  });

  await Promise.all(
    users.map(async (user) => {
      const suggestions = await getScheduledOverlapsForUser(user.id);
      const top = suggestions[0];

      if (!top) {
        return;
      }

      const hoursAway = (top.startsAt.getTime() - Date.now()) / (60 * 60 * 1000);
      if (hoursAway < 3 || hoursAway > 72) {
        return;
      }

      const dedupeKey = `scheduled-overlap:${user.id}:${top.matchedUser.id}:${top.startsAt.toISOString()}`;
      const recentlySent = await wasRecentlySent(
        user.id,
        NotificationType.OVERLAP_FOUND,
        dedupeKey,
        18 * 60,
      );

      if (recentlySent) {
        return;
      }

      await sendPushToUser({
        userId: user.id,
        type: NotificationType.OVERLAP_FOUND,
        priority: NotificationPriority.LOW,
        dedupeKey,
        title: "A good hang window just lined up",
        body: `${top.matchedUser.name ?? "A friend"} overlaps with you ${top.label}.`,
        data: {
          screen: "home",
        },
      });
    }),
  );
};
