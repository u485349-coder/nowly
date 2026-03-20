import { InviteChannel, Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { normalizeFriendPair } from "../../utils/friends.js";
import { trackEvent } from "../analytics/analytics.service.js";
import {
  deriveFriendInsight,
  loadSocialContext,
} from "../intelligence/social-intelligence.service.js";

const inviteSchema = z.object({
  phoneNumbers: z.array(z.string().min(8)).min(1).max(20),
  channel: z.nativeEnum(InviteChannel).default(InviteChannel.SMS)
});

const requestSchema = z.object({
  userId: z.string().min(1)
});

const respondSchema = z.object({
  action: z.enum(["ACCEPT", "DECLINE"])
});

const friendshipInclude = {
  userA: {
    select: {
      id: true,
      name: true,
      city: true,
      photoUrl: true,
      phone: true,
      responsivenessScore: true,
      communityTag: true,
      sharedServerCount: true,
      discordUsername: true
    }
  },
  userB: {
    select: {
      id: true,
      name: true,
      city: true,
      photoUrl: true,
      phone: true,
      responsivenessScore: true,
      communityTag: true,
      sharedServerCount: true,
      discordUsername: true
    }
  }
} satisfies Prisma.FriendshipInclude;

export const friendsRouter = Router();

friendsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (request, response) => {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ userAId: request.userId }, { userBId: request.userId }]
      },
      include: friendshipInclude,
      orderBy: { updatedAt: "desc" }
    });

    const otherUserIds = friendships.map((friendship) =>
      friendship.userAId === request.userId ? friendship.userBId : friendship.userAId
    );
    const context = await loadSocialContext([request.userId!, ...otherUserIds]);

    const enriched = friendships.map((friendship) => {
      const otherId =
        friendship.userAId === request.userId ? friendship.userBId : friendship.userAId;
      const insight = deriveFriendInsight(context, request.userId!, otherId);

      return {
        ...friendship,
        lastSignal: insight.lastSignal,
        insight
      };
    });

    response.json({ data: enriched });
  })
);

friendsRouter.get(
  "/suggestions",
  requireAuth,
  asyncHandler(async (request, response) => {
    const me = await prisma.user.findUniqueOrThrow({
      where: { id: request.userId },
      select: {
        city: true,
        communityTag: true
      }
    });

    const existing = await prisma.friendship.findMany({
      where: {
        OR: [{ userAId: request.userId }, { userBId: request.userId }]
      },
      select: {
        userAId: true,
        userBId: true
      }
    });

    const blockedIds = new Set<string>([request.userId!]);
    existing.forEach((friendship) => {
      blockedIds.add(friendship.userAId);
      blockedIds.add(friendship.userBId);
    });

    const suggestions = await prisma.user.findMany({
      where: {
        id: { notIn: [...blockedIds] },
        sharedServerCount: { gt: 0 }
      },
      take: 10,
      orderBy: [{ sharedServerCount: "desc" }, { responsivenessScore: "desc" }],
      select: {
        id: true,
        name: true,
        city: true,
        photoUrl: true,
        phone: true,
        responsivenessScore: true,
        communityTag: true,
        sharedServerCount: true,
        discordUsername: true
      }
    });

    const sorted = suggestions
      .map((suggestion) => {
        const sameCommunity =
          Boolean(me.communityTag) && me.communityTag === suggestion.communityTag;
        const sameCity = Boolean(me.city) && me.city === suggestion.city;

        return {
          ...suggestion,
          localLabel: sameCommunity
            ? `Same ${suggestion.communityTag}`
            : sameCity
              ? `${suggestion.city} crew`
              : null,
          localRank: sameCommunity ? 2 : sameCity ? 1 : 0
        };
      })
      .sort(
        (left, right) =>
          right.localRank - left.localRank ||
          (right.sharedServerCount ?? 0) - (left.sharedServerCount ?? 0) ||
          right.responsivenessScore - left.responsivenessScore
      )
      .map(({ localRank, ...suggestion }) => suggestion);

    response.json({ data: sorted });
  })
);

friendsRouter.post(
  "/invite",
  requireAuth,
  asyncHandler(async (request, response) => {
    const body = inviteSchema.parse(request.body);

    const invitations = await prisma.$transaction(
      body.phoneNumbers.map((phoneNumber) =>
        prisma.invitation.create({
          data: {
            inviterId: request.userId!,
            inviteePhone: phoneNumber,
            channel: body.channel,
            context: {
              deeplink: `${env.MOBILE_DEEP_LINK_SCHEME}://invite`
            }
          }
        })
      )
    );

    await trackEvent("contact_invite_sent", request.userId, {
      count: invitations.length,
      channel: body.channel
    });

    response.status(201).json({
      data: invitations.map((invitation) => ({
        ...invitation,
        inviteLink: `${env.MOBILE_DEEP_LINK_SCHEME}://invite/${invitation.deepLinkToken}`,
        smsTemplate: `Anyone free tonight? Let's link on Nowly -> ${env.MOBILE_DEEP_LINK_SCHEME}://invite/${invitation.deepLinkToken}`
      }))
    });
  })
);

friendsRouter.post(
  "/request",
  requireAuth,
  asyncHandler(async (request, response) => {
    const body = requestSchema.parse(request.body);
    const [userAId, userBId] = normalizeFriendPair(request.userId!, body.userId);

    const friendship = await prisma.friendship.upsert({
      where: {
        userAId_userBId: {
          userAId,
          userBId
        }
      },
      update: {},
      create: {
        userAId,
        userBId,
        initiatedBy: request.userId!
      },
      include: friendshipInclude
    });

    response.status(201).json({ data: friendship });
  })
);

friendsRouter.post(
  "/:friendshipId/respond",
  requireAuth,
  asyncHandler(async (request, response) => {
    const friendshipId = String(request.params.friendshipId);
    const body = respondSchema.parse(request.body);
    const friendship = await prisma.friendship.findUniqueOrThrow({
      where: { id: friendshipId }
    });

    if (![friendship.userAId, friendship.userBId].includes(request.userId!)) {
      response.status(403).json({ error: "Forbidden" });
      return;
    }

    const updated = await prisma.friendship.update({
      where: { id: friendship.id },
      data: {
        status: body.action === "ACCEPT" ? "ACCEPTED" : "BLOCKED"
      },
      include: friendshipInclude
    });

    if (body.action === "ACCEPT") {
      await trackEvent("friend_joined", request.userId, {
        friendshipId: updated.id
      });
    }

    response.json({ data: updated });
  })
);
