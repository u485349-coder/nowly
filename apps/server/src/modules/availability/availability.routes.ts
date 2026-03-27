import {
  AvailabilityRecurrence,
  AvailabilityState,
  BudgetMood,
  FriendshipStatus,
  EnergyLevel,
  MessageType,
  HangoutIntent,
  MicroCommitment,
  NotificationType,
  ParticipantResponse,
  SocialBattery,
  Vibe,
} from "@prisma/client";
import {
  parseSignalLabelMetadata,
  schedulingDecisionModes,
  schedulingVisibilityModes,
  schedulingVoteStates,
} from "@nowly/shared";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { verifyAccessToken } from "../../lib/jwt.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { normalizeFriendPair } from "../../utils/friends.js";
import { trackEvent } from "../analytics/analytics.service.js";
import { sendPushToUser } from "../notifications/push.service.js";
import { broadcastSchedulingSessionUpdate } from "../sockets/socket.server.js";
import { getBookableAvailability } from "./booking.service.js";
import {
  createGroupSchedulingSession,
  fetchGroupSchedulingProfile,
  finalizeGroupSchedulingSession,
  lockGroupSchedulingPoll,
  postGroupSchedulingMessage,
  submitGroupSchedulingAvailability,
} from "./group-scheduling.service.js";

const durationByState: Record<AvailabilityState, number> = {
  FREE_NOW: 3,
  FREE_LATER: 6,
  BUSY: 4,
  DOWN_THIS_WEEKEND: 48
};

const livePromptSuffixes = [
  "Could be an easy time to check in.",
  "Might be a clean window to link up.",
  "If you are free too, this one looks easy to answer.",
  "Could be a good moment to send a quick prompt.",
];

const normalizeLocationLabel = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, 80);
};

const humanizeIntent = (value: HangoutIntent | null | undefined) =>
  value ? value.replaceAll("_", " ").toLowerCase() : null;

const buildFriendLiveBody = ({
  intent,
  locationLabel,
  meetMode,
  onlineVenue,
  crowdMode,
}: {
  intent?: HangoutIntent | null;
  locationLabel?: string | null;
  meetMode?: "IN_PERSON" | "ONLINE" | "EITHER" | null;
  onlineVenue?: string | null;
  crowdMode?: "ONE_ON_ONE" | "GROUP" | "EITHER" | null;
}) => {
  const suffix = livePromptSuffixes[Math.floor(Math.random() * livePromptSuffixes.length)];
  const intro =
    meetMode === "ONLINE"
      ? `They look open${onlineVenue ? ` on ${onlineVenue}` : " online"}.`
      : intent
        ? `They look open for ${humanizeIntent(intent)}.`
        : "They just opened up a live window.";
  const crowdLine =
    crowdMode === "GROUP"
      ? " They are open to a small group too."
      : crowdMode === "ONE_ON_ONE"
        ? " They are looking for one clean 1:1 link."
        : "";
  const area =
    meetMode === "ONLINE"
      ? ""
      : locationLabel
        ? ` Around ${locationLabel}.`
        : "";
  return `${intro}${crowdLine}${area} ${suffix}`.trim();
};

const createSignalSchema = z.object({
  state: z.nativeEnum(AvailabilityState),
  label: z.string().min(2).max(120).nullable().optional(),
  radiusKm: z.number().int().min(1).max(100).default(8),
  vibe: z.nativeEnum(Vibe).nullable().optional(),
  energyLevel: z.nativeEnum(EnergyLevel).nullable().optional(),
  budgetMood: z.nativeEnum(BudgetMood).nullable().optional(),
  socialBattery: z.nativeEnum(SocialBattery).nullable().optional(),
  hangoutIntent: z.nativeEnum(HangoutIntent).nullable().optional(),
  durationHours: z.number().min(0.25).max(72).optional()
});

