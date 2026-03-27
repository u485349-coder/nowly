CREATE TYPE "SchedulingType" AS ENUM ('ONE_ON_ONE', 'GROUP');
CREATE TYPE "SchedulingDecisionMode" AS ENUM ('INSTANT_CONFIRM', 'EVERYONE_AGREES', 'MINIMUM_REQUIRED', 'HOST_DECIDES');
CREATE TYPE "SchedulingVisibilityMode" AS ENUM ('PUBLIC', 'ANONYMOUS');
CREATE TYPE "SchedulingSessionStatus" AS ENUM ('OPEN', 'LOCKED', 'FINALIZED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "SchedulingVoteState" AS ENUM ('AVAILABLE', 'MAYBE', 'UNAVAILABLE');

CREATE TABLE "SchedulingSession" (
  "id" TEXT NOT NULL,
  "shareCode" TEXT NOT NULL,
  "hostId" TEXT NOT NULL,
  "schedulingType" "SchedulingType" NOT NULL DEFAULT 'GROUP',
  "status" "SchedulingSessionStatus" NOT NULL DEFAULT 'OPEN',
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "locationName" TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "timezone" TEXT NOT NULL,
  "participantCap" INTEGER NOT NULL DEFAULT 4,
  "minimumConfirmations" INTEGER NOT NULL DEFAULT 3,
  "decisionMode" "SchedulingDecisionMode" NOT NULL DEFAULT 'MINIMUM_REQUIRED',
  "visibilityMode" "SchedulingVisibilityMode" NOT NULL DEFAULT 'PUBLIC',
  "responseDeadline" TIMESTAMP(3),
  "pollLockedAt" TIMESTAMP(3),
  "finalizedAt" TIMESTAMP(3),
  "finalizedSlotId" TEXT,
  "finalHangoutId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SchedulingSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchedulingSessionSlot" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SchedulingSessionSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchedulingSessionParticipant" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "isHost" BOOLEAN NOT NULL DEFAULT false,
  "collaborationIndex" INTEGER NOT NULL DEFAULT 0,
  "hasSubmittedAvailability" BOOLEAN NOT NULL DEFAULT false,
  "submittedAt" TIMESTAMP(3),
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActiveAt" TIMESTAMP(3),

  CONSTRAINT "SchedulingSessionParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchedulingSessionVote" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "slotId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "status" "SchedulingVoteState" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SchedulingSessionVote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchedulingSessionMessage" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "senderParticipantId" TEXT,
  "text" TEXT NOT NULL,
  "type" "MessageType" NOT NULL DEFAULT 'TEXT',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SchedulingSessionMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchedulingSession_shareCode_key" ON "SchedulingSession"("shareCode");
CREATE INDEX "SchedulingSession_hostId_createdAt_idx" ON "SchedulingSession"("hostId", "createdAt");
CREATE INDEX "SchedulingSession_shareCode_status_idx" ON "SchedulingSession"("shareCode", "status");

CREATE UNIQUE INDEX "SchedulingSessionSlot_sessionId_startsAt_endsAt_key" ON "SchedulingSessionSlot"("sessionId", "startsAt", "endsAt");
CREATE INDEX "SchedulingSessionSlot_sessionId_startsAt_idx" ON "SchedulingSessionSlot"("sessionId", "startsAt");

CREATE UNIQUE INDEX "SchedulingSessionParticipant_sessionId_userId_key" ON "SchedulingSessionParticipant"("sessionId", "userId");
CREATE INDEX "SchedulingSessionParticipant_userId_joinedAt_idx" ON "SchedulingSessionParticipant"("userId", "joinedAt");

CREATE UNIQUE INDEX "SchedulingSessionVote_slotId_participantId_key" ON "SchedulingSessionVote"("slotId", "participantId");
CREATE INDEX "SchedulingSessionVote_sessionId_slotId_idx" ON "SchedulingSessionVote"("sessionId", "slotId");

CREATE INDEX "SchedulingSessionMessage_sessionId_createdAt_idx" ON "SchedulingSessionMessage"("sessionId", "createdAt");

ALTER TABLE "SchedulingSession"
ADD CONSTRAINT "SchedulingSession_hostId_fkey"
FOREIGN KEY ("hostId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SchedulingSession"
ADD CONSTRAINT "SchedulingSession_finalHangoutId_fkey"
FOREIGN KEY ("finalHangoutId") REFERENCES "Hangout"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SchedulingSession"
ADD CONSTRAINT "SchedulingSession_finalizedSlotId_fkey"
FOREIGN KEY ("finalizedSlotId") REFERENCES "SchedulingSessionSlot"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SchedulingSessionSlot"
ADD CONSTRAINT "SchedulingSessionSlot_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "SchedulingSession"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchedulingSessionParticipant"
ADD CONSTRAINT "SchedulingSessionParticipant_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "SchedulingSession"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchedulingSessionParticipant"
ADD CONSTRAINT "SchedulingSessionParticipant_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SchedulingSessionVote"
ADD CONSTRAINT "SchedulingSessionVote_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "SchedulingSession"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchedulingSessionVote"
ADD CONSTRAINT "SchedulingSessionVote_slotId_fkey"
FOREIGN KEY ("slotId") REFERENCES "SchedulingSessionSlot"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchedulingSessionVote"
ADD CONSTRAINT "SchedulingSessionVote_participantId_fkey"
FOREIGN KEY ("participantId") REFERENCES "SchedulingSessionParticipant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchedulingSessionMessage"
ADD CONSTRAINT "SchedulingSessionMessage_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "SchedulingSession"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchedulingSessionMessage"
ADD CONSTRAINT "SchedulingSessionMessage_senderParticipantId_fkey"
FOREIGN KEY ("senderParticipantId") REFERENCES "SchedulingSessionParticipant"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
