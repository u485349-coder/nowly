import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { useResponsiveLayout } from "../../components/ui/useResponsiveLayout";
import { nowlyColors } from "../../constants/theme";
import { api } from "../../lib/api";
import { track } from "../../lib/analytics";
import { formatTime } from "../../lib/format";
import { getSocket } from "../../lib/socket";
import { webPressableStyle } from "../../lib/web-pressable";
import { useAppStore } from "../../store/useAppStore";
import type { DirectChat, DirectMessage } from "../../types";

const EMPTY_DIRECT_MESSAGES: DirectMessage[] = [];

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

const Avatar = ({
  name,
  photoUrl,
  size,
  borderColor = "rgba(255,255,255,0.14)",
  textSize = 18,
}: {
  name: string;
  photoUrl?: string | null;
  size: number;
  borderColor?: string;
  textSize?: number;
}) => (
  <View
    style={[
      styles.avatarShell,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        borderColor,
      },
    ]}
  >
    {photoUrl ? (
      <Image source={{ uri: photoUrl }} style={styles.avatarImage} resizeMode="cover" />
    ) : (
      <View style={styles.avatarFallback}>
        <Text style={[styles.avatarInitial, { fontSize: textSize }]}>
          {(name[0] ?? "N").toUpperCase()}
        </Text>
      </View>
    )}
  </View>
);

const compactPositions = [
  { left: 0, top: 20 },
  { left: 26, top: 0 },
  { left: 52, top: 20 },
  { left: 26, top: 44 },
];

const CompactAvatarCluster = ({
  participants,
  maxVisible = 4,
}: {
  participants: DirectChat["participants"];
  maxVisible?: number;
}) => {
  const visibleParticipants = participants.slice(0, maxVisible);
  const overflowCount = Math.max(0, participants.length - maxVisible);

  return (
    <View style={styles.clusterWrap}>
      {visibleParticipants.map((participant, index) => (
        <View
          key={participant.id}
          style={[
            styles.clusterAvatarSlot,
            {
              left: compactPositions[index]?.left ?? 0,
              top: compactPositions[index]?.top ?? 0,
            },
          ]}
        >
          <Avatar
            name={participant.name}
            photoUrl={participant.photoUrl}
            size={48}
            borderColor="rgba(8,14,29,0.65)"
            textSize={16}
          />
        </View>
      ))}

      {overflowCount > 0 ? (
        <View style={styles.clusterOverflow}>
          <Text style={styles.clusterOverflowText}>+{overflowCount}</Text>
        </View>
      ) : null}
    </View>
  );
};

const HeaderAvatarStack = ({ participants }: { participants: DirectChat["participants"] }) => {
  const visibleParticipants = participants.slice(0, 3);
  const overflowCount = Math.max(0, participants.length - visibleParticipants.length);

  return (
    <View style={styles.headerAvatarStack}>
      {visibleParticipants.map((participant, index) => (
        <View
          key={participant.id}
          style={{ marginLeft: index === 0 ? 0 : -10, zIndex: visibleParticipants.length - index }}
        >
          <Avatar
            name={participant.name}
            photoUrl={participant.photoUrl}
            size={30}
            borderColor="rgba(8,14,29,0.76)"
            textSize={12}
          />
        </View>
      ))}
      {overflowCount > 0 ? (
        <View style={styles.headerOverflow}>
          <Text style={styles.headerOverflowText}>+{overflowCount}</Text>
        </View>
      ) : null}
    </View>
  );
};

