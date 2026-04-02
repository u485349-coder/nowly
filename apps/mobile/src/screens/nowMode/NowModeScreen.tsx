import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { GradientMeshBackground } from "../../components/layout/GradientMeshBackground";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { Section } from "../../components/layout/Section";
import { StickyFooter } from "../../components/layout/StickyFooter";
import { AppText } from "../../components/primitives/AppText";
import { ErrorState } from "../../components/primitives/ErrorState";
import { IconButton } from "../../components/primitives/IconButton";
import { Input } from "../../components/primitives/Input";
import { PillButton } from "../../components/primitives/PillButton";
import { colors, radii, spacing } from "../../theme";
import { useBreakpoint } from "../../hooks/layout/useBreakpoint";
import { AuraHero } from "../../features/nowMode/components/AuraHero";
import { LiveContextList } from "../../features/nowMode/components/LiveContextList";
import { SignalChipGroup } from "../../features/nowMode/components/SignalChipGroup";
import { SignalDisclosureCard } from "../../features/nowMode/components/SignalDisclosureCard";
import { SignalStateList } from "../../features/nowMode/components/SignalStateList";
import { NowlyToast } from "../../../components/ui/NowlyToast";
import { useNowModeScreen } from "./useNowModeScreen";

export const NowModeScreen = () => {
  const screen = useNowModeScreen();
  const layout = useBreakpoint();

  if (screen.status === "error") {
    return (
      <GradientMeshBackground>
        <View style={styles.errorWrap}>
          <ErrorState title="Now Mode needs your session" message="Sign back in and your live signal controls will be ready again." />
        </View>
      </GradientMeshBackground>
    );
  }

  return (
    <GradientMeshBackground>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.select({ ios: "padding", android: "height", default: undefined })}
      >
        <NowlyToast toast={screen.toast} top={layout.isDesktop ? 20 : 14} />

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
          <View style={[styles.inner, { maxWidth: layout.isDesktop ? 760 : layout.maxContentWidth }]}> 
            <ScreenHeader
              eyebrow="Now Mode"
              title="Tune your live signal"
              subtitle="Set the mood once, then let timing do the work."
              onBack={screen.onBack}
              right={<IconButton icon="calendar-clock-outline" onPress={screen.onOpenWindows} tone="accent" />}
            />

            <Section>
              <AuraHero
                title={screen.title}
                copy={screen.copy}
                status={screen.heroStatus}
                locationLabel={screen.locationLabel}
                onOpenWindows={screen.onOpenWindows}
              />
            </Section>

            <Section>
              <SignalDisclosureCard title="Live status" summary={screen.stateSummary} defaultExpanded>
                <View style={styles.group}>
                  <AppText variant="bodySmall" color={colors.muted}>
                    Pick the live state first, then give the moment a line people can understand at a glance.
                  </AppText>
                  <SignalStateList options={screen.stateOptions} />
                </View>

                <View style={styles.group}>
                  <AppText variant="h3">Signal line</AppText>
                  <Input
                    icon="message-outline"
                    placeholder="After class coffee, study break, quick reset..."
                    value={screen.label}
                    onChangeText={screen.onChangeLabel}
                  />
                </View>
              </SignalDisclosureCard>
            </Section>

            <Section>
              <SignalDisclosureCard title="How the moment feels" summary={screen.vibeSummary} defaultExpanded>
                <View style={styles.group}>
                  <AppText variant="h3">Intent</AppText>
                  <SignalChipGroup options={screen.intentOptions} />
                </View>

                <View style={styles.group}>
                  <AppText variant="h3">Vibe</AppText>
                  <SignalChipGroup options={screen.vibeOptions} />
                </View>

                <View style={styles.group}>
                  <AppText variant="h3">Energy</AppText>
                  <SignalChipGroup options={screen.energyOptions} />
                </View>
              </SignalDisclosureCard>
            </Section>

            <Section>
              <SignalDisclosureCard title="Where and how it can happen" summary={screen.logisticsSummary} defaultExpanded>
                <View style={styles.group}>
                  <AppText variant="h3">Meet mode</AppText>
                  <SignalChipGroup options={screen.meetModeOptions} />
                </View>

                <View style={styles.group}>
                  <AppText variant="h3">Crowd mode</AppText>
                  <SignalChipGroup options={screen.crowdModeOptions} />
                </View>

                {screen.supportsOnline ? (
                  <View style={styles.group}>
                    <AppText variant="h3">Online venue</AppText>
                    <Input
                      icon="laptop"
                      placeholder="Discord, Reddit, Roblox..."
                      value={screen.onlineVenue}
                      onChangeText={screen.onChangeOnlineVenue}
                    />
                    <SignalChipGroup options={screen.onlineVenueSuggestions} />
                  </View>
                ) : null}

                <View style={styles.group}>
                  <AppText variant="h3">Live for</AppText>
                  <SignalChipGroup options={screen.durationOptions} />
                  <Input
                    icon="timer-outline"
                    placeholder="Custom duration: 45m, 1.5h, 4h..."
                    value={screen.durationInput}
                    onChangeText={screen.onChangeDurationInput}
                  />
                </View>

                {screen.supportsInPerson ? (
                  <>
                    <View style={styles.group}>
                      <AppText variant="h3">Location sharing</AppText>
                      <View style={styles.toggleWrap}>
                        <PillButton label="Hide spot" variant={screen.showLocation ? "secondary" : "primary"} onPress={screen.onSelectHideLocation} style={styles.toggleButton} />
                        <PillButton label="Show area" variant={screen.showLocation ? "primary" : "secondary"} onPress={screen.onSelectShowLocation} style={styles.toggleButton} />
                      </View>
                    </View>

                    {screen.showLocation ? (
                      <View style={styles.group}>
                        <AppText variant="bodySmall" color={colors.muted}>
                          Share the area, not the exact spot, so people know what part of town this signal belongs to.
                        </AppText>
                        <Input
                          icon="map-marker-radius-outline"
                          placeholder="Near campus, downtown, west side..."
                          value={screen.locationInput}
                          onChangeText={screen.onChangeLocationLabel}
                        />
                      </View>
                    ) : null}

                    <View style={styles.group}>
                      <AppText variant="h3">Radius</AppText>
                      <SignalChipGroup options={screen.radiusOptions} />
                    </View>
                  </>
                ) : (
                  <AppText variant="bodySmall" color={colors.muted}>
                    Online mode ignores distance, so the platform matters more than the radius.
                  </AppText>
                )}
              </SignalDisclosureCard>
            </Section>

            <Section>
              <SignalDisclosureCard title="Comfort level" summary={screen.comfortSummary}>
                <View style={styles.group}>
                  <AppText variant="h3">Social battery</AppText>
                  <SignalChipGroup options={screen.batteryOptions} />
                </View>

                <View style={styles.group}>
                  <AppText variant="h3">Spend mood</AppText>
                  <SignalChipGroup options={screen.budgetOptions} />
                </View>
              </SignalDisclosureCard>
            </Section>

            <Section>
              <LiveContextList
                label="Live matches"
                title="Who feels reachable right now"
                emptyText="Once your aura is live, the strongest people and timing should surface here first."
                items={screen.liveMatches}
              />
            </Section>

            <Section>
              <LiveContextList
                label="Best windows"
                title="Softer timing still matters"
                emptyText="Saved rhythm and recurring windows will collect here once your crew has compatible time."
                items={screen.suggestedTimes}
              />
            </Section>
          </View>
        </ScrollView>

        <StickyFooter>
          <View style={styles.footerActions}>
            {screen.hasActiveSignal ? (
              <PillButton
                label={screen.clearing ? "Stopping live..." : "Clear signal"}
                variant="secondary"
                onPress={screen.onClear}
                disabled={screen.clearing || screen.saving}
                style={styles.secondaryAction}
              />
            ) : null}
            <PillButton
              label={screen.saveLabel}
              onPress={screen.onSave}
              loading={screen.saving}
              disabled={screen.clearing}
              style={styles.primaryAction}
            />
          </View>
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
  group: {
    gap: spacing[12],
  },
  toggleWrap: {
    gap: spacing[12],
  },
  toggleButton: {
    width: "100%",
  },
  footerActions: {
    gap: spacing[8],
  },
  secondaryAction: {
    width: "100%",
  },
  primaryAction: {
    width: "100%",
  },
  errorWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing[24],
  },
});
