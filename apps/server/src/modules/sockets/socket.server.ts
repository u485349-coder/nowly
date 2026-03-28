import {
  MessageType,
  NotificationType,
  ParticipantResponse
} from "@prisma/client";
import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { prisma } from "../../db/prisma.js";
import { verifyAccessToken } from "../../lib/jwt.js";
import { logger } from "../../lib/logger.js";
import { postGroupSchedulingMessage } from "../availability/group-scheduling.service.js";
import { sendPushToUser } from "../notifications/push.service.js";

type ThreadMessagePayload = {
  threadId: string;
  text: string;
};

type DirectChatMessagePayload = {
  chatId: string;
  text: string;
};

type EtaPayload = {
  hangoutId: string;
  etaMinutes: number;
};

type LocationPayload = {
  hangoutId: string;
  lat: number;
  lng: number;
};

type ReactionPayload = {
  threadId: string;
  emoji: string;
};

type PollPayload = {
  threadId: string;
  question: string;
  options: string[];
};

type SchedulingJoinPayload = {
  shareCode: string;
};

type SchedulingMessagePayload = {
  shareCode: string;
  text: string;
};

let realtimeServer: Server | null = null;

const getSchedulingRoom = (shareCode: string) => `schedule:${shareCode}`;
const getUserRoom = (userId: string) => `user:${userId}`;
const toChatType = (type: string): "direct" | "group" => (type === "group" ? "group" : "direct");

export const broadcastDirectChatMessage = (chatId: string, message: unknown) => {
  realtimeServer?.to(chatId).emit("chat:message", message);
};

export const broadcastDirectChatMessageUpdated = (chatId: string, message: unknown) => {
  realtimeServer?.to(chatId).emit("chat:message-updated", message);
};

export const broadcastDirectChatMessageDeleted = (
  chatId: string,
  payload: { chatId: string; messageId: string },
) => {
  realtimeServer?.to(chatId).emit("chat:message-deleted", payload);
};

export const broadcastDirectChatInboxRefresh = (
  userIds: string[],
  payload?: {
    actorId?: string;
    chatId?: string;
    chatType?: "direct" | "group";
    title?: string;
    body?: string;
    screen?: "chat";
  },
) => {
  userIds.forEach((userId) => {
    realtimeServer?.to(getUserRoom(userId)).emit("chat:inbox-update", {
      userId,
      at: new Date().toISOString(),
      ...payload,
    });
  });
};

export const broadcastCrewActivity = (
  userIds: string[],
  payload: {
    actorId?: string;
    screen: "chat" | "thread" | "proposal" | "friends";
    title?: string;
    body?: string;
    chatId?: string;
    threadId?: string;
    hangoutId?: string;
  },
) => {
  userIds.forEach((userId) => {
    realtimeServer?.to(getUserRoom(userId)).emit("crew:activity", {
      userId,
      at: new Date().toISOString(),
      ...payload,
    });
  });
};

export const broadcastSchedulingSessionUpdate = (shareCode: string, session: unknown) => {
  realtimeServer?.to(getSchedulingRoom(shareCode)).emit("schedule:update", session);
};

export const broadcastThreadMessageUpdated = (threadId: string, message: unknown) => {
  realtimeServer?.to(threadId).emit("thread:message-updated", message);
};

export const broadcastThreadMessageDeleted = (
  threadId: string,
  payload: { threadId: string; messageId: string },
) => {
  realtimeServer?.to(threadId).emit("thread:message-deleted", payload);
};

const getParticipantIds = async (hangoutId: string) => {
  const participants = await prisma.hangoutParticipant.findMany({
    where: { hangoutId },
    select: { userId: true }
  });
  return participants.map((participant) => participant.userId);
};

const getThreadForHangout = async (hangoutId: string) =>
  prisma.hangoutThread.findUnique({
    where: { hangoutId },
    select: { id: true }
  });

const canAccessThread = async (threadId: string, userId: string) =>
  prisma.hangoutThread.findFirst({
    where: {
      id: threadId,
      hangout: {
        participants: {
          some: {
            userId
          }
        }
      }
    },
    select: { id: true }
  });

const canAccessDirectChat = async (chatId: string, userId: string) =>
  prisma.directThread.findFirst({
    where: {
      id: chatId,
      participants: {
        some: {
          userId,
        },
      },
    },
    select: { id: true, type: true },
  });

