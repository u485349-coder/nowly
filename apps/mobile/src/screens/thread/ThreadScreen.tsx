import { useEffect, useRef } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GradientMeshBackground } from "../../components/layout/GradientMeshBackground";
import { EmptyState } from "../../components/primitives/EmptyState";
import { ErrorState } from "../../components/primitives/ErrorState";
import { LoadingState } from "../../components/primitives/LoadingState";
import { ChatComposer } from "../../features/chat/components/ChatComposer";
import { ChatMessageList } from "../../features/chat/components/ChatMessageList";
import { ThreadHeader } from "../../features/thread/components/ThreadHeader";
import { ThreadQuickActions } from "../../features/thread/components/ThreadQuickActions";
import { useBreakpoint } from "../../hooks/layout/useBreakpoint";
import { spacing } from "../../theme";
import { useThreadScreen } from "./useThreadScreen";

type Props = {
  threadId: string;
};

export const ThreadScreen = ({ threadId }: Props) => {
  const screen = useThreadScreen({ threadId });
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
              <ThreadHeader
                title={screen.title}
                peopleLabel={screen.peopleLabel}
                whenLabel={screen.whenLabel}
                locationLabel={screen.locationLabel}
                intentLabel={screen.intentLabel}
                onBack={screen.onBack}
              />
            </View>
          ) : null}

          <View style={styles.body}>
            <View style={[styles.column, styles.bodyColumn, { maxWidth }]}> 
              {screen.status === "missing" ? (
                <EmptyState title="Thread not found" message="That hangout thread link is missing a thread id." />
              ) : screen.status === "redirecting" ? (
                <LoadingState
                  title="Opening recap"
                  message="This hangout is already wrapped, so we're taking you to the recap."
                />
              ) : screen.status === "loading" ? (
                <LoadingState title="Opening thread" message="Pulling in the coordination room now." />
              ) : screen.status === "error" ? (
                <ErrorState
                  title="Thread hit a snag"
                  message={screen.errorMessage}
                  actionLabel="Try again"
                  onAction={screen.onRetry}
                />
              ) : (
                <ChatMessageList
                  scrollRef={scrollRef}
                  messages={screen.messages}
                  isGroup
                  emptyTitle={screen.emptyTitle}
                  emptyMessage={screen.emptyMessage}
                />
              )}
            </View>
          </View>

          {screen.status === "ready" ? (
            <View style={[styles.column, styles.footerColumn, { maxWidth }]}> 
              <ThreadQuickActions
                reactions={screen.reactionOptions}
                onReaction={screen.onReaction}
                onEta={screen.onEta}
                etaLabel={screen.etaLabel}
              />

              <ChatComposer
                inputRef={screen.inputRef}
                text={screen.text}
                onChangeText={screen.onChangeText}
                onSend={screen.onSend}
                placeholder={screen.placeholder}
                sendDisabled={screen.sendDisabled}
                showQuickReplyToggle={false}
                showQuickReplies={false}
                quickReplies={[]}
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
  footerColumn: {
    gap: spacing[12],
  },
});
