-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AvailabilityState" AS ENUM ('FREE_NOW', 'FREE_LATER', 'BUSY', 'DOWN_THIS_WEEKEND');

-- CreateEnum
CREATE TYPE "Vibe" AS ENUM ('FOOD', 'GYM', 'CHILL', 'PARTY', 'COFFEE', 'OUTDOORS');

-- CreateEnum
CREATE TYPE "EnergyLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "BudgetMood" AS ENUM ('LOW_SPEND', 'FLEXIBLE', 'TREAT_MYSELF');

-- CreateEnum
CREATE TYPE "SocialBattery" AS ENUM ('LOW_KEY', 'OPEN', 'SOCIAL');

-- CreateEnum
CREATE TYPE "HangoutIntent" AS ENUM ('QUICK_BITE', 'COFFEE_RUN', 'WALK_NEARBY', 'STUDY_SPRINT', 'PULL_UP', 'WORKOUT', 'QUICK_CHILL');

-- CreateEnum
CREATE TYPE "MicroCommitment" AS ENUM ('DROP_IN', 'QUICK_WINDOW', 'OPEN_ENDED');

-- CreateEnum
CREATE TYPE "MicroResponse" AS ENUM ('PULLING_UP', 'TEN_MIN_ONLY', 'MAYBE_LATER', 'PASS');

