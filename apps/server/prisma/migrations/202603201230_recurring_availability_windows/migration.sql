CREATE TYPE "AvailabilityRecurrence" AS ENUM ('WEEKLY', 'MONTHLY');

CREATE TABLE "RecurringAvailabilityWindow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recurrence" "AvailabilityRecurrence" NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "utcOffsetMinutes" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT,
    "vibe" "Vibe",
    "hangoutIntent" "HangoutIntent",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringAvailabilityWindow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecurringAvailabilityWindow_userId_recurrence_dayOfWeek_dayOfMonth_startMinute_endMinute_key"
ON "RecurringAvailabilityWindow"("userId", "recurrence", "dayOfWeek", "dayOfMonth", "startMinute", "endMinute");

CREATE INDEX "RecurringAvailabilityWindow_userId_isActive_recurrence_idx"
ON "RecurringAvailabilityWindow"("userId", "isActive", "recurrence");

ALTER TABLE "RecurringAvailabilityWindow" ADD CONSTRAINT "RecurringAvailabilityWindow_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
