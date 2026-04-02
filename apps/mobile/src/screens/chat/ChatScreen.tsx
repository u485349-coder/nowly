import { useEffect, useRef } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GradientMeshBackground } from "../../components/layout/GradientMeshBackground";
import { EmptyState } from "../../components/primitives/EmptyState";
import { ErrorState } from "../../components/primitives/ErrorState";
import { LoadingState } from "../../components/primitives/LoadingState";
import { useBreakpoint } from "../../hooks/layout/useBreakpoint";
import { spacing } from "../../theme";
import { ChatComposer } from "../../features/chat/components/ChatComposer";
import { ChatHeader } from "../../features/chat/components/ChatHeader";
import { ChatMessageList } from "../../features/chat/components/ChatMessageList";
import { useChatScreen } from "./useChatScreen";

type Props = {
  chatId: string;
};

export const ChatScreen = ({ chatId }: Props) => {
  const screen = useChatScreen({ chatId });
  const layout = useBreakpoint();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView | null>(null);
  const maxWidth = layout.isDesktop ? 760 : layout.maxContentWidth;

  useEffect(() => {
    if (screen.status !== "ready") {
      return;
    }

    const timeout = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: screen.messages.length > 1 });
    }, 40);

    return () => clearTimeout(timeout);
  }, [screen.messages.length, screen.status]);

  return (
    <GradientMeshBackground>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.select({ ios: "padding", android: "height", default: undefined })}
      >
        <View
          style={[
            styles.chrome,
            {
              paddingTop: insets.top + layout.topPadding,
              paddingHorizontal: layout.horizontalPadding,
              paddingLeft: layout.horizontalPadding + layout.railOffset,
            },
          ]}
        >
          {screen.status === "ready" ? (
            <View style={[styles.column, { maxWidth }]}>
              <ChatHeader
                title={screen.title}
                subtitle={screen.subtitle}
                participants={screen.participants}
                isGroup={screen.isGroup}
                onBack={screen.onBack}
                onOpenOptions={screen.onOpenOptions}
              />
            </View>
          ) : null}

          <View style={styles.body}>
            <View style={[styles.column, styles.bodyColumn, { maxWidth }]}> 
              {screen.status === "missing" ? (
                <EmptyState title="Chat not found" message="That private thread link is missing a chat id." />
              ) : screen.status === "loading" ? (
                <LoadingState title="Opening chat" message="Pulling the thread into place." />
              ) : screen.status === "error" ? (
                <ErrorState title="Chat hit a snag" message={screen.errorMessage} actionLabel="Try again" onAction={screen.onRetry} />
              ) : screen.isMessageHistoryLoading ? (
                <LoadingState title="Loading messages" message="Warming up this private line now." />
              ) : screen.isMessageHistoryError ? (
                <ErrorState title="Messages hit a snag" message="We couldn't load the message history. Try again in a moment." actionLabel="Try again" onAction={screen.onRetry} />
              ) : (
                <ChatMessageList
                  scrollRef={scrollRef}
                  messages={screen.messages}
                  isGroup={screen.isGroup}
                  emptyTitle={screen.emptyTitle}
                  emptyMessage={screen.emptyMessage}
                />
              )}
            </View>
          </View>

          {screen.status === "ready" ? (
            <View style={[styles.column, { maxWidth }]}> 
              <ChatComposer
                inputRef={screen.inputRef}
                text={screen.text}
                onChangeText={screen.onChangeText}
                onSend={screen.onSend}
                placeholder={screen.placeholder}
                sendDisabled={screen.sendDisabled}
                showQuickReplies={screen.showQuickReplies}
                onToggleQuickReplies={screen.onToggleQuickReplies}
                quickReplies={screen.quickReplies}
                onQuickReply={screen.onQuickReply}
                showEmojiPicker={screen.showEmojiPicker}
                onToggleEmojiPicker={screen.onToggleEmojiPicker}
                emojiChoices={screen.emojiChoices}
                onSelectEmoji={screen.onSelectEmoji}
                typingLabel={screen.typingLabel}
                isEditing={screen.isEditing}
                onCancelEdit={screen.onCancelEdit}
                bottomInset={insets.bottom}
                onInputBlur={screen.onInputBlur}
              />
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </GradientMeshBackground>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  chrome: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
  column: {
    width: "100%",
  },
  body: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    paddingTop: spacing[16],
  },
  bodyColumn: {
    flex: 1,
    paddingBottom: spacing[8],
  },
});
