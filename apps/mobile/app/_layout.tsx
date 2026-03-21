import "../global.css";

import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold, useFonts } from "@expo-google-fonts/space-grotesk";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform, Text, View } from "react-native";
import { api } from "../lib/api";
import { useAppStore } from "../store/useAppStore";

export default function RootLayout() {
  const router = useRouter();
  const token = useAppStore((state) => state.token);
  const notificationsEnabled = useAppStore((state) => state.notificationsEnabled);
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

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

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0B1020",
        }}
      >
        <Text
          style={{
            color: "#F8FAFC",
            fontSize: 16,
          }}
        >
          Loading Nowly...
        </Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: "#0B1020",
        },
      }}
    />
  );
}
