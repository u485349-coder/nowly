import {
  FriendshipStatus,
  MessageType,
  NotificationType,
  Prisma,
} from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { normalizeFriendPair } from "../../utils/friends.js";
import { sendPushToUser } from "../notifications/push.service.js";

const createDirectChatSchema = z.object({
  userId: z.string().min(1),
});

const createGroupChatSchema = z.object({
  title: z.string().trim().min(2).max(60).nullable().optional(),
  participantIds: z.array(z.string().min(1)).min(2).max(8),
});

const sendMessageSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  type: z.nativeEnum(MessageType).optional(),
});

const participantUserSelect = {
  id: true,
  name: true,
  city: true,
  communityTag: true,
  photoUrl: true,
  phone: true,
  responsivenessScore: true,
  discordUsername: true,
  sharedServerCount: true,
} satisfies Prisma.UserSelect;

const directThreadArgs = Prisma.validator<Prisma.DirectThreadDefaultArgs>()({
  include: {
    participants: {
      include: {
        user: {
          select: participantUserSelect,
        },
      },
      orderBy: {
        joinedAt: "asc",
      },
    },
    messages: {
      orderBy: { createdAt: "desc" },
      take: 1,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
          },
        },
      },
    },
  },
});

const serializeChat = (
  thread: Prisma.DirectThreadGetPayload<typeof directThreadArgs>,
  currentUserId: string,
) => {
  const otherParticipants = thread.participants
    .filter((entry) => entry.userId !== currentUserId)
    .map((entry) => entry.user);
  const latestMessage = thread.messages[0];

  return {
    id: thread.id,
    title: thread.title,
    isGroup: thread.participants.length > 2 || Boolean(thread.title),
    memberCount: thread.participants.length,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    lastMessageAt: thread.lastMessageAt,
    participants: otherParticipants,
    latestMessage: latestMessage
      ? {
          id: latestMessage.id,
          text: latestMessage.text,
          type: latestMessage.type,
          createdAt: latestMessage.createdAt,
          sender: latestMessage.sender,
        }
      : null,
  };
};

const canAccessChat = async (chatId: string, userId: string) =>
  prisma.directThread.findFirst({
    where: {
      id: chatId,
      participants: {
        some: {
          userId,
        },
      },
    },
    select: { id: true },
  });

const getAcceptedFriendIds = async (userId: string) => {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: FriendshipStatus.ACCEPTED,
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    select: {
      userAId: true,
      userBId: true,
    },
  });

  return new Set(
    friendships.map((friendship) =>
      friendship.userAId === userId ? friendship.userBId : friendship.userAId,
    ),
  );
};

const GROUP_CHAT_IDEMPOTENCY_WINDOW_MS = 2 * 60 * 1000;
const MAX_GROUP_FRIEND_PARTICIPANTS = 8;

const buildParticipantSignature = (participantIds: string[]) =>
  [...participantIds].sort().join(":");

export const chatsRouter = Router();

chatsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (request, response) => {
    const threads = await prisma.directThread.findMany({
      where: {
        participants: {
          some: {
            userId: request.userId,
          },
        },
      },
      ...directThreadArgs,
      orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    });

    response.json({
      data: threads.map((thread) => serializeChat(thread, request.userId!)),
    });
  }),
);

chatsRouter.post(
  "/direct",
  requireAuth,
  asyncHandler(async (request, response) => {
    const body = createDirectChatSchema.parse(request.body);

    if (body.userId === request.userId) {
      response.status(400).json({ error: "You already have yourself." });
      return;
    }

    const acceptedFriendIds = await getAcceptedFriendIds(request.userId!);

    if (!acceptedFriendIds.has(body.userId)) {
      response.status(403).json({ error: "Accept this friend before opening a private chat." });
      return;
    }

    const [userAId, userBId] = normalizeFriendPair(request.userId!, body.userId);
    const participantKey = `${userAId}:${userBId}`;
    const thread = await prisma.directThread.upsert({
      where: { participantKey },
      update: {},
      create: {
        participantKey,
        creator: {
          connect: { id: request.userId! },
        },
        participants: {
          create: [{ userId: userAId }, { userId: userBId }],
        },
      },
      ...directThreadArgs,
    });

    response.status(201).json({
      data: serializeChat(thread, request.userId!),
    });
  }),
);

