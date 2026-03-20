import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { requestOtp, verifyOtp } from "./auth.service.js";

const requestOtpSchema = z.object({
  phone: z.string().min(8)
});

const verifyOtpSchema = z.object({
  phone: z.string().min(8),
  code: z.string().min(4).max(6)
});

const deviceTokenSchema = z.object({
  token: z.string().min(10),
  platform: z.string().default("expo")
});

export const authRouter = Router();

authRouter.post(
  "/request-otp",
  asyncHandler(async (request, response) => {
    const body = requestOtpSchema.parse(request.body);
    const result = await requestOtp(body.phone);
    response.status(StatusCodes.ACCEPTED).json({ data: result });
  })
);

authRouter.post(
  "/verify-otp",
  asyncHandler(async (request, response) => {
    const body = verifyOtpSchema.parse(request.body);
    const session = await verifyOtp(body.phone, body.code);
    response.json({ data: session });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (request, response) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: request.userId }
    });
    response.json({ data: user });
  })
);

authRouter.post(
  "/device-token",
  requireAuth,
  asyncHandler(async (request, response) => {
    const body = deviceTokenSchema.parse(request.body);

    const deviceToken = await prisma.deviceToken.upsert({
      where: { token: body.token },
      update: {
        active: true,
        userId: request.userId!,
        platform: body.platform
      },
      create: {
        userId: request.userId!,
        token: body.token,
        platform: body.platform
      }
    });

    response.status(StatusCodes.CREATED).json({ data: deviceToken });
  })
);
