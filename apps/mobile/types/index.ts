import {
  AvailabilityState,
  FriendInsight,
  MobileHangout,
  MobileMatch,
  NotificationIntensity,
  MobileUser,
  ParticipantResponse,
  SocialRadar,
  MicroResponse,
} from "@nowly/shared";

export type AppUser = MobileUser & {
  streakCount: number;
  invitesSent: number;
  premium: boolean;
  hasDiscordLinked: boolean;
  notificationIntensity: NotificationIntensity;
};

export type AppFriend = MobileUser & {
  friendshipId: string;
  status: "ACCEPTED" | "PENDING";
  lastSignal?: AvailabilityState;
  sharedLabel?: string;
  insight?: FriendInsight;
};

export type AppMatch = MobileMatch & {
  distanceLabel?: string;
};

export type AppHangout = MobileHangout & {
  threadId: string;
  participantsInfo: Array<{
    userId: string;
    name: string;
    responseStatus: ParticipantResponse;
    microResponse?: MicroResponse | null;
    etaMinutes?: number | null;
  }>;
};

export type ThreadMessage = {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  text: string;
  type: "TEXT" | "SYSTEM" | "REACTION" | "POLL";
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type RecapCard = {
  id: string;
  hangoutId: string;
  title: string;
  summary: string;
  badge: string;
  streakCount: number;
  shareLabel: string;
};

export type AppRadar = SocialRadar;