chatsRouter.post(
  "/group",
  requireAuth,
  asyncHandler(async (request, response) => {
    const body = createGroupChatSchema.parse(request.body);
    const uniqueParticipantIds = [...new Set(body.participantIds.filter((id) => id !== request.userId))];
    const normalizedTitle = body.title?.trim() || null;
    const participantIdsWithRequester = [request.userId!, ...uniqueParticipantIds];
    const participantSignature = buildParticipantSignature(participantIdsWithRequester);

    if (uniqueParticipantIds.length < 2) {
      response.status(400).json({
        error: "Pick at least 2 accepted friends to start a group chat.",
      });
      return;
    }

    if (uniqueParticipantIds.length > MAX_GROUP_FRIEND_PARTICIPANTS) {
      response.status(400).json({
        error: `Group chats can include up to ${MAX_GROUP_FRIEND_PARTICIPANTS} friends.`,
      });
      return;
    }

    const acceptedFriendIds = await getAcceptedFriendIds(request.userId!);

    if (uniqueParticipantIds.some((userId) => !acceptedFriendIds.has(userId))) {
      response.status(403).json({ error: "Only accepted friends can be added to a private group chat." });
      return;
    }

    const idempotencyKey = request.header("x-idempotency-key")?.trim();
    if (idempotencyKey) {
      const recentThreads = await prisma.directThread.findMany({
        where: {
          creatorId: request.userId!,
          title: normalizedTitle,
          createdAt: {
            gte: new Date(Date.now() - GROUP_CHAT_IDEMPOTENCY_WINDOW_MS),
          },
        },
        ...directThreadArgs,
        orderBy: { createdAt: "desc" },
        take: 8,
      });

      const existingThread = recentThreads.find((thread) => {
        const threadSignature = buildParticipantSignature(
          thread.participants.map((participant) => participant.userId),
        );
        return threadSignature === participantSignature;
      });

      if (existingThread) {
        response.status(200).json({
          data: serializeChat(existingThread, request.userId!),
        });
        return;
      }
    }

    const thread = await prisma.directThread.create({
      data: {
        title: normalizedTitle,
        creator: {
          connect: { id: request.userId! },
        },
        participants: {
          create: participantIdsWithRequester.map((userId) => ({ userId })),
        },
      },
      ...directThreadArgs,
    });

    response.status(201).json({
      data: serializeChat(thread, request.userId!),
    });
  }),
);

chatsRouter.get(
  "/:chatId",
  requireAuth,
  asyncHandler(async (request, response) => {
    const chatId = String(request.params.chatId);
    const authorized = await canAccessChat(chatId, request.userId!);

    if (!authorized) {
      response.status(403).json({ error: "Forbidden" });
      return;
    }

    const thread = await prisma.directThread.findUniqueOrThrow({
      where: { id: chatId },
      ...directThreadArgs,
    });

    response.json({ data: serializeChat(thread, request.userId!) });
  }),
);

chatsRouter.get(
  "/:chatId/messages",
  requireAuth,
  asyncHandler(async (request, response) => {
    const chatId = String(request.params.chatId);
    const authorized = await canAccessChat(chatId, request.userId!);

    if (!authorized) {
      response.status(403).json({ error: "Forbidden" });
      return;
    }

    const messages = await prisma.directMessage.findMany({
      where: { threadId: chatId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    response.json({ data: messages });
  }),
);

chatsRouter.post(
  "/:chatId/messages",
  requireAuth,
  asyncHandler(async (request, response) => {
    const chatId = String(request.params.chatId);
    const body = sendMessageSchema.parse(request.body);
    const authorized = await canAccessChat(chatId, request.userId!);

    if (!authorized) {
      response.status(403).json({ error: "Forbidden" });
      return;
    }

    const message = await prisma.directMessage.create({
      data: {
        threadId: chatId,
        senderId: request.userId!,
        text: body.text,
        type: body.type ?? MessageType.TEXT,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
          },
        },
      },
    });

    await prisma.directThread.update({
      where: { id: chatId },
      data: { lastMessageAt: new Date() },
    });

    const recipients = await prisma.directThreadParticipant.findMany({
      where: {
        threadId: chatId,
        userId: { not: request.userId! },
      },
      select: { userId: true },
    });

    await Promise.all(
      recipients.map((recipient) =>
        sendPushToUser({
          userId: recipient.userId,
          type: NotificationType.GROUP_UPDATE,
          dedupeKey: `chat:${chatId}:message:${message.id}`,
          title: message.sender.name ?? "New message",
          body: body.text,
          data: {
            screen: "chat",
            chatId,
          },
        }),
      ),
    );

    response.status(201).json({ data: message });
  }),
);
