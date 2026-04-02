import { api } from "../../../lib/api";

export const chatApi = {
  fetchChat: (token: string | null, chatId: string) => api.fetchDirectChat(token, chatId),
  fetchMessages: (token: string | null, chatId: string) => api.fetchDirectMessages(token, chatId),
  createGroupChat: (
    token: string | null,
    payload: { title?: string | null; participantIds: string[]; idempotencyKey?: string },
  ) => api.createGroupChat(token, payload),
  sendMessage: (token: string | null, chatId: string, text: string) => api.sendDirectMessage(token, chatId, text),
  updateMessage: (token: string | null, chatId: string, messageId: string, text: string) =>
    api.updateDirectMessage(token, chatId, messageId, text),
  deleteMessage: (token: string | null, chatId: string, messageId: string) =>
    api.deleteDirectMessage(token, chatId, messageId),
  markRead: (token: string | null, chatId: string) => api.markDirectChatRead(token, chatId),
  deleteChat: (token: string | null, chatId: string) => api.deleteDirectChat(token, chatId),
  unfriend: (token: string | null, friendshipId: string) => api.unfriend(token, friendshipId),
};
