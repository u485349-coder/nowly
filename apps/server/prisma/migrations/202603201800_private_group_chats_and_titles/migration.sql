ALTER TABLE "DirectThread"
ALTER COLUMN "participantKey" DROP NOT NULL;

ALTER TABLE "DirectThread"
ADD COLUMN "title" TEXT,
ADD COLUMN "creatorId" TEXT;

ALTER TABLE "DirectThread"
ADD CONSTRAINT "DirectThread_creatorId_fkey"
FOREIGN KEY ("creatorId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "DirectThread_creatorId_createdAt_idx"
ON "DirectThread"("creatorId", "createdAt");
