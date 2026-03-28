import { Router } from "express";
import { NotificationIntensity } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { normalizeFriendPair } from "../../utils/friends.js";
import { trackEvent } from "../analytics/analytics.service.js";

const onboardingSchema = z.object({
  name: z.string().min(2),
  city: z.string().min(2),
  communityTag: z.string().min(2).max(40).optional().nullable(),
  photoUrl: z
    .string()
    .max(5_000_000)
    .refine(
      (value) =>
        /^https?:\/\//i.test(value) ||
        /^data:image\/(?:png|jpe?g|webp|heic|heif);base64,/i.test(value),
      "Photo must be a remote URL or image data URI",
    )
    .optional()
    .nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  referralToken: z.string().optional()
});

const preferencesSchema = z.object({
  notificationIntensity: z.nativeEnum(NotificationIntensity).optional(),
  pushNotificationsEnabled: z.boolean().optional(),
  inAppNotificationsEnabled: z.boolean().optional(),
  notificationSoundEnabled: z.boolean().optional(),
  messagePreviewEnabled: z.boolean().optional(),
  dmNotificationsEnabled: z.boolean().optional(),
  pingNotificationsEnabled: z.boolean().optional(),
});

const profileSchema = z.object({
  photoUrl: z
    .string()
    .max(5_000_000)
    .refine(
      (value) =>
        /^https?:\/\//i.test(value) ||
        /^data:image\/(?:png|jpe?g|webp|heic|heif);base64,/i.test(value),
      "Photo must be a remote URL or image data URI",
    )
    .nullable()
    .optional(),
});

const notificationReadSchema = z.object({
  entityId: z.string().min(1),
});

