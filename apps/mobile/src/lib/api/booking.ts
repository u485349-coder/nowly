import { api } from "../../../lib/api";

export const bookingApi = {
  fetchBookingProfileWithSession: (
    token: string | null,
    inviteCode: string,
    sessionShareCode?: string | null,
  ) => api.fetchBookingProfileWithSession(token, inviteCode, sessionShareCode),
  bookSharedAvailability: (
    token: string | null,
    inviteCode: string,
    payload: Parameters<typeof api.bookSharedAvailability>[2],
  ) => api.bookSharedAvailability(token, inviteCode, payload),
  submitGroupSchedulingAvailability: (
    token: string | null,
    shareCode: string,
    votes: Parameters<typeof api.submitGroupSchedulingAvailability>[2],
  ) => api.submitGroupSchedulingAvailability(token, shareCode, votes),
  sendGroupSchedulingMessage: (
    token: string | null,
    shareCode: string,
    text: string,
  ) => api.sendGroupSchedulingMessage(token, shareCode, text),
  finalizeGroupSchedulingSession: (
    token: string | null,
    shareCode: string,
    slotId: string,
  ) => api.finalizeGroupSchedulingSession(token, shareCode, slotId),
  lockGroupSchedulingSession: (token: string | null, shareCode: string) =>
    api.lockGroupSchedulingSession(token, shareCode),
};
