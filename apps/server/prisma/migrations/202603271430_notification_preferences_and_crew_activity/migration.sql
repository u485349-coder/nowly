ALTER TABLE "User"
ADD COLUMN "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "inAppNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notificationSoundEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "messagePreviewEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "dmNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "pingNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "lastCrewSeenAt" TIMESTAMP(3);
