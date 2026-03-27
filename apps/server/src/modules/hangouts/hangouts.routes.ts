import {
  HangoutIntent,
  MicroCommitment,
  MicroResponse,
  MessageType,
  NotificationType,
  ParticipantResponse,
  Prisma
} from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { trackEvent } from "../analytics/analytics.service.js";
import {
  deriveSocialRadar,
  loadSocialContext,
} from "../intelligence/social-intelligence.service.js";
import { getScheduledOverlapsForUser } from "../matching/scheduled-overlap.service.js";
import { sendPushToUser } from "../notifications/push.service.js";

const createHangoutSchema = z.object({
  activity: z.string().min(2).max(60),
  microType: z.nativeEnum(HangoutIntent).nullable().optional(),
  commitmentLevel: z.nativeEnum(MicroCommitment).optional(),
  locationName: z.string().min(2).max(120),
  locationLat: z.number().optional().nullable(),
  locationLng: z.number().optional().nullable(),
  scheduledFor: z.string().datetime(),
  participantIds: z.array(z.string()).min(1).max(8)
});

const respondSchema = z
  .object({
    responseStatus: z.nativeEnum(ParticipantResponse).optional(),
    microResponse: z.nativeEnum(MicroResponse).nullable().optional()
  })
  .refine((value) => value.responseStatus || value.microResponse, {
    message: "A response is required"
  });

const recapSchema = z.object({
  didHang: z.boolean(),
  photoDropUrl: z.string().url().optional().nullable()
});

const groupQuerySchema = z.object({
  vibe: z.enum(["FOOD", "GYM", "CHILL", "PARTY", "COFFEE", "OUTDOORS"]).optional()
});

const hangoutInclude = {
  creator: {
    select: {
      id: true,
      name: true
    }
  },
  participants: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          photoUrl: true,
          responsivenessScore: true
        }
      }
    }
  },
  thread: {
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 50
      }
    }
  }
} satisfies Prisma.HangoutInclude;

export const hangoutsRouter = Router();

const resolveResponseStatus = (
  responseStatus?: ParticipantResponse,
  microResponse?: MicroResponse | null
) => {
  if (responseStatus) {
    return responseStatus;
  }

  if (
    microResponse === MicroResponse.PULLING_UP ||
    microResponse === MicroResponse.TEN_MIN_ONLY
  ) {
    return ParticipantResponse.ACCEPTED;
  }

  if (microResponse === MicroResponse.MAYBE_LATER) {
    return ParticipantResponse.SUGGESTED_CHANGE;
  }

  return ParticipantResponse.DECLINED;
};

hangoutsRouter.get(
  "/matches",
  requireAuth,
  asyncHandler(async (request, response) => {
    const matches = await prisma.overlapMatch.findMany({
      where: {
        userId: request.userId,
        status: "OPEN",
        expiresAt: { gt: new Date() }
      },
      include: {
        matchedUser: true,
        signal: true,
        matchedSignal: true
      },
      orderBy: { score: "desc" },
      take: 5
    });

    response.json({
      data: matches.map((match) => {
        const reason =
          match.reason && typeof match.reason === "object"
            ? (match.reason as Record<string, unknown>)
            : {};

        return {
          ...match,
          insightLabel:
            (typeof reason.momentumLabel === "string" && reason.momentumLabel) ||
            (typeof reason.timingLabel === "string" && reason.timingLabel) ||
            null
        };
      })
    });
  })
);

hangoutsRouter.get(
  "/radar",
  requireAuth,
  asyncHandler(async (request, response) => {
    const friendships = await prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ userAId: request.userId }, { userBId: request.userId }]
      },
      select: {
        userAId: true,
        userBId: true
      }
    });

    const friendIds = friendships.map((friendship) =>
      friendship.userAId === request.userId ? friendship.userBId : friendship.userAId
    );
    const context = await loadSocialContext([request.userId!, ...friendIds]);
    const radar = deriveSocialRadar(context, request.userId!);

    response.json({ data: radar });
  })
);

hangoutsRouter.get(
  "/scheduled-overlaps",
  requireAuth,
  asyncHandler(async (request, response) => {
    const suggestions = await getScheduledOverlapsForUser(request.userId!);

    response.json({
      data: suggestions.map((suggestion) => ({
        ...suggestion,
        startsAt: suggestion.startsAt.toISOString(),
        endsAt: suggestion.endsAt.toISOString(),
      })),
    });
  }),
);

