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
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeRecipient = (channel: "phone" | "email", value: string) =>
  channel === "email" ? normalizeEmail(value) : value.trim();

const toAuthPayload = (user: User) => ({
  token: createAccessToken(user.id),
  user
});

export const requestAuthCode = async (channel: "phone" | "email", value: string) => {
  const recipient = normalizeRecipient(channel, value);
  const code = generateOtp();

  await prisma.otpCode.create({
    data: {
      phone: recipient,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    }
  });

  if (twilioEnabled) {
    const client = await loadTwilioClient();
    await client.verify.v2
      .services(env.TWILIO_VERIFY_SERVICE_SID!)
      .verifications.create({ to: recipient, channel: channel === "email" ? "email" : "sms" });
  } else {
    logger.info(`Auth code for ${channel}:${recipient}: ${code}`);
  }

  return {
    ok: true,
    devCode: isProd ? undefined : code
  };
};

export const verifyAuthCode = async (
  channel: "phone" | "email",
  value: string,
  code: string,
) => {
  const recipient = normalizeRecipient(channel, value);

  if (twilioEnabled) {
    const client = await loadTwilioClient();
    const verification = await client.verify.v2
      .services(env.TWILIO_VERIFY_SERVICE_SID!)
      .verificationChecks.create({ to: recipient, code });

    if (verification.status !== "approved") {
      throw new Error("Invalid code");
    }
  } else {
    const localOtp = await prisma.otpCode.findFirst({
      where: {
        phone: recipient,
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

  const existingUser =
    channel === "email"
      ? await prisma.user.findUnique({ where: { email: recipient } })
      : await prisma.user.findUnique({ where: { phone: recipient } });
  const created = !existingUser;

  const user =
    existingUser ??
    (await prisma.user.create({
      data: {
        ...(channel === "email" ? { email: recipient } : { phone: recipient }),
        inactiveSince: null
      }
    }));

  if (created) {
    await trackEvent("account_created", user.id, {
      verifiedChannel: channel,
      verifiedAt: new Date().toISOString()
    });
  }

  return toAuthPayload(user);
};

export const requestOtp = async (phone: string) => requestAuthCode("phone", phone);
export const verifyOtp = async (phone: string, code: string) =>
  verifyAuthCode("phone", phone, code);
export const requestEmailCode = async (email: string) => requestAuthCode("email", email);
export const verifyEmailCode = async (email: string, code: string) =>
  verifyAuthCode("email", email, code);