const recurringWindowSchema = z
  .object({
    recurrence: z.nativeEnum(AvailabilityRecurrence),
    dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
    dayOfMonth: z.number().int().min(1).max(31).nullable().optional(),
    startMinute: z.number().int().min(0).max(23 * 60 + 59),
    endMinute: z.number().int().min(1).max(24 * 60),
    utcOffsetMinutes: z.number().int().min(-14 * 60).max(14 * 60),
    label: z.string().min(2).max(40).nullable().optional(),
    vibe: z.nativeEnum(Vibe).nullable().optional(),
    hangoutIntent: z.nativeEnum(HangoutIntent).nullable().optional()
  })
  .superRefine((value, context) => {
    if (value.endMinute <= value.startMinute) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time",
        path: ["endMinute"],
      });
    }

    if (value.recurrence === AvailabilityRecurrence.WEEKLY && value.dayOfWeek == null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Weekly windows need a day of week",
        path: ["dayOfWeek"],
      });
    }

    if (value.recurrence === AvailabilityRecurrence.MONTHLY && value.dayOfMonth == null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Monthly windows need a day of month",
        path: ["dayOfMonth"],
      });
    }
  });

const replaceRecurringSchema = z.object({
  windows: z.array(recurringWindowSchema).max(24)
});

const bookingSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  note: z.string().trim().min(2).max(80).optional().nullable(),
});

const groupSessionSchema = z.object({
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional().nullable(),
  locationName: z.string().trim().min(2).max(120),
  durationMinutes: z.number().int().min(15).max(360),
  timezone: z.string().trim().min(2).max(80),
  participantCap: z.number().int().min(2).max(24),
  minimumConfirmations: z.number().int().min(2).max(24),
  decisionMode: z.enum(schedulingDecisionModes.filter((mode) => mode !== "INSTANT_CONFIRM") as [
    "EVERYONE_AGREES",
    "MINIMUM_REQUIRED",
    "HOST_DECIDES",
  ]),
  visibilityMode: z.enum(schedulingVisibilityModes),
  responseDeadline: z.string().datetime().optional().nullable(),
  dateSpecificWindows: z
    .array(
      z.object({
        dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        startMinute: z.number().int().min(0).max(23 * 60 + 59),
        endMinute: z.number().int().min(1).max(24 * 60),
      }),
    )
    .max(48)
    .default([]),
});

const groupVotesSchema = z.object({
  votes: z
    .array(
      z.object({
        slotId: z.string().min(2),
        status: z.enum(schedulingVoteStates),
      }),
    )
    .min(1),
});

const groupMessageSchema = z.object({
  text: z.string().trim().min(1).max(240),
});

const groupFinalizeSchema = z.object({
  slotId: z.string().min(2),
});

export const availabilityRouter = Router();

availabilityRouter.get(
  "/group-sessions/:shareCode",
  asyncHandler(async (request, response) => {
    const shareCode = String(request.params.shareCode);
    const authHeader = request.headers.authorization;
    let viewerId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      try {
        const payload = verifyAccessToken(authHeader.replace("Bearer ", ""));
        viewerId = payload.sub;
      } catch {
        viewerId = null;
      }
    }

    const profile = await fetchGroupSchedulingProfile(shareCode, viewerId);

    if (!profile) {
      response.status(404).json({ error: "Group scheduling link not found" });
      return;
    }

    response.json({ data: profile });
  }),
);

availabilityRouter.post(
  "/share/:inviteCode/group-session",
  requireAuth,
  asyncHandler(async (request, response) => {
    const inviteCode = String(request.params.inviteCode);
    const body = groupSessionSchema.parse(request.body);
    const host = await prisma.user.findUnique({
      where: { inviteCode },
      select: { id: true },
    });

    if (!host || host.id !== request.userId) {
      response.status(403).json({ error: "You can only create a group link for your own booking page." });
      return;
    }

    const session = await createGroupSchedulingSession({
      hostId: request.userId!,
      title: body.title,
      description: body.description ?? null,
      locationName: body.locationName,
      durationMinutes: body.durationMinutes,
      timezone: body.timezone,
      participantCap: body.participantCap,
      minimumConfirmations: Math.min(body.minimumConfirmations, body.participantCap),
      decisionMode: body.decisionMode,
      visibilityMode: body.visibilityMode,
      responseDeadline: body.responseDeadline ? new Date(body.responseDeadline) : null,
      dateSpecificWindows: body.dateSpecificWindows,
    });

    response.status(201).json({ data: session });
  }),
);

