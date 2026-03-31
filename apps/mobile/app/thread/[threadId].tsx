import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { useResponsiveLayout } from "../../components/ui/useResponsiveLayout";
import { ThreadMobileScreen } from "../../features/mobile/screens/ThreadMobileScreen";
import { api } from "../../lib/api";
import { track } from "../../lib/analytics";
import { formatTime } from "../../lib/format";
import { getSocket } from "../../lib/socket";
import { webPressableStyle } from "../../lib/web-pressable";
import { useAppStore } from "../../store/useAppStore";
import { ThreadMessage } from "../../types";

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
];

const normalizeIncomingMessage = (message: {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  type: "TEXT" | "SYSTEM" | "REACTION" | "POLL";
  createdAt: string;
  updatedAt?: string;
  senderName?: string;
  sender?: { name?: string | null };
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
  if (names.length === 0) {
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

export default function ThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const hangouts = useAppStore((state) => state.hangouts);
  const threadMessages = useAppStore((state) => state.threadMessages[threadId] ?? EMPTY_THREAD_MESSAGES);
  const setThreadMessages = useAppStore((state) => state.setThreadMessages);
  const appendMessage = useAppStore((state) => state.appendMessage);
  const updateThreadMessageLocal = useAppStore((state) => state.updateThreadMessage);
  const deleteThreadMessageLocal = useAppStore((state) => state.deleteThreadMessage);
  const layout = useResponsiveLayout();
  const useMobileFrontend = Platform.OS !== "web" && layout.isMobile;
  const fetchedThreadIdRef = useRef<string | null>(null);
  const joinedThreadIdRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingPeopleTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [typingPeople, setTypingPeople] = useState<Array<{ id: string; name: string }>>([]);
  const hangout = hangouts.find((item) => item.threadId === threadId);
  const isCompleted = hangout?.status === "COMPLETED";
  const typingLabel = useMemo(
    () => typingLabelForNames(typingPeople.map((entry) => entry.name)),
    [typingPeople],
  );

  useEffect(() => {
    if (hangout?.id && isCompleted) {
      router.replace(`/recap/${hangout.id}`);
    }
  }, [hangout?.id, isCompleted]);

  useEffect(() => {
    if (!threadId || isCompleted) {
      return;
    }

    if (fetchedThreadIdRef.current !== threadId) {
      fetchedThreadIdRef.current = threadId;
      api.fetchThreadMessages(token, threadId).then((messages) => {
        setThreadMessages(threadId, messages);
      });
    }
  }, [isCompleted, setThreadMessages, threadId, token]);

  useEffect(() => {
    if (!threadId || isCompleted) {
      return;
    }

    const socket = getSocket(token);

    if (!socket) {
      return;
    }

    if (joinedThreadIdRef.current !== threadId) {
      joinedThreadIdRef.current = threadId;
      socket.emit("thread:join", { threadId });
    }

    const handleIncoming = (message: {
      id: string;
      threadId: string;
      senderId: string;
      text: string;
      type: "TEXT" | "SYSTEM" | "REACTION" | "POLL";
      createdAt: string;
      updatedAt?: string;
      senderName?: string;
      sender?: { name?: string | null };
    }) => {
      if (message.threadId !== threadId) {
        return;
      }
      appendMessage(threadId, normalizeIncomingMessage(message));
    };

    const handleUpdated = (message: {
      id: string;
      threadId: string;
      senderId: string;
      text: string;
      type: "TEXT" | "SYSTEM" | "REACTION" | "POLL";
      createdAt: string;
      updatedAt?: string;
      senderName?: string;
      sender?: { name?: string | null };
    }) => {
      if (message.threadId !== threadId) {
        return;
      }

      updateThreadMessageLocal(threadId, normalizeIncomingMessage(message));
    };

    const handleDeleted = (payload: { threadId: string; messageId: string }) => {
      if (payload.threadId !== threadId) {
        return;
      }

      deleteThreadMessageLocal(threadId, payload.messageId);
      if (editingMessageId === payload.messageId) {
        setEditingMessageId(null);
        setText("");
      }
    };

    const handleTyping = (payload: {
      threadId: string;
      userId: string;
      userName?: string;
      isTyping: boolean;
    }) => {
      if (payload.threadId !== threadId || payload.userId === user?.id) {
        return;
      }

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
    };

    socket.on("thread:message", handleIncoming);
    socket.on("thread:reaction", handleIncoming);
    socket.on("thread:poll", handleIncoming);
    socket.on("thread:message-updated", handleUpdated);
    socket.on("thread:message-deleted", handleDeleted);
    socket.on("thread:typing", handleTyping);

    return () => {
      socket.emit("thread:typing", {
        threadId,
        isTyping: false,
        userName: user?.name,
      });
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
    appendMessage,
    deleteThreadMessageLocal,
    editingMessageId,
    isCompleted,
    threadId,
    token,
    updateThreadMessageLocal,
    user?.id,
    user?.name,
  ]);

  useEffect(
    () => () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      Object.values(typingPeopleTimeoutsRef.current).forEach((timeout) => clearTimeout(timeout));
    },
    [],
  );

  const quickReactions = useMemo(() => ["Fire", "Ramen", "Run", "Coffee"], []);

  const sendLocalMessage = (payload: ThreadMessage) => {
    appendMessage(threadId, payload);
  };

  const emitTyping = (isTyping: boolean) => {
    const socket = getSocket(token);
    if (!socket || !threadId || !user) {
      return;
    }

    socket.emit("thread:typing", {
      threadId,
      isTyping,
      userName: user.name,
    });
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

  const handleSend = async () => {
    if (!text.trim() || !user || isCompleted) {
      return;
    }

    const nextText = text.trim();
    try {
      const socket = getSocket(token);
      if (editingMessageId) {
        const message = await api.updateThreadMessage(token, threadId, editingMessageId, nextText);
        updateThreadMessageLocal(threadId, message);
      } else if (socket) {
        socket.emit("thread:message", { threadId, text: nextText });
      } else {
        sendLocalMessage({
          id: `local-${Date.now()}`,
          threadId,
          senderId: user.id,
          senderName: user.name,
          text: nextText,
          type: "TEXT",
          createdAt: new Date().toISOString(),
        });
      }

      if (!editingMessageId) {
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
      Alert.alert(
        "Message failed",
        error instanceof Error ? error.message : "Could not update right now.",
      );
    }
  };

  const handleReaction = (emoji: string) => {
    if (!user || isCompleted) {
      return;
    }

    const socket = getSocket(token);
    if (socket) {
      socket.emit("thread:reaction", { threadId, emoji });
    } else {
      sendLocalMessage({
        id: `reaction-${Date.now()}`,
        threadId,
        senderId: user.id,
        senderName: user.name,
        text: emoji,
        type: "REACTION",
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleEta = () => {
    if (!hangout || isCompleted) {
      return;
    }

    const socket = getSocket(token);
    if (socket) {
      socket.emit("thread:eta", {
        hangoutId: hangout.id,
        etaMinutes: 12,
      });
    }

    sendLocalMessage({
      id: `eta-${Date.now()}`,
      threadId,
      senderId: user?.id ?? "me",
      senderName: user?.name ?? "You",
      text: "ETA 12 min",
      type: "SYSTEM",
      createdAt: new Date().toISOString(),
    });
  };

  const handleMessageOptions = (message: ThreadMessage) => {
    if (message.senderId !== user?.id) {
      return;
    }

    Alert.alert(
      "Your message",
      "Choose what to do with this message.",
      [
        {
          text: "Edit",
          onPress: () => {
            setEditingMessageId(message.id);
            setText(message.text);
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void api.deleteThreadMessage(token, threadId, message.id)
              .then(() => {
                deleteThreadMessageLocal(threadId, message.id);
                if (editingMessageId === message.id) {
                  setEditingMessageId(null);
                  setText("");
                }
              })
              .catch((error) => {
                Alert.alert(
                  "Could not delete message",
                  error instanceof Error ? error.message : "Try again.",
                );
              });
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  if (isCompleted && hangout?.id) {
    return (
      <GradientMesh>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="font-body text-base text-white/60">Opening recap...</Text>
        </View>
      </GradientMesh>
    );
  }

  if (useMobileFrontend) {
    return (
      <ThreadMobileScreen
        title={hangout?.activity ?? "Crew thread"}
        subtitle="Quick chat, polls, ETA, and live location belong here."
        onBack={() => router.back()}
        messages={threadMessages.map((message) => ({
          id: message.id,
          senderName: message.senderName,
          text: message.text,
          time: formatTime(message.createdAt),
          edited: Boolean(message.updatedAt) && message.updatedAt !== message.createdAt,
        }))}
        typingLabel={typingLabel}
        editing={Boolean(editingMessageId)}
        onCancelEdit={() => {
          setEditingMessageId(null);
          setText("");
        }}
        quickReactions={quickReactions}
        onQuickReaction={handleReaction}
        onEta={handleEta}
        text={text}
        onChangeText={handleTextChange}
        placeholder={editingMessageId ? "Edit your message" : "Drop a quick update"}
        onToggleEmoji={() => setShowEmojiPicker((current) => !current)}
        showEmojiPicker={showEmojiPicker}
        emojis={EMOJI_CHOICES}
        onSelectEmoji={(emoji) => setText((current) => `${current}${emoji}`)}
        onSend={() => void handleSend()}
      />
    );
  }

  return (
    <GradientMesh>
      <View
        className="flex-1 pb-8"
        style={{
          paddingHorizontal: layout.screenPadding,
          paddingTop: layout.topPadding + 18,
        }}
      >
        <View style={{ width: layout.shellWidth, alignSelf: "center", flex: 1 }}>
        <GlassCard className="mb-4 p-5">
          <Text
            className="font-display text-cloud"
            style={{ fontSize: layout.isCompactPhone ? 24 : 28, lineHeight: layout.isCompactPhone ? 28 : 32 }}
          >
            {hangout?.activity ?? "Crew thread"}
          </Text>
          <Text className="mt-1 font-body text-sm text-white/60">
            Quick chat, polls, ETA, and live location belong here.
          </Text>
        </GlassCard>

        <ScrollView className="flex-1" contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
          {threadMessages.map((message) => (
            <Pressable
              key={message.id}
              onLongPress={message.senderId === user?.id ? () => handleMessageOptions(message) : undefined}
            >
              <GlassCard className="p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="font-display text-base text-cloud">{message.senderName}</Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="font-body text-xs text-white/45">{formatTime(message.createdAt)}</Text>
                    {message.updatedAt && message.updatedAt !== message.createdAt ? (
                      <Text className="font-body text-[11px] text-aqua/75">edited</Text>
                    ) : null}
                  </View>
                </View>
                <Text className="mt-2 font-body text-base leading-6 text-white/70">{message.text}</Text>
              </GlassCard>
            </Pressable>
          ))}
        </ScrollView>

        {typingLabel ? (
          <Text className="mb-2 font-body text-xs text-aqua/80">{typingLabel}</Text>
        ) : null}
        {editingMessageId ? (
          <View className="mb-3 flex-row items-center justify-between rounded-[18px] border border-white/8 bg-white/5 px-4 py-3">
            <Text className="font-body text-xs text-cloud">Editing your message</Text>
            <Pressable onPress={() => { setEditingMessageId(null); setText(""); }}>
              <Text className="font-body text-xs text-aqua">Cancel</Text>
            </Pressable>
          </View>
        ) : null}

        <View className="mb-3 flex-row gap-2" style={{ flexWrap: "wrap" }}>
          {quickReactions.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => handleReaction(emoji)}
              className="rounded-full bg-white/10 px-4 py-3"
              style={({ pressed }) =>
                webPressableStyle(pressed, { pressedOpacity: 0.86, pressedScale: 0.99 })
              }
            >
              <Text className="font-body text-sm text-cloud">{emoji}</Text>
            </Pressable>
          ))}
          <PillButton label="ETA 12m" variant="secondary" onPress={handleEta} />
        </View>

        <View className="flex-row items-center gap-3">
          <TextInput
            value={text}
            onChangeText={handleTextChange}
            onBlur={() => emitTyping(false)}
            placeholder={editingMessageId ? "Edit your message" : "Drop a quick update"}
            placeholderTextColor="rgba(248,250,252,0.4)"
            className="flex-1 rounded-[24px] border border-white/12 bg-white/8 px-4 py-4 font-body text-base text-cloud"
          />
          <Pressable
            onPress={() => setShowEmojiPicker((current) => !current)}
            className="h-14 w-14 items-center justify-center rounded-full bg-white/10"
            style={({ pressed }) =>
              webPressableStyle(pressed, { pressedOpacity: 0.88, pressedScale: 0.98 })
            }
          >
            <Text className="font-body text-xl text-cloud">{showEmojiPicker ? "⌨️" : "😊"}</Text>
          </Pressable>
          <PillButton label={editingMessageId ? "Save" : "Send"} onPress={handleSend} />
        </View>
        {showEmojiPicker ? (
          <View className="mt-3 flex-row flex-wrap gap-2 rounded-[24px] border border-white/10 bg-white/5 p-3">
            {EMOJI_CHOICES.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => setText((current) => `${current}${emoji}`)}
                className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
                style={({ pressed }) =>
                  webPressableStyle(pressed, { pressedOpacity: 0.88, pressedScale: 0.98 })
                }
              >
                <Text className="text-[22px]">{emoji}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        </View>
      </View>
    </GradientMesh>
  );
}
