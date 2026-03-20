import {
  AvailabilitySignal,
  AvailabilityState,
  Friendship,
  Hangout,
  HangoutParticipant,
  MicroResponse,
  ParticipantResponse,
  User,
} from "@prisma/client";
import { prisma } from "../../db/prisma.js";

type WindowLabel = "late morning" | "after class" | "tonight" | "late night";

type PairStats = {
  total: number;
  accepted: number;
  completed: number;
  declined: number;
  noResponse: number;
  groupCount: number;
  lastLinkedAt: Date | null;
  windowCounts: Record<WindowLabel, number>;
};

type UserMomentum = {
  completedLast7d: number;
  confirmedLast7d: number;
  lastCompletedAt: Date | null;
  windowCounts: Record<WindowLabel, number>;
};

type HangoutWithParticipants = Hangout & {
  participants: Array<
    HangoutParticipant & {
      user?: User | null;
    }
  >;
};

export type SocialContext = {
  usersById: Map<string, User>;
  latestSignalByUser: Map<string, AvailabilitySignal>;
  friendMap: Map<string, Set<string>>;
  pairStatsByKey: Map<string, PairStats>;
  userMomentumById: Map<string, UserMomentum>;
};

export type DerivedFriendInsight = {
  relationshipScore: number;
  hangoutLikelihood: number;
  reliabilityLabel: string;
  cadenceNote: string;
  clusterLabel?: string | null;
  lastSignal?: AvailabilityState | null;
  momentumLabel?: string | null;
  preferredWindow?: string | null;
  mutualCount: number;
};

const recentWindowMs = 45 * 24 * 60 * 60 * 1000;

const defaultWindowCounts = (): Record<WindowLabel, number> => ({
  "late morning": 0,
  "after class": 0,
  tonight: 0,
  "late night": 0,
});

const pairKey = (leftId: string, rightId: string) =>
  [leftId, rightId].sort().join(":");

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const getWindowLabel = (date: Date): WindowLabel => {
  const hour = date.getHours();
  if (hour < 14) {
    return "late morning";
  }

  if (hour < 18) {
    return "after class";
  }

  if (hour < 22) {
    return "tonight";
  }

  return "late night";
};

const countIntersection = (left?: Set<string>, right?: Set<string>) => {
  if (!left || !right) {
    return 0;
  }

  let count = 0;
  left.forEach((value) => {
    if (right.has(value)) {
      count += 1;
    }
  });
  return count;
};

const isAccepted = (
  responseStatus: ParticipantResponse,
  microResponse?: MicroResponse | null,
) =>
  responseStatus === ParticipantResponse.ACCEPTED ||
  microResponse === MicroResponse.PULLING_UP ||
  microResponse === MicroResponse.TEN_MIN_ONLY;

const topWindowFromCounts = (counts: Record<WindowLabel, number>) => {
  const ranked = Object.entries(counts).sort((left, right) => right[1] - left[1]);
  const top = ranked[0];
  if (!top || top[1] < 1) {
    return null;
  }

  return top[0] as WindowLabel;
};