export const createSocketServer = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: "*"
    }
  });
  realtimeServer = io;

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      next(new Error("Unauthorized"));
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.data.userId}`);
    socket.join(getUserRoom(socket.data.userId));

    socket.on("thread:join", async ({ threadId }: { threadId: string }) => {
      const thread = await canAccessThread(threadId, socket.data.userId);

      if (!thread) {
        return;
      }

      socket.join(threadId);
    });

    socket.on("chat:join", async ({ chatId }: { chatId: string }) => {
      const chat = await canAccessDirectChat(chatId, socket.data.userId);

      if (!chat) {
        return;
      }

      socket.join(chatId);
    });

    socket.on(
      "chat:typing",
      async (payload: { chatId: string; isTyping: boolean; userName?: string }) => {
        const chat = await canAccessDirectChat(payload.chatId, socket.data.userId);

        if (!chat) {
          return;
        }

        socket.to(payload.chatId).emit("chat:typing", {
          chatId: payload.chatId,
          userId: socket.data.userId,
          userName: payload.userName,
          isTyping: payload.isTyping,
        });
      },
    );

    socket.on("schedule:join", async ({ shareCode }: SchedulingJoinPayload) => {
      const session = await prisma.schedulingSession.findUnique({
        where: { shareCode },
        select: { id: true },
      });

      if (!session) {
        return;
      }

      socket.join(getSchedulingRoom(shareCode));
    });

    socket.on("schedule:message", async (payload: SchedulingMessagePayload) => {
      const message = await postGroupSchedulingMessage(
        payload.shareCode,
        socket.data.userId,
        payload.text,
      );

      io.to(getSchedulingRoom(payload.shareCode)).emit("schedule:message", message);
    });

    socket.on("thread:message", async (payload: ThreadMessagePayload) => {
      const threadAccess = await canAccessThread(payload.threadId, socket.data.userId);
      if (!threadAccess) {
        return;
      }

      const message = await prisma.message.create({
        data: {
          threadId: payload.threadId,
          senderId: socket.data.userId,
          text: payload.text
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              photoUrl: true
            }
          }
        }
      });

      await prisma.hangoutThread.update({
        where: { id: payload.threadId },
        data: { lastMessageAt: new Date() }
      });

      io.to(payload.threadId).emit("thread:message", message);
      const thread = await prisma.hangoutThread.findUnique({
        where: { id: payload.threadId },
        include: { hangout: true }
      });

      if (thread) {
        const participantIds = await getParticipantIds(thread.hangoutId);
        const recipientIds = participantIds.filter((userId) => userId !== socket.data.userId);

        broadcastCrewActivity(recipientIds, {
          actorId: socket.data.userId,
          screen: "thread",
          threadId: payload.threadId,
          hangoutId: thread.hangoutId,
          title: message.sender.name
            ? `${message.sender.name} replied`
            : "Crew thread update",
          body: payload.text,
        });

        await Promise.all(
          recipientIds.map((userId) =>
              sendPushToUser({
                userId,
                type: NotificationType.GROUP_UPDATE,
                dedupeKey: `thread:${payload.threadId}:message:${message.id}`,
                title: message.sender.name
                  ? `${message.sender.name} replied`
                  : "Crew thread update",
                body: payload.text,
                data: {
                  screen: "thread",
                  threadId: payload.threadId,
                  hangoutId: thread.hangoutId,
                }
              })
            )
        );
      }
    });

    socket.on(
      "thread:typing",
      async (payload: { threadId: string; isTyping: boolean; userName?: string }) => {
        const thread = await canAccessThread(payload.threadId, socket.data.userId);
        if (!thread) {
          return;
        }

        socket.to(payload.threadId).emit("thread:typing", {
          threadId: payload.threadId,
          userId: socket.data.userId,
          userName: payload.userName,
          isTyping: payload.isTyping,
        });
      },
    );

    socket.on("chat:message", async (payload: DirectChatMessagePayload) => {
      const chatAccess = await canAccessDirectChat(payload.chatId, socket.data.userId);
      if (!chatAccess) {
        return;
      }

      const message = await prisma.directMessage.create({
        data: {
          threadId: payload.chatId,
          senderId: socket.data.userId,
          text: payload.text,
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

      const now = new Date();
      await prisma.$transaction([
        prisma.directThread.update({
          where: { id: payload.chatId },
          data: { lastMessageAt: now },
        }),
        prisma.directThreadParticipant.update({
          where: {
            threadId_userId: {
              threadId: payload.chatId,
              userId: socket.data.userId,
            },
          },
          data: {
            lastReadAt: now,
          },
        }),
      ]);

      broadcastDirectChatMessage(payload.chatId, message);

      const recipients = await prisma.directThreadParticipant.findMany({
        where: {
          threadId: payload.chatId,
          userId: { not: socket.data.userId },
        },
        select: { userId: true },
      });

      broadcastDirectChatInboxRefresh(
        [socket.data.userId, ...recipients.map((recipient) => recipient.userId)],
        {
          actorId: socket.data.userId,
          chatId: payload.chatId,
          chatType: toChatType(chatAccess.type),
          title: message.sender.name ?? "New message",
          body: payload.text,
          screen: "chat",
        },
      );

      await Promise.all(
        recipients.map((recipient) =>
          sendPushToUser({
            userId: recipient.userId,
            type: NotificationType.GROUP_UPDATE,
            dedupeKey: `chat:${payload.chatId}:message:${message.id}`,
            title: message.sender.name ?? "New message",
            body: payload.text,
            data: {
              screen: "chat",
              chatId: payload.chatId,
              chatType: toChatType(chatAccess.type),
            },
          }),
        ),
      );
    });

    socket.on("thread:reaction", async (payload: ReactionPayload) => {
      const threadAccess = await canAccessThread(payload.threadId, socket.data.userId);
      if (!threadAccess) {
        return;
      }

      const message = await prisma.message.create({
        data: {
          threadId: payload.threadId,
          senderId: socket.data.userId,
          text: payload.emoji,
          type: MessageType.REACTION
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              photoUrl: true
            }
          }
        }
      });

      io.to(payload.threadId).emit("thread:reaction", message);
    });

    socket.on("thread:poll", async (payload: PollPayload) => {
      const threadAccess = await canAccessThread(payload.threadId, socket.data.userId);
      if (!threadAccess) {
        return;
      }

      const message = await prisma.message.create({
        data: {
          threadId: payload.threadId,
          senderId: socket.data.userId,
          text: payload.question,
          type: MessageType.POLL,
          metadata: {
            options: payload.options
          }
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              photoUrl: true
            }
          }
        }
      });

      io.to(payload.threadId).emit("thread:poll", message);
    });

    socket.on("thread:eta", async (payload: EtaPayload) => {
      const participant = await prisma.hangoutParticipant.findUnique({
        where: {
          hangoutId_userId: {
            hangoutId: payload.hangoutId,
            userId: socket.data.userId
          }
        },
        select: { userId: true }
      });

      if (!participant) {
        return;
      }

      await prisma.hangoutParticipant.update({
        where: {
          hangoutId_userId: {
            hangoutId: payload.hangoutId,
            userId: socket.data.userId
          }
        },
        data: {
          etaMinutes: payload.etaMinutes,
          responseStatus: ParticipantResponse.ACCEPTED
        }
      });

      const thread = await getThreadForHangout(payload.hangoutId);
      if (thread) {
        io.to(thread.id).emit("thread:eta", payload);
      }
      const participantIds = await getParticipantIds(payload.hangoutId);
      await Promise.all(
        participantIds
          .filter((userId) => userId !== socket.data.userId)
          .map((userId) =>
            sendPushToUser({
              userId,
              type: NotificationType.ETA_UPDATE,
              dedupeKey: `hangout:${payload.hangoutId}:eta:${socket.data.userId}`,
              title: "ETA update",
              body: `Someone is ${payload.etaMinutes} min away.`,
              data: {
                screen: "thread",
                threadId: thread?.id
              }
            })
          )
      );
    });

    socket.on("thread:location", async (payload: LocationPayload) => {
      const participant = await prisma.hangoutParticipant.findUnique({
        where: {
          hangoutId_userId: {
            hangoutId: payload.hangoutId,
            userId: socket.data.userId
          }
        },
        select: { userId: true }
      });

      if (!participant) {
        return;
      }

      await prisma.hangoutParticipant.update({
        where: {
          hangoutId_userId: {
            hangoutId: payload.hangoutId,
            userId: socket.data.userId
          }
        },
        data: {
          lastSharedLat: payload.lat,
          lastSharedLng: payload.lng
        }
      });

      const thread = await getThreadForHangout(payload.hangoutId);
      if (thread) {
        io.to(thread.id).emit("thread:location", payload);
      }
    });
  });

  return io;
};
