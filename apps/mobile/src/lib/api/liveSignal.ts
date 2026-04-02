import { api } from "../../../lib/api";

export const liveSignalApi = {
  setAvailability: (
    token: string | null,
    payload: Parameters<typeof api.setAvailability>[1],
  ) => api.setAvailability(token, payload),
  clearAvailability: (token: string | null, signalId: string) =>
    api.clearAvailability(token, signalId),
};
