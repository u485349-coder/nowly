import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  MicroResponse,
  MobileAvailabilitySignal,
  MobileRecurringAvailabilityWindow,
  MobileScheduledOverlap,
  ParticipantResponse,
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
  DirectChat,
  DirectMessage,
  RecapCard,
  ThreadMessage,
} from "../types";

type AppState = {
  token: string | null;
  user: AppUser | null;
  introSeen: boolean;
  onboardingComplete: boolean;
  notificationsEnabled: boolean;
  activeSignal: MobileAvailabilitySignal | null;
  recurringWindows: MobileRecurringAvailabilityWindow[];
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
  setScheduledOverlaps: (overlaps: MobileScheduledOverlap[]) => void;
  updateUser: (payload: Partial<AppUser>) => void;
  upsertHangout: (hangout: AppHangout) => void;
  setThreadMessages: (threadId: string, messages: ThreadMessage[]) => void;
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
      introSeen: false,
      onboardingComplete: false,
      notificationsEnabled: true,
      activeSignal: null,
      recurringWindows: [],
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
        set(() => ({
          token,
          user,
        })),
      finishOnboarding: (user) =>
        set(() => ({
          user,
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
      setDashboard: (payload) =>
        set(() => ({
          friends: payload.friends,
          matches: payload.matches,
          hangouts: payload.hangouts,
          recaps: payload.recaps,
          activeSignal: payload.activeSignal,
          recurringWindows: payload.recurringWindows,
          scheduledOverlaps: payload.scheduledOverlaps,
          radar: payload.radar,
        })),
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
        set((state) => ({
          token: null,
          user: null,
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
          scheduledOverlaps: [],
          introSeen: state.introSeen,
          notificationsEnabled: state.notificationsEnabled,
        })),
      bootstrapDemo: () =>
        set((state) => ({
          token: state.token ?? "demo-token",
          user: state.user ?? demoUser,
          onboardingComplete: true,
          friends: demoFriends,
          matches: demoMatches as AppMatch[],
          hangouts: demoHangouts,
          radar: demoRadar,
          recaps: demoRecaps,
          activeSignal: demoSignal,
          recurringWindows: demoRecurringWindows,
          scheduledOverlaps: demoScheduledOverlaps,
          threadMessages: demoThreads,
          directChats: demoDirectChats,
          directMessages: demoDirectMessages,
        })),
    }),
    {
      name: "nowly-app-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        introSeen: state.introSeen,
        onboardingComplete: state.onboardingComplete,
        notificationsEnabled: state.notificationsEnabled,
        activeSignal: state.activeSignal,
      }),
    },
  ),
);