availabilityRouter.get(
  "/share/:inviteCode",
  asyncHandler(async (request, response) => {
    const inviteCode = String(request.params.inviteCode);
    const authHeader = request.headers.authorization;
    let viewerId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      try {
        const payload = verifyAccessToken(authHeader.replace("Bearer ", ""));
        viewerId = payload.sub;
      } catch {
        viewerId = null;
      }
    }

    const booking = await getBookableAvailability(inviteCode, viewerId);

    if (!booking) {
      response.status(404).json({ error: "Availability link not found" });
      return;
    }

    response.json({
      data: {
        host: booking.host,
        viewerHasRecurringSchedule: booking.viewerHasRecurringSchedule,
        slots: booking.slots.map((slot) => ({
          ...slot,
          startsAt: slot.startsAt.toISOString(),
          endsAt: slot.endsAt.toISOString(),
        })),
      },
    });
  }),
);

availabilityRouter.post(
  "/share/:inviteCode/book",
  requireAuth,
  asyncHandler(async (request, response) => {
    const inviteCode = String(request.params.inviteCode);
    const body = bookingSchema.parse(request.body);
    const booking = await getBookableAvailability(inviteCode, request.userId);

    if (!booking) {
      response.status(404).json({ error: "Availability link not found" });
      return;
    }

    if (booking.host.id === request.userId) {
      response.status(400).json({ error: "You cannot book your own window." });
      return;
    }

    const selectedSlot = booking.slots.find(
      (slot) =>
        slot.startsAt.toISOString() === body.startsAt &&
        slot.endsAt.toISOString() === body.endsAt,
    );

    if (!selectedSlot) {
      response.status(400).json({ error: "That slot is no longer available." });
      return;
    }

    const [userAId, userBId] = normalizeFriendPair(request.userId!, booking.host.id);
    const existingFriendship = await prisma.friendship.findUnique({
      where: {
        userAId_userBId: {
          userAId,
          userBId,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (existingFriendship?.status === FriendshipStatus.BLOCKED) {
      response.status(403).json({ error: "This link is not available to you." });
      return;
    }

    if (!existingFriendship) {
      await prisma.friendship.create({
        data: {
          userAId,
          userBId,
          status: FriendshipStatus.PENDING,
          initiatedBy: request.userId!,
        },
      });
    }

    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);
    const requestedLocationName = normalizeLocationLabel(request.body?.locationName);
    const hostWindowMinutes = Math.max(
      15,
      Math.round((endsAt.getTime() - startsAt.getTime()) / (60 * 1000)),
    );
    const activity =
      body.note?.trim() ||
      selectedSlot.sourceLabel ||
      (selectedSlot.hangoutIntent
        ? selectedSlot.hangoutIntent.replaceAll("_", " ").toLowerCase()
        : "hang out");
    const locationName =
      requestedLocationName ||
      booking.host.communityTag ||
      booking.host.city ||
      "nearby";

    const hangout = await prisma.hangout.create({
      data: {
        creatorId: request.userId!,
        activity,
        microType: selectedSlot.hangoutIntent ?? undefined,
        commitmentLevel:
          hostWindowMinutes <= 90
            ? MicroCommitment.QUICK_WINDOW
            : MicroCommitment.OPEN_ENDED,
        locationName,
        scheduledFor: startsAt,
        participants: {
          create: [request.userId!, booking.host.id].map((userId) => ({
            userId,
            responseStatus:
              userId === request.userId
                ? ParticipantResponse.ACCEPTED
                : ParticipantResponse.PENDING,
            respondedAt: userId === request.userId ? new Date() : null,
          })),
        },
        thread: {
          create: {
            lastMessageAt: new Date(),
            messages: {
              create: {
                senderId: request.userId!,
                text: `Booked from availability link: ${activity} on ${startsAt.toISOString()}`,
                type: MessageType.SYSTEM,
              },
            },
          },
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                photoUrl: true,
                responsivenessScore: true,
              },
            },
          },
        },
        thread: {
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
              take: 50,
            },
          },
        },
      },
    });

    await trackEvent("proposal_sent", request.userId, {
      hangoutId: hangout.id,
      source: "booking_link",
      slotStartsAt: body.startsAt,
      mutualFit: selectedSlot.mutualFit,
    });

    await sendPushToUser({
      userId: booking.host.id,
      type: NotificationType.PROPOSAL_RECEIVED,
      dedupeKey: `booking-link:${hangout.id}:${request.userId}`,
      title: "Someone picked one of your windows",
      body: `${hangout.creator.name ?? "A friend"} chose ${selectedSlot.label}.`,
      data: {
        screen: "proposal",
        hangoutId: hangout.id,
      },
    });

    response.status(201).json({ data: hangout });
  }),
);

