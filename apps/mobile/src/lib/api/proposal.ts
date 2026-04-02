import { api } from "../../../lib/api";
import type { MicroResponse, ParticipantResponse } from "@nowly/shared";

export const proposalApi = {
  respond: (
    token: string | null,
    hangoutId: string,
    payload: {
      responseStatus?: ParticipantResponse;
      microResponse?: MicroResponse | null;
    },
  ) => api.respondToHangout(token, hangoutId, payload),
};