hangoutsRouter.post(
  "/group-candidates",
  requireAuth,
  asyncHandler(async (request, response) => {
    const body = groupQuerySchema.parse(request.body);
    const matches = await prisma.overlapMatch.findMany({
      where: {
        userId: request.userId,
        status: "OPEN",
        expiresAt: { gt: new Date() },
        ...(body.vibe
          ? {
              OR: [
                { signal: { is: { vibe: body.vibe } } },
                { matchedSignal: { is: { vibe: body.vibe } } }
              ]
            }
          : {})
      },
      include: {
        matchedUser: true
      },
      take: 5,
      orderBy: { score: "desc" }
    });

    response.json({ data: matches });
  })
);

hangoutsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (request, response) => {
    const hangouts = await prisma.hangout.findMany({
      where: {
        participants: {
          some: {
            userId: request.userId
          }
        }
      },
      include: hangoutInclude,
      orderBy: { scheduledFor: "asc" }
    });

    response.json({ data: hangouts });
  })
);

hangoutsRouter.get(
  "/recaps",
  requireAuth,
  asyncHandler(async (request, response) => {
    const recaps = await prisma.recapMemory.findMany({
      where: {
        ownerId: request.userId
      },
      orderBy: { createdAt: "desc" }
    });

    response.json({ data: recaps });
  })
);

hangoutsRouter.get(
  "/threads/:threadId/messages",
  requireAuth,
  asyncHandler(async (request, response) => {
    const threadId = String(request.params.threadId);

    const authorized = await prisma.hangoutThread.findFirst({
      where: {
        id: threadId,
        hangout: {
          participants: {
            some: {
              userId: request.userId
            }
          }
        }
      },
      select: { id: true }
    });

    if (!authorized) {
      response.status(403).json({ error: "Forbidden" });
      return;
    }

    const messages = await prisma.message.findMany({
      where: {
        threadId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            photoUrl: true
          }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    response.json({ data: messages });
  })
);

hangoutsRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (request, response) => {
    const body = createHangoutSchema.parse(request.body);
    const participantIds = [...new Set([request.userId!, ...body.participantIds])];

    const hangout = await prisma.hangout.create({
      data: {
        creatorId: request.userId!,
        activity: body.activity,
        microType: body.microType ?? undefined,
        commitmentLevel: body.commitmentLevel ?? MicroCommitment.DROP_IN,
        locationName: body.locationName,
        locationLat: body.locationLat,
        locationLng: body.locationLng,
        scheduledFor: new Date(body.scheduledFor),
        participants: {
          create: participantIds.map((userId) => ({
            userId,
            responseStatus:
              userId === request.userId
                ? ParticipantResponse.ACCEPTED
                : ParticipantResponse.PENDING,
            respondedAt: userId === request.userId ? new Date() : null
          }))
        },
        thread: {
          create: {
            lastMessageAt: new Date(),
            messages: {
              create: {
                senderId: request.userId!,
                text: `Quick link proposed: ${body.activity} at ${body.locationName}`,
                type: MessageType.SYSTEM
              }
            }
          }
        }
      },
      include: hangoutInclude
    });

    await trackEvent("proposal_sent", request.userId, {
      hangoutId: hangout.id,
      groupSize: participantIds.length,
      microType: body.microType,
      commitmentLevel: body.commitmentLevel ?? MicroCommitment.DROP_IN
    });

    await Promise.all(
      participantIds
        .filter((participantId) => participantId !== request.userId)
        .map((participantId) =>
          sendPushToUser({
            userId: participantId,
            type: NotificationType.PROPOSAL_RECEIVED,
            dedupeKey: `hangout:${hangout.id}:proposal`,
            title: "New hangout proposal",
            body: `${hangout.creator.name ?? "A friend"} wants to ${body.activity}.`,
            data: {
              screen: "proposal",
              hangoutId: hangout.id
            }
          })
        )
    );

    if (participantIds.length > 2) {
      await trackEvent("group_thread_created", request.userId, {
        hangoutId: hangout.id
      });
    }

    response.status(201).json({ data: hangout });
  })
);

