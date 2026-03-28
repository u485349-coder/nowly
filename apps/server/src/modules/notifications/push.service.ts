import {
  Expo,
  ExpoPushMessage,
  ExpoPushReceipt,
  ExpoPushTicket,
} from "expo-server-sdk";
import {
  NotificationIntensity,
  NotificationPriority,
  NotificationType,
  Prisma,
  PushReceiptStatus,
} from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { logger } from "../../lib/logger.js";

const expo = new Expo(
  env.EXPO_ACCESS_TOKEN
    ? {
        accessToken: env.EXPO_ACCESS_TOKEN,
      }
    : undefined,
);

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
      NotificationType.REMINDER,
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

const resolveNotificationCategory = (data?: Record<string, unknown>) => {
  const screen = typeof data?.screen === "string" ? data.screen : null;

  if (screen === "chat") {
    return "dm";
  }

  if (screen === "proposal" || screen === "thread" || screen === "friends") {
    return "ping";
  }

  return "system";
};

const deactivateDeviceTokens = async (deviceTokenIds: string[]) => {
  if (!deviceTokenIds.length) {
    return;
  }

  await prisma.deviceToken.updateMany({
    where: {
      id: {
        in: [...new Set(deviceTokenIds)],
      },
    },
    data: {
      active: false,
    },
  });
};

const handleTicketError = async (
  deviceTokenId: string,
  ticket: Extract<ExpoPushTicket, { status: "error" }>,
) => {
  if (ticket.details?.error === "DeviceNotRegistered") {
    await deactivateDeviceTokens([deviceTokenId]);
  }
};

export const wasRecentlySent = async (
  userId: string,
  type: NotificationType,
  dedupeKey: string,
  cooldownMinutes: number,
) => {
  const sentAfter = new Date(Date.now() - cooldownMinutes * 60 * 1000);
  const log = await prisma.notificationLog.findFirst({
    where: {
      userId,
      type,
      dedupeKey,
      sentAt: { gte: sentAfter },
    },
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
  dedupeKey,
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
      notificationIntensity: true,
      pushNotificationsEnabled: true,
      notificationSoundEnabled: true,
      messagePreviewEnabled: true,
      dmNotificationsEnabled: true,
      pingNotificationsEnabled: true,
    },
  });
  const intensity = user?.notificationIntensity ?? NotificationIntensity.BALANCED;
  const pushNotificationsEnabled = user?.pushNotificationsEnabled ?? true;
  const notificationSoundEnabled = user?.notificationSoundEnabled ?? true;
  const messagePreviewEnabled = user?.messagePreviewEnabled ?? true;
  const dmNotificationsEnabled = user?.dmNotificationsEnabled ?? true;
  const pingNotificationsEnabled = user?.pingNotificationsEnabled ?? true;
  const category = resolveNotificationCategory(data);
  const resolvedTitle = messagePreviewEnabled
    ? title
    : category === "dm"
      ? "New message"
      : "Nowly update";
  const resolvedBody = messagePreviewEnabled
    ? body
    : category === "dm"
      ? "Open Nowly to read it."
      : "Open Nowly to check it.";

  if (!pushNotificationsEnabled) {
    return { delivered: false, suppressedByPreference: true };
  }

  if (category === "dm" && !dmNotificationsEnabled) {
    return { delivered: false, suppressedByPreference: true };
  }

  if (category === "ping" && !pingNotificationsEnabled) {
    return { delivered: false, suppressedByPreference: true };
  }

  if (!shouldDeliver(intensity, type, priority)) {
    return { delivered: false, suppressedByPreference: true };
  }

  const tokens = await prisma.deviceToken.findMany({
    where: {
      userId,
      active: true,
    },
    select: {
      id: true,
      token: true,
    },
  });

  const invalidTokenIds = tokens
    .filter((item) => !Expo.isExpoPushToken(item.token))
    .map((item) => item.id);

  await deactivateDeviceTokens(invalidTokenIds);

  const messageEntries = tokens
    .filter((item) => Expo.isExpoPushToken(item.token))
    .map((token) => ({
      deviceTokenId: token.id,
        token: token.token,
        message: {
          to: token.token,
          sound:
            notificationSoundEnabled && priority === NotificationPriority.HIGH
              ? "default"
              : undefined,
          title: resolvedTitle,
          body: resolvedBody,
          data,
          priority: priority === NotificationPriority.HIGH ? "high" : "normal",
        } satisfies ExpoPushMessage,
    }));

  if (!messageEntries.length) {
    return { delivered: false, noActiveTokens: true };
  }

  const pendingReceipts: Array<{
    receiptId: string;
    deviceTokenId: string;
  }> = [];
  let attemptedDelivery = false;
  let offset = 0;
  const chunks = expo.chunkPushNotifications(messageEntries.map((entry) => entry.message));

  for (const chunk of chunks) {
    const chunkEntries = messageEntries.slice(offset, offset + chunk.length);
    offset += chunk.length;

    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);

      await Promise.all(
        ticketChunk.map(async (ticket, index) => {
          const entry = chunkEntries[index];
          if (!entry) {
            return;
          }

          if (ticket.status === "ok") {
            attemptedDelivery = true;
            pendingReceipts.push({
              receiptId: ticket.id,
              deviceTokenId: entry.deviceTokenId,
            });
            return;
          }

          await handleTicketError(entry.deviceTokenId, ticket);
          logger.warn("Expo rejected a push ticket", {
            userId,
            notificationType: type,
            error: ticket.details?.error ?? ticket.message,
          });
        }),
      );
    } catch (error) {
      logger.error("Failed to enqueue Expo push notifications", error);
    }
  }

  if (!attemptedDelivery) {
    return { delivered: false, enqueued: false };
  }

  if (pendingReceipts.length) {
    await prisma.pushReceipt.createMany({
      data: pendingReceipts.map((receipt) => ({
        receiptId: receipt.receiptId,
        userId,
        deviceTokenId: receipt.deviceTokenId,
        notificationType: type,
        payload: data as Prisma.InputJsonValue | undefined,
      })),
      skipDuplicates: true,
    });
  }

  await prisma.notificationLog.upsert({
    where: {
      userId_type_dedupeKey: {
        userId,
        type,
        dedupeKey,
      },
    },
    update: {
      sentAt: new Date(),
      payload: data as Prisma.InputJsonValue | undefined,
      priority,
    },
    create: {
      userId,
      type,
      priority,
      dedupeKey,
      payload: data as Prisma.InputJsonValue | undefined,
    },
  });

  return { delivered: true, receiptCount: pendingReceipts.length };
};

