import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  MicroResponse,
  MobileAvailabilitySignal,
  MobileRecurringAvailabilityWindow,
  MobileScheduledOverlap,
  ParticipantResponse,
  SchedulingDecisionMode,
  SchedulingVisibilityMode,
} from "@nowly/shared";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
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
  demoThreads,
  demoUser,
} from "../lib/demo-data";
import {
  AppFriend,
  AppHangout,
  AppMatch,
  AppRadar,
  AppUser,
  DateSpecificAvailabilityWindow,
  DirectChat,
  DirectMessage,
  RecapCard,
  ThreadMessage,
} from "../types";

const syncBrowserSessionMarker = (token: string | null) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (token) {
      window.localStorage.setItem("nowly.browser.session", "1");
    } else {
      window.localStorage.removeItem("nowly.browser.session");
    }
  } catch (error) {
    // Ignore browser storage errors so auth state still works in-app.
  }
};

type BookingSetupState = {
  format: "ONE_ON_ONE" | "GROUP";
  title: string;
  description: string;
  locationName: string;
  durationMinutes: number;
  participantCap: number;
  minimumConfirmations: number;
  decisionMode: SchedulingDecisionMode;
  visibilityMode: SchedulingVisibilityMode;
  responseDeadlineHours: number;
  lastGroupSession: {
    shareCode: string;
    signature: string;
  } | null;
};

type LiveSignalPreferencesState = {
  showLocation: boolean;
  locationLabel: string;
};