export const loadSocialContext = async (userIds: string[]) => {
  const uniqueIds = [...new Set(userIds)];
  if (!uniqueIds.length) {
    return {
      usersById: new Map<string, User>(),
      latestSignalByUser: new Map<string, AvailabilitySignal>(),
      friendMap: new Map<string, Set<string>>(),
      pairStatsByKey: new Map<string, PairStats>(),
      userMomentumById: new Map<string, UserMomentum>(),
    } satisfies SocialContext;
  }

  const since = new Date(Date.now() - recentWindowMs);

  const [users, recentSignals, friendships, hangouts] = await Promise.all([
    prisma.user.findMany({
      where: {
        id: {
          in: uniqueIds,
        },
      },
    }),
    prisma.availabilitySignal.findMany({
      where: {
        userId: {
          in: uniqueIds,
        },
        createdAt: {
          gte: since,
        },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ userAId: { in: uniqueIds } }, { userBId: { in: uniqueIds } }],
      },
    }),
    prisma.hangout.findMany({
      where: {
        scheduledFor: {
          gte: since,
        },
        participants: {
          some: {
            userId: {
              in: uniqueIds,
            },
          },
        },
      },
      include: {
        participants: true,
      },
    }),
  ]);

  const usersById = new Map(users.map((user) => [user.id, user]));
  const latestSignalByUser = new Map<string, AvailabilitySignal>();
  recentSignals.forEach((signal) => {
    if (!latestSignalByUser.has(signal.userId)) {
      latestSignalByUser.set(signal.userId, signal);
    }
  });

  const friendMap = new Map<string, Set<string>>();
  friendships.forEach((friendship) => {
    const left = friendMap.get(friendship.userAId) ?? new Set<string>();
    left.add(friendship.userBId);
    friendMap.set(friendship.userAId, left);

    const right = friendMap.get(friendship.userBId) ?? new Set<string>();
    right.add(friendship.userAId);
    friendMap.set(friendship.userBId, right);
  });

  const pairStatsByKey = new Map<string, PairStats>();
  const userMomentumById = new Map<string, UserMomentum>();
  const now = Date.now();

  const getUserMomentum = (userId: string) => {
    const momentum =
      userMomentumById.get(userId) ??
      ({
        completedLast7d: 0,
        confirmedLast7d: 0,
        lastCompletedAt: null,
        windowCounts: defaultWindowCounts(),
      } satisfies UserMomentum);

    userMomentumById.set(userId, momentum);
    return momentum;
  };

  const getPairStats = (leftId: string, rightId: string) => {
    const key = pairKey(leftId, rightId);
    const current =
      pairStatsByKey.get(key) ??
      ({
        total: 0,
        accepted: 0,
        completed: 0,
        declined: 0,
        noResponse: 0,
        groupCount: 0,
        lastLinkedAt: null,
        windowCounts: defaultWindowCounts(),
      } satisfies PairStats);

    pairStatsByKey.set(key, current);
    return current;
  };

  hangouts.forEach((hangout) => {
    const windowLabel = getWindowLabel(hangout.scheduledFor);
    const isRecent = now - hangout.scheduledFor.getTime() <= 7 * 24 * 60 * 60 * 1000;

    hangout.participants.forEach((participant) => {
      const momentum = getUserMomentum(participant.userId);
      if (isAccepted(participant.responseStatus, participant.microResponse)) {
        momentum.windowCounts[windowLabel] += 1;
      }

      if (hangout.status === "CONFIRMED" || hangout.status === "COMPLETED") {
        if (isRecent) {
          momentum.confirmedLast7d += 1;
        }
      }

      if (hangout.status === "COMPLETED") {
        if (isRecent) {
          momentum.completedLast7d += 1;
        }

        if (
          !momentum.lastCompletedAt ||
          momentum.lastCompletedAt.getTime() < hangout.scheduledFor.getTime()
        ) {
          momentum.lastCompletedAt = hangout.scheduledFor;
        }
      }
    });

    for (let index = 0; index < hangout.participants.length; index += 1) {
      for (
        let secondIndex = index + 1;
        secondIndex < hangout.participants.length;
        secondIndex += 1
      ) {
        const left = hangout.participants[index];
        const right = hangout.participants[secondIndex];
        if (!left || !right) {
          continue;
        }

        const pair = getPairStats(left.userId, right.userId);
        pair.total += 1;
        pair.windowCounts[windowLabel] += 1;

        if (hangout.participants.length > 2) {
          pair.groupCount += 1;
        }

        if (
          isAccepted(left.responseStatus, left.microResponse) &&
          isAccepted(right.responseStatus, right.microResponse)
        ) {
          pair.accepted += 1;
        }

        if (
          left.responseStatus === ParticipantResponse.DECLINED ||
          right.responseStatus === ParticipantResponse.DECLINED ||
          left.microResponse === MicroResponse.PASS ||
          right.microResponse === MicroResponse.PASS
        ) {
          pair.declined += 1;
        }

        if (
          hangout.scheduledFor.getTime() < now &&
          (left.responseStatus === ParticipantResponse.PENDING ||
            right.responseStatus === ParticipantResponse.PENDING)
        ) {
          pair.noResponse += 1;
        }

        if (hangout.status === "COMPLETED") {
          pair.completed += 1;
          if (
            !pair.lastLinkedAt ||
            pair.lastLinkedAt.getTime() < hangout.scheduledFor.getTime()
          ) {
            pair.lastLinkedAt = hangout.scheduledFor;
          }
        }
      }
    }
  });

  return {
    usersById,
    latestSignalByUser,
    friendMap,
    pairStatsByKey,
    userMomentumById,
  } satisfies SocialContext;
};

