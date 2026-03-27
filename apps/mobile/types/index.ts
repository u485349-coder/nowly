import {
  AvailabilityState,
  FriendInsight,
  MobileHangout,
  MobileMatch,
  MobileRecurringAvailabilityWindow,
  MobileScheduledOverlap,
  NotificationIntensity,
  MobileUser,
  ParticipantResponse,
  SocialRadar,
  MicroResponse,
} from "@nowly/shared";

export type DateSpecificAvailabilityWindow = {
  id: string;
  dateKey: string;
  startInput: string;
  endInput: string;
};

export type AppUser = MobileUser & {
  onboardingCompleted: boolean;
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
  requestDirection?: "INCOMING" | "OUTGOING" | null;
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

export type DirectChat = {
  id: string;
  title?: string | null;
  isGroup: boolean;
  memberCount: number;
  participants: MobileUser[];
  lastMessageText?: string | null;
  lastMessageAt?: string | null;
  createdAt: string;
};

export type DirectMessage = {
  id: string;
  chatId: string;
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

export type AppRecurringAvailabilityWindow = MobileRecurringAvailabilityWindow;

export type AppScheduledOverlap = MobileScheduledOverlap;
