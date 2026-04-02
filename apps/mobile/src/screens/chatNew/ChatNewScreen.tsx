import { MaterialCommunityIcons } from "@expo/vector-icons";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { GradientMeshBackground } from "../../components/layout/GradientMeshBackground";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { Section } from "../../components/layout/Section";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { StickyFooter } from "../../components/layout/StickyFooter";
import { EntityRow } from "../../components/display/EntityRow";
import { AppText } from "../../components/primitives/AppText";
import { Avatar } from "../../components/primitives/Avatar";
import { EmptyState } from "../../components/primitives/EmptyState";
import { GlassCard } from "../../components/primitives/GlassCard";
import { Input } from "../../components/primitives/Input";
import { PillButton } from "../../components/primitives/PillButton";
import { useBreakpoint } from "../../hooks/layout/useBreakpoint";
import { colors, radii, spacing } from "../../theme";
import { useChatNewScreen } from "./useChatNewScreen";

export const ChatNewScreen = () => {
  const screen = useChatNewScreen();
  const layout = useBreakpoint();
  const maxWidth = layout.isDesktop ? 760 : layout.maxContentWidth;

  return (
    <GradientMeshBackground>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.select({ ios: "padding", android: "height", default: undefined })}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: layout.topPadding + spacing[12],
              paddingBottom: 220,
              paddingHorizontal: layout.horizontalPadding,
              paddingLeft: layout.horizontalPadding + layout.railOffset,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.inner, { maxWidth }]}>
            <ScreenHeader
              eyebrow="New group"
              title="Build the thread first"
              subtitle="Search, tap people in, then let the group line live on its own."
              onBack={screen.onBack}
            />

            <Section>
              <GlassCard>
                <View style={styles.setupStack}>
                  <Input
                    icon="magnify"
                    value={screen.search}
                    onChangeText={screen.onChangeSearch}
                    placeholder="Search your crew"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                  />

                  <Input
                    icon="account-group-outline"
                    value={screen.title}
                    onChangeText={screen.onChangeTitle}
                    placeholder="Optional group title"
                  />

                  <AppText variant="bodySmall" color={colors.muted}>
                    If you skip the title, Nowly will use the people in the thread.
                  </AppText>
                </View>
              </GlassCard>
            </Section>

            <Section>
              <SectionHeader label="Selected" title="Who is in?" />
              <GlassCard>
                {screen.selectedFriends.length ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.selectedRail}
                  >
                    {screen.selectedFriends.map((friend) => (
                      <Pressable
                        key={friend.id}
                        accessibilityRole="button"
                        onPress={() => screen.onToggleFriend(friend.id)}
                        style={({ pressed }) => [
                          styles.selectedChip,
                          pressed ? styles.selectedChipPressed : null,
                        ]}
                      >
                        <AppText variant="bodySmall" style={styles.selectedChipLabel}>
                          {friend.name}
                        </AppText>
                        <MaterialCommunityIcons name="close" size={16} color={colors.cloud} />
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : (
                  <AppText variant="bodySmall" color={colors.muted}>
                    Pick at least two friends to start the private line.
                  </AppText>
                )}
              </GlassCard>
            </Section>

            <Section>
              <SectionHeader label="Friends" title="Tap people in" />
              {!screen.hasFriends ? (
                <EmptyState
                  title="No crew yet"
                  message="Add a few accepted friends first, then this private group flow will be ready."
                />
              ) : !screen.hasFilteredResults ? (
                <EmptyState
                  title="No matches for that search"
                  message="Try a different name, campus tag, or city and your crew will filter right here."
                />
              ) : (
                <View style={styles.friendList}>
                  {screen.friendRows.map((friend) => (
                    <EntityRow
                      key={friend.id}
                      leading={<Avatar name={friend.name} photoUrl={friend.photoUrl} size={52} />}
                      title={friend.name}
                      subtitle={friend.subtitle}
                      selected={friend.selected}
                      trailing={
                        <View style={styles.trailing}>
                          <MaterialCommunityIcons
                            name={friend.selected ? "check-circle" : "circle-outline"}
                            size={24}
                            color={friend.selected ? colors.aqua : "rgba(247,251,255,0.34)"}
                          />
                        </View>
                      }
                      onPress={friend.onPress}
                    />
                  ))}
                </View>
              )}
            </Section>
          </View>
        </ScrollView>

        <StickyFooter>
          <PillButton
            label={screen.createLabel}
            onPress={screen.createDisabled ? undefined : screen.onCreate}
            loading={screen.isCreating}
            disabled={screen.createDisabled}
          />
        </StickyFooter>
      </KeyboardAvoidingView>
    </GradientMeshBackground>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    alignItems: "center",
  },
  inner: {
    width: "100%",
  },
  setupStack: {
    gap: spacing[12],
  },
  selectedRail: {
    flexDirection: "row",
    gap: spacing[8],
  },
  selectedChip: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    borderRadius: radii.pill,
    backgroundColor: "rgba(139,234,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(139,234,255,0.22)",
    paddingHorizontal: spacing[14],
    paddingVertical: spacing[10],
  },
  selectedChipPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  selectedChipLabel: {
    fontFamily: "SpaceGrotesk_500Medium",
  },
  friendList: {
    gap: spacing[12],
  },
  trailing: {
    alignItems: "center",
    justifyContent: "center",
  },
});