export const deriveFriendInsight = (
  context: SocialContext,
  viewerId: string,
  friendId: string,
) => {
  const viewer = context.usersById.get(viewerId);
  const friend = context.usersById.get(friendId);
  const pairStats = context.pairStatsByKey.get(pairKey(viewerId, friendId));
  const lastSignal = context.latestSignalByUser.get(friendId)?.state ?? null;
  const mutualCount = countIntersection(
    context.friendMap.get(viewerId),
    context.friendMap.get(friendId),
  );

  const total = pairStats?.total ?? 0;
  const acceptedRate = total ? (pairStats?.accepted ?? 0) / total : 0.52;
  const completionRate =
    pairStats?.accepted && pairStats.accepted > 0
      ? pairStats.completed / pairStats.accepted
      : 0.45;
  const declineRate = total ? (pairStats?.declined ?? 0) / total : 0;
  const ghostRate = total ? (pairStats?.noResponse ?? 0) / total : 0;
  const sameCommunity =
    Boolean(viewer?.communityTag) &&
    Boolean(friend?.communityTag) &&
    viewer?.communityTag === friend?.communityTag;

  const relationshipScore = clamp(
    0.26 +
      acceptedRate * 0.26 +
      completionRate * 0.2 +
      Math.min(mutualCount, 4) * 0.05 +
      Math.min(pairStats?.groupCount ?? 0, 3) * 0.03 +
      (sameCommunity ? 0.06 : 0) -
      ghostRate * 0.18 -
      declineRate * 0.12,
    0.18,
    0.98,
  );

  const hangoutLikelihood = clamp(
    relationshipScore +
      (lastSignal && lastSignal !== "BUSY" ? 0.08 : 0) +
      ((pairStats?.lastLinkedAt &&
      Date.now() - pairStats.lastLinkedAt.getTime() <= 10 * 24 * 60 * 60 * 1000)
        ? 0.05
        : 0),
    0.1,
    0.99,
  );

  const preferredWindow = pairStats
    ? topWindowFromCounts(pairStats.windowCounts)
    : null;

  let reliabilityLabel = "best with quick low-pressure pings";
  if (total >= 2 && completionRate >= 0.68) {
    reliabilityLabel = "usually follows through";
  } else if (ghostRate >= 0.34) {
    reliabilityLabel = "can go quiet last minute";
  } else if (declineRate >= 0.34) {
    reliabilityLabel = "better with softer invites";
  } else if (lastSignal && lastSignal !== "BUSY") {
    reliabilityLabel = "often down on short notice";
  }

  const clusterLabel = sameCommunity
    ? `Same ${friend?.communityTag}`
    : mutualCount > 1
      ? `${mutualCount} mutual crew links`
      : viewer?.city && friend?.city && viewer.city === friend.city
        ? `${friend.city} crew`
        : null;

  const cadenceNote = preferredWindow
    ? `You two usually click ${preferredWindow}`
    : sameCommunity
      ? `Strongest inside ${friend?.communityTag}`
      : lastSignal && lastSignal !== "BUSY"
        ? `${friend?.name ?? "They"} look open right now`
        : "Best with casual, low-pressure invites";

  const momentumLabel =
    pairStats?.lastLinkedAt &&
    Date.now() - pairStats.lastLinkedAt.getTime() <= 5 * 24 * 60 * 60 * 1000
      ? "recently active"
      : pairStats && pairStats.completed >= 2
        ? "steady rhythm"
        : lastSignal && lastSignal !== "BUSY"
          ? "live now"
          : null;

  return {
    relationshipScore,
    hangoutLikelihood,
    reliabilityLabel,
    cadenceNote,
    clusterLabel,
    lastSignal,
    momentumLabel,
    preferredWindow,
    mutualCount,
  } satisfies DerivedFriendInsight;
};

