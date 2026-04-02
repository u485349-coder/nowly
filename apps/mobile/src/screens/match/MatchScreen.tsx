import { View } from "react-native";
import { GradientMeshBackground } from "../../components/layout/GradientMeshBackground";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { Section } from "../../components/layout/Section";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { AppText } from "../../components/primitives/AppText";
import { Chip } from "../../components/primitives/Chip";
import { EmptyState } from "../../components/primitives/EmptyState";
import { GlassCard } from "../../components/primitives/GlassCard";
import { HeroCard } from "../../components/primitives/HeroCard";
import { PillButton } from "../../components/primitives/PillButton";
import { colors, spacing } from "../../theme";
import { MatchFastPlans } from "../../features/match/components/MatchFastPlans";
import { useMatchScreen } from "./useMatchScreen";

type Props = {
  matchId: string;
};

export const MatchScreen = ({ matchId }: Props) => {
  const screen = useMatchScreen({ matchId });

  return (
    <GradientMeshBackground>
      <ScreenContainer>
        {screen.status === "missing" ? (
          <>
            <ScreenHeader
              eyebrow="Match"
              title="Match expired"
              subtitle="That overlap probably timed out. The next one will come through soon."
              onBack={screen.onBack}
            />
            <EmptyState
              title="Nothing to act on here"
              message="Head back home and catch the next good overlap while it's still warm."
            />
          </>
        ) : (
          <>
            <ScreenHeader
              eyebrow="Match"
              title="One strong overlap"
              subtitle="Read the room first, then make the move."
              onBack={screen.onBack}
            />

            <Section>
              <HeroCard>
                <View style={{ gap: spacing[12] }}>
                  <AppText variant="eyebrow" color="rgba(139,234,255,0.82)">
                    Confidence signal
                  </AppText>
                  <View style={{ gap: spacing[8] }}>
                    <AppText variant="h1">{screen.title}</AppText>
                    <AppText variant="body" color="rgba(247,251,255,0.72)">
                      {screen.reasoningHeadline}
                    </AppText>
                    <AppText variant="bodySmall" color="rgba(139,234,255,0.82)">
                      {screen.reasoningDetail}
                    </AppText>
                  </View>

                  <AppText variant="bodySmall" color="rgba(247,251,255,0.62)">
                    {screen.insight}
                  </AppText>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[12] }}>
                    <PillButton label="Start something" onPress={screen.onStartSomething} />
                    <PillButton
                      label={screen.isOpeningChat ? "Opening chat..." : "Message first"}
                      variant="secondary"
                      onPress={screen.onMessageFirst}
                      disabled={screen.isOpeningChat}
                    />
                  </View>
                </View>
              </HeroCard>
            </Section>

            <Section>
              <SectionHeader label="Why now" title="What makes this feel good" />
              <GlassCard>
                <View style={{ gap: spacing[12] }}>
                  <AppText variant="body" color={colors.cloud}>
                    {screen.reasoningHeadline}
                  </AppText>
                  <AppText variant="bodySmall" color={colors.muted}>
                    {screen.insight}
                  </AppText>
                </View>
              </GlassCard>
            </Section>

            <Section>
              <SectionHeader label="Shared signal" title="Read the vibe" />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[8] }}>
                {screen.chips.map((chip, index) => (
                  <Chip key={`${chip}-${index}`} label={chip} selected={index === 0} />
                ))}
              </View>
            </Section>

            <Section>
              <SectionHeader label="Low stakes" title="Pitch a clean plan" />
              <MatchFastPlans items={screen.fastPlans} />
            </Section>
          </>
        )}
      </ScreenContainer>
    </GradientMeshBackground>
  );
};
