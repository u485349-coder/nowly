import cron from "node-cron";
import {
  NotificationPriority,
  NotificationType,
  ParticipantResponse,
} from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { logger } from "../../lib/logger.js";
import { sendScheduledOverlapNudges } from "../matching/scheduled-overlap.service.js";
import { sendPushToUser, sweepPushReceipts, wasRecentlySent } from "./push.service.js";

const JOB_TIMEZONE = "America/New_York";

const getIsoWeekKey = (date: Date) => {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};

const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

const reminderWindows = [
  { key: "24h", minutesBefore: 24 * 60, toleranceMinutes: 20 },
  { key: "1h", minutesBefore: 60, toleranceMinutes: 12 },
  { key: "10m", minutesBefore: 10, toleranceMinutes: 6 },
] as const;

const reminderCopy = (
  key: (typeof reminderWindows)[number]["key"],
  activity: string,
  locationName: string,
) => {
  if (key === "24h") {
    return {
      title: "Your hang is tomorrow",
      body: `${activity} at ${locationName} is coming up in about 24 hours.`,
    };
  }

  if (key === "1h") {
    return {
      title: "Your hang starts in about an hour",
      body: `${activity} at ${locationName} is about an hour away.`,
    };
  }

  return {
    title: "Your hang starts soon",
    body: `${activity} at ${locationName} starts in about 10 minutes.`,
  };
};

