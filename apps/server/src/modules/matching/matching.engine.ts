import {
  AvailabilitySignal,
  DiscordPresence,
  NotificationType,
  Prisma,
  User,
} from "@prisma/client";
import {
  crowdModesAreCompatible,
  parseSignalLabelMetadata,
  signalSupportsInPerson,
  signalSupportsOnline,
  type SignalCrowdMode,
} from "@nowly/shared";
import { prisma } from "../../db/prisma.js";
import { distanceInKm } from "../../utils/geo.js";
import {
  deriveFriendInsight,
  loadSocialContext,
} from "../intelligence/social-intelligence.service.js";
import { trackEvent } from "../analytics/analytics.service.js";
import { sendPushToUser, wasRecentlySent } from "../notifications/push.service.js";

type SignalWithUser = AvailabilitySignal & {
  user: User;
};

const compatibleStates = new Set<string>([
  "FREE_NOW:FREE_NOW",
  "FREE_NOW:FREE_LATER",
  "FREE_LATER:FREE_NOW",
  "FREE_LATER:FREE_LATER",
  "DOWN_THIS_WEEKEND:DOWN_THIS_WEEKEND",
  "FREE_LATER:DOWN_THIS_WEEKEND",
  "DOWN_THIS_WEEKEND:FREE_LATER",
]);

const discordBonusByPresence: Record<DiscordPresence, number> = {
  ONLINE: 1,
  IDLE: 0.6,
  DND: 0.2,
  OFFLINE: 0,
  UNKNOWN: 0,
};

const energyOrder = ["LOW", "MEDIUM", "HIGH"] as const;
const budgetOrder = ["LOW_SPEND", "FLEXIBLE", "TREAT_MYSELF"] as const;
const batteryOrder = ["LOW_KEY", "OPEN", "SOCIAL"] as const;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const computeOverlapMinutes = (left: AvailabilitySignal, right: AvailabilitySignal) =>
  Math.max(
    0,
    Math.floor(
      (Math.min(left.expiresAt.getTime(), right.expiresAt.getTime()) - Date.now()) /
        60000,
    ),
  );

const enumCloseness = (
  left: string | null | undefined,
  right: string | null | undefined,
  ordered: readonly string[],
) => {
  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 1;
  }

  const leftIndex = ordered.indexOf(left);
  const rightIndex = ordered.indexOf(right);
  if (leftIndex === -1 || rightIndex === -1) {
    return 0;
  }

  return clamp(1 - Math.abs(leftIndex - rightIndex) / (ordered.length - 1), 0, 1);
};

const computeIdentityScore = (left: SignalWithUser, right: SignalWithUser) => {
  let score = 0;
  let factors = 0;

  if (left.vibe && right.vibe) {
    score += left.vibe === right.vibe ? 1 : 0;
    factors += 1;
  }

  if (left.hangoutIntent && right.hangoutIntent) {
    score += left.hangoutIntent === right.hangoutIntent ? 1 : 0;
    factors += 1;
  }

  if (left.energyLevel && right.energyLevel) {
    score += enumCloseness(left.energyLevel, right.energyLevel, energyOrder);
    factors += 1;
  }

  if (left.budgetMood && right.budgetMood) {
    score += enumCloseness(left.budgetMood, right.budgetMood, budgetOrder);
    factors += 1;
  }

  if (left.socialBattery && right.socialBattery) {
    score += enumCloseness(left.socialBattery, right.socialBattery, batteryOrder);
    factors += 1;
  }

  if (!factors) {
    return 0.42;
  }

  return score / factors;
};

const resolveCrowdMode = (
  left: SignalCrowdMode,
  right: SignalCrowdMode,
): SignalCrowdMode => {
  if (left === right) {
    return left;
  }

  if (left === "EITHER") {
    return right;
  }

  if (right === "EITHER") {
    return left;
  }

  return "EITHER";
};

