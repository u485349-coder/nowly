import { StyleSheet, View } from "react-native";
import { GradientMeshBackground } from "../../components/layout/GradientMeshBackground";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { Section } from "../../components/layout/Section";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { Badge } from "../../components/primitives/Badge";
import { ErrorState } from "../../components/primitives/ErrorState";
import { GlassCard } from "../../components/primitives/GlassCard";
import { Input } from "../../components/primitives/Input";
import { LoadingState } from "../../components/primitives/LoadingState";
import { PillButton } from "../../components/primitives/PillButton";
import { AppText } from "../../components/primitives/AppText";
import { ConversationList } from "../../features/crew/components/ConversationList";
import { CrewFriendList } from "../../features/crew/components/CrewFriendList";
import { LivePeopleList } from "../../features/crew/components/LivePeopleList";
import { SocialEdgeList } from "../../features/crew/components/SocialEdgeList";
import { spacing } from "../../theme";
import { useCrewScreen } from "./useCrewScreen";

export const CrewScreen = () => {
  const screen = useCrewScreen();

  return (
    <GradientMeshBackground>
      <ScreenContainer includeBottomNavInset>
        <ScreenHeader
          eyebrow="Crew"
          title="Conversations first, people close behind."
          subtitle="Keep the inbox warm, keep the graph within reach, and let discovery stay quieter in the background."
          right={<PillButton label="New group" onPress={screen.onCreateGroup} variant="secondary" />}
        />

        <Section>
          <GlassCard>
            <Input
              value={screen.search}
              onChangeText={screen.setSearch}
              placeholder="Search chats, people, and invites"
            />
          </GlassCard>
        </Section>

        {screen.isLoading ? (
          <LoadingState title="Pulling in your crew" message="Syncing chats, requests, and live people now." />
        ) : null}

        {screen.isError ? (
          <ErrorState
            title="Crew hit a snag"
            message="We couldn't fully load your people layer. Try again in a moment."
            actionLabel="Try again"
            onAction={screen.onRetry}
          />
        ) : null}

        {!screen.isLoading && !screen.isError ? (
          <>
            <Section>
              <SectionHeader
                label="Active conversations"
                title="Messages"
                right={
                  screen.conversationUnreadCount ? (
                    <Badge value={screen.conversationUnreadCount > 99 ? "99+" : screen.conversationUnreadCount} />
                  ) : null
                }
              />
              <ConversationList conversations={screen.conversationItems} />
            </Section>

            <Section>
              <SectionHeader label="Live people" title="Warm right now" />
              <LivePeopleList items={screen.livePeopleItems} />
            </Section>

            <Section>
              <SectionHeader label="Your crew" title="People you can move with" />
              <CrewFriendList items={screen.crewItems} />
            </Section>

            <Section>
              <SectionHeader
                label="Pending requests"
                title="Waiting on a reply"
                right={
                  screen.friendRequestUnreadCount ? (
                    <Badge value={screen.friendRequestUnreadCount > 99 ? "99+" : screen.friendRequestUnreadCount} />
                  ) : null
                }
              />
              <SocialEdgeList
                items={screen.pendingRequestItems}
                emptyMessage="No pending requests right now."
              />
            </Section>

            <Section>
              <SectionHeader label="Suggestions" title="People nearby" />
              <SocialEdgeList
                items={screen.suggestionItems}
                emptyMessage="No nearby suggestions to surface yet."
              />
            </Section>

            <Section>
              <GlassCard>
                <View style={styles.inviteCard}>
                  <View style={styles.inviteCopy}>
                    <AppText variant="eyebrow" color="rgba(247,251,255,0.5)">
                      Invite
                    </AppText>
                    <AppText variant="h3">Pull someone into the circle.</AppText>
                    <AppText variant="body" color="rgba(247,251,255,0.64)">
                      Share a Nowly link when a quick nudge in Discord, text, or a campus group chat will do the trick.
                    </AppText>
                  </View>
                  <PillButton label="Invite people" onPress={screen.onInvite} variant="ghost" />
                </View>
              </GlassCard>
            </Section>
          </>
        ) : null}
      </ScreenContainer>
    </GradientMeshBackground>
  );
};

const styles = StyleSheet.create({
  inviteCard: {
    gap: spacing[16],
  },
  inviteCopy: {
    gap: spacing[8],
  },
});
