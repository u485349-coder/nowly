import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Alert, type TextInput } from "react-native";
import { track } from "../../../lib/analytics";
import { formatTime } from "../../../lib/format";
import { useAppStore } from "../../../store/useAppStore";
import type { AppFriend, DirectChat, DirectMessage } from "../../../types";
import { useChatRoom } from "../../hooks/realtime/useChatRoom";
import { chatApi } from "../../lib/api/chat";

const EMPTY_DIRECT_MESSAGES: DirectMessage[] = [];
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

const normalizeIncomingMessage = (message: {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  type: "TEXT" | "SYSTEM" | "REACTION" | "POLL";
  createdAt: string;
  updatedAt?: string;
  sender?: { name?: string | null } | null;
}): DirectMessage => ({
  id: message.id,
  chatId: message.threadId,
  senderId: message.senderId,
  senderName: message.sender?.name ?? "Friend",
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
    return `${names[0]}, ${names[1]} are responding`;
  }

  return "Multiple people are responding";
};

const chatDisplayName = (chat?: { title?: string | null; participants: Array<{ name: string }> }) =>
  chat?.title || chat?.participants.map((participant) => participant.name).join(", ") || "Private chat";

const sortChats = (chats: DirectChat[]) =>
  [...chats].sort((a, b) => {
    const aTs = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTs = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTs - aTs;
  });

type Props = {
  chatId: string;
};

