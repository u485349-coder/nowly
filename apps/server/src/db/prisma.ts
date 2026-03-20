import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __nowlyPrisma__: PrismaClient | undefined;
}

export const prisma =
  global.__nowlyPrisma__ ??
  new PrismaClient({
    log: ["warn", "error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.__nowlyPrisma__ = prisma;
}
