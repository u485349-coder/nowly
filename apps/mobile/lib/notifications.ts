import Constants from "expo-constants";
import { Platform } from "react-native";

let notificationHandlerConfigured = false;

const ensureNotificationHandlerConfigured = async () => {
  if (Platform.OS === "web" || notificationHandlerConfigured) {
    return null;
  }

  const Notifications = await import("expo-notifications");

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  notificationHandlerConfigured = true;
  return Notifications;
};

export const notificationPathFromData = (data?: Record<string, unknown>) => {
  if (!data?.screen) {
    return null;
  }

  if (data.screen === "home") {
    return "/home";
  }

  if (data.screen === "now_mode") {
    return "/home";
  }

  if (data.screen === "friends") {
    return "/friends";
  }

  if (data.screen === "profile") {
    return "/profile";
  }

  if (data.screen === "match" && typeof data.matchId === "string") {
    return `/match/${data.matchId}`;
  }

  if (data.screen === "proposal" && typeof data.hangoutId === "string") {
    return `/proposal/${data.hangoutId}`;
  }

  if (data.screen === "thread" && typeof data.threadId === "string") {
    return `/thread/${data.threadId}`;
  }

  if (data.screen === "chat" && typeof data.chatId === "string") {
    return `/chat/${data.chatId}`;
  }

  if (data.screen === "recap" && typeof data.hangoutId === "string") {
    return `/recap/${data.hangoutId}`;
  }

  return null;
};

export const registerForPushNotificationsAsync = async () => {
  if (Platform.OS === "web") {
    return null;
  }

  const Notifications = await ensureNotificationHandlerConfigured();

  if (!Notifications) {
    return null;
  }

  // Expo Go no longer supports remote push notification tokens.
  // Keep the app usable there and only register push in dev/release builds.
  const isExpoGo =
    Boolean(Constants.expoGoConfig) ||
    Constants.appOwnership === "expo" ||
    (Constants.executionEnvironment === "storeClient" && Boolean(Constants.expoVersion));

  if (isExpoGo) {
    console.log("[push] Remote push notifications are unavailable in Expo Go. Use a development or production build.");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  try {
    const projectId =
      process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return token.data;
  } catch {
    return null;
  }
};
