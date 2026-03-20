import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../db/prisma.js";
import { verifyAccessToken } from "../lib/jwt.js";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

export const requireAuth = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    response.status(StatusCodes.UNAUTHORIZED).json({
      error: "Missing bearer token"
    });
    return;
  }

  try {
    const payload = verifyAccessToken(authHeader.replace("Bearer ", ""));
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true }
    });

    if (!user) {
      response.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid token" });
      return;
    }

    request.userId = user.id;
    next();
  } catch {
    response.status(StatusCodes.UNAUTHORIZED).json({ error: "Invalid token" });
  }
};