const resolveReceipt = async (
  receiptRecordId: string,
  deviceTokenId: string,
  receipt: ExpoPushReceipt,
) => {
  if (receipt.status === "ok") {
    await prisma.pushReceipt.update({
      where: { id: receiptRecordId },
      data: {
        status: PushReceiptStatus.OK,
        checkedAt: new Date(),
        resolvedAt: new Date(),
      },
    });
    return;
  }

  if (receipt.details?.error === "DeviceNotRegistered") {
    await deactivateDeviceTokens([deviceTokenId]);
  }

  await prisma.pushReceipt.update({
    where: { id: receiptRecordId },
    data: {
      status: PushReceiptStatus.ERROR,
      errorCode: receipt.details?.error ?? "ExpoError",
      errorMessage: receipt.message,
      checkedAt: new Date(),
      resolvedAt: new Date(),
    },
  });
};

export const sweepPushReceipts = async () => {
  const pendingReceipts = await prisma.pushReceipt.findMany({
    where: {
      status: PushReceiptStatus.PENDING,
    },
    select: {
      id: true,
      receiptId: true,
      deviceTokenId: true,
    },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  if (!pendingReceipts.length) {
    return { checked: 0, resolved: 0 };
  }

  const receiptMap = new Map(
    pendingReceipts.map((receipt) => [receipt.receiptId, receipt] as const),
  );
  let resolved = 0;
  const receiptIdChunks = expo.chunkPushNotificationReceiptIds(
    pendingReceipts.map((receipt) => receipt.receiptId),
  );

  for (const chunk of receiptIdChunks) {
    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

      await Promise.all(
        Object.entries(receipts).map(async ([receiptId, receipt]) => {
          const receiptRecord = receiptMap.get(receiptId);
          if (!receiptRecord) {
            return;
          }

          resolved += 1;
          await resolveReceipt(receiptRecord.id, receiptRecord.deviceTokenId, receipt);
        }),
      );
    } catch (error) {
      logger.error("Failed to fetch Expo push receipts", error);
    }
  }

  return {
    checked: pendingReceipts.length,
    resolved,
  };
};
