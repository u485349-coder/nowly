ALTER TABLE "DirectThread"
ADD COLUMN "type" TEXT NOT NULL DEFAULT 'direct',
ADD COLUMN "imageUrl" TEXT;

ALTER TABLE "DirectThreadParticipant"
ADD COLUMN "lastReadAt" TIMESTAMP(3);

ALTER TABLE "DirectMessage"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "DirectThread"
SET "type" = CASE
  WHEN "title" IS NOT NULL THEN 'group'
  ELSE 'direct'
END;
