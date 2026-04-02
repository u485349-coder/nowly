import type { RefObject } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "../../../components/primitives/AppText";
import { colors, radii, spacing } from "../../../theme";

type Props = {
  inputRef: RefObject<TextInput | null>;
  text: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  onInputBlur?: () => void;
  placeholder: string;
  sendDisabled: boolean;
  showQuickReplyToggle?: boolean;
  showQuickReplies: boolean;
  onToggleQuickReplies?: () => void;
  quickReplies: string[];
  onQuickReply?: (reply: string) => void;
  showEmojiPicker: boolean;
  onToggleEmojiPicker: () => void;
  emojiChoices: string[];
  onSelectEmoji: (emoji: string) => void;
  typingLabel?: string;
  isEditing?: boolean;
  onCancelEdit: () => void;
  bottomInset: number;
};

export const ChatComposer = ({
  inputRef,
  text,
  onChangeText,
  onSend,
  onInputBlur,
  placeholder,
  sendDisabled,
  showQuickReplyToggle = true,
  showQuickReplies,
  onToggleQuickReplies,
  quickReplies,
  onQuickReply,
  showEmojiPicker,
  onToggleEmojiPicker,
  emojiChoices,
  onSelectEmoji,
  typingLabel,
  isEditing = false,
  onCancelEdit,
  bottomInset,
}: Props) => {
  return (
    <LinearGradient
      colors={["rgba(4,8,20,0)", "rgba(4,8,20,0.84)", "rgba(4,8,20,0.98)"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.gradient, { paddingBottom: Math.max(bottomInset, spacing[12]) }]}
    >
      <View style={styles.stack}>
        {typingLabel ? (
          <View style={styles.typingPill}>
            <AppText variant="label" color="rgba(139,234,255,0.92)">
              {typingLabel}
            </AppText>
          </View>
        ) : null}

        {isEditing ? (
          <View style={styles.editingRow}>
            <AppText variant="label" color={colors.cloud}>
              Editing your message
            </AppText>
            <Pressable onPress={onCancelEdit}>
              <AppText variant="label" color={colors.aqua}>
                Cancel
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {showQuickReplies && quickReplies.length && onQuickReply ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickReplyRail}>
            {quickReplies.map((reply) => (
              <Pressable
                key={reply}
                onPress={() => onQuickReply(reply)}
                style={({ pressed }) => [styles.quickReplyChip, pressed ? styles.pressed : null]}
              >
                <AppText variant="bodySmall" color={colors.cloud} style={styles.quickReplyText}>
                  {reply}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.composerRow}>
          {showQuickReplyToggle ? (
            <Pressable
              onPress={onToggleQuickReplies}
              style={({ pressed }) => [styles.leadingButton, pressed ? styles.pressed : null]}
            >
              <MaterialCommunityIcons
                name={showQuickReplies ? "close" : "flash-outline"}
                size={20}
                color={colors.ink}
              />
            </Pressable>
          ) : null}

          <View style={styles.inputShell}>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={onChangeText}
              onBlur={onInputBlur}
              placeholder={placeholder}
              placeholderTextColor="rgba(247,251,255,0.42)"
              style={styles.input}
              blurOnSubmit={false}
              onSubmitEditing={() => {
                if (!sendDisabled) {
                  onSend();
                }
              }}
            />
            <Pressable onPress={onToggleEmojiPicker} style={({ pressed }) => [styles.inlineAction, pressed ? styles.pressed : null]}>
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
            style={({ pressed }) => [styles.sendButton, sendDisabled ? styles.disabled : null, pressed && !sendDisabled ? styles.pressed : null]}
          >
            <MaterialCommunityIcons name={isEditing ? "check" : "arrow-up"} size={22} color={colors.ink} />
          </Pressable>
        </View>

        {showEmojiPicker ? (
          <View style={styles.emojiTray}>
            {emojiChoices.map((emoji) => (
              <Pressable key={emoji} onPress={() => onSelectEmoji(emoji)} style={({ pressed }) => [styles.emojiChip, pressed ? styles.pressed : null]}>
                <AppText style={styles.emojiText}>{emoji}</AppText>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    width: "100%",
    paddingTop: spacing[12],
  },
  stack: {
    gap: spacing[12],
  },
  typingPill: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    backgroundColor: "rgba(139,234,255,0.14)",
  },
  editingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[12],
    borderRadius: radii.sm,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickReplyRail: {
    gap: spacing[10],
    paddingRight: spacing[8],
  },
  quickReplyChip: {
    height: 40,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[14],
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickReplyText: {
    fontFamily: "SpaceGrotesk_500Medium",
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
  },
  leadingButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(247,251,255,0.94)",
  },
  inputShell: {
    flex: 1,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
    borderRadius: radii.pill,
    paddingLeft: spacing[18],
    paddingRight: spacing[8],
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    color: colors.cloud,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "SpaceGrotesk_400Regular",
    paddingVertical: spacing[16],
  },
  inlineAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(247,251,255,0.96)",
  },
  disabled: {
    opacity: 0.42,
  },
  emojiTray: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[10],
    borderRadius: radii.lg,
    padding: spacing[12],
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  emojiChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  emojiText: {
    fontSize: 22,
    lineHeight: 24,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
});