const resolveOnlineVenue = (leftVenue?: string | null, rightVenue?: string | null) => {
  const normalizedLeft = leftVenue?.trim() || null;
  const normalizedRight = rightVenue?.trim() || null;

  if (
    normalizedLeft &&
    normalizedRight &&
    normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
  ) {
    return normalizedLeft;
  }

  return normalizedLeft || normalizedRight || null;
};

const computeScore = (
  left: SignalWithUser,
  right: SignalWithUser,
  relationshipScore: number,
  momentumLabel?: string | null,
  timingLabel?: string | null,
  localDensityLabel?: string | null,
) => {
  if (!compatibleStates.has(`${left.state}:${right.state}`)) {
    return null;
  }

  const overlapMinutes = computeOverlapMinutes(left, right);
  if (overlapMinutes < 15) {
    return null;
  }

  const leftMetadata = parseSignalLabelMetadata(left.label);
  const rightMetadata = parseSignalLabelMetadata(right.label);

  if (!crowdModesAreCompatible(leftMetadata.crowdMode, rightMetadata.crowdMode)) {
    return null;
  }

  const distanceKm = distanceInKm(
    { lat: left.user.lat, lng: left.user.lng },
    { lat: right.user.lat, lng: right.user.lng },
  );
  const maxDistanceKm = Math.max(left.radiusKm, right.radiusKm) + 3;
  const inPersonPossible =
    signalSupportsInPerson(leftMetadata.meetMode) &&
    signalSupportsInPerson(rightMetadata.meetMode);
  const onlinePossible =
    signalSupportsOnline(leftMetadata.meetMode) &&
    signalSupportsOnline(rightMetadata.meetMode);
  const withinDistance = distanceKm === null || distanceKm <= maxDistanceKm;
  const meetingStyle =
    inPersonPossible && withinDistance
      ? "IN_PERSON"
      : onlinePossible
        ? "ONLINE"
        : null;

  if (!meetingStyle) {
    return null;
  }

  const timeOverlapWeight = Math.min(overlapMinutes / 180, 1);
  const distanceWeight =
    meetingStyle === "ONLINE"
      ? 1
      : distanceKm === null
      ? 0.7
      : Math.max(0, 1 - distanceKm / Math.max(left.radiusKm, right.radiusKm, 1));
  const responsivenessWeight =
    (left.user.responsivenessScore + right.user.responsivenessScore) / 2;
  const discordPresenceWeight =
    discordBonusByPresence[right.user.discordPresence ?? DiscordPresence.UNKNOWN] *
    0.05;
  const identityScore = computeIdentityScore(left, right);
  const localDensityBonus = meetingStyle === "IN_PERSON" && localDensityLabel ? 0.04 : 0;
  const onlineVenue = meetingStyle === "ONLINE"
    ? resolveOnlineVenue(leftMetadata.onlineVenue, rightMetadata.onlineVenue)
    : null;
  const onlineVenueBonus = meetingStyle === "ONLINE" && onlineVenue ? 0.04 : 0.01;
  const crowdMode = resolveCrowdMode(leftMetadata.crowdMode, rightMetadata.crowdMode);

  const score =
    timeOverlapWeight * 0.33 +
    distanceWeight * 0.22 +
    responsivenessWeight * 0.12 +
    relationshipScore * 0.16 +
    identityScore * 0.12 +
    discordPresenceWeight +
    localDensityBonus +
    onlineVenueBonus;

  return {
    score: Number(score.toFixed(3)),
    overlapMinutes,
    distanceKm:
      meetingStyle === "ONLINE" || distanceKm === null
        ? null
        : Number(distanceKm.toFixed(1)),
    meetingStyle,
    crowdMode,
    onlineVenue,
    sharedVibe:
      left.vibe && right.vibe && left.vibe === right.vibe ? left.vibe : null,
    sharedIntent:
      left.hangoutIntent && right.hangoutIntent && left.hangoutIntent === right.hangoutIntent
        ? left.hangoutIntent
        : null,
    discordBonus: discordPresenceWeight,
    relationshipScore: Number(relationshipScore.toFixed(2)),
    identityScore: Number(identityScore.toFixed(2)),
    timingLabel,
    momentumLabel,
    localDensityLabel,
  };
};

