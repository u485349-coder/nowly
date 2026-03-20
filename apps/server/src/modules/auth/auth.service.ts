import { User } from "@prisma/client";
import { env, isProd } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { createAccessToken } from "../../lib/jwt.js";
import { logger } from "../../lib/logger.js";
import { trackEvent } from "../analytics/analytics.service.js";

const twilioEnabled =
  env.TWILIO_ACCOUNT_SID &&
  env.TWILIO_AUTH_TOKEN &&
  env.TWILIO_VERIFY_SERVICE_SID;

const loadTwilioClient = async () => {
  const { default: twilio } = await import("twilio");
  return twilio(env.TWILIO_ACCOUNT_SID!, env.TWILIO_AUTH_TOKEN!);
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const toAuthPayload = (user: User) => ({
  token: createAccessToken(user.id),
  user
});

export const requestOtp = async (phone: string) => {
  const code = generateOtp();

  await prisma.otpCode.create({
    data: {
      phone,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    }
  });

  if (twilioEnabled) {
    const client = await loadTwilioClient();
    await client.verify.v2
      .services(env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({ to: phone, channel: "sms" });
  } else {
    logger.info(`OTP for ${phone}: ${code}`);
  }

  return {
    ok: true,
    devCode: isProd ? undefined : code
  };
};

export const verifyOtp = async (phone: string, code: string) => {
  if (twilioEnabled) {
    const client = await loadTwilioClient();
    const verification = await client.verify.v2
      .services(env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({ to: phone, code });

    if (verification.status !== "approved") {
      throw new Error("Invalid code");
    }
  } else {
    const localOtp = await prisma.otpCode.findFirst({
      where: {
        phone,
        code,
        expiresAt: { gt: new Date() },
        consumedAt: null
      },
      orderBy: { createdAt: "desc" }
    });

    if (!localOtp) {
      throw new Error("Invalid code");
    }

    await prisma.otpCode.update({
      where: { id: localOtp.id },
      data: { consumedAt: new Date() }
    });
  }

  const existingUser = await prisma.user.findUnique({ where: { phone } });
  const created = !existingUser;

  const user =
    existingUser ??
    (await prisma.user.create({
      data: {
        phone,
        inactiveSince: null
      }
    }));

  if (created) {
    await trackEvent("account_created", user.id, {
      phoneVerifiedAt: new Date().toISOString()
    });
  }

  return toAuthPayload(user);
};
