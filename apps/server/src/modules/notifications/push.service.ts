import { Expo, ExpoPushMessage } from "expo-server-sdk";
import {
  NotificationIntensity,
  NotificationPriority,
  NotificationType,
  Prisma,
} from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { logger } from "../../lib/logger.js";

const expo = new Expo();

const shouldDeliver = (
  intensity: NotificationIntensity,
  type: NotificationType,
  priority: NotificationPriority,
) => {
  if (intensity === NotificationIntensity.LIVE) {
    return true;
  }

  if (intensity === NotificationIntensity.QUIET) {
    return ([
      NotificationType.PROPOSAL_RECEIVED,
      NotificationType.PROPOSAL_ACCEPTED,
      NotificationType.ETA_UPDATE,
      NotificationType.RECAP_READY,
    ] as NotificationType[]).includes(type);
  }

  if (priority === NotificationPriority.LOW) {
    return !([
      NotificationType.INVITE_NUDGE,
      NotificationType.WEEKLY_SUMMARY,
    ] as NotificationType[]).includes(type);
  }

  return true;
};

export const wasRecentlySent = async (
  userId: string,
  type: NotificationType,
  dedupeKey: string,
  cooldownMinutes: number
) => {
  const sentAfter = new Date(Date.now() - cooldownMinutes * 60 * 1000);
  const log = await prisma.notificationLog.findFirst({
    where: {
      userId,
      type,
      dedupeKey,
      sentAt: { gte: sentAfter }
    }
  });

  return Boolean(log);
};

export const sendPushToUser = async ({
  userId,
  title,
  body,
  data,
  type,
  priority = NotificationPriority.HIGH,
  dedupeKey
}: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  type: NotificationType;
  priority?: NotificationPriority;
  dedupeKey: string;
}) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      notificationIntensity: true
    }
  });
  const intensity = user?.notificationIntensity ?? NotificationIntensity.BALANCED;

  if (!shouldDeliver(intensity, type, priority)) {
    return { delivered: false, suppressedByPreference: true };
  }

  const tokens = await prisma.deviceToken.findMany({
    where: {
      userId,
      active: true
    }
  });

  const messages: ExpoPushMessage[] = tokens
    .filter((item) => Expo.isExpoPushToken(item.token))
    .map((token) => ({
      to: token.token,
      sound: priority === NotificationPriority.HIGH ? "default" : undefined,
      title,
      body,
      data,
      priority: priority === NotificationPriority.HIGH ? "high" : "normal"
    }));

  if (messages.length) {
    try {
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk);
      }
    } catch (error) {
      logger.error("Failed to send Expo push", error);
    }
  }

  await prisma.notificationLog.upsert({
    where: {
      userId_type_dedupeKey: {
        userId,
        type,
        dedupeKey
      }
    },
    update: {
      sentAt: new Date(),
      payload: data as Prisma.InputJsonValue | undefined,
      priority
    },
    create: {
      userId,
      type,
      priority,
      dedupeKey,
      payload: data as Prisma.InputJsonValue | undefined
    }
  });

  return { delivered: true };
};