export default function DirectChatScreen() {
  const params = useLocalSearchParams<{ chatId?: string | string[] }>();
  const rawChatId = params.chatId;
  const chatId = Array.isArray(rawChatId) ? rawChatId[0] : rawChatId ?? "";
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const directChats = useAppStore((state) => state.directChats);
  const directMessages = useAppStore((state) => state.directMessages[chatId] ?? EMPTY_DIRECT_MESSAGES);
  const setDirectMessages = useAppStore((state) => state.setDirectMessages);
  const appendDirectMessage = useAppStore((state) => state.appendDirectMessage);
  const upsertDirectChat = useAppStore((state) => state.upsertDirectChat);
  const markDirectChatReadLocal = useAppStore((state) => state.markDirectChatReadLocal);
  const layout = useResponsiveLayout();
  const inputRef = useRef<TextInput | null>(null);
  const fetchedChatIdRef = useRef<string | null>(null);
  const fetchedMessagesChatIdRef = useRef<string | null>(null);
  const joinedChatIdRef = useRef<string | null>(null);

  const [text, setText] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const chat = directChats.find((item) => item.id === chatId);
  const otherParticipants = useMemo(() => {
    if (!chat) {
      return [];
    }

    const filtered = chat.participants.filter((participant) => participant.id !== user?.id);
    return filtered.length ? filtered : chat.participants;
  }, [chat, user?.id]);
  const primaryParticipant = otherParticipants[0] ?? chat?.participants[0] ?? null;
  const title = chat?.isGroup
    ? chatDisplayName(chat)
    : primaryParticipant?.name ?? chatDisplayName(chat);
  const subtitle = chat?.isGroup
    ? `${chat.memberCount} people in this private thread`
    : primaryParticipant?.communityTag || primaryParticipant?.city || "Private one-on-one line";
  const heroMeta = chat?.isGroup
    ? "Keep the crew line warm between actual hangs and side plans."
    : "Private space for low-pressure plans, quick updates, and casual check-ins.";
  const quickReplies = useMemo(
    () =>
      chat?.isGroup
        ? ["Who's around?", "Pull up?", "Tonight?", "Drop a pin"]
        : ["Pull up?", "10 min", "Coffee?", "On my way"],
    [chat?.isGroup],
  );

  useEffect(() => {
    if (!chatId) {
      return;
    }

    let active = true;

    if (
      fetchedChatIdRef.current !== chatId &&
      !useAppStore.getState().directChats.some((item) => item.id === chatId)
    ) {
      fetchedChatIdRef.current = chatId;
      api.fetchDirectChat(token, chatId)
        .then((nextChat) => {
          if (!active) {
            return;
          }

          upsertDirectChat(nextChat);
        })
        .catch(() => undefined);
    }

    if (fetchedMessagesChatIdRef.current !== chatId) {
      fetchedMessagesChatIdRef.current = chatId;
      api.fetchDirectMessages(token, chatId)
        .then((messages) => {
          if (!active) {
            return;
          }

          setDirectMessages(chatId, messages);
          markDirectChatReadLocal(chatId);
          void api.markDirectChatRead(token, chatId);
        })
        .catch(() => undefined);
    }

    return () => {
      active = false;
    };
  }, [chatId, markDirectChatReadLocal, setDirectMessages, token, upsertDirectChat]);

  useEffect(() => {
    if (!chatId) {
      return;
    }

    const socket = getSocket(token);

    if (!socket) {
      return;
    }

    if (joinedChatIdRef.current !== chatId) {
      joinedChatIdRef.current = chatId;
      socket.emit("chat:join", { chatId });
    }

    const handleIncoming = (message: {
      id: string;
      threadId: string;
      senderId: string;
      text: string;
      type: "TEXT" | "SYSTEM" | "REACTION" | "POLL";
      createdAt: string;
      sender?: { name?: string | null };
    }) => {
      if (message.threadId !== chatId) {
        return;
      }

      const nextMessage = normalizeIncomingMessage(message);
      appendDirectMessage(chatId, nextMessage);

      const latestChat = useAppStore.getState().directChats.find((item) => item.id === chatId);
      if (latestChat) {
        upsertDirectChat({
          ...latestChat,
          lastMessageAt: nextMessage.createdAt,
          lastMessageText: nextMessage.text,
          unreadCount: message.senderId === user?.id ? 0 : latestChat.unreadCount ?? 0,
        });
      }
    };

    socket.on("chat:message", handleIncoming);

    return () => {
      socket.off("chat:message", handleIncoming);
      if (joinedChatIdRef.current === chatId) {
        joinedChatIdRef.current = null;
      }
    };
  }, [appendDirectMessage, chatId, token, upsertDirectChat, user?.id]);

  const handleSend = async (presetText?: string) => {
    const nextText = (presetText ?? text).trim();

    if (!chatId || !nextText || !user || isSending) {
      return;
    }

    try {
      setIsSending(true);
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
          unreadCount: 0,
        });
      }

      void track(token, "message_sent", { threadKind: "direct", chatId });
      setText("");
    } catch (error) {
      Alert.alert(
        "Message failed",
        error instanceof Error ? error.message : "Could not send right now.",
      );
    } finally {
      setIsSending(false);
    }
  };

  const openCrewSurface = () => {
    router.push("/friends");
  };

  const contentWidth = layout.isDesktop ? Math.min(layout.shellWidth, 720) : layout.shellWidth;

  if (!chatId) {
    return (
      <GradientMesh>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Chat not found</Text>
          <Text style={styles.emptyCopy}>That private thread link is missing a chat id.</Text>
        </View>
      </GradientMesh>
    );
  }

  if (!chat) {
    return (
      <GradientMesh>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Opening chat...</Text>
          <Text style={styles.emptyCopy}>Pulling the thread into place.</Text>
        </View>
      </GradientMesh>
    );
  }

  return (
    <GradientMesh>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={{
            alignItems: "center",
            paddingHorizontal: layout.screenPadding,
            paddingTop: layout.isDesktop ? 34 : 18,
            paddingBottom: 170,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.shell, { width: contentWidth }]}>
            <View style={styles.topBar}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.iconButton,
                  webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                ]}
              >
                <MaterialCommunityIcons name="chevron-left" size={24} color="#F7FBFF" />
              </Pressable>

              <View style={styles.topIdentity}>
                {chat.isGroup ? (
                  <HeaderAvatarStack participants={otherParticipants} />
                ) : primaryParticipant ? (
                  <Avatar
                    name={primaryParticipant.name}
                    photoUrl={primaryParticipant.photoUrl}
                    size={30}
                    borderColor="rgba(8,14,29,0.7)"
                    textSize={12}
                  />
                ) : null}

                <View style={{ flex: 1, gap: 1 }}>
                  <Text numberOfLines={1} style={styles.topTitle}>
                    {title}
                  </Text>
                  <Text numberOfLines={1} style={styles.topSubtitle}>
                    {chat.isGroup ? "Group line" : "Private line"}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={openCrewSurface}
                style={({ pressed }) => [
                  styles.iconButton,
                  webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                ]}
              >
                <MaterialCommunityIcons name="information-outline" size={22} color="#F7FBFF" />
              </Pressable>
            </View>

            <View style={styles.identityHero}>
              <View style={styles.heroGlowPrimary} pointerEvents="none" />
              <View style={styles.heroGlowSecondary} pointerEvents="none" />

              {chat.isGroup ? (
                <CompactAvatarCluster participants={otherParticipants} />
              ) : primaryParticipant ? (
                <Avatar
                  name={primaryParticipant.name}
                  photoUrl={primaryParticipant.photoUrl}
                  size={104}
                  borderColor="rgba(255,255,255,0.16)"
                  textSize={34}
                />
              ) : null}

              <Text style={styles.heroTitle}>{title}</Text>
              <Text style={styles.heroSubtitle}>{subtitle}</Text>
              <Text style={styles.heroCopy}>{heroMeta}</Text>

              <Pressable
                onPress={openCrewSurface}
                style={({ pressed }) => [
                  styles.heroAction,
                  webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.985 }),
                ]}
              >
                <Text style={styles.heroActionText}>
                  {chat.isGroup ? "View members" : "View profile"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.dayDivider}>
              <Text style={styles.dayDividerText}>Today</Text>
            </View>

            <View style={styles.messageList}>
              {directMessages.length ? (
                directMessages.map((message) => {
                  const mine = message.senderId === user?.id;

                  return (
                    <View
                      key={message.id}
                      style={[
                        styles.messageRow,
                        mine ? styles.messageRowMine : styles.messageRowTheirs,
                      ]}
                    >
                      {!mine && chat.isGroup ? (
                        <Text style={styles.senderLabel}>{message.senderName}</Text>
                      ) : null}

                      {mine ? (
                        <LinearGradient
                          colors={["#6F4BFF", "#8BEAFF"]}
                          start={{ x: 0, y: 0.1 }}
                          end={{ x: 1, y: 0.9 }}
                          style={styles.messageBubbleMine}
                        >
                          <Text style={styles.messageTextMine}>{message.text}</Text>
                        </LinearGradient>
                      ) : (
                        <View style={styles.messageBubbleTheirs}>
                          <Text style={styles.messageTextTheirs}>{message.text}</Text>
                        </View>
                      )}

                      <Text style={[styles.messageTime, mine ? styles.messageTimeMine : null]}>
                        {formatTime(message.createdAt)}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyThreadCard}>
                  <Text style={styles.emptyThreadTitle}>No messages yet</Text>
                  <Text style={styles.emptyThreadCopy}>
                    Send one clean line and keep it low pressure.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        <LinearGradient
          colors={["rgba(4,8,20,0.00)", "rgba(4,8,20,0.88)", "rgba(4,8,20,0.98)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.composerFade}
          pointerEvents="box-none"
        >
          <View style={{ width: contentWidth, alignSelf: "center", gap: 12 }}>
            {showShortcuts ? (
              <ScrollView
                horizontal
                contentContainerStyle={styles.quickReplyRow}
                showsHorizontalScrollIndicator={false}
              >
                {quickReplies.map((reply) => (
                  <Pressable
                    key={reply}
                    onPress={() => void handleSend(reply)}
                    style={({ pressed }) => [
                      styles.quickReplyChip,
                      webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.985 }),
                    ]}
                  >
                    <Text style={styles.quickReplyText}>{reply}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            <View style={styles.composerRow}>
              <Pressable
                onPress={() => setShowShortcuts((current) => !current)}
                style={({ pressed }) => [
                  styles.composerIconButton,
                  webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                ]}
              >
                <MaterialCommunityIcons
                  name={showShortcuts ? "close" : "camera-outline"}
                  size={21}
                  color="#081120"
                />
              </Pressable>

              <View style={styles.inputShell}>
                <TextInput
                  ref={inputRef}
                  value={text}
                  onChangeText={setText}
                  placeholder={`Message ${chat.isGroup ? "the group" : primaryParticipant?.name ?? "them"}`}
                  placeholderTextColor="rgba(247,251,255,0.42)"
                  style={styles.input}
                />
                <Pressable
                  onPress={() => {
                    setText((current) => `${current}${current ? " " : ""}:)`);
                    inputRef.current?.focus();
                  }}
                  style={({ pressed }) => [
                    styles.inlineComposerAction,
                    webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                  ]}
                >
                  <MaterialCommunityIcons name="emoticon-outline" size={20} color="#C9D8FF" />
                </Pressable>
              </View>

              <Pressable
                onPress={() => void handleSend()}
                disabled={!text.trim() || isSending}
                style={({ pressed }) => [
                  styles.sendButton,
                  !text.trim() || isSending ? styles.sendButtonDisabled : null,
                  webPressableStyle(pressed, {
                    disabled: !text.trim() || isSending,
                    pressedOpacity: 0.9,
                    pressedScale: 0.97,
                  }),
                ]}
              >
                <MaterialCommunityIcons name="arrow-up" size={22} color="#081120" />
              </Pressable>
            </View>
          </View>
        </LinearGradient>
      </View>
    </GradientMesh>
  );
}

const styles = StyleSheet.create({
  avatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitial: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  avatarShell: {
    overflow: "hidden",
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  clusterAvatarSlot: {
    position: "absolute",
  },
  clusterOverflow: {
    position: "absolute",
    right: 10,
    bottom: 6,
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,17,32,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  clusterOverflowText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 12,
  },
  clusterWrap: {
    width: 116,
    height: 116,
    marginBottom: 4,
  },
  composerFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 18,
  },
  composerIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,234,255,0.95)",
    shadowColor: nowlyColors.aqua,
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dayDivider: {
    alignSelf: "center",
    marginTop: 2,
    marginBottom: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dayDividerText: {
    color: "rgba(247,251,255,0.62)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
  },
  emptyCopy: {
    color: "rgba(247,251,255,0.64)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 15,
    lineHeight: 24,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
  },
  emptyThreadCard: {
    alignItems: "center",
    gap: 6,
    paddingTop: 18,
    paddingBottom: 26,
  },
  emptyThreadCopy: {
    color: "rgba(247,251,255,0.58)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  emptyThreadTitle: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
  },
  emptyTitle: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 26,
    lineHeight: 30,
  },
  headerAvatarStack: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  headerOverflow: {
    marginLeft: -10,
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  headerOverflowText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 11,
  },
  heroAction: {
    marginTop: 2,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  heroActionText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 14,
  },
  heroCopy: {
    maxWidth: 360,
    color: "rgba(247,251,255,0.64)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  heroGlowPrimary: {
    position: "absolute",
    top: -70,
    right: -30,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "rgba(167,139,250,0.16)",
  },
  heroGlowSecondary: {
    position: "absolute",
    left: -48,
    bottom: -80,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(139,234,255,0.12)",
  },
  heroSubtitle: {
    color: "rgba(247,251,255,0.7)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  heroTitle: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 28,
    lineHeight: 32,
    textAlign: "center",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  identityHero: {
    overflow: "hidden",
    alignItems: "center",
    gap: 8,
    borderRadius: 34,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: nowlyColors.glow,
    shadowOpacity: 0.18,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
  },
  inlineComposerAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: 14,
  },
  inputShell: {
    flex: 1,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.07)",
    paddingLeft: 18,
    paddingRight: 8,
  },
  messageBubbleMine: {
    maxWidth: "88%",
    borderRadius: 22,
    borderTopRightRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageBubbleTheirs: {
    maxWidth: "88%",
    borderRadius: 22,
    borderTopLeftRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageList: {
    gap: 14,
  },
  messageRow: {
    gap: 6,
  },
  messageRowMine: {
    alignItems: "flex-end",
  },
  messageRowTheirs: {
    alignItems: "flex-start",
  },
  messageTextMine: {
    color: "#081120",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 15,
    lineHeight: 21,
  },
  messageTextTheirs: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 15,
    lineHeight: 21,
  },
  messageTime: {
    color: "rgba(247,251,255,0.36)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 11,
  },
  messageTimeMine: {
    textAlign: "right",
  },
  quickReplyChip: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  quickReplyRow: {
    flexDirection: "row",
    gap: 10,
    paddingRight: 4,
  },
  quickReplyText: {
    color: "rgba(247,251,255,0.9)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 13,
  },
  screen: {
    flex: 1,
  },
  sendButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,234,255,0.96)",
    shadowColor: nowlyColors.aqua,
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  senderLabel: {
    color: "rgba(139,234,255,0.78)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  shell: {
    gap: 18,
  },
  topBar: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  topIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  topSubtitle: {
    color: "rgba(247,251,255,0.52)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
  },
  topTitle: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
  },
});
