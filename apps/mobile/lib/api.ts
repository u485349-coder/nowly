import {
  AnalyticsEventName,
  BudgetMood,
  EnergyLevel,
  HangoutIntent,
  MicroCommitment,
  MicroResponse,
  MobileGroupSchedulingMessage,
  MobileGroupSchedulingSession,
  NotificationIntensity,
  parseSignalLabelMetadata,
  ParticipantResponse,
  SchedulingDecisionMode,
  SchedulingVisibilityMode,
  SchedulingVoteState,
  SocialBattery,
  Vibe,
} from "@nowly/shared";
import { Platform } from "react-native";
import type {
  MobileAvailabilitySignal,
  MobileBookingProfile,
  MobileRecurringAvailabilityWindow,
  MobileScheduledOverlap,
  SocialRadar,
} from "@nowly/shared";
import {
  demoDirectChats,
  demoDirectMessages,
  demoFriends,
  demoHangouts,
  demoMatches,
  demoRadar,
  demoRecaps,
  demoRecurringWindows,
  demoScheduledOverlaps,
  demoSignal,
  demoSuggestions,
  demoThreads,
  demoUser,
} from "./demo-data";
import { createSmartOpenUrl, createSmartOpenUrlForTargets } from "./smart-links";
import { AppFriend, AppHangout, AppMatch, AppUser, RecapCard, ThreadMessage } from "../types";
import { DirectChat, DirectMessage } from "../types";

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
    onboardingCompleted: Boolean((user as Partial<AppUser>).onboardingCompleted),
    communityTag: user.communityTag ?? null,
    photoUrl: user.photoUrl ?? null,
    inviteCode: user.inviteCode,
    responsivenessScore: user.responsivenessScore ?? 0.72,
    discordUsername: user.discordUsername ?? null,
    sharedServerCount: user.sharedServerCount ?? 0,
    notificationIntensity: user.notificationIntensity ?? "BALANCED",
    streakCount: (user as AppUser).streakCount ?? 1,
    invitesSent: (user as AppUser).invitesSent ?? 0,
    premium: (user as AppUser).premium ?? false,
    hasDiscordLinked: Boolean(user.discordUsername),
  }) as AppUser;

const normalizeSignal = (
  signal: MobileAvailabilitySignal,
): MobileAvailabilitySignal => {
  const metadata = parseSignalLabelMetadata(signal.label);

  return {
    ...signal,
    label: metadata.label,
    meetMode: metadata.meetMode,
    crowdMode: metadata.crowdMode,
    onlineVenue: metadata.onlineVenue,
  };
};

const normalizeMatch = (match: AppMatch): AppMatch => ({
  ...match,
  availability: normalizeSignal(match.availability),
  matchedSignal: normalizeSignal(match.matchedSignal),
});

