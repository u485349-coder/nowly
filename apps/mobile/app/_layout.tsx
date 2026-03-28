import "../global.css";

import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
  useFonts,
} from "@expo-google-fonts/space-grotesk";
import { Stack, usePathname, useRouter, type ErrorBoundaryProps } from "expo-router";
import { Suspense, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { NowlyToast, type NowlyToastPayload } from "../components/ui/NowlyToast";
import { api } from "../lib/api";
import { playNowlyPingSound } from "../lib/match-feedback";
import { setForegroundNotificationSoundEnabled } from "../lib/notifications";
import { getSocket } from "../lib/socket";
import { useAppStore } from "../store/useAppStore";
import type { AppNotification } from "../types";

const LoadingShell = ({
  detail,
  label = "Loading Nowly...",
  onRetry,
}: {
  detail?: string;
  label?: string;
  onRetry?: () => void;
}) => (
  <View
    style={{
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#0B1020",
      paddingHorizontal: 24,
      gap: 12,
    }}
  >
    <Text
      style={{
        color: "#F8FAFC",
        fontSize: 18,
        fontFamily: Platform.OS === "web" ? "system-ui, sans-serif" : undefined,
      }}
    >
      {label}
    </Text>
    {detail ? (
      <Text
        style={{
          color: "rgba(248,250,252,0.68)",
          fontSize: 14,
          textAlign: "center",
          maxWidth: 420,
        }}
      >
        {detail}
      </Text>
    ) : null}
    {onRetry ? (
      <Pressable
        onPress={onRetry}
        style={{
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.08)",
          paddingHorizontal: 18,
          paddingVertical: 12,
        }}
      >
        <Text
          style={{
            color: "#F8FAFC",
            fontSize: 14,
            fontWeight: "600",
          }}
        >
          Try again
        </Text>
      </Pressable>
    ) : null}
  </View>
);

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <LoadingShell
      label="This screen hit a snag"
      detail={error?.message || "Something went sideways while loading this page."}
      onRetry={retry}
    />
  );
}

const entityIdForPathname = (pathname: string) => {
  if (pathname.startsWith("/chat/")) {
    return `chat:${pathname.split("/")[2] ?? ""}`;
  }

  if (pathname.startsWith("/thread/")) {
    return `thread:${pathname.split("/")[2] ?? ""}`;
  }

  if (pathname.startsWith("/proposal/")) {
    return `hangout:${pathname.split("/")[2] ?? ""}`;
  }

  if (pathname.startsWith("/friends")) {
    return "friend_requests";
  }

  return null;
};

