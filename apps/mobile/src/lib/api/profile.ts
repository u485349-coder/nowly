import type { NotificationIntensity } from "@nowly/shared";
import { api } from "../../../lib/api";

type NotificationPreferencePayload = {
  notificationIntensity?: NotificationIntensity;
  pushNotificationsEnabled?: boolean;
  inAppNotificationsEnabled?: boolean;
  notificationSoundEnabled?: boolean;
  messagePreviewEnabled?: boolean;
  dmNotificationsEnabled?: boolean;
  pingNotificationsEnabled?: boolean;
};

export const profileApi = {
  updatePhoto: (token: string | null, photoUrl: string | null) =>
    api.updateProfile(token, { photoUrl }),
  updateNotificationPreference: (
    token: string | null,
    payload: NotificationPreferencePayload,
  ) => api.updateNotificationPreference(token, payload),
};
