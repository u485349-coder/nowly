import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { api } from "../../lib/api";
import { track } from "../../lib/analytics";
import { formatTime } from "../../lib/format";
import { disconnectSocket, getSocket } from "../../lib/socket";
import { webPressableStyle } from "../../lib/web-pressable";
import { useAppStore } from "../../store/useAppStore";
import { DirectMessage } from "../../types";

const normalizeIncomingMessage = (message: {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  type: "TEXT" | "SYSTEM" | "REACTION" | "POLL";
  createdAt: string;
  sender?: { name?: string | null };
}): DirectMessage => ({
  id: message.id,
  chatId: message.threadId,
  senderId: message.senderId,
  senderName: message.sender?.name ?? "Friend",
  text: message.text,
  type: message.type,
  createdAt: message.createdAt,
});

const chatDisplayName = (chat?: {
  title?: string | null;
  participants: Array<{ name: string }>;
}) =>
  chat?.title ||
  chat?.participants.map((participant) => participant.name).join(", ") ||
  "Private chat";

export default function DirectChatScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const directChats = useAppStore((state) => state.directChats);
  const directMessages = useAppStore((state) => state.directMessages[chatId] ?? []);
  const setDirectMessages = useAppStore((state) => state.setDirectMessages);
  const appendDirectMessage = useAppStore((state) => state.appendDirectMessage);
  const upsertDirectChat = useAppStore((state) => state.upsertDirectChat);

  const [text, setText] = useState("");
  const chat = directChats.find((item) => item.id === chatId);
  const quickReplies = useMemo(() => ["Pull up?", "10 min", "Coffee?", "On my way"], []);

  useEffect(() => {
    let active = true;

    if (!chat) {
      api.fetchDirectChat(token, chatId).then((nextChat) => {
        if (!active) {
          return;
        }

        upsertDirectChat(nextChat);
      });
    }

    api.fetchDirectMessages(token, chatId).then((messages) => {
      if (!active) {
        return;
      }

      setDirectMessages(chatId, messages);
    });

    return () => {
      active = false;
    };
  }, [chat, chatId, setDirectMessages, token, upsertDirectChat]);

  useEffect(() => {
    const socket = getSocket(token);

    if (!socket) {
      return;
    }

    socket.emit("chat:join", { chatId });

    const handleIncoming = (message: {
      id: string;
      threadId: string;
      senderId: string;
      text: string;
      type: "TEXT" | "SYSTEM" | "REACTION" | "POLL";
      createdAt: string;
      sender?: { name?: string | null };
    }) => {
      const nextMessage = normalizeIncomingMessage(message);
      appendDirectMessage(chatId, nextMessage);

      if (chat) {
        upsertDirectChat({
          ...chat,
          lastMessageAt: nextMessage.createdAt,
          lastMessageText: nextMessage.text,
        });
      }
    };

    socket.on("chat:message", handleIncoming);

    return () => {
      socket.off("chat:message", handleIncoming);
      disconnectSocket();
    };
  }, [appendDirectMessage, chat, chatId, token, upsertDirectChat]);

  const handleSend = async (presetText?: string) => {
    const nextText = (presetText ?? text).trim();

    if (!nextText || !user) {
      return;
    }

    const socket = getSocket(token);

    if (socket) {
      socket.emit("chat:message", { chatId, text: nextText });
    } else {
      const message = await api.sendDirectMessage(token, chatId, nextText);
      appendDirectMessage(chatId, message);
    }

    if (chat) {
      upsertDirectChat({
        ...chat,
        lastMessageAt: new Date().toISOString(),
        lastMessageText: nextText,
      });
    }

    void track(token, "message_sent", { threadKind: "direct", chatId });
    setText("");
  };

  return (
    <GradientMesh>
      <View className="flex-1 px-5 pb-8 pt-16">
        <GlassCard className="mb-4 p-5">
          <View className="gap-4">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1 flex-row items-center gap-4">
                <View className="flex-row">
                  {chat?.participants.slice(0, 3).map((participant, index) => (
                    <View
                      key={participant.id}
                      className={`${index === 0 ? "" : "-ml-4"} h-14 w-14 overflow-hidden rounded-full border border-white/12 bg-white/8`}
                    >
                      {participant.photoUrl ? (
                        <Image
                          source={{ uri: participant.photoUrl }}
                          className="h-full w-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="h-full w-full items-center justify-center">
                          <Text className="font-display text-xl text-white/70">
                            {(participant.name?.[0] ?? "N").toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>

                <View className="flex-1">
                  <Text className="font-display text-2xl text-cloud">
                    {chatDisplayName(chat)}
                  </Text>
                  <Text className="mt-1 font-body text-sm text-white/60">
                    {chat?.isGroup
                      ? `${chat.memberCount} people · private group thread`
                      : chat?.participants[0]?.communityTag ||
                        chat?.participants[0]?.city ||
                        "Private one-on-one thread"}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => router.back()}
                className="h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/6"
                style={({ pressed }) =>
                  webPressableStyle(pressed, { pressedOpacity: 0.88, pressedScale: 0.97 })
                }
              >
                <Text className="font-display text-base text-cloud">Done</Text>
              </Pressable>
            </View>

            {chat?.isGroup ? (
              <View className="flex-row flex-wrap gap-2">
                {chat.participants.map((participant) => (
                  <View key={participant.id} className="rounded-full bg-white/10 px-3 py-2">
                    <Text className="font-body text-xs text-cloud">{participant.name}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </GlassCard>

        <ScrollView className="flex-1" contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
          {directMessages.map((message) => {
            const mine = message.senderId === user?.id;

            return (
              <GlassCard key={message.id} className={`p-4 ${mine ? "self-end bg-aqua/10" : ""}`}>
                <View className="flex-row items-center justify-between gap-4">
                  <Text className="font-display text-base text-cloud">
                    {mine ? "You" : message.senderName}
                  </Text>
                  <Text className="font-body text-xs text-white/45">{formatTime(message.createdAt)}</Text>
                </View>
                <Text className="mt-2 font-body text-base leading-6 text-white/75">{message.text}</Text>
              </GlassCard>
            );
          })}
        </ScrollView>

        <View className="mb-3 flex-row flex-wrap gap-2">
          {quickReplies.map((reply) => (
            <Pressable
              key={reply}
              onPress={() => void handleSend(reply)}
              className="rounded-full bg-white/10 px-4 py-3"
              style={({ pressed }) =>
                webPressableStyle(pressed, { pressedOpacity: 0.86, pressedScale: 0.99 })
              }
            >
              <Text className="font-body text-sm text-cloud">{reply}</Text>
            </Pressable>
          ))}
        </View>

        <View className="flex-row items-center gap-3">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={`Message ${chat?.isGroup ? "the group" : chat?.participants[0]?.name ?? "your crew"}`}
            placeholderTextColor="rgba(248,250,252,0.4)"
            className="flex-1 rounded-[24px] border border-white/12 bg-white/8 px-4 py-4 font-body text-base text-cloud"
          />
          <PillButton label="Send" onPress={() => void handleSend()} />
        </View>
      </View>
    </GradientMesh>
  );
}
