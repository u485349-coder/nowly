import { parseSignalLabelMetadata, } from "@nowly/shared";
import { Platform } from "react-native";
import { demoDirectChats, demoDirectMessages, demoFriends, demoHangouts, demoMatches, demoRadar, demoRecaps, demoRecurringWindows, demoScheduledOverlaps, demoSignal, demoSuggestions, demoThreads, demoUser, } from "./demo-data";
import { createSmartOpenUrlForTargets } from "./smart-links";
const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
const demoMode = !API_URL || process.env.EXPO_PUBLIC_DEMO_MODE === "true";
const request = async (path, options) => {
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
    return response.json();
};
const normalizeUser = (user) => ({
    id: user.id,
    phone: user.phone,
    name: user.name ?? "Nowly user",
    city: user.city ?? "Somewhere nearby",
    onboardingCompleted: Boolean(user.onboardingCompleted),
    communityTag: user.communityTag ?? null,
    photoUrl: user.photoUrl ?? null,
    inviteCode: user.inviteCode,
    responsivenessScore: user.responsivenessScore ?? 0.72,
    discordUsername: user.discordUsername ?? null,
    sharedServerCount: user.sharedServerCount ?? 0,
    notificationIntensity: user.notificationIntensity ?? "BALANCED",
    streakCount: user.streakCount ?? 1,
    invitesSent: user.invitesSent ?? 0,
    premium: user.premium ?? false,
    hasDiscordLinked: Boolean(user.discordUsername),
});
const normalizeSignal = (signal) => {
    const metadata = parseSignalLabelMetadata(signal.label);
    return {
        ...signal,
        label: metadata.label,
        meetMode: metadata.meetMode,
        crowdMode: metadata.crowdMode,
        onlineVenue: metadata.onlineVenue,
    };
};
const normalizeMatch = (match) => ({
    ...match,
    availability: normalizeSignal(match.availability),
    matchedSignal: normalizeSignal(match.matchedSignal),
});
const normalizeFriend = (currentUserId, friendship) => {
    const other = friendship.userA.id === currentUserId ? friendship.userB : friendship.userA;
    return {
        ...other,
        friendshipId: friendship.id,
        status: friendship.status,
        lastSignal: friendship.lastSignal,
        insight: friendship.insight,
        requestDirection: friendship.status === "PENDING"
            ? friendship.initiatedBy === currentUserId
                ? "OUTGOING"
                : "INCOMING"
            : null,
        sharedLabel: other.sharedServerCount && other.sharedServerCount > 0
            ? `You share ${other.sharedServerCount} server${other.sharedServerCount > 1 ? "s" : ""}`
            : undefined,
    };
};
const normalizeHangout = (hangout) => ({
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
const normalizeMessage = (message) => ({
    id: message.id,
    threadId: message.threadId,
    senderId: message.senderId,
    senderName: message.sender?.name ?? "Friend",
    text: message.text,
    type: message.type,
    createdAt: message.createdAt,
});
const normalizeDirectChat = (chat) => ({
    id: chat.id,
    title: chat.title ?? null,
    isGroup: Boolean(chat.isGroup),
    memberCount: chat.memberCount ?? ((chat.participants?.length ?? 0) + 1),
    createdAt: chat.createdAt,
    lastMessageAt: chat.lastMessageAt ?? chat.latestMessage?.createdAt ?? null,
    lastMessageText: chat.latestMessage?.text ?? null,
    participants: (chat.participants ?? []).map((participant, index) => normalizeUser({
        id: participant.id ?? `participant-${index}`,
        phone: participant.phone ?? "+10000000000",
        name: participant.name ?? "Friend",
        city: participant.city ?? "Nearby",
        communityTag: participant.communityTag ?? null,
        photoUrl: participant.photoUrl ?? null,
        responsivenessScore: participant.responsivenessScore ?? 0.7,
        discordUsername: participant.discordUsername ?? null,
        sharedServerCount: participant.sharedServerCount ?? 0,
    })),
});
const normalizeDirectMessage = (message) => ({
    id: message.id,
    chatId: message.threadId,
    senderId: message.senderId,
    senderName: message.sender?.name ?? "Friend",
    text: message.text,
    type: message.type,
    createdAt: message.createdAt,
});
const localHangout = (input) => ({
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
            responseStatus: "PENDING",
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
                responseStatus: "PENDING",
            };
        }),
    ],
});
export const api = {
    async requestOtp(phone) {
        if (demoMode) {
            return {
                ok: true,
                devCode: "111111",
            };
        }
        const response = await request("/auth/request-otp", {
            method: "POST",
            body: JSON.stringify({ phone }),
        });
        return response.data;
    },
    async verifyOtp(phone, code) {
        if (demoMode) {
            return {
                token: "demo-token",
                user: normalizeUser({
                    ...demoUser,
                    phone,
                }),
            };
        }
        const response = await request("/auth/verify-otp", {
            method: "POST",
            body: JSON.stringify({ phone, code }),
        });
        return {
            token: response.data.token,
            user: normalizeUser(response.data.user),
        };
    },
    async completeOnboarding(token, payload) {
        if (demoMode) {
            return normalizeUser({
                ...demoUser,
                ...payload,
            });
        }
        const response = await request("/users/me/onboarding", {
            method: "PUT",
            token,
            body: JSON.stringify(payload),
        });
        return normalizeUser(response.data);
    },
    async fetchDashboard(token, currentUserId) {
        if (demoMode) {
            return {
                friends: demoFriends,
                matches: demoMatches.map((match) => normalizeMatch(match)),
                hangouts: demoHangouts,
                recaps: demoRecaps,
                activeSignal: normalizeSignal(demoSignal),
                recurringWindows: demoRecurringWindows,
                scheduledOverlaps: demoScheduledOverlaps,
                radar: demoRadar,
            };
        }
        const [friends, matches, hangouts, recaps, activeSignal, recurringWindows, scheduledOverlaps, radar] = await Promise.all([
            request("/friends", {
                token,
            }),
            request("/hangouts/matches", { token }),
            request("/hangouts", {
                token,
            }),
            request("/hangouts/recaps", { token }),
            request("/availability/signals", { token }),
            request("/availability/recurring", { token }),
            request("/hangouts/scheduled-overlaps", {
                token,
            }),
            request("/hangouts/radar", { token }),
        ]);
        return {
            friends: currentUserId
                ? friends.data.map((friendship) => normalizeFriend(currentUserId, friendship))
                : [],
            matches: matches.data.map((match) => normalizeMatch(match)),
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
            activeSignal: activeSignal.data[0] ? normalizeSignal(activeSignal.data[0]) : null,
            recurringWindows: recurringWindows.data,
            scheduledOverlaps: scheduledOverlaps.data,
            radar: radar.data,
        };
    },
    async fetchFriendSuggestions(token) {
        if (demoMode) {
            return demoSuggestions;
        }
        const response = await request("/friends/suggestions", {
            token,
        });
        return response.data.map((friend) => ({
            ...friend,
            friendshipId: `suggestion-${friend.id}`,
            status: "PENDING",
            requestDirection: null,
            sharedLabel: friend.localLabel ||
                (friend.sharedServerCount && friend.sharedServerCount > 0
                    ? `You share ${friend.sharedServerCount} server${friend.sharedServerCount > 1 ? "s" : ""}`
                    : undefined),
        }));
    },
    async fetchFriends(token, currentUserId) {
        if (demoMode) {
            return demoFriends;
        }
        const response = await request("/friends", {
            token,
        });
        return response.data.map((friendship) => normalizeFriend(currentUserId, friendship));
    },
    async fetchDirectChats(token) {
        if (demoMode) {
            return demoDirectChats;
        }
        const response = await request("/chats", {
            token,
        });
        return response.data.map((chat) => normalizeDirectChat(chat));
    },
    async openDirectChat(token, userId) {
        if (demoMode) {
            return (demoDirectChats.find((chat) => !chat.isGroup && chat.participants.some((participant) => participant.id === userId)) ?? {
                id: `chat-${userId}`,
                title: null,
                isGroup: false,
                memberCount: 2,
                participants: [demoFriends.find((friend) => friend.id === userId) ?? demoFriends[0]],
                createdAt: new Date().toISOString(),
                lastMessageAt: null,
                lastMessageText: null,
            });
        }
        const response = await request("/chats/direct", {
            method: "POST",
            token,
            body: JSON.stringify({ userId }),
        });
        return normalizeDirectChat(response.data);
    },
    async createGroupChat(token, payload) {
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
        const response = await request("/chats/group", {
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
        });
        return normalizeDirectChat(response.data);
    },
    async fetchDirectChat(token, chatId) {
        if (demoMode) {
            return demoDirectChats.find((chat) => chat.id === chatId) ?? demoDirectChats[0];
        }
        const response = await request(`/chats/${chatId}`, { token });
        return normalizeDirectChat(response.data);
    },
    async fetchDirectMessages(token, chatId) {
        if (demoMode) {
            return demoDirectMessages[chatId] ?? [];
        }
        const response = await request(`/chats/${chatId}/messages`, { token });
        return response.data.map((message) => normalizeDirectMessage(message));
    },
    async sendDirectMessage(token, chatId, text) {
        if (demoMode) {
            return {
                id: `chat-local-${Date.now()}`,
                chatId,
                senderId: demoUser.id,
                senderName: demoUser.name,
                text,
                type: "TEXT",
                createdAt: new Date().toISOString(),
            };
        }
        const response = await request(`/chats/${chatId}/messages`, {
            method: "POST",
            token,
            body: JSON.stringify({ text }),
        });
        return normalizeDirectMessage(response.data);
    },
    async sendInvite(token, phoneNumbers) {
        if (demoMode) {
            return phoneNumbers.map((phoneNumber) => ({
                inviteLink: createSmartOpenUrlForTargets(`/onboarding?referralToken=${phoneNumber.replace(/\D/g, "")}`, `/onboarding?referralToken=${phoneNumber.replace(/\D/g, "")}`),
                smsTemplate: `Anyone free tonight? Let's link on Nowly -> ${createSmartOpenUrlForTargets(`/onboarding?referralToken=${phoneNumber.replace(/\D/g, "")}`, `/onboarding?referralToken=${phoneNumber.replace(/\D/g, "")}`)}`,
            }));
        }
        const response = await request("/friends/invite", {
            method: "POST",
            token,
            body: JSON.stringify({ phoneNumbers, channel: "SMS" }),
        });
        return response.data;
    },
    async requestFriend(token, currentUserId, userId) {
        if (demoMode) {
            return {
                ...(demoSuggestions.find((friend) => friend.id === userId) ?? demoFriends[0]),
                friendshipId: `friend-${userId}`,
                status: "PENDING",
                requestDirection: "OUTGOING",
            };
        }
        const response = await request("/friends/request", {
            method: "POST",
            token,
            body: JSON.stringify({ userId }),
        });
        return normalizeFriend(currentUserId, response.data);
    },
    async respondToFriendRequest(token, currentUserId, friendshipId, action) {
        if (demoMode) {
            const friend = demoFriends.find((item) => item.friendshipId === friendshipId);
            if (!friend) {
                return null;
            }
            return action === "ACCEPT"
                ? { ...friend, status: "ACCEPTED", requestDirection: null }
                : null;
        }
        const response = await request(`/friends/${friendshipId}/respond`, {
            method: "POST",
            token,
            body: JSON.stringify({ action }),
        });
        return action === "DECLINE" ? null : normalizeFriend(currentUserId, response.data);
    },
    async redeemInvite(token, referralToken) {
        if (demoMode) {
            return { ok: true };
        }
        return request("/friends/redeem-invite", {
            method: "POST",
            token,
            body: JSON.stringify({ referralToken }),
        });
    },
    async setAvailability(token, payload) {
        if (demoMode) {
            return normalizeSignal({
                ...demoSignal,
                ...payload,
                state: payload.state,
                expiresAt: new Date(Date.now() + (payload.durationHours ?? 3) * 60 * 60 * 1000).toISOString(),
            });
        }
        const response = await request("/availability/signals", {
            method: "POST",
            token,
            body: JSON.stringify(payload),
        });
        return normalizeSignal({
            ...response.data,
            showLocation: payload.showLocation ?? false,
            locationLabel: payload.locationLabel ?? null,
        });
    },
    async clearAvailability(token, signalId) {
        if (demoMode) {
            return { ok: true };
        }
        return request(`/availability/signals/${signalId}`, {
            method: "DELETE",
            token,
        });
    },
    async fetchRecurringAvailability(token) {
        if (demoMode) {
            return demoRecurringWindows;
        }
        const response = await request("/availability/recurring", { token });
        return response.data;
    },
    async saveRecurringAvailability(token, windows) {
        if (demoMode) {
            return windows.map((window, index) => ({
                id: demoRecurringWindows[index]?.id ?? `window-${Date.now()}-${index}`,
                createdAt: new Date().toISOString(),
                ...window,
            }));
        }
        const response = await request("/availability/recurring", {
            method: "PUT",
            token,
            body: JSON.stringify({ windows }),
        });
        return response.data;
    },
    async fetchBookingProfile(token, inviteCode) {
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
            };
        }
        const response = await request(`/availability/share/${inviteCode}`, {
            token,
        });
        return response.data;
    },
    async fetchBookingProfileWithSession(token, inviteCode, sessionShareCode) {
        if (!sessionShareCode) {
            return this.fetchBookingProfile(token, inviteCode);
        }
        if (demoMode) {
            return this.fetchBookingProfile(token, inviteCode);
        }
        const response = await request(`/availability/group-sessions/${sessionShareCode}`, {
            token,
        });
        return response.data;
    },
    async createGroupSchedulingSession(token, inviteCode, payload) {
        const response = await request(`/availability/share/${inviteCode}/group-session`, {
            method: "POST",
            token,
            body: JSON.stringify(payload),
        });
        return response.data;
    },
    async submitGroupSchedulingAvailability(token, shareCode, votes) {
        const response = await request(`/availability/group-sessions/${shareCode}/votes`, {
            method: "POST",
            token,
            body: JSON.stringify({ votes }),
        });
        return response.data;
    },
    async sendGroupSchedulingMessage(token, shareCode, text) {
        const response = await request(`/availability/group-sessions/${shareCode}/messages`, {
            method: "POST",
            token,
            body: JSON.stringify({ text }),
        });
        return response.data;
    },
    async finalizeGroupSchedulingSession(token, shareCode, slotId) {
        const response = await request(`/availability/group-sessions/${shareCode}/finalize`, {
            method: "POST",
            token,
            body: JSON.stringify({ slotId }),
        });
        return response.data;
    },
    async lockGroupSchedulingSession(token, shareCode) {
        const response = await request(`/availability/group-sessions/${shareCode}/lock`, {
            method: "POST",
            token,
        });
        return response.data;
    },
    async bookSharedAvailability(token, inviteCode, payload) {
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
        const response = await request(`/availability/share/${inviteCode}/book`, {
            method: "POST",
            token,
            body: JSON.stringify(payload),
        });
        return normalizeHangout(response.data);
    },
    async fetchScheduledOverlaps(token) {
        if (demoMode) {
            return demoScheduledOverlaps;
        }
        const response = await request("/hangouts/scheduled-overlaps", {
            token,
        });
        return response.data;
    },
    async createHangout(token, payload) {
        if (demoMode) {
            return localHangout(payload);
        }
        const response = await request("/hangouts", {
            method: "POST",
            token,
            body: JSON.stringify(payload),
        });
        return normalizeHangout(response.data);
    },
    async respondToHangout(token, hangoutId, payload) {
        if (demoMode) {
            return { ok: true };
        }
        return request(`/hangouts/${hangoutId}/respond`, {
            method: "POST",
            token,
            body: JSON.stringify(payload),
        });
    },
    async fetchThreadMessages(token, threadId) {
        if (demoMode) {
            return demoThreads[threadId] ?? [];
        }
        const response = await request(`/hangouts/threads/${threadId}/messages`, { token });
        return response.data.map((message) => normalizeMessage(message));
    },
    async createRecap(token, hangoutId) {
        if (demoMode) {
            return demoRecaps[0];
        }
        const response = await request(`/hangouts/${hangoutId}/recap`, {
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
    async updateNotificationPreference(token, notificationIntensity) {
        if (demoMode) {
            return normalizeUser({
                ...demoUser,
                notificationIntensity,
            });
        }
        const response = await request("/users/me/preferences", {
            method: "PATCH",
            token,
            body: JSON.stringify({ notificationIntensity }),
        });
        return normalizeUser(response.data);
    },
    async updateProfile(token, payload) {
        if (demoMode) {
            return normalizeUser({
                ...demoUser,
                photoUrl: payload.photoUrl ?? null,
            });
        }
        const response = await request("/users/me/profile", {
            method: "PATCH",
            token,
            body: JSON.stringify(payload),
        });
        return normalizeUser(response.data);
    },
    async registerPushToken(token, pushToken) {
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
    async track(token, event, payload) {
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
    async getDiscordOauthUrl(token) {
        if (demoMode) {
            return "https://discord.com";
        }
        const redirectUri = Platform.OS === "web" && typeof window !== "undefined"
            ? `${window.location.origin}/discord/callback`
            : undefined;
        const response = await request(`/discord/oauth-url${redirectUri ? `?redirectUri=${encodeURIComponent(redirectUri)}` : ""}`, {
            token,
        });
        return response.data.url;
    },
    async linkDiscord(token, code) {
        if (demoMode) {
            return normalizeUser({
                ...demoUser,
                discordUsername: "nowly-demo",
                sharedServerCount: 3,
            });
        }
        const redirectUri = Platform.OS === "web" && typeof window !== "undefined"
            ? `${window.location.origin}/discord/callback`
            : undefined;
        const response = await request("/discord/link", {
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
