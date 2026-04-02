import { api } from "../../../lib/api";

export const threadApi = {
  fetchMessages: (token: string | null, threadId: string) => api.fetchThreadMessages(token, threadId),
  updateMessage: (token: string | null, threadId: string, messageId: string, text: string) =>
    api.updateThreadMessage(token, threadId, messageId, text),
  deleteMessage: (token: string | null, threadId: string, messageId: string) =>
    api.deleteThreadMessage(token, threadId, messageId),
};
