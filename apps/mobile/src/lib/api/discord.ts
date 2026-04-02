import { api } from "../../../lib/api";

export const discordApi = {
  linkDiscord: (token: string | null, code: string) => api.linkDiscord(token, code),
};
