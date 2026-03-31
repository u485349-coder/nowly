import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GradientMesh } from "../../../components/ui/GradientMesh";
import { GlassCard } from "../../../components/ui/GlassCard";
import { PillButton } from "../../../components/ui/PillButton";
import { nowlyColors } from "../../../constants/theme";
import { useResponsiveLayout } from "../../../components/ui/useResponsiveLayout";
import { webPressableStyle } from "../../../lib/web-pressable";
import { MobileStickyActions } from "../components/MobileStickyActions";

type ThreadMessageRow = {
  id: string;
  senderName: string;
  text: string;
  time: string;
  edited?: boolean;
};

export const ThreadMobileScreen = ({
  title,
  subtitle,
  onBack,
  messages,
  typingLabel,
  editing,
  onCancelEdit,
  quickReactions,
  onQuickReaction,
  onEta,
  text,
  onChangeText,
  placeholder,
  onToggleEmoji,
  showEmojiPicker,
  emojis,
  onSelectEmoji,
  onSend,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  messages: ThreadMessageRow[];
  typingLabel?: string;
  editing: boolean;
  onCancelEdit: () => void;
  quickReactions: string[];
  onQuickReaction: (emoji: string) => void;
  onEta: () => void;
  text: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  onToggleEmoji: () => void;
  showEmojiPicker: boolean;
  emojis: string[];
  onSelectEmoji: (emoji: string) => void;
  onSend: () => void;
}) => {
  const layout = useResponsiveLayout();

  return (
    <GradientMesh>
      <View style={styles.screen}>
        <View
          style={[
            styles.headerWrap,
            {
              paddingTop: layout.topPadding + 6,
              paddingHorizontal: layout.screenPadding,
            },
          ]}
        >
          <View style={{ width: layout.shellWidth, alignSelf: "center", gap: 14 }}>
            <View style={styles.topBar}>
              <Pressable
                onPress={onBack}
                style={({ pressed }) => [
                  styles.iconButton,
                  webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                ]}
              >
                <MaterialCommunityIcons name="chevron-left" size={22} color={nowlyColors.cloud} />
              </Pressable>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
              </View>
            </View>

            <GlassCard className="p-4">
              <Text style={styles.contextTitle}>{title}</Text>
              <Text style={styles.contextCopy}>{subtitle}</Text>
            </GlassCard>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: layout.screenPadding,
            paddingTop: 6,
            paddingBottom: 232,
            alignItems: "center",
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: layout.shellWidth, gap: 12 }}>
            {messages.map((message) => (
              <GlassCard key={message.id} className="p-4">
                <View style={styles.messageHeader}>
                  <Text style={styles.sender}>{message.senderName}</Text>
                  <View style={styles.messageMeta}>
                    <Text style={styles.time}>{message.time}</Text>
                    {message.edited ? <Text style={styles.edited}>edited</Text> : null}
                  </View>
                </View>
                <Text style={styles.body}>{message.text}</Text>
              </GlassCard>
            ))}
          </View>
        </ScrollView>

        <MobileStickyActions>
          {typingLabel ? (
            <View style={styles.typingBadge}>
              <Text style={styles.typingText}>{typingLabel}</Text>
            </View>
          ) : null}

          {editing ? (
            <View style={styles.editRow}>
              <Text style={styles.editLabel}>Editing your update</Text>
              <Pressable onPress={onCancelEdit}>
                <Text style={styles.editCancel}>Cancel</Text>
              </Pressable>
            </View>
          ) : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reactionRail}>
            {quickReactions.map((reaction) => (
              <Pressable
                key={reaction}
                onPress={() => onQuickReaction(reaction)}
                style={({ pressed }) => [
                  styles.reactionChip,
                  webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.985 }),
                ]}
              >
                <Text style={styles.reactionText}>{reaction}</Text>
              </Pressable>
            ))}
            <PillButton label="ETA 12m" variant="secondary" onPress={onEta} />
          </ScrollView>

          <View style={styles.composerRow}>
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
            <PillButton label={editing ? "Save" : "Send"} onPress={onSend} />
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
  body: { color: "rgba(247,251,255,0.78)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 15, lineHeight: 21, marginTop: 8 },
  composerRow: { gap: 10 },
  contextCopy: { color: "rgba(247,251,255,0.6)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 14, lineHeight: 20, marginTop: 6 },
  contextTitle: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_700Bold", fontSize: 20 },
  editCancel: { color: nowlyColors.aqua, fontFamily: "SpaceGrotesk_500Medium", fontSize: 12 },
  editLabel: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_500Medium", fontSize: 12 },
  editRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "rgba(255,255,255,0.08)" },
  edited: { color: "rgba(139,234,255,0.82)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 11 },
  emojiChip: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" },
  emojiText: { fontSize: 22 },
  emojiTray: { flexDirection: "row", flexWrap: "wrap", gap: 10, borderRadius: 24, padding: 14, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  headerWrap: { zIndex: 2 },
  iconButton: { width: 42, height: 42, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)" },
  input: { flex: 1, color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_400Regular", fontSize: 15, paddingVertical: 0 },
  inputShell: { minHeight: 54, borderRadius: 27, paddingHorizontal: 16, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", flexDirection: "row", alignItems: "center", gap: 10 },
  messageHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  messageMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  reactionChip: { height: 40, borderRadius: 20, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  reactionRail: { gap: 10, paddingRight: 8, alignItems: "center" },
  reactionText: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_500Medium", fontSize: 13 },
  screen: { flex: 1 },
  sender: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_700Bold", fontSize: 15 },
  subtitle: { color: "rgba(247,251,255,0.58)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 13 },
  time: { color: "rgba(247,251,255,0.44)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 11 },
  title: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_700Bold", fontSize: 19 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12 },
  typingBadge: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "rgba(139,234,255,0.14)" },
  typingText: { color: "rgba(139,234,255,0.92)", fontFamily: "SpaceGrotesk_500Medium", fontSize: 12 },
});