const sendUpcomingHangoutReminders = async () => {
  const now = new Date();
  const reminderWindowStart = new Date(now.getTime() + 4 * 60 * 1000);
  const reminderWindowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000);

  const hangouts = await prisma.hangout.findMany({
    where: {
      status: {
        in: ["PROPOSED", "CONFIRMED"],
      },
      scheduledFor: {
        gte: reminderWindowStart,
        lte: reminderWindowEnd,
      },
    },
    include: {
      thread: {
        select: {
          id: true,
        },
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  await Promise.all(
    hangouts.flatMap((hangout) => {
      const minutesAway = Math.max(
        1,
        Math.round((hangout.scheduledFor.getTime() - now.getTime()) / 60000),
      );
      const matchingWindows = reminderWindows.filter(
        (window) =>
          minutesAway <= window.minutesBefore + window.toleranceMinutes &&
          minutesAway >= Math.max(1, window.minutesBefore - window.toleranceMinutes),
      );

      return matchingWindows.flatMap((window) =>
        hangout.participants
          .filter((participant) => participant.responseStatus !== ParticipantResponse.DECLINED)
          .map(async (participant) => {
            const dedupeKey = `hangout:${hangout.id}:reminder:${window.key}`;
            const recentlySent = await wasRecentlySent(
              participant.userId,
              NotificationType.REMINDER,
              dedupeKey,
              26 * 60,
            );

            if (recentlySent) {
              return;
            }

            const screen =
              hangout.status === "CONFIRMED" && hangout.thread?.id ? "thread" : "proposal";
            const copy = reminderCopy(window.key, hangout.activity, hangout.locationName);

            await sendPushToUser({
              userId: participant.userId,
              type: NotificationType.REMINDER,
              priority: NotificationPriority.HIGH,
              dedupeKey,
              title: copy.title,
              body: copy.body,
              data:
                screen === "thread"
                  ? {
                      screen: "thread",
                      threadId: hangout.thread!.id,
                      hangoutId: hangout.id,
                    }
                  : {
                      screen: "proposal",
                      hangoutId: hangout.id,
                    },
            });
          }),
      );
    }),
  );
};

const sendInviteNudges = async () => {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const dayOld = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const users = await prisma.user.findMany({
    where: {
      onboardingCompleted: true,
      createdAt: {
        lte: dayOld,
      },
    },
    select: {
      id: true,
    },
  });

  await Promise.all(
    users.map(async (user) => {
      const [acceptedFriends, recentInvites, recentlySent] = await Promise.all([
        prisma.friendship.count({
          where: {
            status: "ACCEPTED",
            OR: [{ userAId: user.id }, { userBId: user.id }],
          },
        }),
        prisma.invitation.count({
          where: {
            inviterId: user.id,
            createdAt: {
              gte: threeDaysAgo,
            },
          },
        }),
        wasRecentlySent(
          user.id,
          NotificationType.INVITE_NUDGE,
          "invite-nudge:friend-density",
          72 * 60,
        ),
      ]);

      if (acceptedFriends >= 3 || recentInvites > 0 || recentlySent) {
        return;
      }

      const needed = Math.max(1, 3 - acceptedFriends);
      await sendPushToUser({
        userId: user.id,
        type: NotificationType.INVITE_NUDGE,
        priority: NotificationPriority.LOW,
        dedupeKey: "invite-nudge:friend-density",
        title: "Bring your people in",
        body:
          acceptedFriends === 0
            ? "Add 3 close friends and Nowly starts feeling alive fast."
            : `Bring in ${pluralize(needed, "more friend")} so overlap starts to feel real.`,
        data: {
          screen: "friends",
        },
      });
    }),
  );
};

const sendWeeklySummaries = async () => {
  const weekKey = getIsoWeekKey(new Date());
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const users = await prisma.user.findMany({
    where: {
      onboardingCompleted: true,
    },
    select: {
      id: true,
    },
  });

  await Promise.all(
    users.map(async (user) => {
      const dedupeKey = `weekly-summary:${weekKey}`;
      const recentlySent = await wasRecentlySent(
        user.id,
        NotificationType.WEEKLY_SUMMARY,
        dedupeKey,
        8 * 24 * 60,
      );

      if (recentlySent) {
        return;
      }

      const [completedHangouts, openMatches, acceptedFriends] = await Promise.all([
        prisma.hangoutParticipant.count({
          where: {
            userId: user.id,
            hangout: {
              status: "COMPLETED",
              scheduledFor: {
                gte: weekAgo,
              },
            },
          },
        }),
        prisma.overlapMatch.count({
          where: {
            userId: user.id,
            status: "OPEN",
            expiresAt: {
              gt: new Date(),
            },
          },
        }),
        prisma.friendship.count({
          where: {
            status: "ACCEPTED",
            OR: [{ userAId: user.id }, { userBId: user.id }],
          },
        }),
      ]);

      if (completedHangouts === 0 && openMatches === 0 && acceptedFriends === 0) {
        return;
      }

      const title =
        completedHangouts > 0
          ? "Your crew had motion this week"
          : openMatches > 0
            ? "Your crew is active tonight"
            : "Best time to catch people is tonight";

      const body =
        completedHangouts > 0
          ? `You turned ${pluralize(completedHangouts, "overlap")} into real hangouts this week.`
          : openMatches > 0
            ? `${pluralize(openMatches, "live overlap")} could still turn into something tonight.`
            : "Set one quick signal and let Nowly do the overlap work.";

      await sendPushToUser({
        userId: user.id,
        type: NotificationType.WEEKLY_SUMMARY,
        priority: NotificationPriority.LOW,
        dedupeKey,
        title,
        body,
        data: {
          screen: "home",
        },
      });
    }),
  );
};

export const startNotificationJobs = () => {
  cron.schedule("*/5 * * * *", async () => {
      try {
        await sweepPushReceipts();
        await sendUpcomingHangoutReminders();
        await sendScheduledOverlapNudges();
      } catch (error) {
        logger.error("Push reminder job failed", error);
      }
  });

  cron.schedule(
    "0 12 * * *",
    async () => {
      try {
        await sendInviteNudges();
      } catch (error) {
        logger.error("Invite nudge job failed", error);
      }
    },
    {
      timezone: JOB_TIMEZONE,
    },
  );

  cron.schedule(
    "0 18 * * 0",
    async () => {
      try {
        await sendWeeklySummaries();
      } catch (error) {
        logger.error("Weekly summary job failed", error);
      }
    },
    {
      timezone: JOB_TIMEZONE,
    },
  );

  logger.info("Notification jobs scheduled");
};
