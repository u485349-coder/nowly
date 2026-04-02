import { api } from "../../../lib/api";

export const dashboardApi = {
  fetchDashboard: (token: string | null, userId: string) => api.fetchDashboard(token, userId),
};
