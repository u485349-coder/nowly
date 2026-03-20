import AsyncStorage from "@react-native-async-storage/async-storage";
import { MicroResponse, MobileAvailabilitySignal, ParticipantResponse } from "@nowly/shared";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  demoFriends,
  demoHangouts,
  demoMatches,
  demoRadar,
  demoRecaps,
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
  friends: AppFriend[];
  matches: AppMatch[];
  hangouts: AppHangout[];
  radar: AppRadar | null;
  threadMessages: Record<string, ThreadMessage[]>;
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
    radar: AppRadar | null;
  }) => void;
  setSuggestions: (friends: AppFriend[]) => void;
  setActiveSignal: (signal: MobileAvailabilitySignal | null) => void;
  updateUser: (payload: Partial<AppUser>) => void;
  upsertHangout: (hangout: AppHangout) => void;
  setThreadMessages: (threadId: string, messages: ThreadMessage[]) => void;
  appendMessage: (threadId: string, message: ThreadMessage) => void;
  updateHangoutResponse: (
    hangoutId: string,
    userId: string,
    responseStatus: ParticipantResponse,
    microResponse?: MicroResponse | null,
  ) => void;
  addRecap: (recap: RecapCard) => void;
  moveSuggestionToFriends: (friend: AppFriend) => void;
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
      friends: [],
      matches: [],
      hangouts: [],
      radar: null,
      threadMessages: {},
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
          radar: payload.radar,
        })),
      setSuggestions: (friends) =>
        set(() => ({
          suggestions: friends,
        })),
      setActiveSignal: (signal) =>
        set(() => ({
          activeSignal: signal,
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
          threadMessages: demoThreads,
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
