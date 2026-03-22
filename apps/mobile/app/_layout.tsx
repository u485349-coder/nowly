import "../global.css";

import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold, useFonts } from "@expo-google-fonts/space-grotesk";
import { Stack, useRouter, type ErrorBoundaryProps } from "expo-router";
import { Suspense, useEffect } from "react";
import { Platform, Pressable, Text, View } from "react-native";
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
  const [fontsLoaded] = useFonts({
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
    let subscription: { remove: () => void } | null = null;

    void (async () => {
      const [{ notificationPathFromData }, Notifications] = await Promise.all([
        import("../lib/notifications"),
        import("expo-notifications"),
      ]);

      if (!active) {
        return;
      }

      subscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const path = notificationPathFromData(
            response.notification.request.content.data as Record<string, unknown>,
          );

          if (path) {
            router.push(path as never);
          }
        },
      );
    })();

    return () => {
      active = false;
      subscription?.remove();
    };
  }, [router]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
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
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: "#0B1020",
          },
        }}
      />
    </Suspense>
  );
}
