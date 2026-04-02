import { useCallback, useEffect, useRef } from "react";
import { getSocket } from "../../../lib/socket";

type IncomingChatMessagePayload = {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  type: "TEXT" | "SYSTEM" | "REACTION" | "POLL";
  createdAt: string;
  updatedAt?: string;
  sender?: { name?: string | null } | null;
};

type DeletedChatMessagePayload = {
  chatId: string;
  messageId: string;
};

type ChatTypingPayload = {
  chatId: string;
  userId: string;
  userName?: string;
  isTyping: boolean;
};

type Props = {
  chatId: string;
  token: string | null;
  userId?: string | null;
  userName?: string | null;
  onIncomingMessage: (payload: IncomingChatMessagePayload) => void;
  onUpdatedMessage: (payload: IncomingChatMessagePayload) => void;
  onDeletedMessage: (payload: DeletedChatMessagePayload) => void;
  onTypingChange: (payload: ChatTypingPayload) => void;
};

export const useChatRoom = ({
  chatId,
  token,
  userId,
  userName,
  onIncomingMessage,
  onUpdatedMessage,
  onDeletedMessage,
  onTypingChange,
}: Props) => {
  const joinedChatIdRef = useRef<string | null>(null);

  const emitTyping = useCallback(
    (isTyping: boolean) => {
      const socket = getSocket(token);
      if (!socket || !chatId || !userName) {
        return;
      }

      socket.emit("chat:typing", {
        chatId,
        isTyping,
        userName,
      });
    },
    [chatId, token, userName],
  );

  const emitSocketMessage = useCallback(
    (text: string) => {
      const socket = getSocket(token);
      if (!socket || !chatId) {
        return false;
      }

      socket.emit("chat:message", { chatId, text });
      return true;
    },
    [chatId, token],
  );

  useEffect(() => {
    const socket = getSocket(token);
    if (!socket || !chatId) {
      return;
    }

    if (joinedChatIdRef.current !== chatId) {
      socket.emit("chat:join", { chatId });
      joinedChatIdRef.current = chatId;
    }

    const handleIncoming = (payload: IncomingChatMessagePayload) => {
      if (payload.threadId !== chatId) {
        return;
      }
      onIncomingMessage(payload);
    };

    const handleUpdated = (payload: IncomingChatMessagePayload) => {
      if (payload.threadId !== chatId) {
        return;
      }
      onUpdatedMessage(payload);
    };

    const handleDeleted = (payload: DeletedChatMessagePayload) => {
      if (payload.chatId !== chatId) {
        return;
      }
      onDeletedMessage(payload);
    };

    const handleTyping = (payload: ChatTypingPayload) => {
      if (payload.chatId !== chatId || payload.userId === userId) {
        return;
      }
      onTypingChange(payload);
    };

    socket.on("chat:message", handleIncoming);
    socket.on("chat:message-updated", handleUpdated);
    socket.on("chat:message-deleted", handleDeleted);
    socket.on("chat:typing", handleTyping);

    return () => {
      if (userName) {
        socket.emit("chat:typing", {
          chatId,
          isTyping: false,
          userName,
        });
      }

      socket.off("chat:message", handleIncoming);
      socket.off("chat:message-updated", handleUpdated);
      socket.off("chat:message-deleted", handleDeleted);
      socket.off("chat:typing", handleTyping);

      if (joinedChatIdRef.current === chatId) {
        joinedChatIdRef.current = null;
      }
    };
  }, [chatId, onDeletedMessage, onIncomingMessage, onTypingChange, onUpdatedMessage, token, userId, userName]);

  return {
    emitTyping,
    emitSocketMessage,
  };
};
