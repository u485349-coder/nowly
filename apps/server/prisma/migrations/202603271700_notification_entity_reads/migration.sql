ALTER TABLE "User"
ADD COLUMN "lastFriendRequestsSeenAt" TIMESTAMP(3);

ALTER TABLE "HangoutParticipant"
ADD COLUMN "lastProposalReadAt" TIMESTAMP(3),
ADD COLUMN "lastThreadReadAt" TIMESTAMP(3);
