import { View } from "react-native";
import { GradientMeshBackground } from "../../components/layout/GradientMeshBackground";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { Section } from "../../components/layout/Section";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { AppText } from "../../components/primitives/AppText";
import { EmptyState } from "../../components/primitives/EmptyState";
import { GlassCard } from "../../components/primitives/GlassCard";
import { HeroCard } from "../../components/primitives/HeroCard";
import { LoadingState } from "../../components/primitives/LoadingState";
import { PillButton } from "../../components/primitives/PillButton";
import { Chip } from "../../components/primitives/Chip";
import { colors, spacing } from "../../theme";
import { ProposalParticipantList } from "../../features/proposal/components/ProposalParticipantList";
import { ProposalResponseOptions } from "../../features/proposal/components/ProposalResponseOptions";
import { useProposalScreen } from "./useProposalScreen";

type Props = {
  hangoutId: string;
};

export const ProposalScreen = ({ hangoutId }: Props) => {
  const screen = useProposalScreen({ hangoutId });

  return (
    <GradientMeshBackground>
      <ScreenContainer contentStyle={{ paddingBottom: 140 }}>
        <ScreenHeader
          eyebrow="Proposal"
          title="Keep it easy"
          subtitle="Decide first. The thread is there when you need it."
          onBack={screen.onBack}
        />

        {screen.status === "missing" ? (
          <EmptyState title="Proposal not found" message="That hangout link doesn't map to an active proposal right now." />
        ) : null}
        {screen.status === "redirecting" ? (
          <LoadingState title="Opening recap" message="This hang is already wrapped, so we're taking you to the recap." />
        ) : null}

        {screen.status === "ready" ? (
          <>
            <Section>
              <HeroCard>
                <View style={{ gap: spacing[12] }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing[12] }}>
                    <AppText variant="eyebrow" color="rgba(139,234,255,0.82)">
                      Low-pressure plan
                    </AppText>
                    <View
                      style={{
                        borderRadius: 999,
                        paddingHorizontal: spacing[12],
                        paddingVertical: spacing[8],
                        backgroundColor: "rgba(255,255,255,0.1)",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.14)",
                      }}
                    >
                      <AppText variant="label" color={colors.cloud}>
                        {screen.statusLabel}
                      </AppText>
                    </View>
                  </View>

                  <View style={{ gap: spacing[8] }}>
                    <AppText variant="h1">{screen.title}</AppText>
                    <AppText variant="body" color="rgba(247,251,255,0.72)">
                      With {screen.peopleSummary}
                    </AppText>
                  </View>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[8] }}>
                    <Chip label={screen.intentLabel} selected />
                    <Chip label={screen.commitmentLabel} />
                  </View>

                  <AppText variant="bodySmall" color="rgba(139,234,255,0.82)">
                    {screen.confirmationHint}
                  </AppText>
                </View>
              </HeroCard>
            </Section>

            <Section>
              <SectionHeader label="Plan" title="Where and when" />
              <GlassCard>
                <View style={{ gap: spacing[12] }}>
                  <View style={{ gap: spacing[4] }}>
                    <AppText variant="eyebrow" color="rgba(247,251,255,0.48)">
                      Timing
                    </AppText>
                    <AppText variant="body" color={colors.cloud}>
                      {screen.whenLabel}
                    </AppText>
                  </View>
                  <View style={{ gap: spacing[4] }}>
                    <AppText variant="eyebrow" color="rgba(247,251,255,0.48)">
                      Place
                    </AppText>
                    <AppText variant="body" color={colors.cloud}>
                      {screen.locationLabel}
                    </AppText>
                  </View>
                </View>
              </GlassCard>
            </Section>

            <Section>
              <SectionHeader label="Crew status" title="Who’s in so far" />
              <GlassCard>
                <ProposalParticipantList items={screen.participants} />
              </GlassCard>
            </Section>

            <Section>
              <SectionHeader label="Your move" title="React with low pressure" />
              <GlassCard>
                <View style={{ gap: spacing[12] }}>
                  <AppText variant="bodySmall" color={colors.muted}>
                    Keep it honest. A soft yes or soft no is better than leaving people guessing.
                  </AppText>
                  <ProposalResponseOptions options={screen.responseOptions} />
                </View>
              </GlassCard>
            </Section>

            <Section>
              <SectionHeader label="After that" title="Keep the thread moving" />
              <GlassCard>
                <View style={{ gap: spacing[12] }}>
                  <AppText variant="bodySmall" color={colors.muted}>
                    Once people react, the thread is the room for quick updates, ETA, and last-minute pivots.
                  </AppText>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[12] }}>
                    <PillButton label="Open thread" onPress={screen.onOpenThread} style={{ flexGrow: 1 }} />
                    <PillButton label="Share link" variant="secondary" onPress={screen.onShare} style={{ flexGrow: 1 }} />
                  </View>
                </View>
              </GlassCard>
            </Section>
          </>
        ) : null}
      </ScreenContainer>
    </GradientMeshBackground>
  );
};