const defaultBookingSetup: BookingSetupState = {
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

const defaultLiveSignalPreferences: LiveSignalPreferencesState = {
  showLocation: false,
  locationLabel: "",
};

type AppState = {
  bookingSetup: BookingSetupState;
  liveSignalPreferences: LiveSignalPreferencesState;
  token: string | null;
  user: AppUser | null;
  introSeen: boolean;
  onboardingComplete: boolean;
  notificationsEnabled: boolean;
  activeSignal: MobileAvailabilitySignal | null;
  recurringWindows: MobileRecurringAvailabilityWindow[];
  dateSpecificWindows: DateSpecificAvailabilityWindow[];
  scheduledOverlaps: MobileScheduledOverlap[];
  friends: AppFriend[];
  matches: AppMatch[];
  hangouts: AppHangout[];
  radar: AppRadar | null;
  threadMessages: Record<string, ThreadMessage[]>;
  directChats: DirectChat[];
  directMessages: Record<string, DirectMessage[]>;
  recaps: RecapCard[];
  suggestions: AppFriend[];
  setSession: (token: string, user: AppUser) => void;
  finishOnboarding: (user: AppUser) => void;
  setIntroSeen: () => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setBookingSetup: (payload: Partial<AppState["bookingSetup"]>) => void;
  setLiveSignalPreferences: (payload: Partial<AppState["liveSignalPreferences"]>) => void;
  setDashboard: (payload: {
    friends: AppFriend[];
    matches: AppMatch[];
    hangouts: AppHangout[];
    recaps: RecapCard[];
      activeSignal: MobileAvailabilitySignal | null;
      recurringWindows: MobileRecurringAvailabilityWindow[];
      scheduledOverlaps: MobileScheduledOverlap[];
      radar: AppRadar | null;
    }) => void;
  setSuggestions: (friends: AppFriend[]) => void;
  setFriends: (friends: AppFriend[]) => void;
  upsertFriend: (friend: AppFriend) => void;
  removeFriend: (userId: string) => void;
  removeSuggestion: (userId: string) => void;
  setActiveSignal: (signal: MobileAvailabilitySignal | null) => void;
  setRecurringWindows: (windows: MobileRecurringAvailabilityWindow[]) => void;
  setDateSpecificWindows: (windows: DateSpecificAvailabilityWindow[]) => void;
  setScheduledOverlaps: (overlaps: MobileScheduledOverlap[]) => void;
  updateUser: (payload: Partial<AppUser>) => void;
  upsertHangout: (hangout: AppHangout) => void;
  setThreadMessages: (threadId: string, messages: ThreadMessage[]) => void;
  clearThreadMessages: (threadId: string) => void;
  appendMessage: (threadId: string, message: ThreadMessage) => void;
  setDirectChats: (chats: DirectChat[]) => void;
  upsertDirectChat: (chat: DirectChat) => void;
  setDirectMessages: (chatId: string, messages: DirectMessage[]) => void;
  appendDirectMessage: (chatId: string, message: DirectMessage) => void;
  updateHangoutResponse: (
    hangoutId: string,
    userId: string,
    responseStatus: ParticipantResponse,
    microResponse?: MicroResponse | null,
  ) => void;
  setHangoutStatus: (hangoutId: string, status: AppHangout["status"]) => void;
  addRecap: (recap: RecapCard) => void;
  moveSuggestionToFriends: (friend: AppFriend) => void;
  clearSession: () => void;
  bootstrapDemo: () => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      bookingSetup: defaultBookingSetup,
      liveSignalPreferences: defaultLiveSignalPreferences,
      introSeen: false,
      onboardingComplete: false,
      notificationsEnabled: true,
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
      setSession: (token, user) =>
        set(() => {
          syncBrowserSessionMarker(token);
          return {
            token,
            user,
            onboardingComplete: user.onboardingCompleted ?? false,
          };
        }),
      finishOnboarding: (user) =>
        set(() => ({
          user: {
            ...user,
            onboardingCompleted: true,
          },
          onboardingComplete: true,
        })),
      setIntroSeen: () =>
        set(() => ({
          introSeen: true,
        })),
      setNotificationsEnabled: (enabled) =>
        set(() => ({
          notificationsEnabled: enabled,
        })),
      setBookingSetup: (payload) =>
        set((state) => ({
          bookingSetup: {
            ...state.bookingSetup,
            ...payload,
          },
        })),
      setLiveSignalPreferences: (payload) =>
        set((state) => ({
          liveSignalPreferences: {
            ...state.liveSignalPreferences,
            ...payload,
          },
        })),
      setDashboard: (payload) =>
        set((state) => {
          const completedThreadIds = new Set(
            payload.hangouts
              .filter((hangout) => hangout.status === "COMPLETED")
              .map((hangout) => hangout.threadId),
          );

          const nextThreadMessages = Object.fromEntries(
            Object.entries(state.threadMessages).filter(
              ([threadId]) => !completedThreadIds.has(threadId),
            ),
          ) as Record<string, ThreadMessage[]>;

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
      setSuggestions: (friends) =>
        set(() => ({
          suggestions: friends,
        })),
      setFriends: (friends) =>
        set(() => ({
          friends,
        })),
      upsertFriend: (friend) =>
        set((state) => ({
          friends: [friend, ...state.friends.filter((item) => item.id !== friend.id)],
        })),
      removeFriend: (userId) =>
        set((state) => ({
          friends: state.friends.filter((item) => item.id !== userId),
        })),
      removeSuggestion: (userId) =>
        set((state) => ({
          suggestions: state.suggestions.filter((item) => item.id !== userId),
        })),
      setActiveSignal: (signal) =>
        set(() => ({
          activeSignal: signal,
        })),
      setRecurringWindows: (windows) =>
        set(() => ({
          recurringWindows: windows,
        })),
      setDateSpecificWindows: (windows) =>
        set(() => ({
          dateSpecificWindows: windows,
        })),
      setScheduledOverlaps: (overlaps) =>
        set(() => ({
          scheduledOverlaps: overlaps,
        })),
      updateUser: (payload) =>
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                ...payload,
              }
            : state.user,
          onboardingComplete:
            typeof payload.onboardingCompleted === "boolean"
              ? payload.onboardingCompleted
              : state.onboardingComplete,
        })),
      upsertHangout: (hangout) =>
        set((state) => ({
          hangouts: [hangout, ...state.hangouts.filter((item) => item.id !== hangout.id)],
        })),
      setThreadMessages: (threadId, messages) =>
        set((state) => ({
          threadMessages: {
            ...state.threadMessages,
            [threadId]: messages,
          },
        })),
      clearThreadMessages: (threadId) =>
        set((state) => {
          const nextMessages = { ...state.threadMessages };
          delete nextMessages[threadId];

          return {
            threadMessages: nextMessages,
          };
        }),
      appendMessage: (threadId, message) =>
        set((state) => ({
          threadMessages: {
            ...state.threadMessages,
            [threadId]: [...(state.threadMessages[threadId] ?? []), message],
          },
        })),
      setDirectChats: (chats) =>
        set(() => ({
          directChats: chats,
        })),
      upsertDirectChat: (chat) =>
        set((state) => ({
          directChats: [
            chat,
            ...state.directChats.filter((item) => item.id !== chat.id),
          ],
        })),
      setDirectMessages: (chatId, messages) =>
        set((state) => ({
          directMessages: {
            ...state.directMessages,
            [chatId]: messages,
          },
        })),
      appendDirectMessage: (chatId, message) =>
        set((state) => ({
          directMessages: {
            ...state.directMessages,
            [chatId]: [...(state.directMessages[chatId] ?? []), message],
          },
        })),
      updateHangoutResponse: (hangoutId, userId, responseStatus, microResponse) =>
        set((state) => ({
          hangouts: state.hangouts.map((hangout) =>
            hangout.id === hangoutId
              ? {
                  ...hangout,
                  participants: hangout.participants.map((participant) =>
                    participant.userId === userId
                      ? { ...participant, responseStatus, microResponse }
                      : participant,
                  ),
                  participantsInfo: hangout.participantsInfo.map((participant) =>
                    participant.userId === userId
                      ? { ...participant, responseStatus, microResponse }
                      : participant,
                  ),
                }
              : hangout,
          ),
        })),
      setHangoutStatus: (hangoutId, status) =>
        set((state) => {
          const updatedHangouts = state.hangouts.map((hangout) =>
            hangout.id === hangoutId
              ? {
                  ...hangout,
                  status,
                }
              : hangout,
          );

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
      addRecap: (recap) =>
        set((state) => ({
          recaps: [recap, ...state.recaps.filter((item) => item.id !== recap.id)],
        })),
      moveSuggestionToFriends: (friend) =>
        set((state) => ({
          friends: [
            ...state.friends,
            {
              ...friend,
              status: "PENDING",
            },
          ],
          suggestions: state.suggestions.filter((item) => item.id !== friend.id),
        })),
      clearSession: () =>
        set((state) => {
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
          };
        }),
      bootstrapDemo: () =>
        set((state) => ({
          token: state.token ?? "demo-token",
        user: state.user ?? demoUser,
        bookingSetup: state.bookingSetup,
        liveSignalPreferences: state.liveSignalPreferences,
        onboardingComplete: true,
          friends: demoFriends,
          matches: demoMatches as AppMatch[],
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
    }),
    {
      name: "nowly-app-store",
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persistedState, currentState) => {
        const incoming = (persistedState as Partial<AppState>) ?? {};
        const incomingBookingSetup = (incoming.bookingSetup ?? {}) as Partial<BookingSetupState>;
        const incomingSignalPreferences = (incoming.liveSignalPreferences ??
          {}) as Partial<LiveSignalPreferencesState>;
        const incomingSignal = incoming.activeSignal ?? null;

        return {
          ...currentState,
          ...incoming,
          bookingSetup: {
            ...defaultBookingSetup,
            ...currentState.bookingSetup,
            ...incomingBookingSetup,
            lastGroupSession:
              incomingBookingSetup.lastGroupSession ??
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
        } as AppState;
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
    },
  ),
);
