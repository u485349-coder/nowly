export const availabilityStates = [
  "FREE_NOW",
  "FREE_LATER",
  "BUSY",
  "DOWN_THIS_WEEKEND",
] as const;

export type AvailabilityState = (typeof availabilityStates)[number];

export const vibeOptions = [
  "FOOD",
  "GYM",
  "CHILL",
  "PARTY",
  "COFFEE",
  "OUTDOORS",
] as const;

export type Vibe = (typeof vibeOptions)[number];

export const energyLevels = ["LOW", "MEDIUM", "HIGH"] as const;
export type EnergyLevel = (typeof energyLevels)[number];

export const budgetMoods = ["LOW_SPEND", "FLEXIBLE", "TREAT_MYSELF"] as const;
export type BudgetMood = (typeof budgetMoods)[number];

export const socialBatteryLevels = ["LOW_KEY", "OPEN", "SOCIAL"] as const;
export type SocialBattery = (typeof socialBatteryLevels)[number];

export const hangoutIntentOptions = [
  "QUICK_BITE",
  "COFFEE_RUN",
  "WALK_NEARBY",
  "STUDY_SPRINT",
  "PULL_UP",
  "WORKOUT",
  "QUICK_CHILL",
] as const;

export type HangoutIntent = (typeof hangoutIntentOptions)[number];

export const microCommitments = ["DROP_IN", "QUICK_WINDOW", "OPEN_ENDED"] as const;
export type MicroCommitment = (typeof microCommitments)[number];

export const microResponses = [
  "PULLING_UP",
  "TEN_MIN_ONLY",
  "MAYBE_LATER",
  "PASS",
] as const;

export type MicroResponse = (typeof microResponses)[number];

export const notificationIntensities = ["QUIET", "BALANCED", "LIVE"] as const;
export type NotificationIntensity = (typeof notificationIntensities)[number];

export type MatchReason = {
  sharedVibe?: Vibe | null;
  sharedIntent?: HangoutIntent | null;
  travelMinutes?: number | null;
  discordBonus?: number;
  overlapMinutes: number;
  relationshipScore?: number;
  identityScore?: number;
  timingLabel?: string | null;
  momentumLabel?: string | null;
  localDensityLabel?: string | null;
};

export type NowlyNotificationType =
  | "OVERLAP_FOUND"
  | "PROPOSAL_RECEIVED"
  | "PROPOSAL_ACCEPTED"
  | "GROUP_UPDATE"
  | "ETA_UPDATE"
  | "RECAP_READY"
  | "REMINDER"
  | "INVITE_NUDGE"
  | "WEEKLY_SUMMARY";

export type ApiListResponse<T> = {
  data: T[];
};

export type ApiItemResponse<T> = {
  data: T;
};

export type FriendInsight = {
  hangoutLikelihood: number;
  reliabilityLabel: string;
  cadenceNote: string;
  clusterLabel?: string | null;
  lastSignal?: AvailabilityState | null;
  momentumLabel?: string | null;
};

export type MobileUser = {
  id: string;
  name: string;
  city: string;
  communityTag?: string | null;
  photoUrl?: string | null;
  phone: string;
  responsivenessScore: number;
  discordUsername?: string | null;
  sharedServerCount?: number;
  notificationIntensity?: NotificationIntensity;
};

export type MobileAvailabilitySignal = {
  id: string;
  state: AvailabilityState;
  radiusKm: number;
  vibe?: Vibe | null;
  energyLevel?: EnergyLevel | null;
  budgetMood?: BudgetMood | null;
  socialBattery?: SocialBattery | null;
  hangoutIntent?: HangoutIntent | null;
  expiresAt: string;
  createdAt: string;
};

export type MobileMatch = {
  id: string;
  score: number;
  reason: MatchReason;
  matchedUser: MobileUser;
  availability: MobileAvailabilitySignal;
  matchedSignal: MobileAvailabilitySignal;
  status: "OPEN" | "DISMISSED" | "CONVERTED" | "EXPIRED";
  insightLabel?: string | null;
};

export type HangoutStatus =
  | "PROPOSED"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";

export type ParticipantResponse =
  | "PENDING"
  | "ACCEPTED"
  | "SUGGESTED_CHANGE"
  | "DECLINED";

export type MobileHangout = {
  id: string;
  activity: string;
  microType?: HangoutIntent | null;
  commitmentLevel?: MicroCommitment;
  locationName: string;
  scheduledFor: string;
  status: HangoutStatus;
  participants: Array<{
    userId: string;
    responseStatus: ParticipantResponse;
    microResponse?: MicroResponse | null;
    etaMinutes?: number | null;
  }>;
};

export type SocialRhythmSummary = {
  state: "QUIET" | "WARM" | "LIVE";
  headline: string;
  detail: string;
  bestWindow: string;
  activeNowCount: number;
  nearbyFriendsCount: number;
  cadenceDays: number | null;
  livePrompt: string;
  communityLabel?: string | null;
};

export type LocalDensitySummary = {
  communityLabel?: string | null;
  nearbyFriendsCount: number;
  activeNowCount: number;
  densityLabel: string;
};

export type SocialRadar = {
  rhythm: SocialRhythmSummary;
  localDensity: LocalDensitySummary;
  suggestionLine: string;
};

export type AnalyticsEventName =
  | "account_created"
  | "onboarding_completed"
  | "contact_invite_sent"
  | "friend_joined"
  | "availability_set"
  | "overlap_found"
  | "proposal_sent"
  | "proposal_accepted"
  | "group_thread_created"
  | "message_sent"
  | "hangout_confirmed"
  | "recap_shared"
  | "user_reactivated";
