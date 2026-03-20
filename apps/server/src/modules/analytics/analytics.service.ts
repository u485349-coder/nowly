import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

export const trackEvent = async (
  event: string,
  userId?: string | null,
  payload?: Record<string, unknown>
) =>
  prisma.analyticsEvent.create({
    data: {
      event,
      userId: userId ?? undefined,
      payload: payload as Prisma.InputJsonValue | undefined
    }
  });
