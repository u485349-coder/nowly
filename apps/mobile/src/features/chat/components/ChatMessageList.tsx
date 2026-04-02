import type { RefObject } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "../../../components/primitives/AppText";
import { EmptyState } from "../../../components/primitives/EmptyState";
import { colors, radii, spacing } from "../../../theme";

type MessageItem = {
  id: string;
  mine: boolean;
  senderName?: string;
  text: string;
  time: string;
  edited?: boolean;
  onLongPress?: () => void;
};

type Props = {
  scrollRef?: RefObject<ScrollView | null>;
  messages: MessageItem[];
  isGroup: boolean;
  emptyTitle: string;
  emptyMessage: string;
  onContentSizeChange?: () => void;
};

export const ChatMessageList = ({
  scrollRef,
  messages,
  isGroup,
  emptyTitle,
  emptyMessage,
  onContentSizeChange,
}: Props) => {
  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={onContentSizeChange}
    >
      {messages.length ? (
        <>
          <View style={styles.dayDivider}>
            <AppText variant="label" color="rgba(247,251,255,0.62)">
              Today
            </AppText>
          </View>

          <View style={styles.list}>
            {messages.map((message) => (
              <Pressable
                key={message.id}
                onLongPress={message.onLongPress}
                style={[styles.row, message.mine ? styles.rowMine : styles.rowTheirs]}
              >
                {!message.mine && isGroup && message.senderName ? (
                  <AppText variant="eyebrow" color="rgba(139,234,255,0.82)" style={styles.senderLabel}>
                    {message.senderName}
                  </AppText>
                ) : null}

                {message.mine ? (
                  <LinearGradient colors={["#6F4BFF", "#8BEAFF"]} start={{ x: 0, y: 0.1 }} end={{ x: 1, y: 0.9 }} style={styles.mineBubble}>
                    <AppText variant="body" color={colors.ink} style={styles.mineText}>
                      {message.text}
                    </AppText>
                  </LinearGradient>
                ) : (
                  <View style={styles.theirBubble}>
                    <AppText variant="body" color={colors.cloud}>
                      {message.text}
                    </AppText>
                  </View>
                )}

                <View style={[styles.metaRow, message.mine ? styles.metaRowMine : null]}>
                  <AppText variant="bodySmall" color={message.mine ? "rgba(247,251,255,0.66)" : "rgba(247,251,255,0.42)"}>
                    {message.time}
                  </AppText>
                  {message.edited ? (
                    <AppText variant="bodySmall" color="rgba(139,234,255,0.72)">
                      edited
                    </AppText>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <View style={styles.emptyWrap}>
          <EmptyState title={emptyTitle} message={emptyMessage} />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    width: "100%",
  },
  content: {
    flexGrow: 1,
    gap: spacing[16],
    paddingBottom: spacing[20],
  },
  dayDivider: {
    alignSelf: "center",
    borderRadius: radii.pill,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  list: {
    gap: spacing[16],
  },
  row: {
    gap: spacing[8],
  },
  rowMine: {
    alignItems: "flex-end",
  },
  rowTheirs: {
    alignItems: "flex-start",
  },
  senderLabel: {
    paddingHorizontal: spacing[4],
  },
  mineBubble: {
    maxWidth: "86%",
    borderRadius: radii.lg,
    borderTopRightRadius: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  mineText: {
    fontFamily: "SpaceGrotesk_500Medium",
  },
  theirBubble: {
    maxWidth: "86%",
    borderRadius: radii.lg,
    borderTopLeftRadius: spacing[8],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    paddingHorizontal: spacing[4],
  },
  metaRowMine: {
    justifyContent: "flex-end",
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
  },
});
