import Constants from "expo-constants";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const notificationPathFromData = (data?: Record<string, unknown>) => {
  if (!data?.screen) {
    return null;
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

  if (data.screen === "recap" && typeof data.hangoutId === "string") {
    return `/recap/${data.hangoutId}`;
  }

  return null;
};

export const registerForPushNotificationsAsync = async () => {
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
    const token = await Notifications.getExpoPushTokenAsync({
      projectId:
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId,
    });
    return token.data;
  } catch {
    return null;
  }
};