hangoutsRouter.post(
  "/:hangoutId/respond",
  requireAuth,
  asyncHandler(async (request, response) => {
    const hangoutId = String(request.params.hangoutId);
    const body = respondSchema.parse(request.body);
    const nextResponseStatus = resolveResponseStatus(
      body.responseStatus,
      body.microResponse
    );

    const participant = await prisma.hangoutParticipant.update({
      where: {
        hangoutId_userId: {
          hangoutId,
          userId: request.userId!
        }
      },
      data: {
        responseStatus: nextResponseStatus,
        microResponse: body.microResponse ?? undefined,
        respondedAt: new Date()
      }
    });

    const hangout = await prisma.hangout.findUniqueOrThrow({
      where: { id: hangoutId },
      include: {
        participants: true,
        creator: true,
        thread: true
      }
    });

    const acceptedCount = hangout.participants.filter(
      (entry) => entry.responseStatus === ParticipantResponse.ACCEPTED
    ).length;
    const confirmationThreshold = hangout.participants.length <= 2 ? 2 : 3;

    const nextStatus =
      acceptedCount >= confirmationThreshold &&
      nextResponseStatus !== ParticipantResponse.DECLINED
        ? "CONFIRMED"
        : hangout.status;

    const updatedHangout = await prisma.hangout.update({
      where: { id: hangout.id },
      data: { status: nextStatus },
      include: hangoutInclude
    });

    if (nextResponseStatus === ParticipantResponse.ACCEPTED) {
      await trackEvent("proposal_accepted", request.userId, {
        hangoutId: hangout.id,
        microResponse: body.microResponse
      });
      if (hangout.status !== "CONFIRMED" && nextStatus === "CONFIRMED") {
        await trackEvent("hangout_confirmed", request.userId, {
          hangoutId: hangout.id
        });
      }
      await sendPushToUser({
        userId: hangout.creatorId,
        type: NotificationType.PROPOSAL_ACCEPTED,
        dedupeKey: `hangout:${hangout.id}:accepted:${request.userId}`,
        title: "Hangout locked in",
        body:
          body.microResponse === MicroResponse.TEN_MIN_ONLY
            ? `${updatedHangout.participants.find((entry) => entry.userId === request.userId)?.user.name ?? "A friend"} can slide through for a bit.`
            : `${updatedHangout.participants.find((entry) => entry.userId === request.userId)?.user.name ?? "A friend"} is in.`,
        data: {
          screen: "proposal",
          hangoutId: hangout.id
        }
      });
    }

    response.json({ data: { participant, hangout: updatedHangout } });
  })
);

hangoutsRouter.post(
  "/:hangoutId/recap",
  requireAuth,
  asyncHandler(async (request, response) => {
    const hangoutId = String(request.params.hangoutId);
    const body = recapSchema.parse(request.body);

    if (!body.didHang) {
      response.json({ data: { didHang: false } });
      return;
    }

    const hangout = await prisma.hangout.findUniqueOrThrow({
      where: { id: hangoutId }
    });

    const recentCount = await prisma.recapMemory.count({
      where: {
        ownerId: request.userId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    const recap = await prisma.recapMemory.upsert({
      where: {
        hangoutId: hangout.id
      },
      update: {
        photoDropUrl: body.photoDropUrl,
        streakCount: recentCount + 1
      },
      create: {
        hangoutId: hangout.id,
        ownerId: request.userId!,
        title: `${hangout.activity} crew memory`,
        summary: `You made a real plan happen at ${hangout.locationName}.`,
        photoDropUrl: body.photoDropUrl,
        streakCount: recentCount + 1,
        sharePayload: {
          badge: "Crew made it out",
          prompt: "Share the vibe"
        } as Prisma.JsonObject
      }
    });

    await prisma.hangout.update({
      where: { id: hangout.id },
      data: { status: "COMPLETED" }
    });

    const participants = await prisma.hangoutParticipant.findMany({
      where: { hangoutId: hangout.id },
      select: { userId: true }
    });

    await Promise.all(
      participants
        .filter((participant) => participant.userId !== request.userId)
        .map((participant) =>
          sendPushToUser({
            userId: participant.userId,
            type: NotificationType.RECAP_READY,
            dedupeKey: `hangout:${hangout.id}:recap`,
            title: "Recap ready",
            body: `${hangout.activity} just turned into a shareable memory.`,
            data: {
              screen: "recap",
              hangoutId: hangout.id
            }
          })
        )
    );

    response.json({ data: recap });
  })
);
