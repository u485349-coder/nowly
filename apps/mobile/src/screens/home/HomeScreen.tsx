import { Pressable } from "react-native";
import { GradientMeshBackground } from "../../components/layout/GradientMeshBackground";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { Section } from "../../components/layout/Section";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { AppText } from "../../components/primitives/AppText";
import { EmptyState } from "../../components/primitives/EmptyState";
import { ErrorState } from "../../components/primitives/ErrorState";
import { IconButton } from "../../components/primitives/IconButton";
import { LoadingState } from "../../components/primitives/LoadingState";
import { OpportunityHero } from "../../features/now/components/OpportunityHero";
import { PromptRail } from "../../features/now/components/PromptRail";
import { RadarList } from "../../features/now/components/RadarList";
import { RecapSummaryCard } from "../../features/now/components/RecapSummaryCard";
import { TimingSignalCard } from "../../features/now/components/TimingSignalCard";
import { useHomeScreen } from "./useHomeScreen";

export const HomeScreen = () => {
  const screen = useHomeScreen();

  return (
    <GradientMeshBackground>
      <ScreenContainer includeBottomNavInset>
        <ScreenHeader
          eyebrow="Now"
          title="Who can you catch right now?"
          subtitle="One clean glance, then the next best move."
          right={<IconButton icon="calendar-clock-outline" onPress={screen.openWindows} tone="accent" />}
        />

        {screen.isLoading ? <LoadingState title="Warming up the radar" message="Pulling in your live opportunities now." /> : null}
        {screen.isError ? (
          <ErrorState title="Radar missed this pass" message="We couldn't load your live opportunities. Try again in a moment." />
        ) : null}
        {!screen.isLoading && !screen.isError ? (
          <>
            <Section>
              <OpportunityHero
                eyebrow={screen.hero.eyebrow}
                title={screen.hero.title}
                copy={screen.hero.copy}
                status={screen.hero.status}
                people={screen.warmPeople}
                primaryLabel={screen.hero.primaryLabel}
                secondaryLabel="Best windows"
                onPrimary={screen.hero.onPrimary}
                onSecondary={screen.openWindows}
              />
            </Section>

            <Section>
              <TimingSignalCard
                title={screen.timingSignal.title}
                detail={screen.timingSignal.detail}
                onPress={screen.timingSignal.onPress}
              />
            </Section>

            <Section>
              <SectionHeader label="Low pressure" title="Quick prompts" />
              <PromptRail prompts={screen.promptItems} />
            </Section>

            <Section>
              <SectionHeader label="Live radar" title="People and windows" />
              {screen.radarItems.length ? (
                <>
                  <RadarList items={screen.radarItems} />
                  <AppText variant="bodySmall" color="rgba(247,251,255,0.52)">
                    {screen.radarHint}
                  </AppText>
                </>
              ) : (
                <EmptyState title="No live rows yet" message="Go live or save a hang rhythm and the radar will start surfacing the best fits here." />
              )}
            </Section>

            <Section>
              <SectionHeader label="Past hangs" title="Recent momentum" />
              {screen.recap ? (
                <Pressable onPress={screen.recap.onPress}>
                  <RecapSummaryCard title={screen.recap.title} detail={screen.recap.detail} />
                </Pressable>
              ) : (
                <EmptyState title="No past hangs yet" message="When a hang wraps, its recap will collect here as a soft reminder to keep the momentum warm." />
              )}
              <AppText variant="bodySmall" color="rgba(247,251,255,0.52)">
                The radar stays focused on what matters now. Everything below the hero is support, not noise.
              </AppText>
            </Section>
          </>
        ) : null}
      </ScreenContainer>
    </GradientMeshBackground>
  );
};