const buildOverlapNotification = (
  signal: SignalWithUser,
  rankedMatches: Array<
    ReturnType<typeof computeScore> & {
      friendSignal: SignalWithUser;
      insight: ReturnType<typeof deriveFriendInsight>;
    }
  >,
) => {
  const top = rankedMatches[0];
  if (!top) {
    return null;
  }

  const area = signal.user.communityTag ?? signal.user.city ?? "near you";

  if (rankedMatches.length >= 3) {
    if (top.meetingStyle === "ONLINE") {
      return {
        title: "Your crew is live online",
        body: `${rankedMatches.length} friends look open${top.onlineVenue ? ` on ${top.onlineVenue}` : " online"} right now.`,
        dedupeKey: `overlap:crew-online:${signal.userId}:${rankedMatches.length}`,
      };
    }

    return {
      title: "Your crew is active right now",
      body: `${rankedMatches.length} friends look open around ${area}. Best hangout window is happening now.`,
      dedupeKey: `overlap:crew:${signal.userId}:${rankedMatches.length}`,
    };
  }

  if (top.meetingStyle === "ONLINE") {
    return {
      title: top.onlineVenue ? `${top.onlineVenue} hang looks easy` : "An online hang looks easy",
      body: `${top.friendSignal.user.name ?? "A friend"} looks open${top.onlineVenue ? ` on ${top.onlineVenue}` : " online"} and usually ${top.insight.reliabilityLabel}.`,
      dedupeKey: `overlap:online:${[signal.userId, top.friendSignal.userId].sort().join(":")}:${top.onlineVenue ?? "generic"}`,
    };
  }

  if (top.sharedIntent) {
    return {
      title: "Best hangout window is open",
      body: `${top.friendSignal.user.name ?? "A friend"} looks down for ${top.sharedIntent
        .replaceAll("_", " ")
        .toLowerCase()} around ${area}.`,
      dedupeKey: `overlap:intent:${signal.userId}:${top.friendSignal.userId}:${top.sharedIntent}`,
    };
  }

  return {
    title: "A quick link is on the table",
    body: `${top.friendSignal.user.name ?? "A friend"} is free ${top.distanceKm ?? 1} km away and usually ${top.insight.reliabilityLabel}.`,
    dedupeKey: `overlap:pair:${[signal.userId, top.friendSignal.userId].sort().join(":")}`,
  };
};