-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "HangoutStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ParticipantResponse" AS ENUM ('PENDING', 'ACCEPTED', 'SUGGESTED_CHANGE', 'DECLINED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'SYSTEM', 'ETA', 'LOCATION', 'POLL', 'REACTION');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('OVERLAP_FOUND', 'PROPOSAL_RECEIVED', 'PROPOSAL_ACCEPTED', 'GROUP_UPDATE', 'ETA_UPDATE', 'RECAP_READY', 'REMINDER', 'INVITE_NUDGE', 'WEEKLY_SUMMARY');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('HIGH', 'LOW');

-- CreateEnum
CREATE TYPE "NotificationIntensity" AS ENUM ('QUIET', 'BALANCED', 'LIVE');

-- CreateEnum
CREATE TYPE "InviteChannel" AS ENUM ('SMS', 'DISCORD', 'LINK');

-- CreateEnum
CREATE TYPE "DiscordPresence" AS ENUM ('ONLINE', 'IDLE', 'DND', 'OFFLINE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('OPEN', 'DISMISSED', 'CONVERTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "photoUrl" TEXT,
    "city" TEXT,
    "communityTag" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "responsivenessScore" DOUBLE PRECISION NOT NULL DEFAULT 0.55,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "inviteCode" TEXT NOT NULL,
    "discordId" TEXT,
    "discordUsername" TEXT,
    "discordAvatar" TEXT,
    "discordPresence" "DiscordPresence",
    "sharedServerCount" INTEGER NOT NULL DEFAULT 0,
    "notificationIntensity" "NotificationIntensity" NOT NULL DEFAULT 'BALANCED',
    "inactiveSince" TIMESTAMP(3),
    "referredById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilitySignal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "state" "AvailabilityState" NOT NULL,
    "radiusKm" INTEGER NOT NULL DEFAULT 8,
    "vibe" "Vibe",
    "energyLevel" "EnergyLevel",
    "budgetMood" "BudgetMood",
    "socialBattery" "SocialBattery",
    "hangoutIntent" "HangoutIntent",
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilitySignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "initiatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hangout" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "status" "HangoutStatus" NOT NULL DEFAULT 'PROPOSED',
    "activity" TEXT NOT NULL,
    "microType" "HangoutIntent",
    "commitmentLevel" "MicroCommitment" NOT NULL DEFAULT 'DROP_IN',
    "locationName" TEXT NOT NULL,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hangout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HangoutThread" (
    "id" TEXT NOT NULL,
    "hangoutId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HangoutThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HangoutParticipant" (
    "hangoutId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "responseStatus" "ParticipantResponse" NOT NULL DEFAULT 'PENDING',
    "microResponse" "MicroResponse",
    "respondedAt" TIMESTAMP(3),
    "etaMinutes" INTEGER,
    "lastSharedLat" DOUBLE PRECISION,
    "lastSharedLng" DOUBLE PRECISION,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HangoutParticipant_pkey" PRIMARY KEY ("hangoutId","userId")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "event" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "priority" "NotificationPriority" NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "payload" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "joinedUserId" TEXT,
    "inviteePhone" TEXT,
    "channel" "InviteChannel" NOT NULL,
    "deepLinkToken" TEXT NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscordServerConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscordServerConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OverlapMatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "matchedUserId" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "matchedSignalId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reason" JSONB NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'OPEN',
    "notifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OverlapMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecapMemory" (
    "id" TEXT NOT NULL,
    "hangoutId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "photoDropUrl" TEXT,
    "streakCount" INTEGER NOT NULL DEFAULT 1,
    "sharePayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecapMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteCode_key" ON "User"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");

-- CreateIndex
CREATE INDEX "OtpCode_phone_expiresAt_idx" ON "OtpCode"("phone", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");

-- CreateIndex
CREATE INDEX "DeviceToken_userId_active_idx" ON "DeviceToken"("userId", "active");

-- CreateIndex
CREATE INDEX "AvailabilitySignal_userId_isActive_expiresAt_idx" ON "AvailabilitySignal"("userId", "isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "Friendship_userAId_status_idx" ON "Friendship"("userAId", "status");

-- CreateIndex
CREATE INDEX "Friendship_userBId_status_idx" ON "Friendship"("userBId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_userAId_userBId_key" ON "Friendship"("userAId", "userBId");

-- CreateIndex
CREATE INDEX "Hangout_creatorId_status_idx" ON "Hangout"("creatorId", "status");

-- CreateIndex
CREATE INDEX "Hangout_scheduledFor_idx" ON "Hangout"("scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "HangoutThread_hangoutId_key" ON "HangoutThread"("hangoutId");

-- CreateIndex
CREATE INDEX "HangoutParticipant_userId_responseStatus_idx" ON "HangoutParticipant"("userId", "responseStatus");

-- CreateIndex
CREATE INDEX "Message_threadId_createdAt_idx" ON "Message"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_event_createdAt_idx" ON "AnalyticsEvent"("event", "createdAt");

-- CreateIndex
CREATE INDEX "NotificationLog_userId_sentAt_idx" ON "NotificationLog"("userId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_userId_type_dedupeKey_key" ON "NotificationLog"("userId", "type", "dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_deepLinkToken_key" ON "Invitation"("deepLinkToken");

-- CreateIndex
CREATE INDEX "DiscordServerConnection_serverId_idx" ON "DiscordServerConnection"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscordServerConnection_userId_serverId_key" ON "DiscordServerConnection"("userId", "serverId");

-- CreateIndex
CREATE INDEX "OverlapMatch_userId_status_expiresAt_idx" ON "OverlapMatch"("userId", "status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "OverlapMatch_userId_matchedUserId_signalId_matchedSignalId_key" ON "OverlapMatch"("userId", "matchedUserId", "signalId", "matchedSignalId");

-- CreateIndex
CREATE UNIQUE INDEX "RecapMemory_hangoutId_key" ON "RecapMemory"("hangoutId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySignal" ADD CONSTRAINT "AvailabilitySignal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hangout" ADD CONSTRAINT "Hangout_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangoutThread" ADD CONSTRAINT "HangoutThread_hangoutId_fkey" FOREIGN KEY ("hangoutId") REFERENCES "Hangout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangoutParticipant" ADD CONSTRAINT "HangoutParticipant_hangoutId_fkey" FOREIGN KEY ("hangoutId") REFERENCES "Hangout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HangoutParticipant" ADD CONSTRAINT "HangoutParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "HangoutThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_joinedUserId_fkey" FOREIGN KEY ("joinedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscordServerConnection" ADD CONSTRAINT "DiscordServerConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OverlapMatch" ADD CONSTRAINT "OverlapMatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OverlapMatch" ADD CONSTRAINT "OverlapMatch_matchedUserId_fkey" FOREIGN KEY ("matchedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OverlapMatch" ADD CONSTRAINT "OverlapMatch_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "AvailabilitySignal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OverlapMatch" ADD CONSTRAINT "OverlapMatch_matchedSignalId_fkey" FOREIGN KEY ("matchedSignalId") REFERENCES "AvailabilitySignal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecapMemory" ADD CONSTRAINT "RecapMemory_hangoutId_fkey" FOREIGN KEY ("hangoutId") REFERENCES "Hangout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecapMemory" ADD CONSTRAINT "RecapMemory_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

