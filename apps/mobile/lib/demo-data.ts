import {
  FriendInsight,
  MobileAvailabilitySignal,
  MobileMatch,
} from "@nowly/shared";
import {
  AppFriend,
  AppHangout,
  AppRadar,
  AppUser,
  RecapCard,
  ThreadMessage,
} from "../types";

const jordanInsight: FriendInsight = {
  hangoutLikelihood: 0.88,
  reliabilityLabel: "usually follows through",
  cadenceNote: "You two usually click tonight",
  clusterLabel: "Same NYU",
  lastSignal: "FREE_NOW",
  momentumLabel: "recently active",
};

const minaInsight: FriendInsight = {
  hangoutLikelihood: 0.72,
  reliabilityLabel: "better with softer invites",
  cadenceNote: "Best with casual, low-pressure invites",
  clusterLabel: "Brooklyn crew",
  lastSignal: "FREE_LATER",
  momentumLabel: "steady rhythm",
};

export const demoUser: AppUser = {
  id: "user-avery",
  name: "Avery",
  city: "New York",
  photoUrl: null,
  phone: "+15550000001",
  responsivenessScore: 0.89,
  discordUsername: "averyloop",
  communityTag: "NYU",
  sharedServerCount: 3,
  streakCount: 4,
  invitesSent: 7,
  premium: false,
  hasDiscordLinked: true,
  notificationIntensity: "BALANCED",
};

export const demoFriends: AppFriend[] = [
  {
    id: "user-jordan",
    friendshipId: "friend-jordan",
    name: "Jordan",
    city: "Lower East Side",
    photoUrl: null,
    phone: "+15550000002",
    responsivenessScore: 0.83,
    discordUsername: "jordango",
    communityTag: "NYU",
    sharedServerCount: 2,
    status: "ACCEPTED",
    lastSignal: "FREE_NOW",
    sharedLabel: "You share 2 servers",
    insight: jordanInsight,
  },
  {
    id: "user-mina",
    friendshipId: "friend-mina",
    name: "Mina",
    city: "Brooklyn",
    photoUrl: null,
    phone: "+15550000003",
    responsivenessScore: 0.75,
    communityTag: "Brooklyn crew",
    sharedServerCount: 1,
    status: "ACCEPTED",
    lastSignal: "FREE_LATER",
    sharedLabel: "You share a server",
    insight: minaInsight,
  },
  {
    id: "user-leo",
    friendshipId: "friend-leo",
    name: "Leo",
    city: "Queens",
    photoUrl: null,
    phone: "+15550000004",
    responsivenessScore: 0.66,
    communityTag: "Queens nights",
    sharedServerCount: 0,
    status: "PENDING",
    lastSignal: "BUSY",
  },
];

export const demoSignal: MobileAvailabilitySignal = {
  id: "signal-avery",
  state: "FREE_NOW",
  radiusKm: 8,
  vibe: "COFFEE",
  energyLevel: "MEDIUM",
  budgetMood: "LOW_SPEND",
  socialBattery: "OPEN",
  hangoutIntent: "COFFEE_RUN",
  expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
};

export const demoMatches: MobileMatch[] = [
  {
    id: "match-jordan",
    score: 0.91,
    reason: {
      overlapMinutes: 122,
      travelMinutes: 12,
      sharedVibe: "FOOD",
      sharedIntent: "QUICK_BITE",
      discordBonus: 0.05,
      relationshipScore: 0.88,
      identityScore: 0.8,
      timingLabel: "tonight",
      momentumLabel: "recently active",
      localDensityLabel: "Same NYU",
    },
    matchedUser: demoFriends[0],
    insightLabel: "recently active",
    availability: demoSignal,
    matchedSignal: {
      id: "signal-jordan",
      state: "FREE_NOW",
      radiusKm: 8,
      vibe: "FOOD",
      energyLevel: "HIGH",
      budgetMood: "FLEXIBLE",
      socialBattery: "SOCIAL",
      hangoutIntent: "QUICK_BITE",
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    },
    status: "OPEN",
  },
  {
    id: "match-mina",
    score: 0.77,
    reason: {
      overlapMinutes: 188,
      travelMinutes: 18,
      sharedVibe: "CHILL",
      sharedIntent: "QUICK_CHILL",
      discordBonus: 0.03,
      relationshipScore: 0.72,
      identityScore: 0.78,
      timingLabel: "after class",
      momentumLabel: "steady rhythm",
      localDensityLabel: "Brooklyn crew",
    },
    matchedUser: demoFriends[1],
    insightLabel: "steady rhythm",
    availability: demoSignal,
    matchedSignal: {
      id: "signal-mina",
      state: "FREE_LATER",
      radiusKm: 12,
      vibe: "CHILL",
      energyLevel: "LOW",
      budgetMood: "LOW_SPEND",
      socialBattery: "LOW_KEY",
      hangoutIntent: "QUICK_CHILL",
      expiresAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    },
    status: "OPEN",
  },
];

