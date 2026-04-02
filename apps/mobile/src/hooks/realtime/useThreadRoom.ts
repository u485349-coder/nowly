import { useCallback, useEffect, useRef } from "react";
import { getSocket } from "../../../lib/socket";

type IncomingThreadMessagePayload = {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  type: "TEXT" | "SYSTEM" | "REACTION" | "POLL";
  createdAt: string;
  updatedAt?: string;
  senderName?: string;
  sender?: { name?: string | null } | null;
};

type DeletedThreadMessagePayload = {
  threadId: string;
  messageId: string;
};

type ThreadTypingPayload = {
  threadId: string;
  userId: string;
  userName?: string;
  isTyping: boolean;
};

type Props = {
  threadId: string;
  hangoutId?: string | null;
  token: string | null;
  userId?: string | null;
  userName?: string | null;
  onIncomingMessage: (payload: IncomingThreadMessagePayload) => void;
  onUpdatedMessage: (payload: IncomingThreadMessagePayload) => void;
  onDeletedMessage: (payload: DeletedThreadMessagePayload) => void;
  onTypingChange: (payload: ThreadTypingPayload) => void;
};

export const useThreadRoom = ({
  threadId,
  hangoutId,
  token,
  userId,
  userName,
  onIncomingMessage,
  onUpdatedMessage,
  onDeletedMessage,
  onTypingChange,
}: Props) => {
  const joinedThreadIdRef = useRef<string | null>(null);

  const emitTyping = useCallback(
    (isTyping: boolean) => {
      const socket = getSocket(token);
      if (!socket || !threadId || !userName) {
        return;
      }

      socket.emit("thread:typing", {
        threadId,
        isTyping,
        userName,
      });
    },
    [threadId, token, userName],
  );

  const emitSocketMessage = useCallback(
    (text: string) => {
      const socket = getSocket(token);
      if (!socket || !threadId) {
        return false;
      }

      socket.emit("thread:message", { threadId, text });
      return true;
    },
    [threadId, token],
  );

  const emitSocketReaction = useCallback(
    (emoji: string) => {
      const socket = getSocket(token);
      if (!socket || !threadId) {
        return false;
      }

      socket.emit("thread:reaction", { threadId, emoji });
      return true;
    },
    [threadId, token],
  );

  const emitSocketEta = useCallback(
    (etaMinutes: number) => {
      const socket = getSocket(token);
      if (!socket || !hangoutId) {
        return false;
      }

      socket.emit("thread:eta", {
        hangoutId,
        etaMinutes,
      });
      return true;
    },
    [hangoutId, token],
  );

  useEffect(() => {
    const socket = getSocket(token);
    if (!socket || !threadId) {
      return;
    }

    if (joinedThreadIdRef.current !== threadId) {
      socket.emit("thread:join", { threadId });
      joinedThreadIdRef.current = threadId;
    }

    const handleIncoming = (payload: IncomingThreadMessagePayload) => {
      if (payload.threadId !== threadId) {
        return;
      }
      onIncomingMessage(payload);
    };

    const handleUpdated = (payload: IncomingThreadMessagePayload) => {
      if (payload.threadId !== threadId) {
        return;
      }
      onUpdatedMessage(payload);
    };

    const handleDeleted = (payload: DeletedThreadMessagePayload) => {
      if (payload.threadId !== threadId) {
        return;
      }
      onDeletedMessage(payload);
    };

    const handleTyping = (payload: ThreadTypingPayload) => {
      if (payload.threadId !== threadId || payload.userId === userId) {
        return;
      }
      onTypingChange(payload);
    };

    socket.on("thread:message", handleIncoming);
    socket.on("thread:reaction", handleIncoming);
    socket.on("thread:poll", handleIncoming);
    socket.on("thread:message-updated", handleUpdated);
    socket.on("thread:message-deleted", handleDeleted);
    socket.on("thread:typing", handleTyping);

    return () => {
      if (userName) {
        socket.emit("thread:typing", {
          threadId,
          isTyping: false,
          userName,
        });
      }

      socket.off("thread:message", handleIncoming);
      socket.off("thread:reaction", handleIncoming);
      socket.off("thread:poll", handleIncoming);
      socket.off("thread:message-updated", handleUpdated);
      socket.off("thread:message-deleted", handleDeleted);
      socket.off("thread:typing", handleTyping);

      if (joinedThreadIdRef.current === threadId) {
        joinedThreadIdRef.current = null;
      }
    };
  }, [
    threadId,
    token,
    onIncomingMessage,
    onUpdatedMessage,
    onDeletedMessage,
    onTypingChange,
    userId,
    userName,
  ]);

  return {
    emitTyping,
    emitSocketMessage,
    emitSocketReaction,
    emitSocketEta,
  };
};
