import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GradientMesh } from "../../../components/ui/GradientMesh";
import { nowlyColors } from "../../../constants/theme";
import { useResponsiveLayout } from "../../../components/ui/useResponsiveLayout";
import { webPressableStyle } from "../../../lib/web-pressable";
import { MobileStickyActions } from "../components/MobileStickyActions";

type ChatMessage = {
  id: string;
  mine: boolean;
  senderName?: string;
  text: string;
  time: string;
  edited?: boolean;
};

export const ChatMobileScreen = ({
  title,
  subtitle,
  isGroup,
  onBack,
  onInfo,
  messages,
  typingLabel,
  editing,
  onCancelEdit,
  quickReplies,
  showQuickReplies,
  onToggleQuickReplies,
  onQuickReply,
  text,
  onChangeText,
  placeholder,
  onToggleEmoji,
  showEmojiPicker,
  emojis,
  onSelectEmoji,
  onSend,
  sendDisabled,
  emptyTitle,
  emptyCopy,
}: {
  title: string;
  subtitle: string;
  isGroup: boolean;
  onBack: () => void;
  onInfo: () => void;
  messages: ChatMessage[];
  typingLabel?: string;
  editing: boolean;
  onCancelEdit: () => void;
  quickReplies: string[];
  showQuickReplies: boolean;
  onToggleQuickReplies: () => void;
  onQuickReply: (reply: string) => void;
  text: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  onToggleEmoji: () => void;
  showEmojiPicker: boolean;
  emojis: string[];
  onSelectEmoji: (emoji: string) => void;
  onSend: () => void;
  sendDisabled: boolean;
  emptyTitle: string;
  emptyCopy: string;
}) => {
  const layout = useResponsiveLayout();

  return (
    <GradientMesh>
      <View style={styles.screen}>
        <View
          style={[
            styles.header,
            {
              paddingTop: layout.topPadding + 6,
              paddingHorizontal: layout.screenPadding,
            },
          ]}
        >
          <View style={{ width: layout.shellWidth, alignSelf: "center", gap: 14 }}>
            <View style={styles.headerRow}>
              <Pressable
                onPress={onBack}
                style={({ pressed }) => [
                  styles.iconButton,
                  webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                ]}
              >
                <MaterialCommunityIcons name="chevron-left" size={22} color={nowlyColors.cloud} />
              </Pressable>

              <View style={styles.headerCopy}>
                <Text numberOfLines={1} style={styles.title}>{title}</Text>
                <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text>
              </View>

              <Pressable
                onPress={onInfo}
                style={({ pressed }) => [
                  styles.iconButton,
                  webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                ]}
              >
                <MaterialCommunityIcons name="information-outline" size={20} color={nowlyColors.cloud} />
              </Pressable>
            </View>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: layout.screenPadding,
            paddingTop: 14,
            paddingBottom: 212,
            alignItems: "center",
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: layout.shellWidth, gap: 12 }}>
            {messages.length ? (
              messages.map((message) => (
                <Pressable
                  key={message.id}
                  style={[styles.messageRow, message.mine ? styles.messageRowMine : styles.messageRowTheirs]}
                >
                  {!message.mine && isGroup && message.senderName ? (
                    <Text style={styles.senderLabel}>{message.senderName}</Text>
                  ) : null}

                  {message.mine ? (
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

                  <View style={[styles.metaRow, message.mine ? styles.metaRowMine : null]}>
                    <Text style={[styles.messageTime, message.mine ? styles.messageTimeMine : null]}>{message.time}</Text>
                    {message.edited ? <Text style={styles.editedLabel}>edited</Text> : null}
                  </View>
                </Pressable>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>{emptyTitle}</Text>
                <Text style={styles.emptyCopy}>{emptyCopy}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <MobileStickyActions>
          {typingLabel ? (
            <View style={styles.typingRow}>
              <Text style={styles.typingText}>{typingLabel}</Text>
            </View>
          ) : null}

          {editing ? (
            <View style={styles.editingRow}>
              <Text style={styles.editingLabel}>Editing your message</Text>
              <Pressable onPress={onCancelEdit}>
                <Text style={styles.editingCancel}>Cancel</Text>
              </Pressable>
            </View>
          ) : null}

          {showQuickReplies ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickReplyRail}>
              {quickReplies.map((reply) => (
                <Pressable
                  key={reply}
                  onPress={() => onQuickReply(reply)}
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
              onPress={onToggleQuickReplies}
              style={({ pressed }) => [
                styles.leadingButton,
                webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
              ]}
            >
              <MaterialCommunityIcons
                name={showQuickReplies ? "close" : "flash-outline"}
                size={20}
                color="#081120"
              />
            </Pressable>

            <View style={styles.inputShell}>
              <TextInput
                value={text}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="rgba(247,251,255,0.42)"
                style={styles.input}
              />
              <Pressable onPress={onToggleEmoji} hitSlop={8}>
                <MaterialCommunityIcons
                  name={showEmojiPicker ? "keyboard-close-outline" : "emoticon-outline"}
                  size={20}
                  color="#C9D8FF"
                />
              </Pressable>
            </View>

            <Pressable
              onPress={onSend}
              disabled={sendDisabled}
              style={({ pressed }) => [
                styles.sendButton,
                sendDisabled ? styles.sendButtonDisabled : null,
                webPressableStyle(pressed, { disabled: sendDisabled, pressedOpacity: 0.9, pressedScale: 0.97 }),
              ]}
            >
              <MaterialCommunityIcons name={editing ? "check" : "arrow-up"} size={22} color="#081120" />
            </Pressable>
          </View>

          {showEmojiPicker ? (
            <View style={styles.emojiTray}>
              {emojis.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => onSelectEmoji(emoji)}
                  style={({ pressed }) => [
                    styles.emojiChip,
                    webPressableStyle(pressed, { pressedOpacity: 0.88, pressedScale: 0.96 }),
                  ]}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </MobileStickyActions>
      </View>
    </GradientMesh>
  );
};

const styles = StyleSheet.create({
  composerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  editedLabel: { color: "rgba(247,251,255,0.56)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 11 },
  editingCancel: { color: nowlyColors.aqua, fontFamily: "SpaceGrotesk_500Medium", fontSize: 12 },
  editingLabel: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_500Medium", fontSize: 12 },
  editingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "rgba(255,255,255,0.08)" },
  emojiChip: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" },
  emojiText: { fontSize: 22 },
  emojiTray: { flexDirection: "row", flexWrap: "wrap", gap: 10, borderRadius: 24, padding: 14, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  emptyCard: { borderRadius: 24, paddingHorizontal: 18, paddingVertical: 18, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", gap: 6 },
  emptyCopy: { color: "rgba(247,251,255,0.58)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 14, lineHeight: 20 },
  emptyTitle: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_700Bold", fontSize: 18 },
  header: { zIndex: 2 },
  headerCopy: { flex: 1, gap: 2, minWidth: 0 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconButton: { width: 42, height: 42, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)" },
  input: { flex: 1, color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_400Regular", fontSize: 15, paddingVertical: 0 },
  inputShell: { flex: 1, minHeight: 54, borderRadius: 27, paddingHorizontal: 16, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", flexDirection: "row", alignItems: "center", gap: 10 },
  leadingButton: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(247,251,255,0.92)" },
  messageBubbleMine: { maxWidth: "88%", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 22, borderTopRightRadius: 8 },
  messageBubbleTheirs: { maxWidth: "88%", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 22, borderTopLeftRadius: 8, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  messageRow: { gap: 6 },
  messageRowMine: { alignItems: "flex-end" },
  messageRowTheirs: { alignItems: "flex-start" },
  messageTextMine: { color: "#081120", fontFamily: "SpaceGrotesk_500Medium", fontSize: 15, lineHeight: 20 },
  messageTextTheirs: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_400Regular", fontSize: 15, lineHeight: 20 },
  messageTime: { color: "rgba(247,251,255,0.44)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 11 },
  messageTimeMine: { color: "rgba(247,251,255,0.68)" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 },
  metaRowMine: { justifyContent: "flex-end" },
  quickReplyChip: { height: 40, borderRadius: 20, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  quickReplyRail: { gap: 10, paddingRight: 8 },
  quickReplyText: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_500Medium", fontSize: 13 },
  screen: { flex: 1 },
  sendButton: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(247,251,255,0.96)" },
  sendButtonDisabled: { opacity: 0.42 },
  senderLabel: { color: "rgba(139,234,255,0.88)", fontFamily: "SpaceGrotesk_500Medium", fontSize: 12, paddingHorizontal: 4 },
  subtitle: { color: "rgba(247,251,255,0.58)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 13 },
  title: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_700Bold", fontSize: 19 },
  typingRow: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "rgba(139,234,255,0.14)" },
  typingText: { color: "rgba(139,234,255,0.92)", fontFamily: "SpaceGrotesk_500Medium", fontSize: 12 },
});