const buildNotificationSnapshot = async (userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      lastCrewSeenAt: true,
      lastFriendRequestsSeenAt: true,
    },
  });

  const [directThreads, incomingFriendRequests, hangoutParticipants] = await Promise.all([
    prisma.directThread.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
      select: {
        id: true,
        type: true,
        lastMessageAt: true,
        participants: {
          where: { userId },
          select: {
            lastReadAt: true,
          },
        },
        messages: {
          where: {
            senderId: { not: userId },
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.friendship.findMany({
      where: {
        status: "PENDING",
        initiatedBy: { not: userId },
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
      },
    }),
    prisma.hangoutParticipant.findMany({
      where: {
        userId,
        hangout: {
          status: {
            in: ["PROPOSED", "CONFIRMED"],
          },
        },
      },
      select: {
        hangoutId: true,
        lastProposalReadAt: true,
        lastThreadReadAt: true,
        hangout: {
          select: {
            id: true,
            creatorId: true,
            createdAt: true,
            updatedAt: true,
            thread: {
              select: {
                id: true,
                messages: {
                  where: {
                    senderId: { not: userId },
                    type: { not: "SYSTEM" },
                  },
                  orderBy: { createdAt: "desc" },
                  select: {
                    id: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const unreadByEntity: Record<string, number> = {};
  const notifications: Array<{
    id: string;
    type: "dm" | "group_dm" | "friend_request" | "hangout_invite" | "thread";
    entityId: string;
    createdAt: number;
    read: boolean;
  }> = [];

  directThreads.forEach((thread) => {
    const lastReadAt = thread.participants[0]?.lastReadAt ?? null;
    const unreadMessages = thread.messages.filter((message) =>
      lastReadAt ? message.createdAt > lastReadAt : true,
    );

    if (!unreadMessages.length) {
      return;
    }

    const entityId = `chat:${thread.id}`;
    unreadByEntity[entityId] = unreadMessages.length;
    notifications.push({
      id: `notif-${entityId}-${unreadMessages[0]!.id}`,
      type: thread.type === "group" ? "group_dm" : "dm",
      entityId,
      createdAt: unreadMessages[0]!.createdAt.getTime(),
      read: false,
    });
  });

  const unseenFriendRequests = incomingFriendRequests.filter((friendship) =>
    user.lastFriendRequestsSeenAt ? friendship.createdAt > user.lastFriendRequestsSeenAt : true,
  );

  if (unseenFriendRequests.length) {
    unreadByEntity.friend_requests = unseenFriendRequests.length;
    notifications.push({
      id: `notif-friend-requests-${unseenFriendRequests[0]!.id}`,
      type: "friend_request",
      entityId: "friend_requests",
      createdAt: unseenFriendRequests[0]!.createdAt.getTime(),
      read: false,
    });
  }

  hangoutParticipants.forEach((participant) => {
    if (participant.hangout.creatorId !== userId) {
      const proposalIsUnread = participant.lastProposalReadAt
        ? participant.hangout.updatedAt > participant.lastProposalReadAt
        : true;

      if (proposalIsUnread) {
        const entityId = `hangout:${participant.hangoutId}`;
        unreadByEntity[entityId] = 1;
        notifications.push({
          id: `notif-${entityId}`,
          type: "hangout_invite",
          entityId,
          createdAt: participant.hangout.updatedAt.getTime(),
          read: false,
        });
      }
    }

    const thread = participant.hangout.thread;
    const threadId = thread?.id;
    if (!thread || !threadId) {
      return;
    }

    const unreadThreadMessages = thread.messages.filter((message) =>
      participant.lastThreadReadAt ? message.createdAt > participant.lastThreadReadAt : true,
    );

    if (!unreadThreadMessages.length) {
      return;
    }

    const entityId = `thread:${threadId}`;
    unreadByEntity[entityId] = unreadThreadMessages.length;
    notifications.push({
      id: `notif-${entityId}-${unreadThreadMessages[0]!.id}`,
      type: "thread",
      entityId,
      createdAt: unreadThreadMessages[0]!.createdAt.getTime(),
      read: false,
    });
  });

  notifications.sort((left, right) => right.createdAt - left.createdAt);

  return {
    notifications,
    unreadByEntity,
    globalUnreadCount: Object.values(unreadByEntity).reduce((sum, count) => sum + count, 0),
  };
};

export const usersRouter = Router();

usersRouter.put(
  "/me/onboarding",
  requireAuth,
  asyncHandler(async (request, response) => {
    const body = onboardingSchema.parse(request.body);

    const user = await prisma.user.update({
      where: { id: request.userId },
      data: {
        name: body.name,
        city: body.city,
        communityTag: body.communityTag,
        photoUrl: body.photoUrl,
        lat: body.lat,
        lng: body.lng,
        onboardingCompleted: true,
        inactiveSince: null
      }
    });

    if (body.referralToken) {
      const invite = await prisma.invitation.findUnique({
        where: { deepLinkToken: body.referralToken }
      });

      if (invite && !invite.joinedUserId) {
        await prisma.invitation.update({
          where: { id: invite.id },
          data: {
            joinedUserId: user.id,
            redeemedAt: new Date()
          }
        });

        const [userAId, userBId] = normalizeFriendPair(invite.inviterId, user.id);
        await prisma.friendship.upsert({
          where: {
            userAId_userBId: {
              userAId,
              userBId
            }
          },
          update: {
            status: "ACCEPTED"
          },
          create: {
            userAId,
            userBId,
            status: "ACCEPTED",
            initiatedBy: invite.inviterId
          }
        });
      }
    }

    await trackEvent("onboarding_completed", user.id, {
      city: body.city,
      communityTag: body.communityTag
    });

    response.json({ data: user });
  })
);

usersRouter.patch(
  "/me/preferences",
  requireAuth,
  asyncHandler(async (request, response) => {
    const body = preferencesSchema.parse(request.body);

    const user = await prisma.user.update({
      where: { id: request.userId },
      data: {
        ...(body.notificationIntensity ? { notificationIntensity: body.notificationIntensity } : {}),
        ...(typeof body.pushNotificationsEnabled === "boolean"
          ? { pushNotificationsEnabled: body.pushNotificationsEnabled }
          : {}),
        ...(typeof body.inAppNotificationsEnabled === "boolean"
          ? { inAppNotificationsEnabled: body.inAppNotificationsEnabled }
          : {}),
        ...(typeof body.notificationSoundEnabled === "boolean"
          ? { notificationSoundEnabled: body.notificationSoundEnabled }
          : {}),
        ...(typeof body.messagePreviewEnabled === "boolean"
          ? { messagePreviewEnabled: body.messagePreviewEnabled }
          : {}),
        ...(typeof body.dmNotificationsEnabled === "boolean"
          ? { dmNotificationsEnabled: body.dmNotificationsEnabled }
          : {}),
        ...(typeof body.pingNotificationsEnabled === "boolean"
          ? { pingNotificationsEnabled: body.pingNotificationsEnabled }
          : {}),
      },
    });

    response.json({ data: user });
  })
);

usersRouter.get(
  "/me/notification-state",
  requireAuth,
  asyncHandler(async (request, response) => {
    const snapshot = await buildNotificationSnapshot(request.userId!);
    response.json({ data: snapshot });
  }),
);

usersRouter.post(
  "/me/notifications/read",
  requireAuth,
  asyncHandler(async (request, response) => {
    const body = notificationReadSchema.parse(request.body);
    const now = new Date();

    if (body.entityId === "friend_requests") {
      await prisma.user.update({
        where: { id: request.userId },
        data: { lastFriendRequestsSeenAt: now },
      });
      response.json({ data: { ok: true } });
      return;
    }

    if (body.entityId.startsWith("chat:")) {
      const chatId = body.entityId.replace(/^chat:/, "");
      await prisma.directThreadParticipant.update({
        where: {
          threadId_userId: {
            threadId: chatId,
            userId: request.userId!,
          },
        },
        data: { lastReadAt: now },
      });
      response.json({ data: { ok: true } });
      return;
    }

    if (body.entityId.startsWith("hangout:")) {
      const hangoutId = body.entityId.replace(/^hangout:/, "");
      await prisma.hangoutParticipant.update({
        where: {
          hangoutId_userId: {
            hangoutId,
            userId: request.userId!,
          },
        },
        data: { lastProposalReadAt: now },
      });
      response.json({ data: { ok: true } });
      return;
    }

    if (body.entityId.startsWith("thread:")) {
      const threadId = body.entityId.replace(/^thread:/, "");
      const hangoutThread = await prisma.hangoutThread.findFirstOrThrow({
        where: {
          id: threadId,
          hangout: {
            participants: {
              some: {
                userId: request.userId!,
              },
            },
          },
        },
        select: { hangoutId: true },
      });

      await prisma.hangoutParticipant.update({
        where: {
          hangoutId_userId: {
            hangoutId: hangoutThread.hangoutId,
            userId: request.userId!,
          },
        },
        data: { lastThreadReadAt: now },
      });
      response.json({ data: { ok: true } });
      return;
    }

    response.status(400).json({ error: "Unknown notification entity." });
  }),
);

usersRouter.get(
  "/me/activity-counts",
  requireAuth,
  asyncHandler(async (request, response) => {
    const snapshot = await buildNotificationSnapshot(request.userId!);
    const chatActivityCount = Object.entries(snapshot.unreadByEntity)
      .filter(([entityId]) => entityId.startsWith("chat:"))
      .reduce((sum, [, count]) => sum + count, 0);
    const notificationActivityCount = Object.entries(snapshot.unreadByEntity)
      .filter(([entityId]) => !entityId.startsWith("chat:"))
      .reduce((sum, [, count]) => sum + count, 0);

    response.json({
      data: {
        crewUnreadCount: snapshot.globalUnreadCount,
        chatActivityCount,
        pingActivityCount: notificationActivityCount,
      },
    });
  }),
);

usersRouter.post(
  "/me/activity/read",
  requireAuth,
  asyncHandler(async (request, response) => {
    await prisma.user.update({
      where: { id: request.userId },
      data: {
        lastCrewSeenAt: new Date(),
        lastFriendRequestsSeenAt: new Date(),
      },
    });

    response.json({ data: { ok: true } });
  }),
);

usersRouter.patch(
  "/me/profile",
  requireAuth,
  asyncHandler(async (request, response) => {
    const body = profileSchema.parse(request.body);

    const user = await prisma.user.update({
      where: { id: request.userId },
      data: {
        photoUrl: body.photoUrl,
      }
    });

    response.json({ data: user });
  })
);

usersRouter.patch(
  "/me/location",
  requireAuth,
  asyncHandler(async (request, response) => {
    const body = z
      .object({
        lat: z.number(),
        lng: z.number(),
        city: z.string().optional()
      })
      .parse(request.body);

    const user = await prisma.user.update({
      where: { id: request.userId },
      data: {
        lat: body.lat,
        lng: body.lng,
        city: body.city
      }
    });

    response.json({ data: user });
  })
);
