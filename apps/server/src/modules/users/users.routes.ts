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
  photoUrl: z.string().url().optional().nullable(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  referralToken: z.string().optional()
});

const preferencesSchema = z.object({
  notificationIntensity: z.nativeEnum(NotificationIntensity)
});

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
        notificationIntensity: body.notificationIntensity
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
