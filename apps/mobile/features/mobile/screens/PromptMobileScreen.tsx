import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassCard } from "../../../components/ui/GlassCard";
import { PillButton } from "../../../components/ui/PillButton";
import { nowlyColors } from "../../../constants/theme";
import { MobileHeroCard } from "../components/MobileHeroCard";
import { MobileScreen } from "../components/MobileScreen";
import { MobileSectionHeader } from "../components/MobileSectionHeader";
import { MobileStickyActions } from "../components/MobileStickyActions";

type PromptRecipientItem = {
  id: string;
  name: string;
  photoUrl?: string | null;
  eyebrow: string;
  detail: string;
  selected: boolean;
};

export const PromptMobileScreen = ({
  title,
  detail,
  activityPreview,
  onBack,
  customLabel,
  onChangeLabel,
  customDetail,
  onChangeDetail,
  customActivity,
  onChangeActivity,
  recipients,
  onSelectRecipient,
  onSend,
  sendLabel,
  sendDisabled,
}: {
  title: string;
  detail: string;
  activityPreview: string;
  onBack: () => void;
  customLabel: string;
  onChangeLabel: (value: string) => void;
  customDetail: string;
  onChangeDetail: (value: string) => void;
  customActivity: string;
  onChangeActivity: (value: string) => void;
  recipients: PromptRecipientItem[];
  onSelectRecipient: (id: string) => void;
  onSend: () => void;
  sendLabel: string;
  sendDisabled: boolean;
}) => (
  <MobileScreen
    label="Start something"
    title="Send one clean nudge"
    subtitle="Keep it light. The product will turn it into the next right room."
    onBack={onBack}
    footer={
      <MobileStickyActions>
        <PillButton label={sendLabel} onPress={onSend} disabled={sendDisabled} />
      </MobileStickyActions>
    }
  >
    <MobileHeroCard eyebrow="Prompt" title={title} copy={detail}>
      <View style={styles.previewRow}>
        <MaterialCommunityIcons name="sparkles" size={16} color={nowlyColors.aqua} />
        <Text style={styles.previewText}>{activityPreview}</Text>
      </View>
    </MobileHeroCard>

    <GlassCard className="p-4">
      <View style={styles.sectionStack}>
        <MobileSectionHeader label="Copy" title="Make it yours" />
        <TextInput
          value={customLabel}
          onChangeText={onChangeLabel}
          placeholder="Prompt label"
          placeholderTextColor="rgba(247,251,255,0.4)"
          style={styles.input}
        />
        <TextInput
          value={customDetail}
          onChangeText={onChangeDetail}
          placeholder="Prompt detail"
          placeholderTextColor="rgba(247,251,255,0.4)"
          style={styles.input}
          multiline
        />
        <TextInput
          value={customActivity}
          onChangeText={onChangeActivity}
          placeholder="Activity line"
          placeholderTextColor="rgba(247,251,255,0.4)"
          style={styles.input}
        />
      </View>
    </GlassCard>

    <View style={{ gap: 12 }}>
      <MobileSectionHeader label="Recipients" title="Who should see it?" />
      {recipients.length ? (
        recipients.map((recipient) => (
          <Pressable key={recipient.id} onPress={() => onSelectRecipient(recipient.id)}>
            <GlassCard className="p-4">
              <View style={styles.recipientRow}>
                {recipient.photoUrl ? (
                  <Image source={{ uri: recipient.photoUrl }} style={styles.avatar} resizeMode="cover" />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>{(recipient.name[0] ?? "N").toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.recipientName}>{recipient.name}</Text>
                  <Text style={styles.recipientEyebrow}>{recipient.eyebrow}</Text>
                  <Text style={styles.recipientDetail}>{recipient.detail}</Text>
                </View>
                {recipient.selected ? (
                  <MaterialCommunityIcons name="check-circle" size={24} color={nowlyColors.aqua} />
                ) : (
                  <MaterialCommunityIcons name="circle-outline" size={24} color="rgba(247,251,255,0.32)" />
                )}
              </View>
            </GlassCard>
          </Pressable>
        ))
      ) : (
        <GlassCard className="p-4">
          <Text style={styles.emptyTitle}>No one is lined up yet</Text>
          <Text style={styles.recipientDetail}>Once matches and crew are populated, this screen becomes your fastest opener.</Text>
        </GlassCard>
      )}
    </View>

  </MobileScreen>
);

const styles = StyleSheet.create({
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)" },
  avatarInitial: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_700Bold", fontSize: 18 },
  emptyTitle: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_700Bold", fontSize: 18, marginBottom: 6 },
  input: { minHeight: 54, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 15, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_400Regular", fontSize: 15 },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  previewText: { color: "rgba(139,234,255,0.92)", fontFamily: "SpaceGrotesk_500Medium", fontSize: 13, lineHeight: 18 },
  recipientDetail: { color: "rgba(139,234,255,0.84)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 13, lineHeight: 18 },
  recipientEyebrow: { color: "rgba(247,251,255,0.56)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 12 },
  recipientName: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_700Bold", fontSize: 17 },
  recipientRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  sectionStack: { gap: 12 },
});
