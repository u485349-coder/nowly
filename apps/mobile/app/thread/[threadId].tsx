import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { api } from "../../lib/api";
import { track } from "../../lib/analytics";
import { formatTime } from "../../lib/format";
import { getSocket } from "../../lib/socket";
import { webPressableStyle } from "../../lib/web-pressable";
import { useAppStore } from "../../store/useAppStore";
import { ThreadMessage } from "../../types";

const normalizeIncomingMessage = (message: {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  type: "TEXT" | "SYSTEM" | "REACTION" | "POLL";
  createdAt: string;
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
});

export default function ThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const hangouts = useAppStore((state) => state.hangouts);
  const threadMessages = useAppStore((state) => state.threadMessages[threadId] ?? []);
  const setThreadMessages = useAppStore((state) => state.setThreadMessages);
  const appendMessage = useAppStore((state) => state.appendMessage);

  const [text, setText] = useState("");
  const hangout = hangouts.find((item) => item.threadId === threadId);
  const isCompleted = hangout?.status === "COMPLETED";

  useEffect(() => {
    if (hangout?.id && isCompleted) {
      router.replace(`/recap/${hangout.id}`);
    }
  }, [hangout?.id, isCompleted]);

  useEffect(() => {
    if (!threadId || isCompleted) {
      return;
    }

    api.fetchThreadMessages(token, threadId).then((messages) => {
      setThreadMessages(threadId, messages);
    });
  }, [isCompleted, setThreadMessages, threadId, token]);

  useEffect(() => {
    if (!threadId || isCompleted) {
      return;
    }

    const socket = getSocket(token);

    if (!socket) {
      return;
    }

    socket.emit("thread:join", { threadId });

    const handleIncoming = (message: {
      id: string;
      threadId: string;
      senderId: string;
      text: string;
      type: "TEXT" | "SYSTEM" | "REACTION" | "POLL";
      createdAt: string;
      senderName?: string;
      sender?: { name?: string | null };
    }) => {
      if (message.threadId !== threadId) {
        return;
      }
      appendMessage(threadId, normalizeIncomingMessage(message));
    };

    socket.on("thread:message", handleIncoming);
    socket.on("thread:reaction", handleIncoming);
    socket.on("thread:poll", handleIncoming);

    return () => {
      socket.off("thread:message", handleIncoming);
      socket.off("thread:reaction", handleIncoming);
      socket.off("thread:poll", handleIncoming);
    };
  }, [appendMessage, isCompleted, threadId, token]);

  const quickReactions = useMemo(() => ["Fire", "Ramen", "Run", "Coffee"], []);

  const sendLocalMessage = (payload: ThreadMessage) => {
    appendMessage(threadId, payload);
  };

  const handleSend = () => {
    if (!text.trim() || !user || isCompleted) {
      return;
    }

    const socket = getSocket(token);
    if (socket) {
      socket.emit("thread:message", { threadId, text });
    } else {
      sendLocalMessage({
        id: `local-${Date.now()}`,
        threadId,
        senderId: user.id,
        senderName: user.name,
        text,
        type: "TEXT",
        createdAt: new Date().toISOString(),
      });
    }

    void track(token, "message_sent", { threadId });
    setText("");
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

  if (isCompleted && hangout?.id) {
    return (
      <GradientMesh>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="font-body text-base text-white/60">Opening recap...</Text>
        </View>
      </GradientMesh>
    );
  }

  return (
    <GradientMesh>
      <View className="flex-1 px-5 pb-8 pt-16">
        <GlassCard className="mb-4 p-5">
          <Text className="font-display text-2xl text-cloud">
            {hangout?.activity ?? "Crew thread"}
          </Text>
          <Text className="mt-1 font-body text-sm text-white/60">
            Quick chat, polls, ETA, and live location belong here.
          </Text>
        </GlassCard>

        <ScrollView className="flex-1" contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
          {threadMessages.map((message) => (
            <GlassCard key={message.id} className="p-4">
              <View className="flex-row items-center justify-between">
                <Text className="font-display text-base text-cloud">{message.senderName}</Text>
                <Text className="font-body text-xs text-white/45">{formatTime(message.createdAt)}</Text>
              </View>
              <Text className="mt-2 font-body text-base leading-6 text-white/70">{message.text}</Text>
            </GlassCard>
          ))}
        </ScrollView>

        <View className="mb-3 flex-row gap-2">
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
            onChangeText={setText}
            placeholder="Drop a quick update"
            placeholderTextColor="rgba(248,250,252,0.4)"
            className="flex-1 rounded-[24px] border border-white/12 bg-white/8 px-4 py-4 font-body text-base text-cloud"
          />
          <PillButton label="Send" onPress={handleSend} />
        </View>
      </View>
    </GradientMesh>
  );
}
