import { api } from "../../../lib/api";

export const onboardingApi = {
  requestAuthCode: (payload: { channel: "phone" | "email"; value: string }) =>
    api.requestAuthCode(payload),
  verifyAuthCode: (payload: {
    channel: "phone" | "email";
    value: string;
    code: string;
  }) => api.verifyAuthCode(payload),
  completeOnboarding: (
    token: string | null,
    payload: {
      name: string;
      city: string;
      communityTag?: string | null;
      photoUrl?: string | null;
      lat?: number | null;
      lng?: number | null;
      referralToken?: string;
    },
  ) => api.completeOnboarding(token, payload),
  redeemInvite: (token: string | null, referralToken: string) =>
    api.redeemInvite(token, referralToken),
  fetchDashboard: (token: string | null, currentUserId?: string) =>
    api.fetchDashboard(token, currentUserId),
  sendInvite: (token: string | null, phoneNumbers: string[]) =>
    api.sendInvite(token, phoneNumbers),
  getDiscordOauthUrl: (token: string | null) => api.getDiscordOauthUrl(token),
};
