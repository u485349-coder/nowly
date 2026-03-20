import {
  AnalyticsEventName,
  BudgetMood,
  EnergyLevel,
  HangoutIntent,
  MicroCommitment,
  MicroResponse,
  NotificationIntensity,
  ParticipantResponse,
  SocialBattery,
  Vibe,
} from "@nowly/shared";
import type { MobileAvailabilitySignal, SocialRadar } from "@nowly/shared";
import {
  demoFriends,
  demoHangouts,
  demoMatches,
  demoRadar,
  demoRecaps,
  demoSignal,
  demoThreads,
  demoUser,
} from "./demo-data";
import { AppFriend, AppHangout, AppUser, RecapCard, ThreadMessage } from "../types";

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
const demoMode = !API_URL || process.env.EXPO_PUBLIC_DEMO_MODE === "true";

const request = async <T>(
  path: string,
  options?: RequestInit & { token?: string | null },
): Promise<T> => {
  if (!API_URL) {
    throw new Error("API URL not configured");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.token
        ? {
            Authorization: `Bearer ${options.token}`,
          }
        : {}),
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed for ${path}`);
  }

  return response.json() as Promise<T>;
};

const normalizeUser = (
  user: Partial<AppUser> & {
    id: string;
    phone: string;
  },
) =>
  ({
    id: user.id,
    phone: user.phone,
    name: user.name ?? "Nowly user",
    city: user.city ?? "Somewhere nearby",
    communityTag: user.communityTag ?? null,
    photoUrl: user.photoUrl ?? null,
    responsivenessScore: user.responsivenessScore ?? 0.72,
    discordUsername: user.discordUsername ?? null,
    sharedServerCount: user.sharedServerCount ?? 0,
    notificationIntensity: user.notificationIntensity ?? "BALANCED",
    streakCount: (user as AppUser).streakCount ?? 1,
    invitesSent: (user as AppUser).invitesSent ?? 0,
    premium: (user as AppUser).premium ?? false,
    hasDiscordLinked: Boolean(user.discordUsername),
  }) as AppUser;

const normalizeFriend = (
  currentUserId: string,
  friendship: {
    id: string;
    status: "PENDING" | "ACCEPTED";
    lastSignal?: AppFriend["lastSignal"];
    insight?: AppFriend["insight"];
    userA: {
      id: string;
      name: string;
      city: string;
      communityTag?: string | null;
      photoUrl?: string | null;
      phone: string;
      responsivenessScore: number;
      sharedServerCount?: number;
      discordUsername?: string | null;
    };
    userB: {
      id: string;
      name: string;
      city: string;
      communityTag?: string | null;
      photoUrl?: string | null;
      phone: string;
      responsivenessScore: number;
      sharedServerCount?: number;
      discordUsername?: string | null;
    };
  },
): AppFriend => {
  const other = friendship.userA.id === currentUserId ? friendship.userB : friendship.userA;
  return {
    ...other,
    friendshipId: friendship.id,
    status: friendship.status,
    lastSignal: friendship.lastSignal,
    insight: friendship.insight,
    sharedLabel:
      other.sharedServerCount && other.sharedServerCount > 0
        ? `You share ${other.sharedServerCount} server${other.sharedServerCount > 1 ? "s" : ""}`
        : undefined,
  };
};

const normalizeHangout = (hangout: {
  id: string;
  activity: string;
  microType?: HangoutIntent | null;
  commitmentLevel?: MicroCommitment;
  locationName: string;
  scheduledFor: string;
  status: "PROPOSED" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  thread?: { id: string | null } | null;
  participants: Array<{
    userId: string;
    responseStatus: ParticipantResponse;
    microResponse?: MicroResponse | null;
    etaMinutes?: number | null;
    user?: { name?: string | null } | null;
  }>;
}): AppHangout => ({
  id: hangout.id,
  activity: hangout.activity,
  microType: hangout.microType,
  commitmentLevel: hangout.commitmentLevel,
  locationName: hangout.locationName,
  scheduledFor: hangout.scheduledFor,
  status: hangout.status === "CANCELLED" ? "PROPOSED" : hangout.status,
  threadId: hangout.thread?.id ?? `thread-${hangout.id}`,
  participants: hangout.participants.map((participant) => ({
    userId: participant.userId,
    responseStatus: participant.responseStatus,
    microResponse: participant.microResponse,
    etaMinutes: participant.etaMinutes,
  })),
  participantsInfo: hangout.participants.map((participant) => ({
    userId: participant.userId,
    name: participant.user?.name ?? "Friend",
    responseStatus: participant.responseStatus,
    microResponse: participant.microResponse,
    etaMinutes: participant.etaMinutes,
  })),
});

const normalizeMessage = (message: {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  type: "TEXT" | "SYSTEM" | "REACTION" | "POLL";
  createdAt: string;
  sender?: { name?: string | null } | null;
}): ThreadMessage => ({
  id: message.id,
  threadId: message.threadId,
  senderId: message.senderId,
  senderName: message.sender?.name ?? "Friend",
  text: message.text,
  type: message.type,
  createdAt: message.createdAt,
});

const localHangout = (input: {
  activity: string;
  microType?: HangoutIntent | null;
  commitmentLevel?: MicroCommitment;
  locationName: string;
  participantIds: string[];
  scheduledFor: string;
}): AppHangout => ({
  id: `hangout-${Date.now()}`,
  activity: input.activity,
  microType: input.microType ?? "PULL_UP",
  commitmentLevel: input.commitmentLevel ?? "DROP_IN",
  locationName: input.locationName,
  scheduledFor: input.scheduledFor,
  status: "PROPOSED",
  threadId: `thread-${Date.now()}`,
  participants: [
    {
      userId: demoUser.id,
      responseStatus: "ACCEPTED",
      microResponse: "PULLING_UP",
    },
    ...input.participantIds.map((participantId) => ({
      userId: participantId,
      responseStatus: "PENDING" as ParticipantResponse,
    })),
  ],
  participantsInfo: [
    {
      userId: demoUser.id,
      name: demoUser.name,
      responseStatus: "ACCEPTED",
      microResponse: "PULLING_UP",
    },
    ...input.participantIds.map((participantId) => {
      const friend = demoFriends.find((item) => item.id === participantId);
      return {
        userId: participantId,
        name: friend?.name ?? "Friend",
        responseStatus: "PENDING" as ParticipantResponse,
      };
    }),
  ],
});

export const api = {
  async requestOtp(phone: string) {
    if (demoMode) {
      return {
        ok: true,
        devCode: "111111",
      };
    }

    const response = await request<{ data: { ok: boolean; devCode?: string } }>(
      "/auth/request-otp",
      {
        method: "POST",
        body: JSON.stringify({ phone }),
      },
    );

    return response.data;
  },

  async verifyOtp(phone: string, code: string) {
    if (demoMode) {
      return {
        token: "demo-token",
        user: normalizeUser({
          ...demoUser,
          phone,
        }),
      };
    }

    const response = await request<{ data: { token: string; user: AppUser } }>(
      "/auth/verify-otp",
      {
        method: "POST",
        body: JSON.stringify({ phone, code }),
      },
    );

    return {
      token: response.data.token,
      user: normalizeUser(response.data.user),
    };
  },

  async completeOnboarding(
    token: string | null,
    payload: {
      name: string;
      city: string;
      communityTag?: string | null;
      photoUrl?: string | null;
      lat?: number | null;
      lng?: number | null;
      referralToken?: string;
    },
  ) {
    if (demoMode) {
      return normalizeUser({
        ...demoUser,
        ...payload,
      } as AppUser);
    }

    const response = await request<{ data: AppUser }>("/users/me/onboarding", {
      method: "PUT",
      token,
      body: JSON.stringify(payload),
    });

    return normalizeUser(response.data);
  },

  async fetchDashboard(token: string | null, currentUserId?: string) {
    if (demoMode) {
      return {
        friends: demoFriends,
        matches: demoMatches,
        hangouts: demoHangouts,
        recaps: demoRecaps,
        activeSignal: demoSignal,
        radar: demoRadar,
      };
    }

    const [friends, matches, hangouts, recaps, activeSignal, radar] = await Promise.all([
      request<{
        data: Array<{
          id: string;
          status: "PENDING" | "ACCEPTED";
          lastSignal?: AppFriend["lastSignal"];
          insight?: AppFriend["insight"];
          userA: AppFriend;
          userB: AppFriend;
        }>;
      }>("/friends", {
        token,
      }),
      request<{ data: typeof demoMatches }>("/hangouts/matches", { token }),
      request<{ data: Array<Parameters<typeof normalizeHangout>[0]> }>("/hangouts", {
        token,
      }),
      request<{ data: RecapCard[] }>("/hangouts/recaps", { token }),
      request<{ data: typeof demoSignal[] }>("/availability/signals", { token }),
      request<{ data: SocialRadar }>("/hangouts/radar", { token }),
    ]);

    return {
      friends: currentUserId
        ? friends.data.map((friendship) => normalizeFriend(currentUserId, friendship))
        : [],
      matches: matches.data,
      hangouts: hangouts.data.map((hangout) => normalizeHangout(hangout)),
      recaps: recaps.data.map((recap) => ({
        id: recap.id,
        hangoutId: recap.hangoutId,
        title: recap.title,
        summary: recap.summary,
        badge: "Crew made it out",
        streakCount: recap.streakCount,
        shareLabel: "Share recap",
      })),
      activeSignal: activeSignal.data[0] ?? null,
      radar: radar.data,
    };
  },

  async fetchFriendSuggestions(token: string | null): Promise<AppFriend[]> {
    if (demoMode) {
      return demoFriends.filter((friend) => friend.status === "PENDING");
    }

    const response = await request<{
      data: Array<{
        id: string;
        name: string;
        city: string;
        communityTag?: string | null;
        photoUrl?: string | null;
        phone: string;
        responsivenessScore: number;
        sharedServerCount?: number;
        discordUsername?: string | null;
        localLabel?: string | null;
      }>;
    }>("/friends/suggestions", {
      token,
    });

    return response.data.map((friend) => ({
      ...friend,
      friendshipId: `suggestion-${friend.id}`,
      status: "PENDING",
      sharedLabel:
        friend.localLabel ||
        (friend.sharedServerCount && friend.sharedServerCount > 0
          ? `You share ${friend.sharedServerCount} server${friend.sharedServerCount > 1 ? "s" : ""}`
          : undefined),
    }));
  },

  async sendInvite(token: string | null, phoneNumbers: string[]) {
    if (demoMode) {
      return phoneNumbers.map((phoneNumber) => ({
        inviteLink: `nowly://invite/${phoneNumber.replace(/\D/g, "")}`,
        smsTemplate: `Anyone free tonight? Let's link on Nowly -> nowly://invite/${phoneNumber.replace(/\D/g, "")}`,
      }));
    }

    const response = await request<{ data: Array<{ inviteLink: string; smsTemplate: string }> }>(
      "/friends/invite",
      {
        method: "POST",
        token,
        body: JSON.stringify({ phoneNumbers, channel: "SMS" }),
      },
    );

    return response.data;
  },

  async requestFriend(token: string | null, userId: string) {
    if (demoMode) {
      return { ok: true };
    }

    return request("/friends/request", {
      method: "POST",
      token,
      body: JSON.stringify({ userId }),
    });
  },

  async setAvailability(
    token: string | null,
    payload: {
      state: string;
      radiusKm: number;
      vibe?: Vibe | null;
      energyLevel?: EnergyLevel | null;
      budgetMood?: BudgetMood | null;
      socialBattery?: SocialBattery | null;
      hangoutIntent?: HangoutIntent | null;
      durationHours?: number;
    },
  ): Promise<MobileAvailabilitySignal> {
    if (demoMode) {
      return {
        ...demoSignal,
        ...payload,
        state: payload.state as MobileAvailabilitySignal["state"],
        expiresAt: new Date(
          Date.now() + (payload.durationHours ?? 3) * 60 * 60 * 1000,
        ).toISOString(),
      } as MobileAvailabilitySignal;
    }

    const response = await request<{ data: typeof demoSignal }>("/availability/signals", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });

    return response.data;
  },

  async createHangout(
    token: string | null,
    payload: {
      activity: string;
      microType?: HangoutIntent | null;
      commitmentLevel?: MicroCommitment;
      locationName: string;
      participantIds: string[];
      scheduledFor: string;
    },
  ) {
    if (demoMode) {
      return localHangout(payload);
    }

    const response = await request<{ data: AppHangout }>("/hangouts", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });

    return normalizeHangout(response.data as Parameters<typeof normalizeHangout>[0]);
  },

  async respondToHangout(
    token: string | null,
    hangoutId: string,
    payload: {
      responseStatus?: ParticipantResponse;
      microResponse?: MicroResponse | null;
    },
  ) {
    if (demoMode) {
      return { ok: true };
    }

    return request(`/hangouts/${hangoutId}/respond`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });
  },

  async fetchThreadMessages(token: string | null, threadId: string) {
    if (demoMode) {
      return demoThreads[threadId] ?? [];
    }

    const response = await request<{ data: ThreadMessage[] }>(
      `/hangouts/threads/${threadId}/messages`,
      { token },
    );

    return response.data.map((message) =>
      normalizeMessage(message as unknown as Parameters<typeof normalizeMessage>[0]),
    );
  },

  async createRecap(token: string | null, hangoutId: string) {
    if (demoMode) {
      return demoRecaps[0] as RecapCard;
    }

    const response = await request<{ data: RecapCard }>(`/hangouts/${hangoutId}/recap`, {
      method: "POST",
      token,
      body: JSON.stringify({ didHang: true }),
    });

    return {
      id: response.data.id,
      hangoutId: response.data.hangoutId,
      title: response.data.title,
      summary: response.data.summary,
      badge: "Crew made it out",
      streakCount: response.data.streakCount,
      shareLabel: "Share recap",
    };
  },

  async updateNotificationPreference(
    token: string | null,
    notificationIntensity: NotificationIntensity,
  ) {
    if (demoMode) {
      return normalizeUser({
        ...demoUser,
        notificationIntensity,
      });
    }

    const response = await request<{ data: AppUser }>("/users/me/preferences", {
      method: "PATCH",
      token,
      body: JSON.stringify({ notificationIntensity }),
    });

    return normalizeUser(response.data);
  },

  async registerPushToken(token: string | null, pushToken: string) {
    if (demoMode) {
      return { ok: true };
    }

    return request("/auth/device-token", {
      method: "POST",
      token,
      body: JSON.stringify({
        token: pushToken,
        platform: "expo",
      }),
    });
  },

  async track(token: string | null, event: AnalyticsEventName, payload?: Record<string, unknown>) {
    if (demoMode) {
      console.log("[analytics]", event, payload ?? {});
      return { ok: true };
    }

    return request("/analytics/events", {
      method: "POST",
      token,
      body: JSON.stringify({ event, payload }),
    });
  },

  async getDiscordOauthUrl(token: string | null) {
    if (demoMode) {
      return "https://discord.com";
    }

    const response = await request<{ data: { url: string } }>("/discord/oauth-url", {
      token,
    });

    return response.data.url;
  },
};