const normalizeFriend = (
  currentUserId: string,
  friendship: {
    id: string;
    status: "PENDING" | "ACCEPTED";
    initiatedBy?: string | null;
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
    requestDirection:
      friendship.status === "PENDING"
        ? friendship.initiatedBy === currentUserId
          ? "OUTGOING"
          : "INCOMING"
        : null,
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

const normalizeDirectChat = (
  chat: {
    id: string;
    title?: string | null;
    isGroup?: boolean;
    memberCount?: number;
    createdAt: string;
    lastMessageAt?: string | null;
    participants?: Array<Partial<AppFriend>> | null;
    latestMessage?: {
      text?: string | null;
      createdAt?: string | null;
    } | null;
  },
): DirectChat => ({
  id: chat.id,
  title: chat.title ?? null,
  isGroup: Boolean(chat.isGroup),
  memberCount: chat.memberCount ?? ((chat.participants?.length ?? 0) + 1),
  createdAt: chat.createdAt,
  lastMessageAt: chat.lastMessageAt ?? chat.latestMessage?.createdAt ?? null,
  lastMessageText: chat.latestMessage?.text ?? null,
  participants: (chat.participants ?? []).map((participant, index) =>
    normalizeUser({
      id: participant.id ?? `participant-${index}`,
      phone: participant.phone ?? "+10000000000",
      name: participant.name ?? "Friend",
      city: participant.city ?? "Nearby",
      communityTag: participant.communityTag ?? null,
      photoUrl: participant.photoUrl ?? null,
      responsivenessScore: participant.responsivenessScore ?? 0.7,
      discordUsername: participant.discordUsername ?? null,
      sharedServerCount: participant.sharedServerCount ?? 0,
    }),
  ),
});

const normalizeDirectMessage = (message: {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  type: "TEXT" | "SYSTEM" | "REACTION" | "POLL";
  createdAt: string;
  sender?: { name?: string | null } | null;
}): DirectMessage => ({
  id: message.id,
  chatId: message.threadId,
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
        matches: demoMatches.map((match) => normalizeMatch(match as AppMatch)),
        hangouts: demoHangouts,
        recaps: demoRecaps,
        activeSignal: normalizeSignal(demoSignal),
        recurringWindows: demoRecurringWindows,
        scheduledOverlaps: demoScheduledOverlaps,
        radar: demoRadar,
      };
    }

    const [friends, matches, hangouts, recaps, activeSignal, recurringWindows, scheduledOverlaps, radar] = await Promise.all([
      request<{
        data: Array<{
          id: string;
          status: "PENDING" | "ACCEPTED";
          initiatedBy?: string | null;
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
      request<{ data: typeof demoRecurringWindows }>("/availability/recurring", { token }),
      request<{ data: typeof demoScheduledOverlaps }>("/hangouts/scheduled-overlaps", {
        token,
      }),
      request<{ data: SocialRadar }>("/hangouts/radar", { token }),
    ]);

    return {
      friends: currentUserId
        ? friends.data.map((friendship) => normalizeFriend(currentUserId, friendship))
        : [],
      matches: matches.data.map((match) => normalizeMatch(match as AppMatch)),
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
      activeSignal: activeSignal.data[0] ? normalizeSignal(activeSignal.data[0] as MobileAvailabilitySignal) : null,
      recurringWindows: recurringWindows.data,
      scheduledOverlaps: scheduledOverlaps.data,
      radar: radar.data,
    };
  },

  async fetchFriendSuggestions(token: string | null): Promise<AppFriend[]> {
    if (demoMode) {
      return demoSuggestions;
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
      requestDirection: null,
      sharedLabel:
        friend.localLabel ||
        (friend.sharedServerCount && friend.sharedServerCount > 0
          ? `You share ${friend.sharedServerCount} server${friend.sharedServerCount > 1 ? "s" : ""}`
          : undefined),
    }));
  },

  async fetchFriends(token: string | null, currentUserId: string): Promise<AppFriend[]> {
    if (demoMode) {
      return demoFriends;
    }

    const response = await request<{
      data: Array<{
        id: string;
        status: "PENDING" | "ACCEPTED";
        initiatedBy?: string | null;
        lastSignal?: AppFriend["lastSignal"];
        insight?: AppFriend["insight"];
        userA: AppFriend;
        userB: AppFriend;
      }>;
    }>("/friends", {
      token,
    });

    return response.data.map((friendship) => normalizeFriend(currentUserId, friendship));
  },

  async fetchDirectChats(token: string | null): Promise<DirectChat[]> {
    if (demoMode) {
      return demoDirectChats;
    }

    const response = await request<{ data: Array<Parameters<typeof normalizeDirectChat>[0]> }>(
      "/chats",
      {
        token,
      },
    );

    return response.data.map((chat) => normalizeDirectChat(chat));
  },

  async openDirectChat(token: string | null, userId: string): Promise<DirectChat> {
    if (demoMode) {
      return (
        demoDirectChats.find(
          (chat) => !chat.isGroup && chat.participants.some((participant) => participant.id === userId),
        ) ?? {
          id: `chat-${userId}`,
          title: null,
          isGroup: false,
          memberCount: 2,
          participants: [demoFriends.find((friend) => friend.id === userId) ?? demoFriends[0]],
          createdAt: new Date().toISOString(),
          lastMessageAt: null,
          lastMessageText: null,
        }
      );
    }

    try {
      const response = await request<{ data: Parameters<typeof normalizeDirectChat>[0] }>(
        "/chats/direct",
        {
          method: "POST",
          token,
          body: JSON.stringify({ userId }),
        },
      );

      return normalizeDirectChat(response.data);
    } catch (error) {
      const existingChats = await this.fetchDirectChats(token);
      const existingOneOnOne = existingChats.find(
        (chat) =>
          !chat.isGroup &&
          chat.participants.some((participant) => participant.id === userId),
      );

      if (existingOneOnOne) {
        return existingOneOnOne;
      }

      throw error;
    }
  },

  async createGroupChat(
    token: string | null,
    payload: { title?: string | null; participantIds: string[]; idempotencyKey?: string },
  ): Promise<DirectChat> {
    if (demoMode) {
      return {
        id: `chat-group-${Date.now()}`,
        title: payload.title?.trim() || "New group chat",
        isGroup: true,
        memberCount: payload.participantIds.length + 1,
        participants: demoFriends.filter((friend) => payload.participantIds.includes(friend.id)),
        createdAt: new Date().toISOString(),
        lastMessageAt: null,
        lastMessageText: null,
      };
    }

    const response = await request<{ data: Parameters<typeof normalizeDirectChat>[0] }>(
      "/chats/group",
      {
        method: "POST",
        token,
        headers: payload.idempotencyKey
          ? {
              "x-idempotency-key": payload.idempotencyKey,
            }
          : undefined,
        body: JSON.stringify({
          title: payload.title,
          participantIds: payload.participantIds,
        }),
      },
    );

    return normalizeDirectChat(response.data);
  },

  async fetchDirectChat(token: string | null, chatId: string): Promise<DirectChat> {
    if (demoMode) {
      return demoDirectChats.find((chat) => chat.id === chatId) ?? demoDirectChats[0];
    }

    const response = await request<{ data: Parameters<typeof normalizeDirectChat>[0] }>(
      `/chats/${chatId}`,
      { token },
    );

    return normalizeDirectChat(response.data);
  },

  async fetchDirectMessages(token: string | null, chatId: string): Promise<DirectMessage[]> {
    if (demoMode) {
      return demoDirectMessages[chatId] ?? [];
    }

    const response = await request<{ data: Array<Parameters<typeof normalizeDirectMessage>[0]> }>(
      `/chats/${chatId}/messages`,
      { token },
    );

    return response.data.map((message) => normalizeDirectMessage(message));
  },

  async sendDirectMessage(token: string | null, chatId: string, text: string) {
    if (demoMode) {
      return {
        id: `chat-local-${Date.now()}`,
        chatId,
        senderId: demoUser.id,
        senderName: demoUser.name,
        text,
        type: "TEXT" as const,
        createdAt: new Date().toISOString(),
      };
    }

    const response = await request<{ data: Parameters<typeof normalizeDirectMessage>[0] }>(
      `/chats/${chatId}/messages`,
      {
        method: "POST",
        token,
        body: JSON.stringify({ text }),
      },
    );

    return normalizeDirectMessage(response.data);
  },

  async sendInvite(token: string | null, phoneNumbers: string[]) {
    if (demoMode) {
      return phoneNumbers.map((phoneNumber) => ({
        inviteLink: createSmartOpenUrlForTargets(
          `/onboarding?referralToken=${phoneNumber.replace(/\D/g, "")}`,
          `/onboarding?referralToken=${phoneNumber.replace(/\D/g, "")}`,
        ),
        smsTemplate: `Anyone free tonight? Let's link on Nowly -> ${createSmartOpenUrlForTargets(
          `/onboarding?referralToken=${phoneNumber.replace(/\D/g, "")}`,
          `/onboarding?referralToken=${phoneNumber.replace(/\D/g, "")}`,
        )}`,
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

  async requestFriend(token: string | null, currentUserId: string, userId: string) {
    if (demoMode) {
      return {
        ...(demoSuggestions.find((friend) => friend.id === userId) ?? demoFriends[0]),
        friendshipId: `friend-${userId}`,
        status: "PENDING" as const,
        requestDirection: "OUTGOING" as const,
      };
    }

    const response = await request<{
      data: {
        id: string;
        status: "PENDING" | "ACCEPTED";
        initiatedBy?: string | null;
        lastSignal?: AppFriend["lastSignal"];
        insight?: AppFriend["insight"];
        userA: AppFriend;
        userB: AppFriend;
      };
    }>("/friends/request", {
      method: "POST",
      token,
      body: JSON.stringify({ userId }),
    });

    return normalizeFriend(
      currentUserId,
      response.data,
    );
  },

  async respondToFriendRequest(
    token: string | null,
    currentUserId: string,
    friendshipId: string,
    action: "ACCEPT" | "DECLINE",
  ) {
    if (demoMode) {
      const friend = demoFriends.find((item) => item.friendshipId === friendshipId);
      if (!friend) {
        return null;
      }

      return action === "ACCEPT"
        ? { ...friend, status: "ACCEPTED" as const, requestDirection: null }
        : null;
    }

    const response = await request<{
      data: {
        id: string;
        status: "PENDING" | "ACCEPTED";
        initiatedBy?: string | null;
        lastSignal?: AppFriend["lastSignal"];
        insight?: AppFriend["insight"];
        userA: AppFriend;
        userB: AppFriend;
      };
    }>(`/friends/${friendshipId}/respond`, {
      method: "POST",
      token,
      body: JSON.stringify({ action }),
    });

    return action === "DECLINE" ? null : normalizeFriend(currentUserId, response.data);
  },

  async redeemInvite(token: string | null, referralToken: string) {
    if (demoMode) {
      return { ok: true };
    }

    return request<{ data: { ok: boolean } }>("/friends/redeem-invite", {
      method: "POST",
      token,
      body: JSON.stringify({ referralToken }),
    });
  },

  async setAvailability(
    token: string | null,
    payload: {
      state: string;
      label?: string | null;
      radiusKm: number;
      showLocation?: boolean;
      locationLabel?: string | null;
      vibe?: Vibe | null;
      energyLevel?: EnergyLevel | null;
      budgetMood?: BudgetMood | null;
      socialBattery?: SocialBattery | null;
      hangoutIntent?: HangoutIntent | null;
      durationHours?: number;
    },
  ): Promise<MobileAvailabilitySignal> {
    if (demoMode) {
      return normalizeSignal({
        ...demoSignal,
        ...payload,
        state: payload.state as MobileAvailabilitySignal["state"],
        expiresAt: new Date(
          Date.now() + (payload.durationHours ?? 3) * 60 * 60 * 1000,
        ).toISOString(),
      } as MobileAvailabilitySignal);
    }

    const response = await request<{ data: typeof demoSignal }>("/availability/signals", {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });

    return normalizeSignal({
      ...response.data,
      showLocation: payload.showLocation ?? false,
      locationLabel: payload.locationLabel ?? null,
    } as MobileAvailabilitySignal);
  },

  async clearAvailability(token: string | null, signalId: string) {
    if (demoMode) {
      return { ok: true };
    }

    return request(`/availability/signals/${signalId}`, {
      method: "DELETE",
      token,
    });
  },

  async fetchRecurringAvailability(token: string | null) {
    if (demoMode) {
      return demoRecurringWindows;
    }

    const response = await request<{ data: MobileRecurringAvailabilityWindow[] }>(
      "/availability/recurring",
      { token },
    );

    return response.data;
  },

  async saveRecurringAvailability(
    token: string | null,
    windows: Array<{
      recurrence: "WEEKLY" | "MONTHLY";
      dayOfWeek?: number | null;
      dayOfMonth?: number | null;
      startMinute: number;
      endMinute: number;
      utcOffsetMinutes: number;
      label?: string | null;
      vibe?: Vibe | null;
      hangoutIntent?: HangoutIntent | null;
    }>,
  ) {
    if (demoMode) {
      return windows.map((window, index) => ({
        id: demoRecurringWindows[index]?.id ?? `window-${Date.now()}-${index}`,
        createdAt: new Date().toISOString(),
        ...window,
      })) as MobileRecurringAvailabilityWindow[];
    }

    const response = await request<{ data: MobileRecurringAvailabilityWindow[] }>(
      "/availability/recurring",
      {
        method: "PUT",
        token,
        body: JSON.stringify({ windows }),
      },
    );

    return response.data;
  },

  async fetchBookingProfile(token: string | null, inviteCode: string) {
    if (demoMode) {
      return {
        type: "ONE_ON_ONE",
        host: demoUser,
        slots: demoScheduledOverlaps.map((overlap) => ({
          id: overlap.id,
          startsAt: overlap.startsAt,
          endsAt: overlap.endsAt,
          label: overlap.label,
          summary: overlap.summary,
          sourceLabel: overlap.sourceWindow.label ?? null,
          vibe: overlap.sharedVibe ?? null,
          hangoutIntent: overlap.sharedIntent ?? null,
          mutualFit: true,
          overlapMinutes: overlap.overlapMinutes,
          score: overlap.score,
        })),
        viewerHasRecurringSchedule: true,
        oneOnOneLocked: false,
      } satisfies MobileBookingProfile;
    }

    const response = await request<{ data: MobileBookingProfile }>(
      `/availability/share/${inviteCode}`,
      {
        token,
      },
    );

    return response.data;
  },

  async fetchBookingProfileWithSession(
    token: string | null,
    inviteCode: string,
    sessionShareCode?: string | null,
  ) {
    if (!sessionShareCode) {
      return this.fetchBookingProfile(token, inviteCode);
    }

    if (demoMode) {
      return this.fetchBookingProfile(token, inviteCode);
    }

    const response = await request<{ data: MobileBookingProfile }>(
      `/availability/group-sessions/${sessionShareCode}`,
      {
        token,
      },
    );

    return response.data;
  },

  async createGroupSchedulingSession(
    token: string | null,
    inviteCode: string,
    payload: {
      title: string;
      description?: string | null;
      locationName: string;
      durationMinutes: number;
      timezone: string;
      participantCap: number;
      minimumConfirmations: number;
      decisionMode: SchedulingDecisionMode;
      visibilityMode: SchedulingVisibilityMode;
      responseDeadline?: string | null;
      dateSpecificWindows: Array<{
        dateKey: string;
        startMinute: number;
        endMinute: number;
      }>;
    },
  ) {
    const response = await request<{
      data: {
        host: AppUser;
        session: MobileGroupSchedulingSession;
      };
    }>(`/availability/share/${inviteCode}/group-session`, {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    });

    return response.data;
  },

  async submitGroupSchedulingAvailability(
    token: string | null,
    shareCode: string,
    votes: Array<{ slotId: string; status: SchedulingVoteState }>,
  ) {
    const response = await request<{ data: MobileGroupSchedulingSession }>(
      `/availability/group-sessions/${shareCode}/votes`,
      {
        method: "POST",
        token,
        body: JSON.stringify({ votes }),
      },
    );

    return response.data;
  },

  async sendGroupSchedulingMessage(
    token: string | null,
    shareCode: string,
    text: string,
  ): Promise<MobileGroupSchedulingMessage> {
    const response = await request<{ data: MobileGroupSchedulingMessage }>(
      `/availability/group-sessions/${shareCode}/messages`,
      {
        method: "POST",
        token,
        body: JSON.stringify({ text }),
      },
    );

    return response.data;
  },

  async finalizeGroupSchedulingSession(
    token: string | null,
    shareCode: string,
    slotId: string,
  ) {
    const response = await request<{ data: MobileGroupSchedulingSession }>(
      `/availability/group-sessions/${shareCode}/finalize`,
      {
        method: "POST",
        token,
        body: JSON.stringify({ slotId }),
      },
    );

    return response.data;
  },

  async lockGroupSchedulingSession(token: string | null, shareCode: string) {
    const response = await request<{ data: MobileGroupSchedulingSession }>(
      `/availability/group-sessions/${shareCode}/lock`,
      {
        method: "POST",
        token,
      },
    );

    return response.data;
  },

  async bookSharedAvailability(
    token: string | null,
    inviteCode: string,
    payload: {
      startsAt: string;
      endsAt: string;
      note?: string | null;
      locationName?: string | null;
    },
  ) {
    if (demoMode) {
      return localHangout({
        activity: payload.note?.trim() || "hang out",
        microType: "QUICK_CHILL",
        commitmentLevel: "QUICK_WINDOW",
        locationName: demoUser.communityTag || demoUser.city || "nearby",
        participantIds: [demoFriends[0]?.id ?? "user-jordan"],
        scheduledFor: payload.startsAt,
      });
    }

    const response = await request<{ data: AppHangout }>(
      `/availability/share/${inviteCode}/book`,
      {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      },
    );

    return normalizeHangout(response.data as Parameters<typeof normalizeHangout>[0]);
  },

  async fetchScheduledOverlaps(token: string | null) {
    if (demoMode) {
      return demoScheduledOverlaps;
    }

    const response = await request<{ data: MobileScheduledOverlap[] }>(
      "/hangouts/scheduled-overlaps",
      {
        token,
      },
    );

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

  async updateProfile(
    token: string | null,
    payload: {
      photoUrl?: string | null;
    },
  ) {
    if (demoMode) {
      return normalizeUser({
        ...demoUser,
        photoUrl: payload.photoUrl ?? null,
      });
    }

    const response = await request<{ data: AppUser }>("/users/me/profile", {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
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

    const redirectUri =
      Platform.OS === "web" && typeof window !== "undefined"
        ? `${window.location.origin}/discord/callback`
        : undefined;

    const response = await request<{ data: { url: string } }>(
      `/discord/oauth-url${
        redirectUri ? `?redirectUri=${encodeURIComponent(redirectUri)}` : ""
      }`,
      {
        token,
      },
    );

    return response.data.url;
  },

  async linkDiscord(token: string | null, code: string) {
    if (demoMode) {
      return normalizeUser({
        ...demoUser,
        discordUsername: "nowly-demo",
        sharedServerCount: 3,
      });
    }

    const redirectUri =
      Platform.OS === "web" && typeof window !== "undefined"
        ? `${window.location.origin}/discord/callback`
        : undefined;

    const response = await request<{ data: { linked: boolean; user: AppUser } }>("/discord/link", {
      method: "POST",
      token,
      body: JSON.stringify({
        code,
        redirectUri,
      }),
    });

    return normalizeUser(response.data.user);
  },
};
