import type { HangoutIntent, MicroCommitment } from "@nowly/shared";
import { api } from "../../../lib/api";

export const matchApi = {
  openDirectChat: (token: string | null, userId: string) => api.openDirectChat(token, userId),
  createHangout: (
    token: string | null,
    payload: {
      activity: string;
      microType: HangoutIntent;
      commitmentLevel: MicroCommitment;
      locationName: string;
      participantIds: string[];
      scheduledFor: string;
    },
  ) => api.createHangout(token, payload),
};
