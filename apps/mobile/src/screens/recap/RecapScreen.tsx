import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { GradientMeshBackground } from "../../components/layout/GradientMeshBackground";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { Section } from "../../components/layout/Section";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { AppText } from "../../components/primitives/AppText";
import { EmptyState } from "../../components/primitives/EmptyState";
import { GlassCard } from "../../components/primitives/GlassCard";
import { HeroCard } from "../../components/primitives/HeroCard";
import { PillButton } from "../../components/primitives/PillButton";
import { colors, radii, spacing } from "../../theme";
import { useRecapScreen } from "./useRecapScreen";

type Props = {
  hangoutId: string;
};

export const RecapScreen = ({ hangoutId }: Props) => {
  const screen = useRecapScreen({ hangoutId });

  return (
    <GradientMeshBackground>
      <ScreenContainer>
        <ScreenHeader
          eyebrow="Recap"
          title="Let the good part stick"
          subtitle="Warm payoff now, easier follow-through next time."
          onBack={screen.onBack}
        />

        {screen.status === "missing" ? (
          <EmptyState
            title="Recap link missing"
            message="This recap needs a hangout id before we can bring the memory card into view."
          />
        ) : (
          <>
            <Section>
              <HeroCard>
                <View style={styles.heroCopy}>
                  <View style={styles.eyebrowRow}>
                    <MaterialCommunityIcons
                      name="sparkles"
                      size={16}
                      color="rgba(139,234,255,0.9)"
                    />
                    <AppText variant="eyebrow" color="rgba(139,234,255,0.9)">
                      {screen.badge}
                    </AppText>
                  </View>

                  <AppText variant="display">{screen.title}</AppText>
                  <AppText variant="body" color="rgba(247,251,255,0.82)">
                    {screen.summary}
                  </AppText>
                </View>

                <View style={styles.heroMetaRow}>
                  <View style={styles.contextPill}>
                    <MaterialCommunityIcons
                      name="account-group-outline"
                      size={18}
                      color={colors.aqua}
                    />
                    <AppText variant="bodySmall" color="rgba(247,251,255,0.78)" style={styles.contextText}>
                      {screen.peopleLine}
                    </AppText>
                  </View>

                  <View style={styles.streakCard}>
                    <AppText variant="eyebrow" color="rgba(247,251,255,0.58)">
                      Momentum
                    </AppText>
                    <AppText variant="h1">{screen.streakCount}</AppText>
                    <AppText variant="bodySmall" color="rgba(247,251,255,0.7)">
                      {screen.streakLabel}
                    </AppText>
                  </View>
                </View>
              </HeroCard>
            </Section>

            <Section>
              <SectionHeader label="Summary" title="What actually happened" />
              <GlassCard>
                <View style={styles.summaryBody}>
                  <AppText variant="body" color="rgba(247,251,255,0.8)">
                    {screen.summary}
                  </AppText>

                  <View style={styles.contextList}>
                    <View style={styles.contextRow}>
                      <MaterialCommunityIcons
                        name="calendar-clock-outline"
                        size={18}
                        color={colors.aqua}
                      />
                      <AppText variant="bodySmall" color={colors.muted}>
                        {screen.scheduleLine}
                      </AppText>
                    </View>
                    <View style={styles.contextRow}>
                      <MaterialCommunityIcons
                        name="map-marker-outline"
                        size={18}
                        color={colors.aqua}
                      />
                      <AppText variant="bodySmall" color={colors.muted}>
                        {screen.locationLine}
                      </AppText>
                    </View>
                  </View>
                </View>
              </GlassCard>
            </Section>

            <Section>
              <SectionHeader label="Momentum" title={screen.followUpTitle} />
              <GlassCard>
                <View style={styles.followUpBlock}>
                  <AppText variant="h3">{screen.streakLabel}</AppText>
                  <AppText variant="bodySmall" color={colors.muted}>
                    {screen.momentumCopy}
                  </AppText>
                  <View style={styles.followUpNote}>
                    <MaterialCommunityIcons
                      name="heart-outline"
                      size={18}
                      color={colors.aqua}
                    />
                    <AppText variant="bodySmall" color="rgba(247,251,255,0.74)" style={styles.followUpText}>
                      {screen.followUpBody}
                    </AppText>
                  </View>
                </View>
              </GlassCard>
            </Section>

            <Section>
              <SectionHeader label="Actions" title="Keep the loop going" />
              <GlassCard>
                <View style={styles.actionStack}>
                  <PillButton
                    label={screen.refreshLabel}
                    onPress={screen.isRefreshing ? undefined : screen.onRefresh}
                    loading={screen.isRefreshing}
                  />
                  <PillButton
                    label={screen.shareLabel}
                    variant="secondary"
                    onPress={screen.onShare}
                  />
                </View>
              </GlassCard>
            </Section>
          </>
        )}
      </ScreenContainer>
    </GradientMeshBackground>
  );
};

const styles = StyleSheet.create({
  heroCopy: {
    gap: spacing[12],
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  heroMetaRow: {
    gap: spacing[16],
  },
  contextPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  contextText: {
    flex: 1,
  },
  streakCard: {
    gap: spacing[8],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(6,10,24,0.26)",
    padding: spacing[16],
  },
  summaryBody: {
    gap: spacing[16],
  },
  contextList: {
    gap: spacing[12],
  },
  contextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
  },
  followUpBlock: {
    gap: spacing[12],
  },
  followUpNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[10],
    borderRadius: radii.lg,
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: spacing[16],
  },
  followUpText: {
    flex: 1,
  },
  actionStack: {
    gap: spacing[12],
  },
});
