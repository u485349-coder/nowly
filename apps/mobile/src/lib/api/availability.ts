import { api } from "../../../lib/api";

export const availabilityApi = {
  fetchRecurringAvailability: (token: string | null) => api.fetchRecurringAvailability(token),
  saveRecurringAvailability: (
    token: string | null,
    windows: Parameters<typeof api.saveRecurringAvailability>[1],
  ) => api.saveRecurringAvailability(token, windows),
  fetchScheduledOverlaps: (token: string | null) => api.fetchScheduledOverlaps(token),
  createGroupSchedulingSession: (
    token: string | null,
    inviteCode: string,
    payload: Parameters<typeof api.createGroupSchedulingSession>[2],
  ) => api.createGroupSchedulingSession(token, inviteCode, payload),
};