export const deriveSocialRadar = (context: SocialContext, userId: string) => {
  const user = context.usersById.get(userId);
  const friendIds = [...(context.friendMap.get(userId) ?? new Set<string>())];
  const nearbyFriends = friendIds.filter((friendId) => {
    const friend = context.usersById.get(friendId);
    if (!friend || !user) {
      return false;
    }

    if (user.communityTag && friend.communityTag) {
      return user.communityTag === friend.communityTag;
    }

    return Boolean(user.city && friend.city && user.city === friend.city);
  });

  const activeNowCount = friendIds.filter((friendId) => {
    const signal = context.latestSignalByUser.get(friendId);
    if (!signal) {
      return false;
    }

    return (
      signal.expiresAt.getTime() > Date.now() &&
      signal.state !== AvailabilityState.BUSY
    );
  }).length;

  const momentum = context.userMomentumById.get(userId);
  const cadenceDays = momentum?.lastCompletedAt
    ? Math.floor(
        (Date.now() - momentum.lastCompletedAt.getTime()) / (24 * 60 * 60 * 1000),
      )
    : null;
  const bestWindow =
    (momentum && topWindowFromCounts(momentum.windowCounts)) || "tonight";

  const momentumScore =
    activeNowCount * 0.38 +
    (momentum?.completedLast7d ?? 0) * 0.28 +
    (momentum?.confirmedLast7d ?? 0) * 0.18 -
    (cadenceDays ?? 3) * 0.03;

  const state =
    momentumScore >= 1.5 ? "LIVE" : momentumScore >= 0.85 ? "WARM" : "QUIET";
  const communityLabel = user?.communityTag ?? user?.city ?? null;

  let headline = "Keep the line warm";
  let detail = "One light signal is enough to wake the crew up.";
  let livePrompt = "Set a quick signal and let overlap do the work.";

  if (activeNowCount >= 3) {
    headline = "Your crew is moving";
    detail = `${activeNowCount} friends look open${communityLabel ? ` around ${communityLabel}` : " nearby"}.`;
    livePrompt = "Best hangout window is happening now.";
  } else if (activeNowCount >= 1) {
    headline = "A quick link is on the table";
    detail = `${activeNowCount} friend${activeNowCount > 1 ? "s" : ""} look open right now.`;
    livePrompt = "Use a low-pressure prompt before the window fades.";
  } else if (cadenceDays !== null && cadenceDays >= 4) {
    headline = `You have been quiet for ${cadenceDays} day${cadenceDays > 1 ? "s" : ""}`;
    detail = `${bestWindow} is usually when your people line up.`;
    livePrompt = "Throw up a quick signal instead of planning hard.";
  } else if ((momentum?.completedLast7d ?? 0) >= 2) {
    headline = "Your social rhythm is warm";
    detail = `You have made ${(momentum?.completedLast7d ?? 0)} real links in the last week.`;
    livePrompt = "Keep it casual and stay easy to catch.";
  }

  const densityLabel =
    activeNowCount >= 3
      ? "dense right now"
      : nearbyFriends.length >= 4
        ? "local crew building"
        : "still early, one more friend helps";

  return {
    rhythm: {
      state,
      headline,
      detail,
      bestWindow,
      activeNowCount,
      nearbyFriendsCount: nearbyFriends.length,
      cadenceDays,
      livePrompt,
      communityLabel,
    },
    localDensity: {
      communityLabel,
      nearbyFriendsCount: nearbyFriends.length,
      activeNowCount,
      densityLabel,
    },
    suggestionLine:
      activeNowCount >= 1
        ? `Best chance is ${bestWindow}. Lead with a quick drop-in prompt.`
        : `Your strongest window tends to be ${bestWindow}. Keep signals light until then.`,
  };
};