export const runMatchingCycle = async () => {
  const activeSignals = await prisma.availabilitySignal.findMany({
    where: {
      isActive: true,
      expiresAt: { gt: new Date() },
      user: {
        onboardingCompleted: true,
      },
    },
    include: {
      user: true,
    },
  });

  const userIds = [...new Set(activeSignals.map((signal) => signal.userId))];
  const socialContext = await loadSocialContext(userIds);
  const groupedSignals = new Map<string, SignalWithUser>();
  activeSignals.forEach((signal) => groupedSignals.set(signal.userId, signal));

  for (const signal of activeSignals) {
    const friendIds = [...(socialContext.friendMap.get(signal.userId) ?? new Set<string>())];
    const rankedMatches = friendIds
      .map((friendId) => {
        const friendSignal = groupedSignals.get(friendId);
        if (!friendSignal) {
          return null;
        }

        const insight = deriveFriendInsight(socialContext, signal.userId, friendId);
        const result = computeScore(
          signal,
          friendSignal,
          insight.relationshipScore,
          insight.momentumLabel,
          insight.preferredWindow,
          insight.clusterLabel,
        );

        if (!result) {
          return null;
        }

        return {
          friendSignal,
          insight,
          ...result,
        };
      })
      .filter(Boolean)
      .sort((left, right) => right!.score - left!.score)
      .slice(0, 5) as Array<
      ReturnType<typeof computeScore> & {
        friendSignal: SignalWithUser;
        insight: ReturnType<typeof deriveFriendInsight>;
      }
    >;

    const persistedMatchIds: string[] = [];

    for (const ranked of rankedMatches) {
      const expiresAt = new Date(
        Math.min(signal.expiresAt.getTime(), ranked.friendSignal.expiresAt.getTime()),
      );

      const match = await prisma.overlapMatch.upsert({
        where: {
          userId_matchedUserId_signalId_matchedSignalId: {
            userId: signal.userId,
            matchedUserId: ranked.friendSignal.userId,
            signalId: signal.id,
            matchedSignalId: ranked.friendSignal.id,
          },
        },
        update: {
          score: ranked.score,
          reason: {
            overlapMinutes: ranked.overlapMinutes,
            travelMinutes:
              ranked.meetingStyle === "ONLINE" || ranked.distanceKm === null
                ? null
                : Math.round((ranked.distanceKm / 25) * 60),
            meetingStyle: ranked.meetingStyle,
            crowdMode: ranked.crowdMode,
            onlineVenue: ranked.onlineVenue,
            sharedVibe: ranked.sharedVibe,
            sharedIntent: ranked.sharedIntent,
            discordBonus: ranked.discordBonus,
            relationshipScore: ranked.relationshipScore,
            identityScore: ranked.identityScore,
            timingLabel: ranked.timingLabel,
            momentumLabel: ranked.momentumLabel,
            localDensityLabel: ranked.localDensityLabel,
          },
          expiresAt,
          status: "OPEN",
        },
        create: {
          userId: signal.userId,
          matchedUserId: ranked.friendSignal.userId,
          signalId: signal.id,
          matchedSignalId: ranked.friendSignal.id,
          score: ranked.score,
          reason: {
            overlapMinutes: ranked.overlapMinutes,
            travelMinutes:
              ranked.meetingStyle === "ONLINE" || ranked.distanceKm === null
                ? null
                : Math.round((ranked.distanceKm / 25) * 60),
            meetingStyle: ranked.meetingStyle,
            crowdMode: ranked.crowdMode,
            onlineVenue: ranked.onlineVenue,
            sharedVibe: ranked.sharedVibe,
            sharedIntent: ranked.sharedIntent,
            discordBonus: ranked.discordBonus,
            relationshipScore: ranked.relationshipScore,
            identityScore: ranked.identityScore,
            timingLabel: ranked.timingLabel,
            momentumLabel: ranked.momentumLabel,
            localDensityLabel: ranked.localDensityLabel,
          } as Prisma.JsonObject,
          expiresAt,
        },
      });

      persistedMatchIds.push(match.id);
    }

    const notification = buildOverlapNotification(signal, rankedMatches);
    if (!notification || !persistedMatchIds.length) {
      continue;
    }

    const recentlySent = await wasRecentlySent(
      signal.userId,
      NotificationType.OVERLAP_FOUND,
      notification.dedupeKey,
      45,
    );

    if (!recentlySent) {
      await sendPushToUser({
        userId: signal.userId,
        type: NotificationType.OVERLAP_FOUND,
        dedupeKey: notification.dedupeKey,
        title: notification.title,
        body: notification.body,
        data: {
          screen: "match",
          matchId: persistedMatchIds[0],
        },
      });

      await trackEvent("overlap_found", signal.userId, {
        matchId: persistedMatchIds[0],
        candidateCount: persistedMatchIds.length,
        topMatchedUserId: rankedMatches[0]?.friendSignal.userId,
        score: rankedMatches[0]?.score,
      });

      await prisma.overlapMatch.updateMany({
        where: {
          id: {
            in: persistedMatchIds,
          },
        },
        data: {
          notifiedAt: new Date(),
        },
      });
    }
  }

  await prisma.overlapMatch.updateMany({
    where: {
      expiresAt: { lte: new Date() },
      status: "OPEN",
    },
    data: {
      status: "EXPIRED",
    },
  });
};
