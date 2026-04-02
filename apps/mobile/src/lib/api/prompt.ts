import { api } from "../../../lib/api";
import type { HangoutIntent, MicroCommitment } from "@nowly/shared";

export const promptApi = {
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