export const demoHangouts: AppHangout[] = [
  {
    id: "hangout-ramen",
    activity: "grab ramen",
    microType: "QUICK_BITE",
    commitmentLevel: "QUICK_WINDOW",
    locationName: "St. Marks",
    scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    status: "CONFIRMED",
    threadId: "thread-ramen",
    participants: [
      {
        userId: demoUser.id,
        responseStatus: "ACCEPTED",
        microResponse: "PULLING_UP",
        etaMinutes: 10,
      },
      {
        userId: demoFriends[0].id,
        responseStatus: "ACCEPTED",
        microResponse: "TEN_MIN_ONLY",
        etaMinutes: 12,
      },
    ],
    participantsInfo: [
      {
        userId: demoUser.id,
        name: demoUser.name,
        responseStatus: "ACCEPTED",
        microResponse: "PULLING_UP",
        etaMinutes: 10,
      },
      {
        userId: demoFriends[0].id,
        name: demoFriends[0].name,
        responseStatus: "ACCEPTED",
        microResponse: "TEN_MIN_ONLY",
        etaMinutes: 12,
      },
    ],
  },
  {
    id: "hangout-group",
    activity: "late coffee crawl",
    microType: "COFFEE_RUN",
    commitmentLevel: "DROP_IN",
    locationName: "West Village",
    scheduledFor: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    status: "PROPOSED",
    threadId: "thread-group",
    participants: [
      {
        userId: demoUser.id,
        responseStatus: "ACCEPTED",
      },
      {
        userId: demoFriends[0].id,
        responseStatus: "PENDING",
      },
      {
        userId: demoFriends[1].id,
        responseStatus: "PENDING",
      },
    ],
    participantsInfo: [
      {
        userId: demoUser.id,
        name: demoUser.name,
        responseStatus: "ACCEPTED",
      },
      {
        userId: demoFriends[0].id,
        name: demoFriends[0].name,
        responseStatus: "PENDING",
      },
      {
        userId: demoFriends[1].id,
        name: demoFriends[1].name,
        responseStatus: "PENDING",
      },
    ],
  },
];

export const demoThreads: Record<string, ThreadMessage[]> = {
  "thread-ramen": [
    {
      id: "message-1",
      threadId: "thread-ramen",
      senderId: demoUser.id,
      senderName: demoUser.name,
      text: "Down for noodles at 8?",
      type: "TEXT",
      createdAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    },
    {
      id: "message-2",
      threadId: "thread-ramen",
      senderId: demoFriends[0].id,
      senderName: demoFriends[0].name,
      text: "Absolutely.",
      type: "TEXT",
      createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    },
  ],
  "thread-group": [
    {
      id: "message-3",
      threadId: "thread-group",
      senderId: demoUser.id,
      senderName: demoUser.name,
      text: "Who's free tonight?",
      type: "SYSTEM",
      createdAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    },
  ],
};

export const demoRecaps: RecapCard[] = [
  {
    id: "recap-1",
    hangoutId: "hangout-ramen",
    title: "Noodle night streak",
    summary: "Quick plan, real night out, zero overthinking.",
    badge: "Crew made it out",
    streakCount: 4,
    shareLabel: "Share recap",
  },
];

export const demoRadar: AppRadar = {
  rhythm: {
    state: "LIVE",
    headline: "Your crew is moving",
    detail: "2 friends look open around NYU right now.",
    bestWindow: "tonight",
    activeNowCount: 2,
    nearbyFriendsCount: 2,
    cadenceDays: 2,
    livePrompt: "Use a low-pressure prompt before the window fades.",
    communityLabel: "NYU",
  },
  localDensity: {
    communityLabel: "NYU",
    nearbyFriendsCount: 2,
    activeNowCount: 2,
    densityLabel: "local crew building",
  },
  suggestionLine: "Best chance is tonight. Lead with a quick drop-in prompt.",
};
