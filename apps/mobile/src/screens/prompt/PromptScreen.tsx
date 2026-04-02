import { View } from "react-native";
import { GradientMeshBackground } from "../../components/layout/GradientMeshBackground";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { StickyFooter } from "../../components/layout/StickyFooter";
import { Section } from "../../components/layout/Section";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { AppText } from "../../components/primitives/AppText";
import { EmptyState } from "../../components/primitives/EmptyState";
import { HeroCard } from "../../components/primitives/HeroCard";
import { GlassCard } from "../../components/primitives/GlassCard";
import { Input } from "../../components/primitives/Input";
import { PillButton } from "../../components/primitives/PillButton";
import { TextArea } from "../../components/primitives/TextArea";
import { spacing } from "../../theme";
import { PromptRecipientList } from "../../features/prompt/components/PromptRecipientList";
import { usePromptScreen } from "./usePromptScreen";

type Props = {
  promptKey: string;
  recipientId?: string | null;
};

export const PromptScreen = ({ promptKey, recipientId }: Props) => {
  const screen = usePromptScreen({ promptKey, recipientId });

  return (
    <GradientMeshBackground>
      <View style={{ flex: 1 }}>
        <ScreenContainer contentStyle={{ paddingBottom: 152 }}>
          <ScreenHeader
            eyebrow="Prompt"
            title="Start something"
            subtitle="One clean nudge. Low pressure all the way through."
            onBack={screen.onBack}
          />

          {screen.status === "missing" ? (
            <EmptyState
              title="Prompt not found"
              message="That prompt does not exist anymore. Head back and pick another one."
            />
          ) : (
            <>
              <Section>
                <HeroCard>
                  <View style={{ gap: spacing[12] }}>
                    <AppText variant="eyebrow" color="rgba(139,234,255,0.82)">
                      What you're asking
                    </AppText>
                    <View style={{ gap: spacing[8] }}>
                      <AppText variant="h1">{screen.promptLabel}</AppText>
                      <AppText variant="body" color="rgba(247,251,255,0.72)">
                        {screen.promptDetail}
                      </AppText>
                    </View>
                    <AppText variant="bodySmall" color="rgba(139,234,255,0.84)">
                      This turns into: {screen.promptActivity}
                    </AppText>
                  </View>
                </HeroCard>
              </Section>

              <Section>
                <SectionHeader label="Make it yours" title="Tweak the tone" />
                <GlassCard>
                  <View style={{ gap: spacing[12] }}>
                    <Input
                      icon="label-variant-outline"
                      value={screen.customLabel}
                      onChangeText={screen.onChangeLabel}
                      placeholder="Give it a short label"
                    />
                    <TextArea
                      value={screen.customDetail}
                      onChangeText={screen.onChangeDetail}
                      placeholder="Add the low-pressure detail"
                    />
                    <Input
                      icon="message-draw"
                      value={screen.customActivity}
                      onChangeText={screen.onChangeActivity}
                      placeholder="What would you actually do?"
                    />
                    <AppText variant="bodySmall" color="rgba(247,251,255,0.58)">
                      Keep it conversational. This should feel like something you'd actually send.
                    </AppText>
                  </View>
                </GlassCard>
              </Section>

              <Section>
                <SectionHeader label="Recipient" title="Who should see it?" />
                {screen.recipients.length ? (
                  <PromptRecipientList items={screen.recipients} />
                ) : (
                  <EmptyState
                    title="No crew available yet"
                    message="Once matches and friends populate, you'll be able to send this prompt from here."
                  />
                )}
              </Section>
            </>
          )}
        </ScreenContainer>

        {screen.status === "ready" ? (
          <StickyFooter>
            <PillButton
              label={screen.isSending ? "Sending..." : screen.sendLabel}
              onPress={screen.onSend}
              disabled={screen.sendDisabled}
            />
          </StickyFooter>
        ) : null}
      </View>
    </GradientMeshBackground>
  );
};