availabilityRouter.post(
  "/group-sessions/:shareCode/votes",
  requireAuth,
  asyncHandler(async (request, response) => {
    const shareCode = String(request.params.shareCode);
    const body = groupVotesSchema.parse(request.body);
    const session = await submitGroupSchedulingAvailability(shareCode, request.userId!, body.votes as never);
    broadcastSchedulingSessionUpdate(shareCode, session);

    response.json({ data: session });
  }),
);

availabilityRouter.post(
  "/group-sessions/:shareCode/messages",
  requireAuth,
  asyncHandler(async (request, response) => {
    const shareCode = String(request.params.shareCode);
    const body = groupMessageSchema.parse(request.body);
    const message = await postGroupSchedulingMessage(shareCode, request.userId!, body.text);
    const profile = await fetchGroupSchedulingProfile(shareCode, request.userId);
    if (profile?.type === "GROUP") {
      broadcastSchedulingSessionUpdate(shareCode, profile.session);
    }

    response.status(201).json({ data: message });
  }),
);

availabilityRouter.post(
  "/group-sessions/:shareCode/finalize",
  requireAuth,
  asyncHandler(async (request, response) => {
    const shareCode = String(request.params.shareCode);
    const body = groupFinalizeSchema.parse(request.body);
    const session = await finalizeGroupSchedulingSession(shareCode, request.userId!, body.slotId);
    broadcastSchedulingSessionUpdate(shareCode, session);

    response.json({ data: session });
  }),
);

availabilityRouter.post(
  "/group-sessions/:shareCode/lock",
  requireAuth,
  asyncHandler(async (request, response) => {
    const shareCode = String(request.params.shareCode);
    const session = await lockGroupSchedulingPoll(shareCode, request.userId!);
    broadcastSchedulingSessionUpdate(shareCode, session);

    response.json({ data: session });
  }),
);

