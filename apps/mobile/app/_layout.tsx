import "../global.css";

import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold, useFonts } from "@expo-google-fonts/space-grotesk";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { api } from "../lib/api";
import {
  notificationPathFromData,
  registerForPushNotificationsAsync,
} from "../lib/notifications";
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

    registerForPushNotificationsAsync().then((pushToken) => {
      if (!pushToken || cancelled) {
        return;
      }

      api.registerPushToken(token, pushToken).catch((error) => {
        console.log("[push:error]", error);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [notificationsEnabled, token]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const path = notificationPathFromData(
          response.notification.request.content.data as Record<string, unknown>,
        );

        if (path) {
          router.push(path as never);
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [router]);

  if (!fontsLoaded) {
    return null;
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
