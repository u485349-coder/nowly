import "../global.css";

import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
  useFonts,
} from "@expo-google-fonts/space-grotesk";
import { Stack, useRouter, type ErrorBoundaryProps } from "expo-router";
import { Suspense, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { NowlyToast, type NowlyToastPayload } from "../components/ui/NowlyToast";
import { api } from "../lib/api";
import { useAppStore } from "../store/useAppStore";

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

export default function RootLayout() {
  const router = useRouter();
  const token = useAppStore((state) => state.token);
  const notificationsEnabled = useAppStore((state) => state.notificationsEnabled);
  const incrementCrewUnread = useAppStore((state) => state.incrementCrewUnread);
  const consumeCrewUnread = useAppStore((state) => state.consumeCrewUnread);
  const [inAppToast, setInAppToast] = useState<NowlyToastPayload | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });
  const readyToRender = Platform.OS === "web" ? true : fontsLoaded;

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
    if (Platform.OS === "web" || !token || !notificationsEnabled) {
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
  }, [notificationsEnabled, token]);

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

          if (screen && (screen === "chat" || screen === "friends" || screen === "proposal" || screen === "thread")) {
            consumeCrewUnread();
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
        const isCrewNotification =
          screen === "chat" || screen === "friends" || screen === "proposal" || screen === "thread";

        if (isCrewNotification) {
          incrementCrewUnread();
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
  }, [consumeCrewUnread, incrementCrewUnread, router]);

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
