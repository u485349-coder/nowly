import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { demoDirectChats, demoDirectMessages, demoFriends, demoHangouts, demoMatches, demoRadar, demoRecaps, demoRecurringWindows, demoScheduledOverlaps, demoSignal, demoThreads, demoUser, } from "../lib/demo-data";
const syncBrowserSessionMarker = (token) => {
    if (typeof window === "undefined") {
        return;
    }
    try {
        if (token) {
            window.localStorage.setItem("nowly.browser.session", "1");
        }
        else {
            window.localStorage.removeItem("nowly.browser.session");
        }
    }
    catch (error) {
        // Ignore browser storage errors so auth state still works in-app.
    }
};
const defaultBookingSetup = {
    format: "ONE_ON_ONE",
    title: "Quick catch-up",
    description: "Pick an easy time and we can lock something in.",
    locationName: "",
    durationMinutes: 60,
    participantCap: 5,
    minimumConfirmations: 3,
    decisionMode: "MINIMUM_REQUIRED",
    visibilityMode: "PUBLIC",
    responseDeadlineHours: 24,
    lastGroupSession: null,
};
const defaultLiveSignalPreferences = {
    showLocation: false,
    locationLabel: "",
};
export const useAppStore = create()(persist((set) => ({
    token: null,
    user: null,
    bookingSetup: defaultBookingSetup,
    liveSignalPreferences: defaultLiveSignalPreferences,
    introSeen: false,
    onboardingComplete: false,
    notificationsEnabled: true,
    crewUnreadCount: 0,
    activeSignal: null,
    recurringWindows: [],
    dateSpecificWindows: [],
    scheduledOverlaps: [],
    friends: [],
    matches: [],
    hangouts: [],
    radar: null,
    threadMessages: {},
    directChats: [],
    directMessages: {},
    recaps: [],
    suggestions: [],
    setSession: (token, user) => set(() => {
        syncBrowserSessionMarker(token);
        return {
            token,
            user,
            onboardingComplete: user.onboardingCompleted ?? false,
        };
    }),
    finishOnboarding: (user) => set(() => ({
        user: {
            ...user,
            onboardingCompleted: true,
        },
        onboardingComplete: true,
    })),
    setIntroSeen: () => set(() => ({
        introSeen: true,
    })),
    setNotificationsEnabled: (enabled) => set(() => ({
        notificationsEnabled: enabled,
    })),
    incrementCrewUnread: (count = 1) => set((state) => ({
        crewUnreadCount: Math.max(0, state.crewUnreadCount + Math.max(1, Math.floor(count))),
    })),
    consumeCrewUnread: () => set(() => ({
        crewUnreadCount: 0,
    })),
    setCrewUnreadCount: (count) => set(() => ({
        crewUnreadCount: Math.max(0, Math.floor(count)),
    })),
    setBookingSetup: (payload) => set((state) => ({
        bookingSetup: {
            ...state.bookingSetup,
            ...payload,
        },
    })),
    setLiveSignalPreferences: (payload) => set((state) => ({
        liveSignalPreferences: {
            ...state.liveSignalPreferences,
            ...payload,
        },
    })),
    setDashboard: (payload) => set((state) => {
        const completedThreadIds = new Set(payload.hangouts
            .filter((hangout) => hangout.status === "COMPLETED")
            .map((hangout) => hangout.threadId));
        const nextThreadMessages = Object.fromEntries(Object.entries(state.threadMessages).filter(([threadId]) => !completedThreadIds.has(threadId)));
        return {
            friends: payload.friends,
            matches: payload.matches,
            hangouts: payload.hangouts,
            recaps: payload.recaps,
            activeSignal: payload.activeSignal,
            recurringWindows: payload.recurringWindows,
            scheduledOverlaps: payload.scheduledOverlaps,
            radar: payload.radar,
            threadMessages: nextThreadMessages,
        };
    }),
    setSuggestions: (friends) => set(() => ({
        suggestions: friends,
    })),
    setFriends: (friends) => set(() => ({
        friends,
    })),
    upsertFriend: (friend) => set((state) => ({
        friends: [friend, ...state.friends.filter((item) => item.id !== friend.id)],
    })),
    removeFriend: (userId) => set((state) => ({
        friends: state.friends.filter((item) => item.id !== userId),
    })),
    removeSuggestion: (userId) => set((state) => ({
        suggestions: state.suggestions.filter((item) => item.id !== userId),
    })),
    setActiveSignal: (signal) => set(() => ({
        activeSignal: signal,
    })),
    setRecurringWindows: (windows) => set(() => ({
        recurringWindows: windows,
    })),
    setDateSpecificWindows: (windows) => set(() => ({
        dateSpecificWindows: windows,
    })),
    setScheduledOverlaps: (overlaps) => set(() => ({
        scheduledOverlaps: overlaps,
    })),
    updateUser: (payload) => set((state) => ({
        user: state.user
            ? {
                ...state.user,
                ...payload,
            }
            : state.user,
        onboardingComplete: typeof payload.onboardingCompleted === "boolean"
            ? payload.onboardingCompleted
            : state.onboardingComplete,
    })),
    upsertHangout: (hangout) => set((state) => ({
        hangouts: [hangout, ...state.hangouts.filter((item) => item.id !== hangout.id)],
    })),
    setThreadMessages: (threadId, messages) => set((state) => ({
        threadMessages: {
            ...state.threadMessages,
            [threadId]: messages,
        },
    })),
    clearThreadMessages: (threadId) => set((state) => {
        const nextMessages = { ...state.threadMessages };
        delete nextMessages[threadId];
        return {
            threadMessages: nextMessages,
        };
    }),
    appendMessage: (threadId, message) => set((state) => {
        const existing = state.threadMessages[threadId] ?? [];
        if (existing.some((item) => item.id === message.id)) {
            return state;
        }
        return {
            threadMessages: {
                ...state.threadMessages,
                [threadId]: [...existing, message],
            },
        };
    }),
    setDirectChats: (chats) => set(() => ({
        directChats: chats,
    })),
    upsertDirectChat: (chat) => set((state) => ({
        directChats: [
            chat,
            ...state.directChats.filter((item) => item.id !== chat.id),
        ],
    })),
    setDirectMessages: (chatId, messages) => set((state) => ({
        directMessages: {
            ...state.directMessages,
            [chatId]: messages,
        },
    })),
    appendDirectMessage: (chatId, message) => set((state) => {
        const existing = state.directMessages[chatId] ?? [];
        if (existing.some((item) => item.id === message.id)) {
            return state;
        }
        return {
            directMessages: {
                ...state.directMessages,
                [chatId]: [...existing, message],
            },
        };
    }),
    updateHangoutResponse: (hangoutId, userId, responseStatus, microResponse) => set((state) => ({
        hangouts: state.hangouts.map((hangout) => hangout.id === hangoutId
            ? {
                ...hangout,
                participants: hangout.participants.map((participant) => participant.userId === userId
                    ? { ...participant, responseStatus, microResponse }
                    : participant),
                participantsInfo: hangout.participantsInfo.map((participant) => participant.userId === userId
                    ? { ...participant, responseStatus, microResponse }
                    : participant),
            }
            : hangout),
    })),
    setHangoutStatus: (hangoutId, status) => set((state) => {
        const updatedHangouts = state.hangouts.map((hangout) => hangout.id === hangoutId
            ? {
                ...hangout,
                status,
            }
            : hangout);
        if (status !== "COMPLETED") {
            return {
                hangouts: updatedHangouts,
            };
        }
        const completedHangout = updatedHangouts.find((hangout) => hangout.id === hangoutId);
        const nextThreadMessages = { ...state.threadMessages };
        if (completedHangout?.threadId) {
            delete nextThreadMessages[completedHangout.threadId];
        }
        return {
            hangouts: updatedHangouts,
            threadMessages: nextThreadMessages,
        };
    }),
    addRecap: (recap) => set((state) => ({
        recaps: [recap, ...state.recaps.filter((item) => item.id !== recap.id)],
    })),
    moveSuggestionToFriends: (friend) => set((state) => ({
        friends: [
            ...state.friends,
            {
                ...friend,
                status: "PENDING",
            },
        ],
        suggestions: state.suggestions.filter((item) => item.id !== friend.id),
    })),
    clearSession: () => set((state) => {
        syncBrowserSessionMarker(null);
        return {
            token: null,
            user: null,
            bookingSetup: state.bookingSetup,
            liveSignalPreferences: state.liveSignalPreferences,
            onboardingComplete: false,
            friends: [],
            matches: [],
            hangouts: [],
            radar: null,
            threadMessages: {},
            directChats: [],
            directMessages: {},
            recaps: [],
            suggestions: [],
            activeSignal: null,
            recurringWindows: [],
            dateSpecificWindows: [],
            scheduledOverlaps: [],
            introSeen: state.introSeen,
            notificationsEnabled: state.notificationsEnabled,
            crewUnreadCount: 0,
        };
    }),
    bootstrapDemo: () => set((state) => ({
        token: state.token ?? "demo-token",
        user: state.user ?? demoUser,
        bookingSetup: state.bookingSetup,
        liveSignalPreferences: state.liveSignalPreferences,
        onboardingComplete: true,
        friends: demoFriends,
        matches: demoMatches,
        hangouts: demoHangouts,
        radar: demoRadar,
        recaps: demoRecaps,
        activeSignal: demoSignal,
        recurringWindows: demoRecurringWindows,
        dateSpecificWindows: state.dateSpecificWindows,
        scheduledOverlaps: demoScheduledOverlaps,
        threadMessages: demoThreads,
        directChats: demoDirectChats,
        directMessages: demoDirectMessages,
    })),
}), {
    name: "nowly-app-store",
    version: 2,
    storage: createJSONStorage(() => AsyncStorage),
    merge: (persistedState, currentState) => {
        const incoming = persistedState ?? {};
        const incomingBookingSetup = (incoming.bookingSetup ?? {});
        const incomingSignalPreferences = (incoming.liveSignalPreferences ??
            {});
        const incomingSignal = incoming.activeSignal ?? null;
        return {
            ...currentState,
            ...incoming,
            bookingSetup: {
                ...defaultBookingSetup,
                ...currentState.bookingSetup,
                ...incomingBookingSetup,
                lastGroupSession: incomingBookingSetup.lastGroupSession ??
                    currentState.bookingSetup.lastGroupSession ??
                    null,
            },
            liveSignalPreferences: {
                ...defaultLiveSignalPreferences,
                ...currentState.liveSignalPreferences,
                ...incomingSignalPreferences,
            },
            activeSignal: incomingSignal
                ? {
                    ...incomingSignal,
                    showLocation: incomingSignal.showLocation ?? false,
                    locationLabel: incomingSignal.locationLabel ?? null,
                }
                : null,
            dateSpecificWindows: incoming.dateSpecificWindows ?? currentState.dateSpecificWindows,
        };
    },
    partialize: (state) => ({
        token: state.token,
        user: state.user,
        bookingSetup: state.bookingSetup,
        liveSignalPreferences: state.liveSignalPreferences,
        introSeen: state.introSeen,
        onboardingComplete: state.onboardingComplete,
        notificationsEnabled: state.notificationsEnabled,
        activeSignal: state.activeSignal,
        dateSpecificWindows: state.dateSpecificWindows,
    }),
}));
