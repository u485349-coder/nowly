import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { trackEvent } from "./analytics.service.js";

const analyticsSchema = z.object({
  event: z.string().min(1),
  payload: z.record(z.any()).optional()
});

export const analyticsRouter = Router();

analyticsRouter.post(
  "/events",
  requireAuth,
  asyncHandler(async (request, response) => {
    const body = analyticsSchema.parse(request.body);
    await trackEvent(body.event, request.userId, body.payload);
    response.status(202).json({ ok: true });
  })
);
