import { StyleSheet, Text, View } from "react-native";
import { GlassCard } from "../../../components/ui/GlassCard";
import { PillButton } from "../../../components/ui/PillButton";
import { nowlyColors } from "../../../constants/theme";
import { MobileHeroCard } from "../components/MobileHeroCard";
import { MobileScreen } from "../components/MobileScreen";
import { MobileSectionHeader } from "../components/MobileSectionHeader";

type FastPlan = {
  title: string;
  hint: string;
  onPress: () => void;
};

export const MatchMobileScreen = ({
  title,
  copy,
  insight,
  chips,
  onBack,
  onStartSomething,
  onMessageFirst,
  fastPlans,
}: {
  title: string;
  copy: string;
  insight: string;
  chips: string[];
  onBack: () => void;
  onStartSomething: () => void;
  onMessageFirst: () => void;
  fastPlans: FastPlan[];
}) => (
  <MobileScreen
    label="Match"
    title="Strong fit right now"
    subtitle="Confidence first. Then one obvious next move."
    onBack={onBack}
  >
    <MobileHeroCard eyebrow="Live overlap" title={title} copy={copy}>
      <View style={styles.chipRail}>
        {chips.map((chip) => (
          <View key={chip} style={styles.metaChip}>
            <Text style={styles.metaChipText}>{chip}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.insight}>{insight}</Text>
      <View style={styles.stack}>
        <PillButton label="Start something" onPress={onStartSomething} />
        <PillButton label="Message first" variant="secondary" onPress={onMessageFirst} />
      </View>
    </MobileHeroCard>

    <View style={{ gap: 12 }}>
      <MobileSectionHeader label="Quick moves" title="Pitch a low-stakes plan" />
      {fastPlans.map((plan) => (
        <GlassCard key={plan.title} className="p-4">
          <View style={styles.planRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.planTitle}>{plan.title}</Text>
              <Text style={styles.planHint}>{plan.hint}</Text>
            </View>
            <PillButton label="Send" variant="secondary" onPress={plan.onPress} />
          </View>
        </GlassCard>
      ))}
    </View>
  </MobileScreen>
);

const styles = StyleSheet.create({
  chipRail: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  insight: { color: "rgba(139,234,255,0.84)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 13, lineHeight: 18 },
  metaChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "rgba(255,255,255,0.08)" },
  metaChipText: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_500Medium", fontSize: 12 },
  planHint: { color: "rgba(247,251,255,0.6)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 13, lineHeight: 18 },
  planRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  planTitle: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_700Bold", fontSize: 17 },
  stack: { gap: 10 },
});
