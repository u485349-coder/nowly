import { api } from "../../../lib/api";

export const recapApi = {
  createRecap: (token: string | null, hangoutId: string) =>
    api.createRecap(token, hangoutId),
};
