import {
  AvailabilityState,
  BudgetMood,
  EnergyLevel,
  HangoutIntent,
  SocialBattery,
  Vibe,
} from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { trackEvent } from "../analytics/analytics.service.js";

const durationByState: Record<AvailabilityState, number> = {
  FREE_NOW: 3,
  FREE_LATER: 6,
  BUSY: 4,
  DOWN_THIS_WEEKEND: 48
};

const createSignalSchema = z.object({
  state: z.nativeEnum(AvailabilityState),
  radiusKm: z.number().int().min(1).max(100).default(8),
  vibe: z.nativeEnum(Vibe).nullable().optional(),
  energyLevel: z.nativeEnum(EnergyLevel).nullable().optional(),
  budgetMood: z.nativeEnum(BudgetMood).nullable().optional(),
  socialBattery: z.nativeEnum(SocialBattery).nullable().optional(),
  hangoutIntent: z.nativeEnum(HangoutIntent).nullable().optional(),
  durationHours: z.number().min(1).max(72).optional()
});

export const availabilityRouter = Router();

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
      radiusKm: body.radiusKm,
      vibe: body.vibe,
      energyLevel: body.energyLevel,
      budgetMood: body.budgetMood,
      socialBattery: body.socialBattery,
      hangoutIntent: body.hangoutIntent,
      expiresAt: expiresAt.toISOString()
    });

    response.status(201).json({ data: signal });
  })
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
