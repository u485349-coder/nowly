import { StyleSheet, Text, View } from "react-native";
import { GlassCard } from "../../../components/ui/GlassCard";
import { PillButton } from "../../../components/ui/PillButton";
import { nowlyColors } from "../../../constants/theme";
import { MobileHeroCard } from "../components/MobileHeroCard";
import { MobileScreen } from "../components/MobileScreen";
import { MobileSectionHeader } from "../components/MobileSectionHeader";

type ProposalResponseAction = {
  label: string;
  variant?: "primary" | "secondary" | "ghost";
  onPress: () => void;
};

type ProposalParticipant = {
  id: string;
  name: string;
  response?: string | null;
  status: string;
};

export const ProposalMobileScreen = ({
  title,
  scheduleLine,
  status,
  chips,
  hint,
  onBack,
  responseActions,
  participants,
  onOpenThread,
  onShare,
}: {
  title: string;
  scheduleLine: string;
  status: string;
  chips: string[];
  hint: string;
  onBack: () => void;
  responseActions: ProposalResponseAction[];
  participants: ProposalParticipant[];
  onOpenThread: () => void;
  onShare: () => void;
}) => (
  <MobileScreen
    label="Proposal"
    title="React fast"
    subtitle="Lightweight decision layer first. Thread second."
    onBack={onBack}
  >
    <MobileHeroCard eyebrow="Proposal summary" title={title} copy={scheduleLine} meta={<View style={styles.statusPill}><Text style={styles.statusText}>{status}</Text></View>}>
      <View style={styles.chipRail}>
        {chips.map((chip) => (
          <View key={chip} style={styles.metaChip}>
            <Text style={styles.metaChipText}>{chip}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.hint}>{hint}</Text>
    </MobileHeroCard>

    <GlassCard className="p-4">
      <View style={{ gap: 12 }}>
        <MobileSectionHeader label="Respond" title="Keep it low pressure" />
        <View style={styles.stack}>
          {responseActions.map((action) => (
            <PillButton key={action.label} label={action.label} variant={action.variant ?? "secondary"} onPress={action.onPress} />
          ))}
        </View>
      </View>
    </GlassCard>

    <GlassCard className="p-4">
      <View style={{ gap: 12 }}>
        <MobileSectionHeader label="Crew state" title="Who is in?" />
        <View style={styles.stack}>
          {participants.map((participant) => (
            <View key={participant.id} style={styles.participantRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.participantName}>{participant.name}</Text>
                {participant.response ? <Text style={styles.participantResponse}>{participant.response}</Text> : null}
              </View>
              <View style={styles.participantStatus}>
                <Text style={styles.participantStatusText}>{participant.status}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </GlassCard>

    <GlassCard className="p-4">
      <View style={{ gap: 12 }}>
        <MobileSectionHeader label="Next" title="Take it into the thread" />
        <Text style={styles.copy}>Once people react, the thread becomes the fast room for updates, ETA, and pivots.</Text>
        <View style={styles.stack}>
          <PillButton label="Open thread" onPress={onOpenThread} />
          <PillButton label="Share link" variant="secondary" onPress={onShare} />
        </View>
      </View>
    </GlassCard>
  </MobileScreen>
);

const styles = StyleSheet.create({
  chipRail: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  copy: { color: "rgba(247,251,255,0.58)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 13, lineHeight: 20 },
  hint: { color: "rgba(139,234,255,0.84)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 13, lineHeight: 18 },
  metaChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "rgba(255,255,255,0.08)" },
  metaChipText: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_500Medium", fontSize: 12 },
  participantName: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_700Bold", fontSize: 16 },
  participantResponse: { color: "rgba(139,234,255,0.82)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 12 },
  participantRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  participantStatus: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: "rgba(255,255,255,0.08)" },
  participantStatusText: { color: nowlyColors.aqua, fontFamily: "SpaceGrotesk_500Medium", fontSize: 11, textTransform: "uppercase" },
  stack: { gap: 10 },
  statusPill: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "rgba(139,234,255,0.14)" },
  statusText: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_500Medium", fontSize: 12, textTransform: "uppercase" },
});
