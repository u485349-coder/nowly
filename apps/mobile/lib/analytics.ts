import { AnalyticsEventName } from "@nowly/shared";
import { api } from "./api";

export const track = async (
  token: string | null,
  event: AnalyticsEventName,
  payload?: Record<string, unknown>,
) => {
  try {
    await api.track(token, event, payload);
  } catch (error) {
    console.log("[analytics:error]", error);
  }
};