availabilityRouter.get(
  "/signals",
  requireAuth,
  asyncHandler(async (request, response) => {
    const signals = await prisma.availabilitySignal.findMany({
      where: {
        userId: request.userId,
        isActive: true,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });

    response.json({ data: signals });
  })
);

availabilityRouter.post(
  "/signals",
  requireAuth,
  asyncHandler(async (request, response) => {
    const body = createSignalSchema.parse(request.body);
    const signalMetadata = parseSignalLabelMetadata(body.label ?? null);
    const wantsToShareLocation = request.body?.showLocation === true;
    const requestedLocationLabel = normalizeLocationLabel(request.body?.locationLabel);
    const expiresAt = new Date(
      Date.now() +
        (body.durationHours ?? durationByState[body.state]) * 60 * 60 * 1000
    );

    await prisma.availabilitySignal.updateMany({
      where: {
        userId: request.userId,
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    const signal = await prisma.availabilitySignal.create({
      data: {
        userId: request.userId!,
        state: body.state,
        label: body.label ?? undefined,
        radiusKm: body.radiusKm,
        vibe: body.vibe ?? undefined,
        energyLevel: body.energyLevel ?? undefined,
        budgetMood: body.budgetMood ?? undefined,
        socialBattery: body.socialBattery ?? undefined,
        hangoutIntent: body.hangoutIntent ?? undefined,
        expiresAt
      }
    });

    await trackEvent("availability_set", request.userId, {
      state: body.state,
      label: signalMetadata.label,
      radiusKm: body.radiusKm,
      showLocation: wantsToShareLocation,
      locationLabel: wantsToShareLocation ? requestedLocationLabel : null,
      meetMode: signalMetadata.meetMode,
      crowdMode: signalMetadata.crowdMode,
      onlineVenue: signalMetadata.onlineVenue,
      vibe: body.vibe,
      energyLevel: body.energyLevel,
      budgetMood: body.budgetMood,
      socialBattery: body.socialBattery,
      hangoutIntent: body.hangoutIntent,
      expiresAt: expiresAt.toISOString()
    });

    const signalUser = await prisma.user.findUnique({
      where: { id: request.userId! },
      select: {
        id: true,
        name: true,
        city: true,
        communityTag: true,
      },
    });

    const friendships = await prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.ACCEPTED,
        OR: [{ userAId: request.userId! }, { userBId: request.userId! }],
      },
      select: {
        userAId: true,
        userBId: true,
      },
    });

    const friendIds = friendships.map((friendship) =>
      friendship.userAId === request.userId ? friendship.userBId : friendship.userAId,
    );
    const locationLabel = wantsToShareLocation
      ? requestedLocationLabel || signalUser?.communityTag || signalUser?.city || null
      : null;

    await Promise.all(
      friendIds.map((friendId) =>
        sendPushToUser({
          userId: friendId,
          type: NotificationType.INVITE_NUDGE,
          dedupeKey: `friend-live:${signal.id}:${friendId}`,
          title: `${signalUser?.name ?? "A friend"} is live on Nowly`,
          body: buildFriendLiveBody({
            intent: body.hangoutIntent,
            locationLabel,
            meetMode: signalMetadata.meetMode,
            onlineVenue: signalMetadata.onlineVenue,
            crowdMode: signalMetadata.crowdMode,
          }),
          data: {
            screen: "friends",
          },
        }),
      ),
    );

    response.status(201).json({ data: signal });
  })
);

availabilityRouter.get(
  "/recurring",
  requireAuth,
  asyncHandler(async (request, response) => {
    const windows = await prisma.recurringAvailabilityWindow.findMany({
      where: {
        userId: request.userId,
        isActive: true,
      },
      orderBy: [{ recurrence: "asc" }, { dayOfWeek: "asc" }, { dayOfMonth: "asc" }, { startMinute: "asc" }],
    });

    response.json({ data: windows });
  }),
);

availabilityRouter.put(
  "/recurring",
  requireAuth,
  asyncHandler(async (request, response) => {
    const body = replaceRecurringSchema.parse(request.body);

    await prisma.$transaction([
      prisma.recurringAvailabilityWindow.deleteMany({
        where: {
          userId: request.userId,
        },
      }),
      ...(body.windows.length
        ? [
            prisma.recurringAvailabilityWindow.createMany({
              data: body.windows.map((window) => ({
                userId: request.userId!,
                recurrence: window.recurrence,
                dayOfWeek:
                  window.recurrence === AvailabilityRecurrence.WEEKLY
                    ? window.dayOfWeek ?? null
                    : null,
                dayOfMonth:
                  window.recurrence === AvailabilityRecurrence.MONTHLY
                    ? window.dayOfMonth ?? null
                    : null,
                startMinute: window.startMinute,
                endMinute: window.endMinute,
                utcOffsetMinutes: window.utcOffsetMinutes,
                label: window.label ?? undefined,
                vibe: window.vibe ?? undefined,
                hangoutIntent: window.hangoutIntent ?? undefined,
              })),
            }),
          ]
        : []),
    ]);

    const windows = await prisma.recurringAvailabilityWindow.findMany({
      where: {
        userId: request.userId,
        isActive: true,
      },
      orderBy: [{ recurrence: "asc" }, { dayOfWeek: "asc" }, { dayOfMonth: "asc" }, { startMinute: "asc" }],
    });

    await trackEvent("availability_schedule_saved", request.userId, {
      windowCount: windows.length,
      monthlyCount: windows.filter((window) => window.recurrence === AvailabilityRecurrence.MONTHLY).length,
      weeklyCount: windows.filter((window) => window.recurrence === AvailabilityRecurrence.WEEKLY).length,
    });

    response.json({ data: windows });
  }),
);

availabilityRouter.delete(
  "/signals/:signalId",
  requireAuth,
  asyncHandler(async (request, response) => {
    const signalId = String(request.params.signalId);

    await prisma.availabilitySignal.updateMany({
      where: {
        id: signalId,
        userId: request.userId
      },
      data: {
        isActive: false
      }
    });

    response.status(204).send();
  })
);
