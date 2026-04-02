import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Alert, type TextInput } from "react-native";
import { track } from "../../../lib/analytics";
import { formatDayTime, formatTime } from "../../../lib/format";
import { hangoutIntentLabel } from "../../../lib/labels";
import { useAppStore } from "../../../store/useAppStore";
import type { AppHangout, ThreadMessage } from "../../../types";
import { useThreadRoom } from "../../hooks/realtime/useThreadRoom";
import { threadApi } from "../../lib/api/thread";

const EMPTY_THREAD_MESSAGES: ThreadMessage[] = [];
const EMOJI_CHOICES = [
  "\u{1F600}",
  "\u{1F602}",
  "\u{1F62D}",
  "\u{1F525}",
  "\u{2764}\u{FE0F}",
  "\u{1F64F}",
  "\u{1F440}",
  "\u{1F62E}",
  "\u{1F60E}",
  "\u{1F972}",
  "\u{1F91D}",
  "\u{1F389}",
] as const;
const ETA_MINUTES = 12;

const normalizeIncomingMessage = (message: {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  type: "TEXT" | "SYSTEM" | "REACTION" | "POLL";
  createdAt: string;
  updatedAt?: string;
  senderName?: string;
  sender?: { name?: string | null } | null;
}): ThreadMessage => ({
  id: message.id,
  threadId: message.threadId,
  senderId: message.senderId,
  senderName: message.senderName ?? message.sender?.name ?? "Friend",
  text: message.text,
  type: message.type,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

const typingLabelForNames = (names: string[]) => {
  if (!names.length) {
    return "";
  }

  if (names.length === 1) {
    return `${names[0]} is responding`;
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]} are responding`;
  }

  return "Multiple people are responding";
};

const buildPeopleLabel = (hangout: AppHangout | null, currentUserId?: string | null) => {
  if (!hangout?.participantsInfo?.length) {
    return "Crew thread";
  }

  const others = hangout.participantsInfo.filter((participant) => participant.userId !== currentUserId);
  const names = (others.length ? others : hangout.participantsInfo).map((participant) => participant.name);

  if (names.length === 1) {
    return `With ${names[0]}`;
  }

  if (names.length === 2) {
    return `With ${names[0]} and ${names[1]}`;
  }

  return `${names[0]}, ${names[1]}, and ${names.length - 2} more`;
};

type Props = {
  threadId: string;
};

export const useThreadScreen = ({ threadId }: Props) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const hangouts = useAppStore((state) => state.hangouts);
  const storeMessages = useAppStore((state) => state.threadMessages[threadId] ?? EMPTY_THREAD_MESSAGES);
  const setThreadMessages = useAppStore((state) => state.setThreadMessages);
  const appendMessage = useAppStore((state) => state.appendMessage);
  const updateThreadMessage = useAppStore((state) => state.updateThreadMessage);
  const deleteThreadMessage = useAppStore((state) => state.deleteThreadMessage);

  const inputRef = useRef<TextInput | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingPeopleTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [typingPeople, setTypingPeople] = useState<Array<{ id: string; name: string }>>([]);

  const hangout = hangouts.find((item) => item.threadId === threadId) ?? null;
  const isCompleted = hangout?.status === "COMPLETED";

  useEffect(() => {
    if (hangout?.id && isCompleted) {
      router.replace(`/recap/${hangout.id}`);
    }
  }, [hangout?.id, isCompleted, router]);

  const messagesQuery = useQuery({
    queryKey: ["thread", "messages", threadId],
    enabled: Boolean(threadId) && !isCompleted,
    queryFn: () => threadApi.fetchMessages(token, threadId),
    initialData: storeMessages.length ? storeMessages : undefined,
  });

  const messages = storeMessages.length ? storeMessages : messagesQuery.data ?? EMPTY_THREAD_MESSAGES;

  const syncMessagesCache = useCallback(
    (nextMessages: ThreadMessage[]) => {
      setThreadMessages(threadId, nextMessages);
      queryClient.setQueryData(["thread", "messages", threadId], nextMessages);
    },
    [queryClient, setThreadMessages, threadId],
  );

  const appendMessageCache = useCallback(
    (message: ThreadMessage) => {
      appendMessage(threadId, message);
      queryClient.setQueryData<ThreadMessage[] | undefined>(["thread", "messages", threadId], (current) => {
        const existing = current ?? [];
        if (existing.some((item) => item.id === message.id)) {
          return existing;
        }
        return [...existing, message];
      });
    },
    [appendMessage, queryClient, threadId],
  );

  const updateMessageCache = useCallback(
    (message: ThreadMessage) => {
      updateThreadMessage(threadId, message);
      queryClient.setQueryData<ThreadMessage[] | undefined>(["thread", "messages", threadId], (current) =>
        (current ?? []).map((item) => (item.id === message.id ? { ...item, ...message } : item)),
      );
    },
    [queryClient, threadId, updateThreadMessage],
  );

  const deleteMessageCache = useCallback(
    (messageId: string) => {
      deleteThreadMessage(threadId, messageId);
      queryClient.setQueryData<ThreadMessage[] | undefined>(["thread", "messages", threadId], (current) =>
        (current ?? []).filter((item) => item.id !== messageId),
      );
    },
    [deleteThreadMessage, queryClient, threadId],
  );

  useEffect(() => {
    if (messagesQuery.data) {
      syncMessagesCache(messagesQuery.data);
    }
  }, [messagesQuery.data, syncMessagesCache]);

  const handleIncomingMessage = useCallback(
    (payload: Parameters<typeof normalizeIncomingMessage>[0]) => {
      appendMessageCache(normalizeIncomingMessage(payload));
    },
    [appendMessageCache],
  );

  const handleUpdatedMessage = useCallback(
    (payload: Parameters<typeof normalizeIncomingMessage>[0]) => {
      updateMessageCache(normalizeIncomingMessage(payload));
    },
    [updateMessageCache],
  );

  const handleDeletedMessage = useCallback(
    (payload: { threadId: string; messageId: string }) => {
      deleteMessageCache(payload.messageId);

      if (editingMessageId === payload.messageId) {
        setEditingMessageId(null);
        setText("");
      }
    },
    [deleteMessageCache, editingMessageId],
  );

  const handleTypingChange = useCallback((payload: { userId: string; userName?: string; isTyping: boolean }) => {
    const timeoutKey = payload.userId;
    const existingTimeout = typingPeopleTimeoutsRef.current[timeoutKey];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    if (!payload.isTyping) {
      delete typingPeopleTimeoutsRef.current[timeoutKey];
      setTypingPeople((current) => current.filter((entry) => entry.id !== payload.userId));
      return;
    }

    setTypingPeople((current) => {
      const nextName = payload.userName?.trim() || "Someone";
      const withoutCurrent = current.filter((entry) => entry.id !== payload.userId);
      return [...withoutCurrent, { id: payload.userId, name: nextName }];
    });

    typingPeopleTimeoutsRef.current[timeoutKey] = setTimeout(() => {
      setTypingPeople((current) => current.filter((entry) => entry.id !== payload.userId));
      delete typingPeopleTimeoutsRef.current[timeoutKey];
    }, 1800);
  }, []);

  const { emitTyping, emitSocketMessage, emitSocketReaction, emitSocketEta } = useThreadRoom({
    threadId,
    hangoutId: hangout?.id,
    token,
    userId: user?.id,
    userName: user?.name,
    onIncomingMessage: handleIncomingMessage,
    onUpdatedMessage: handleUpdatedMessage,
    onDeletedMessage: handleDeletedMessage,
    onTypingChange: handleTypingChange,
  });

  useEffect(
    () => () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      Object.values(typingPeopleTimeoutsRef.current).forEach((timeout) => clearTimeout(timeout));
    },
    [],
  );

  const handleTextChange = (value: string) => {
    setText(value);

    if (!value.trim()) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      emitTyping(false);
      return;
    }

    emitTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(false);
      typingTimeoutRef.current = null;
    }, 1200);
  };

  const handleSend = async () => {
    const nextText = text.trim();
    if (!threadId || !nextText || !user || isCompleted || isSending) {
      return;
    }

    try {
      setIsSending(true);

      if (editingMessageId) {
        const updatedMessage = await threadApi.updateMessage(token, threadId, editingMessageId, nextText);
        updateMessageCache(updatedMessage);
      } else {
        const sentOverSocket = emitSocketMessage(nextText);
        if (!sentOverSocket) {
          appendMessageCache({
            id: `local-${Date.now()}`,
            threadId,
            senderId: user.id,
            senderName: user.name,
            text: nextText,
            type: "TEXT",
            createdAt: new Date().toISOString(),
          });
        }
        void track(token, "message_sent", { threadId });
      }

      emitTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      setText("");
      setEditingMessageId(null);
    } catch (error) {
      Alert.alert("Message failed", error instanceof Error ? error.message : "Could not update right now.");
    } finally {
      setIsSending(false);
    }
  };

  const handleReaction = (reaction: string) => {
    if (!user || isCompleted) {
      return;
    }

    const sentOverSocket = emitSocketReaction(reaction);
    if (!sentOverSocket) {
      appendMessageCache({
        id: `reaction-${Date.now()}`,
        threadId,
        senderId: user.id,
        senderName: user.name,
        text: reaction,
        type: "REACTION",
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleEta = () => {
    if (!hangout || isCompleted) {
      return;
    }

    void emitSocketEta(ETA_MINUTES);
    appendMessageCache({
      id: `eta-${Date.now()}`,
      threadId,
      senderId: user?.id ?? "me",
      senderName: user?.name ?? "You",
      text: `ETA ${ETA_MINUTES} min`,
      type: "SYSTEM",
      createdAt: new Date().toISOString(),
    });
  };

  const handleMessageOptions = (message: ThreadMessage) => {
    if (message.senderId !== user?.id) {
      return;
    }

    Alert.alert("Your message", "Choose what to do with this update.", [
      {
        text: "Edit",
        onPress: () => {
          setEditingMessageId(message.id);
          setText(message.text);
          inputRef.current?.focus();
        },
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void threadApi
            .deleteMessage(token, threadId, message.id)
            .then(() => {
              deleteMessageCache(message.id);
              if (editingMessageId === message.id) {
                setEditingMessageId(null);
                setText("");
              }
            })
            .catch((error) => {
              Alert.alert("Could not delete message", error instanceof Error ? error.message : "Try again.");
            });
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const retry = () => {
    void messagesQuery.refetch();
  };

  const typingLabel = useMemo(
    () => typingLabelForNames(typingPeople.map((entry) => entry.name)),
    [typingPeople],
  );

  const title = hangout?.activity ?? "Crew thread";
  const peopleLabel = buildPeopleLabel(hangout, user?.id);
  const whenLabel = hangout?.scheduledFor ? formatDayTime(hangout.scheduledFor) : "Timing still getting pinned down";
  const locationLabel = hangout?.locationName || null;
  const intentLabel = hangout?.microType ? hangoutIntentLabel(hangout.microType) : null;

  const messageItems = messages.map((message) => ({
    id: message.id,
    mine: message.senderId === user?.id,
    senderName: message.senderName,
    text: message.text,
    time: formatTime(message.createdAt),
    edited: Boolean(message.updatedAt) && message.updatedAt !== message.createdAt,
    onLongPress: message.senderId === user?.id ? () => handleMessageOptions(message) : undefined,
  }));

  const status = !threadId
    ? "missing"
    : isCompleted
      ? "redirecting"
      : messagesQuery.isLoading && !messageItems.length
        ? "loading"
        : messagesQuery.isError && !messageItems.length
          ? "error"
          : "ready";

  return {
    status,
    inputRef: inputRef as RefObject<TextInput | null>,
    title,
    peopleLabel,
    whenLabel,
    locationLabel,
    intentLabel,
    messages: messageItems,
    typingLabel,
    isEditing: Boolean(editingMessageId),
    showEmojiPicker,
    emojiChoices: [...EMOJI_CHOICES],
    text,
    sendDisabled: !text.trim() || isSending,
    reactionOptions: ["Fire", "Ramen", "Run", "Coffee"],
    etaLabel: `ETA ${ETA_MINUTES}m`,
    emptyTitle: "Coordination starts here",
    emptyMessage: "Drop the first update, reaction, or ETA so the plan keeps moving.",
    errorMessage:
      messagesQuery.error instanceof Error
        ? messagesQuery.error.message
        : "We couldn't load this coordination room right now.",
    placeholder: editingMessageId ? "Edit your update" : "Drop a quick update",
    onBack: () => router.back(),
    onChangeText: handleTextChange,
    onSend: () => void handleSend(),
    onReaction: handleReaction,
    onEta: handleEta,
    onToggleEmojiPicker: () => setShowEmojiPicker((current) => !current),
    onSelectEmoji: (emoji: string) => {
      setText((current) => `${current}${emoji}`);
      inputRef.current?.focus();
    },
    onCancelEdit: () => {
      setEditingMessageId(null);
      setText("");
    },
    onInputBlur: () => emitTyping(false),
    onRetry: retry,
  };
};