const buildNotificationType = (
  screen?: string,
  chatType?: string | null,
): AppNotification["type"] => {
  if (screen === "chat") {
    return chatType === "group" ? "group_dm" : "dm";
  }

  if (screen === "proposal") {
    return "hangout_invite";
  }

  if (screen === "thread") {
    return "thread";
  }

  return "friend_request";
};

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const notificationsEnabled = useAppStore((state) => state.notificationsEnabled);
  const hydrateNotificationState = useAppStore((state) => state.hydrateNotificationState);
  const addNotification = useAppStore((state) => state.addNotification);
  const markEntityAsRead = useAppStore((state) => state.markEntityAsRead);
  const incrementCrewUnread = useAppStore((state) => state.incrementCrewUnread);
  const setCrewUnreadCount = useAppStore((state) => state.setCrewUnreadCount);
  const [inAppToast, setInAppToast] = useState<NowlyToastPayload | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });
  const readyToRender = Platform.OS === "web" ? true : fontsLoaded;
  const pushNotificationsEnabled = user?.pushNotificationsEnabled ?? notificationsEnabled;
  const inAppNotificationsEnabled = user?.inAppNotificationsEnabled ?? true;
  const notificationSoundEnabled = user?.notificationSoundEnabled ?? true;
  const openEntityId = entityIdForPathname(pathname);
  const crewSurfaceOpen =
    pathname.startsWith("/friends") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/proposal") ||
    pathname.startsWith("/thread");

  useEffect(() => {
    setForegroundNotificationSoundEnabled(notificationSoundEnabled);
  }, [notificationSoundEnabled]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }

    if (token) {
      window.localStorage.setItem("nowly.browser.session", "1");
    } else {
      window.localStorage.removeItem("nowly.browser.session");
    }
  }, [token]);

  useEffect(() => {
    if (Platform.OS === "web" || !token || !pushNotificationsEnabled) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const { registerForPushNotificationsAsync } = await import("../lib/notifications");
      const pushToken = await registerForPushNotificationsAsync();

      if (!pushToken || cancelled) {
        return;
      }

      api.registerPushToken(token, pushToken).catch((error) => {
        console.log("[push:error]", error);
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [pushNotificationsEnabled, token]);

  useEffect(() => {
    if (!token) {
      hydrateNotificationState({
        notifications: [],
        unreadByEntity: {},
        globalUnreadCount: 0,
      });
      setCrewUnreadCount(0);
      return;
    }

    let active = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const refreshCounts = () =>
      api.fetchNotificationState(token)
        .then((snapshot) => {
          if (!active) {
            return;
          }

          hydrateNotificationState(snapshot);
        })
        .catch(() => undefined);

    void refreshCounts();
    intervalId = setInterval(() => {
      void refreshCounts();
    }, 20000);

    return () => {
      active = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [hydrateNotificationState, setCrewUnreadCount, token]);

  useEffect(() => {
    if (!token || !crewSurfaceOpen || !openEntityId) {
      return;
    }

    markEntityAsRead(openEntityId);
    void api.markNotificationEntityRead(token, openEntityId).catch(() => undefined);
  }, [crewSurfaceOpen, markEntityAsRead, openEntityId, token]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    let active = true;
    let responseSubscription: { remove: () => void } | null = null;
    let foregroundSubscription: { remove: () => void } | null = null;

    void (async () => {
      const [{ notificationPathFromData }, Notifications] = await Promise.all([
        import("../lib/notifications"),
        import("expo-notifications"),
      ]);

      if (!active) {
        return;
      }

      responseSubscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const data = response.notification.request.content.data as Record<string, unknown>;
          const path = notificationPathFromData(data);
          const screen = typeof data.screen === "string" ? data.screen : null;
          const entityId =
            screen === "chat" && typeof data.chatId === "string"
              ? `chat:${data.chatId}`
              : screen === "thread" && typeof data.threadId === "string"
                ? `thread:${data.threadId}`
                : screen === "proposal" && typeof data.hangoutId === "string"
                  ? `hangout:${data.hangoutId}`
                  : screen === "friends"
                    ? "friend_requests"
                    : null;

          if (entityId) {
            markEntityAsRead(entityId);
            void api.markNotificationEntityRead(token, entityId).catch(() => undefined);
          }

          if (path) {
            router.push(path as never);
          }
        },
      );

      foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
        const data = notification.request.content.data as Record<string, unknown>;
        const path = notificationPathFromData(data);
        const screen = typeof data.screen === "string" ? data.screen : null;
        const entityId =
          screen === "chat" && typeof data.chatId === "string"
            ? `chat:${data.chatId}`
            : screen === "thread" && typeof data.threadId === "string"
              ? `thread:${data.threadId}`
              : screen === "proposal" && typeof data.hangoutId === "string"
                ? `hangout:${data.hangoutId}`
                : screen === "friends"
                  ? "friend_requests"
                  : null;
        const isCrewNotification =
          screen === "chat" || screen === "friends" || screen === "proposal" || screen === "thread";

        if (isCrewNotification && !crewSurfaceOpen) {
          if (entityId) {
            addNotification({
              id: `${entityId}:${Date.now()}`,
              type: buildNotificationType(
                screen ?? undefined,
                typeof data.chatType === "string" ? data.chatType : undefined,
              ),
              entityId,
              createdAt: Date.now(),
              read: false,
            });
          } else {
            incrementCrewUnread();
          }
        }

        const iconByScreen: Record<string, NowlyToastPayload["icon"]> = {
          chat: "message-badge-outline",
          friends: "account-plus-outline",
          proposal: "calendar-clock-outline",
          thread: "chat-processing-outline",
          now_mode: "radio-tower",
          home: "radio-tower",
        };
        const fallbackTitleByScreen: Record<string, string> = {
          chat: "New message",
          friends: "Friend update",
          proposal: "New hangout move",
          thread: "Thread update",
          now_mode: "Live radar pulse",
          home: "Live radar pulse",
        };

        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const title =
          notification.request.content.title ??
          (screen ? fallbackTitleByScreen[screen] : null) ??
          "Nowly update";
        const message = notification.request.content.body ?? "Something in your circle just moved.";

        if (notificationSoundEnabled) {
          playNowlyPingSound();
        }

        if (!inAppNotificationsEnabled) {
          return;
        }

        setInAppToast({
          id,
          title,
          message,
          icon: (screen ? iconByScreen[screen] : null) ?? "bell-ring-outline",
          ctaLabel: path ? "Open" : undefined,
          onPress: path
            ? () => {
                router.push(path as never);
                setInAppToast(null);
              }
            : undefined,
        });

        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
        }

        toastTimeoutRef.current = setTimeout(() => {
          setInAppToast((current) => (current?.id === id ? null : current));
        }, 3200);
      });
    })();

    return () => {
      active = false;
      responseSubscription?.remove();
      foregroundSubscription?.remove();
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [addNotification, crewSurfaceOpen, inAppNotificationsEnabled, incrementCrewUnread, markEntityAsRead, notificationSoundEnabled, router, token]);

  useEffect(() => {
    if (Platform.OS !== "web" || !token || !user) {
      return;
    }

    const socket = getSocket(token);
    if (!socket) {
      return;
    }

    const showCrewToast = (payload?: {
      title?: string;
      body?: string;
      chatId?: string;
      threadId?: string;
      hangoutId?: string;
      screen?: string;
    }) => {
      if (notificationSoundEnabled) {
        playNowlyPingSound();
      }

      if (!inAppNotificationsEnabled) {
        return;
      }

      const title = payload?.title ?? "Nowly update";
      const message = payload?.body ?? "Something in your crew just moved.";
      const chatId = payload?.chatId;
      const threadId = payload?.threadId;
      const hangoutId = payload?.hangoutId;
      const screen = payload?.screen;

      setInAppToast({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        message,
        icon:
          screen === "thread"
            ? "chat-processing-outline"
            : screen === "proposal"
              ? "calendar-clock-outline"
              : screen === "friends"
                ? "account-plus-outline"
                : "bell-ring-outline",
        ctaLabel: chatId || threadId || hangoutId ? "Open" : undefined,
        onPress:
          chatId
            ? () => {
                router.push(`/chat/${chatId}` as never);
                setInAppToast(null);
              }
            : threadId
              ? () => {
                  router.push(`/thread/${threadId}` as never);
                  setInAppToast(null);
                }
              : hangoutId
                ? () => {
                    router.push(`/proposal/${hangoutId}` as never);
                    setInAppToast(null);
                  }
                : undefined,
      });
    };

    const onInboxUpdate = (payload?: {
      actorId?: string;
      chatId?: string;
      chatType?: "direct" | "group";
      title?: string;
      body?: string;
      screen?: string;
    }) => {
      if (payload?.actorId === user.id) {
        return;
      }

      if (!crewSurfaceOpen) {
        addNotification({
          id: `chat:${payload?.chatId ?? "unknown"}:${Date.now()}`,
          type: buildNotificationType("chat", payload?.chatType),
          entityId: `chat:${payload?.chatId ?? "unknown"}`,
          createdAt: Date.now(),
          read: false,
        });
      }

      showCrewToast(payload);
    };

    const onCrewActivity = (payload?: {
      actorId?: string;
      title?: string;
      body?: string;
      chatId?: string;
      threadId?: string;
      hangoutId?: string;
      screen?: string;
    }) => {
      if (payload?.actorId === user.id) {
        return;
      }

      if (!crewSurfaceOpen) {
        const entityId =
          payload?.screen === "thread" && payload.threadId
            ? `thread:${payload.threadId}`
            : payload?.screen === "proposal" && payload.hangoutId
              ? `hangout:${payload.hangoutId}`
              : "friend_requests";
        addNotification({
          id: `${entityId}:${Date.now()}`,
          type: buildNotificationType(payload?.screen),
          entityId,
          createdAt: Date.now(),
          read: false,
        });
      }

      showCrewToast(payload);
    };

    socket.on("chat:inbox-update", onInboxUpdate);
    socket.on("crew:activity", onCrewActivity);

    return () => {
      socket.off("chat:inbox-update", onInboxUpdate);
      socket.off("crew:activity", onCrewActivity);
    };
  }, [addNotification, crewSurfaceOpen, inAppNotificationsEnabled, incrementCrewUnread, notificationSoundEnabled, router, token, user]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    if (typeof document !== "undefined") {
      document.title = "Nowly | Don't grow apart";
    }

    const prefetch = (router as { prefetch?: (href: string) => void }).prefetch;
    if (!prefetch) {
      return;
    }

    ["/home", "/friends", "/profile", "/now-mode", "/availability-preferences"].forEach((path) => {
      try {
        prefetch(path);
      } catch (error) {
        // Ignore prefetch misses so navigation still works.
      }
    });
  }, [router]);

  if (!readyToRender) {
    return <LoadingShell />;
  }

  return (
    <Suspense fallback={<LoadingShell />}>
      <View style={styles.root}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: "#0B1020",
            },
          }}
        />
        <NowlyToast toast={inAppToast} top={Platform.OS === "web" ? 14 : 12} />
      </View>
    </Suspense>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
