import { api } from "../../../lib/api";

export const crewApi = {
  fetchFriends: (token: string | null, userId: string) => api.fetchFriends(token, userId),
  fetchFriendSuggestions: (token: string | null) => api.fetchFriendSuggestions(token),
  fetchDirectChats: (token: string | null) => api.fetchDirectChats(token),
  requestFriend: (token: string | null, userId: string, friendId: string) => api.requestFriend(token, userId, friendId),
  respondToFriendRequest: (
    token: string | null,
    userId: string,
    friendshipId: string,
    action: "ACCEPT" | "DECLINE",
  ) => api.respondToFriendRequest(token, userId, friendshipId, action),
  openDirectChat: (token: string | null, userId: string) => api.openDirectChat(token, userId),
  unfriend: (token: string | null, friendshipId: string) => api.unfriend(token, friendshipId),
};