export const useChatScreen = ({ chatId }: Props) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const friends = useAppStore((state) => state.friends);
  const directChats = useAppStore((state) => state.directChats);
  const directMessages = useAppStore((state) => state.directMessages[chatId] ?? EMPTY_DIRECT_MESSAGES);
  const setDirectMessages = useAppStore((state) => state.setDirectMessages);
  const appendDirectMessage = useAppStore((state) => state.appendDirectMessage);
  const updateDirectMessageLocal = useAppStore((state) => state.updateDirectMessage);
  const deleteDirectMessageLocal = useAppStore((state) => state.deleteDirectMessage);
  const upsertDirectChat = useAppStore((state) => state.upsertDirectChat);
  const removeDirectChat = useAppStore((state) => state.removeDirectChat);
  const markDirectChatReadLocal = useAppStore((state) => state.markDirectChatReadLocal);
  const removeFriend = useAppStore((state) => state.removeFriend);
  const inputRef = useRef<TextInput | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingPeopleTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const markedReadChatIdRef = useRef<string | null>(null);

  const [text, setText] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [typingPeople, setTypingPeople] = useState<Array<{ id: string; name: string }>>([]);

  const currentChat = directChats.find((item) => item.id === chatId) ?? null;

  const chatQuery = useQuery({
    queryKey: ["chat", "detail", chatId],
    enabled: Boolean(chatId),
    queryFn: () => chatApi.fetchChat(token, chatId),
    initialData: currentChat ?? undefined,
  });

  const messagesQuery = useQuery({
    queryKey: ["chat", "messages", chatId],
    enabled: Boolean(chatId),
    queryFn: () => chatApi.fetchMessages(token, chatId),
    initialData: directMessages.length ? directMessages : undefined,
  });

  const chat = currentChat ?? chatQuery.data ?? null;
  const messages = directMessages.length ? directMessages : messagesQuery.data ?? EMPTY_DIRECT_MESSAGES;

  const syncChatCache = useCallback(
    (nextChat: DirectChat) => {
      upsertDirectChat(nextChat);
      queryClient.setQueryData(["chat", "detail", nextChat.id], nextChat);
      queryClient.setQueryData<DirectChat[] | undefined>(["crew", "chats", user?.id], (current) => {
        const merged = [nextChat, ...(current ?? []).filter((item) => item.id !== nextChat.id)];
        return sortChats(merged);
      });
    },
    [queryClient, upsertDirectChat, user?.id],
  );

  const removeChatCache = useCallback(
    (targetChatId: string) => {
      removeDirectChat(targetChatId);
      queryClient.removeQueries({ queryKey: ["chat", "detail", targetChatId] });
      queryClient.removeQueries({ queryKey: ["chat", "messages", targetChatId] });
      queryClient.setQueryData<DirectChat[] | undefined>(["crew", "chats", user?.id], (current) =>
        (current ?? []).filter((item) => item.id !== targetChatId),
      );
    },
    [queryClient, removeDirectChat, user?.id],
  );

  const syncMessagesCache = useCallback(
    (nextMessages: DirectMessage[]) => {
      setDirectMessages(chatId, nextMessages);
      queryClient.setQueryData(["chat", "messages", chatId], nextMessages);
    },
    [chatId, queryClient, setDirectMessages],
  );

  const appendMessageCache = useCallback(
    (message: DirectMessage) => {
      appendDirectMessage(chatId, message);
      queryClient.setQueryData<DirectMessage[] | undefined>(["chat", "messages", chatId], (current) => {
        const existing = current ?? [];
        if (existing.some((item) => item.id === message.id)) {
          return existing;
        }
        return [...existing, message];
      });
    },
    [appendDirectMessage, chatId, queryClient],
  );

  const updateMessageCache = useCallback(
    (message: DirectMessage) => {
      updateDirectMessageLocal(chatId, message);
      queryClient.setQueryData<DirectMessage[] | undefined>(["chat", "messages", chatId], (current) =>
        (current ?? []).map((item) => (item.id === message.id ? { ...item, ...message } : item)),
      );
    },
    [chatId, queryClient, updateDirectMessageLocal],
  );

  const deleteMessageCache = useCallback(
    (messageId: string) => {
      deleteDirectMessageLocal(chatId, messageId);
      queryClient.setQueryData<DirectMessage[] | undefined>(["chat", "messages", chatId], (current) =>
        (current ?? []).filter((item) => item.id !== messageId),
      );
    },
    [chatId, deleteDirectMessageLocal, queryClient],
  );

  const markRead = useCallback(() => {
    if (!chatId) {
      return;
    }

    markDirectChatReadLocal(chatId);
      queryClient.setQueryData<DirectChat | undefined>(["chat", "detail", chatId], (current) =>
      current ? { ...current, unreadCount: 0 } : current,
    );
    queryClient.setQueryData<DirectChat[] | undefined>(["crew", "chats", user?.id], (current) =>
      (current ?? []).map((item) => (item.id === chatId ? { ...item, unreadCount: 0 } : item)),
    );
    void chatApi.markRead(token, chatId);
  }, [chatId, markDirectChatReadLocal, queryClient, token, user?.id]);

  useEffect(() => {
    if (chatQuery.data) {
      syncChatCache(chatQuery.data);
    }
  }, [chatQuery.data, syncChatCache]);

  useEffect(() => {
    if (messagesQuery.data) {
      syncMessagesCache(messagesQuery.data);
    }
  }, [messagesQuery.data, syncMessagesCache]);

  useEffect(() => {
    if (!chatId || markedReadChatIdRef.current === chatId) {
      return;
    }

    markedReadChatIdRef.current = chatId;
    markRead();
  }, [chatId, markRead]);

  const otherParticipants = useMemo(() => {
    if (!chat) {
      return [];
    }

    const filtered = chat.participants.filter((participant) => participant.id !== user?.id);
    return filtered.length ? filtered : chat.participants;
  }, [chat, user?.id]);

  const primaryParticipant = otherParticipants[0] ?? chat?.participants[0] ?? null;
  const title = chat?.isGroup ? chatDisplayName(chat) : primaryParticipant?.name ?? chatDisplayName(chat);
  const headerSubtitle = chat?.isGroup ? "Group line" : "Private line";
  const quickReplies = useMemo(
    () => (chat?.isGroup ? ["Who's around?", "Pull up?", "Tonight?", "Drop a pin"] : ["Pull up?", "10 min", "Coffee?", "On my way"]),
    [chat?.isGroup],
  );
  const relatedFriend = useMemo(
    () => (primaryParticipant ? friends.find((friend) => friend.id === primaryParticipant.id) ?? null : null),
    [friends, primaryParticipant],
  );
  const typingLabel = useMemo(() => typingLabelForNames(typingPeople.map((entry) => entry.name)), [typingPeople]);

  const getLatestChat = useCallback(() => useAppStore.getState().directChats.find((item) => item.id === chatId) ?? chat ?? null, [chat, chatId]);
  const getLatestMessages = useCallback(() => useAppStore.getState().directMessages[chatId] ?? EMPTY_DIRECT_MESSAGES, [chatId]);

  const handleIncomingMessage = useCallback(
    (payload: {
      id: string;
      threadId: string;
      senderId: string;
      text: string;
      type: "TEXT" | "SYSTEM" | "REACTION" | "POLL";
      createdAt: string;
      updatedAt?: string;
      sender?: { name?: string | null } | null;
    }) => {
      const nextMessage = normalizeIncomingMessage(payload);
      appendMessageCache(nextMessage);
      const latestChat = getLatestChat();
      if (latestChat) {
        syncChatCache({
          ...latestChat,
          lastMessageAt: nextMessage.createdAt,
          lastMessageText: nextMessage.text,
          unreadCount: 0,
        });
      }
      markRead();
    },
    [appendMessageCache, getLatestChat, markRead, syncChatCache],
  );

  const handleUpdatedMessage = useCallback(
    (payload: {
      id: string;
      threadId: string;
      senderId: string;
      text: string;
      type: "TEXT" | "SYSTEM" | "REACTION" | "POLL";
      createdAt: string;
      updatedAt?: string;
      sender?: { name?: string | null } | null;
    }) => {
      const nextMessage = normalizeIncomingMessage(payload);
      updateMessageCache(nextMessage);
    },
    [updateMessageCache],
  );

  const handleDeletedMessage = useCallback(
    (payload: { chatId: string; messageId: string }) => {
      deleteMessageCache(payload.messageId);

      if (editingMessageId === payload.messageId) {
        setEditingMessageId(null);
        setText("");
      }

      const nextMessages = getLatestMessages().filter((entry) => entry.id !== payload.messageId);
      const latestChat = getLatestChat();
      if (latestChat) {
        const latestMessage = nextMessages[nextMessages.length - 1];
        syncChatCache({
          ...latestChat,
          lastMessageAt: latestMessage?.createdAt ?? null,
          lastMessageText: latestMessage?.text ?? null,
        });
      }
    },
    [deleteMessageCache, editingMessageId, getLatestChat, getLatestMessages, syncChatCache],
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

  const { emitTyping, emitSocketMessage } = useChatRoom({
    chatId,
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

  const handleSend = async (presetText?: string) => {
    const nextText = (presetText ?? text).trim();

    if (!chatId || !nextText || !user || isSending) {
      return;
    }

    try {
      setIsSending(true);

      if (editingMessageId) {
        const updatedMessage = await chatApi.updateMessage(token, chatId, editingMessageId, nextText);
        updateMessageCache(updatedMessage);

        const latestMessages = getLatestMessages();
        if (latestMessages[latestMessages.length - 1]?.id === editingMessageId) {
          const latestChat = getLatestChat();
          if (latestChat) {
            syncChatCache({
              ...latestChat,
              lastMessageText: nextText,
            });
          }
        }
      } else {
        const sentOverSocket = emitSocketMessage(nextText);
        if (!sentOverSocket) {
          const message = await chatApi.sendMessage(token, chatId, nextText);
          appendMessageCache(message);
        }

        const latestChat = getLatestChat();
        if (latestChat) {
          syncChatCache({
            ...latestChat,
            lastMessageAt: new Date().toISOString(),
            lastMessageText: nextText,
            unreadCount: 0,
          });
        }
        void track(token, "message_sent", { threadKind: "direct", chatId });
      }

      emitTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      setText("");
      setEditingMessageId(null);
    } catch (error) {
      Alert.alert("Message failed", error instanceof Error ? error.message : "Could not send right now.");
    } finally {
      setIsSending(false);
    }
  };

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

  const handleMessageOptions = (message: DirectMessage) => {
    if (message.senderId !== user?.id) {
      return;
    }

    Alert.alert("Your message", "Choose what to do with this message.", [
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
          void chatApi
            .deleteMessage(token, chatId, message.id)
            .then(() => {
              const nextMessages = getLatestMessages().filter((entry) => entry.id !== message.id);
              deleteMessageCache(message.id);

              const latestChat = getLatestChat();
              if (latestChat) {
                const latestMessage = nextMessages[nextMessages.length - 1];
                syncChatCache({
                  ...latestChat,
                  lastMessageAt: latestMessage?.createdAt ?? null,
                  lastMessageText: latestMessage?.text ?? null,
                });
              }

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

  const openCrewSurface = () => {
    router.push("/friends");
  };

  const handleDeleteThread = () => {
    if (!chat) {
      return;
    }

    if (chat.isGroup) {
      Alert.alert("Group chat stays", "Group chat reset is not available yet.");
      return;
    }

    Alert.alert(
      "Delete this private thread?",
      "This resets the conversation so a future DM starts clean from the beginning.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void chatApi
              .deleteChat(token, chatId)
              .then(() => {
                removeChatCache(chatId);
                router.replace("/friends");
              })
              .catch((error) => {
                Alert.alert("Could not delete thread", error instanceof Error ? error.message : "Try again.");
              });
          },
        },
      ],
    );
  };

  const handleUnfriend = () => {
    if (!relatedFriend) {
      return;
    }

    Alert.alert(
      `Remove ${relatedFriend.name}?`,
      "This removes them from your crew and closes the current private thread.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            void chatApi
              .unfriend(token, relatedFriend.friendshipId)
              .then(() => {
                removeFriend(relatedFriend.id);
                removeChatCache(chatId);
                router.replace("/friends");
              })
              .catch((error) => {
                Alert.alert("Could not remove friend", error instanceof Error ? error.message : "Try again.");
              });
          },
        },
      ],
    );
  };

  const handleChatOptions = () => {
    if (!chat) {
      return;
    }

    const actions: Array<{ text: string; onPress: () => void; style?: "cancel" | "destructive" | "default" }> = [
      { text: "View crew", onPress: openCrewSurface },
      { text: "Delete thread", onPress: handleDeleteThread },
    ];

    if (!chat.isGroup && relatedFriend) {
      actions.push({ text: "Unfriend", onPress: handleUnfriend });
    }

    Alert.alert(title, chat.isGroup ? "Group chat actions" : "Private thread actions", [
      ...actions,
      { text: "Cancel", style: "cancel", onPress: () => undefined },
    ]);
  };

  const retry = () => {
    void chatQuery.refetch();
    void messagesQuery.refetch();
  };

  const messageItems = messages.map((message) => ({
    id: message.id,
    mine: message.senderId === user?.id,
    senderName: message.senderName,
    text: message.text,
    time: formatTime(message.createdAt),
    edited: Boolean(message.updatedAt) && message.updatedAt !== message.createdAt,
    onLongPress: message.senderId === user?.id ? () => handleMessageOptions(message) : undefined,
  }));

  const status = !chatId ? "missing" : chat ? "ready" : chatQuery.isLoading ? "loading" : chatQuery.isError ? "error" : "loading";

  return {
    status,
    inputRef: inputRef as RefObject<TextInput | null>,
    title,
    subtitle: headerSubtitle,
    isGroup: Boolean(chat?.isGroup),
    participants: otherParticipants,
    messages: messageItems,
    isMessageHistoryLoading: messagesQuery.isLoading && !messageItems.length,
    isMessageHistoryError: messagesQuery.isError && !messageItems.length,
    errorMessage: chatQuery.error instanceof Error ? chatQuery.error.message : "We couldn't open this chat right now.",
    typingLabel,
    isEditing: Boolean(editingMessageId),
    showQuickReplies,
    showEmojiPicker,
    quickReplies,
    emojiChoices: [...EMOJI_CHOICES],
    text,
    sendDisabled: !text.trim() || isSending,
    emptyTitle: "No messages yet",
    emptyMessage: "Send one clean line and keep it low pressure.",
    placeholder: editingMessageId ? "Edit your message" : `Message ${chat?.isGroup ? "the group" : primaryParticipant?.name ?? "them"}`,
    onBack: () => router.back(),
    onOpenOptions: handleChatOptions,
    onChangeText: handleTextChange,
    onToggleQuickReplies: () => setShowQuickReplies((current) => !current),
    onQuickReply: (reply: string) => void handleSend(reply),
    onToggleEmojiPicker: () => setShowEmojiPicker((current) => !current),
    onSelectEmoji: (emoji: string) => {
      setText((current) => `${current}${emoji}`);
      inputRef.current?.focus();
    },
    onSend: () => void handleSend(),
    onCancelEdit: () => {
      setEditingMessageId(null);
      setText("");
    },
    onInputBlur: () => emitTyping(false),
    onRetry: retry,
  };
};
