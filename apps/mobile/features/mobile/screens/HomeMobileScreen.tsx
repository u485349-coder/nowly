import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassCard } from "../../../components/ui/GlassCard";
import { PillButton } from "../../../components/ui/PillButton";
import { nowlyColors } from "../../../constants/theme";
import { MobileHeroCard } from "../components/MobileHeroCard";
import { MobileScreen } from "../components/MobileScreen";
import { MobileSectionHeader } from "../components/MobileSectionHeader";

type WarmPerson = {
  id: string;
  name: string;
  photoUrl?: string | null;
};

type RadarRow = {
  id: string;
  name: string;
  line: string;
  detail: string;
  action: string;
  onPress: () => void;
};

type PromptAction = {
  key: string;
  label: string;
  onPress: () => void;
};

type RecapCard = {
  title: string;
  detail: string;
  onPress: () => void;
};

export const HomeMobileScreen = ({
  heroEyebrow,
  heroTitle,
  heroCopy,
  heroStatus,
  warmPeople,
  onPrimaryAction,
  onSecondaryAction,
  primaryActionLabel,
  secondaryActionLabel,
  prompts,
  radarRows,
  recap,
}: {
  heroEyebrow: string;
  heroTitle: string;
  heroCopy: string;
  heroStatus?: string;
  warmPeople: WarmPerson[];
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  prompts: PromptAction[];
  radarRows: RadarRow[];
  recap?: RecapCard | null;
}) => (
  <MobileScreen
    label="Live radar"
    title="Who can you catch right now?"
    subtitle="One signal should make the next move obvious."
  >
    <MobileHeroCard eyebrow={heroEyebrow} title={heroTitle} copy={heroCopy} meta={heroStatus ? (
      <View style={styles.heroMetaRow}>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{heroStatus}</Text>
        </View>
        {warmPeople.length ? (
          <View style={styles.clusterRow}>
            {warmPeople.slice(0, 4).map((person, index) => (
              <View key={person.id} style={[styles.clusterAvatarWrap, index > 0 ? styles.clusterAvatarShift : null]}>
                {person.photoUrl ? (
                  <Image source={{ uri: person.photoUrl }} style={styles.clusterAvatar} resizeMode="cover" />
                ) : (
                  <View style={styles.clusterAvatarFallback}>
                    <Text style={styles.clusterAvatarInitial}>{(person.name[0] ?? "N").toUpperCase()}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : null}
      </View>
    ) : undefined}>
      <View style={styles.heroActions}>
        <PillButton label={primaryActionLabel} onPress={onPrimaryAction} />
        <PillButton label={secondaryActionLabel} variant="secondary" onPress={onSecondaryAction} />
      </View>
    </MobileHeroCard>

    <View style={styles.sectionGap}>
      <MobileSectionHeader label="Start something" title="Low-pressure openers" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptRail}>
        {prompts.map((prompt) => (
          <Pressable key={prompt.key} onPress={prompt.onPress} style={styles.promptChip}>
            <Text style={styles.promptChipText}>{prompt.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>

    <View style={styles.sectionGap}>
      <MobileSectionHeader label="Radar" title="People and timing that feel warm" />
      <GlassCard className="p-4">
        <View style={styles.radarStack}>
          {radarRows.map((row) => (
            <Pressable key={row.id} onPress={row.onPress} style={styles.radarRow}>
              <View style={styles.radarCopy}>
                <Text style={styles.radarName}>{row.name}</Text>
                <Text style={styles.radarLine}>{row.line}</Text>
                <Text style={styles.radarDetail}>{row.detail}</Text>
              </View>
              <View style={styles.radarAction}>
                <Text style={styles.radarActionText}>{row.action}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </GlassCard>
    </View>

    {recap ? (
      <Pressable onPress={recap.onPress}>
        <GlassCard className="p-4">
          <View style={styles.recapRow}>
            <View style={styles.recapIcon}>
              <MaterialCommunityIcons name="sparkles" size={18} color={nowlyColors.cloud} />
            </View>
            <View style={styles.recapCopy}>
              <Text style={styles.recapTitle}>{recap.title}</Text>
              <Text style={styles.recapDetail}>{recap.detail}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color="rgba(247,251,255,0.64)" />
          </View>
        </GlassCard>
      </Pressable>
    ) : null}
  </MobileScreen>
);

const styles = StyleSheet.create({
  clusterAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  clusterAvatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  clusterAvatarInitial: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 13,
  },
  clusterAvatarShift: {
    marginLeft: -10,
  },
  clusterAvatarWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(4,8,20,0.86)",
  },
  clusterRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroActions: {
    gap: 10,
    marginTop: 4,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 2,
  },
  promptChip: {
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  promptChipText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 14,
  },
  promptRail: {
    gap: 10,
    paddingRight: 6,
  },
  radarAction: {
    minWidth: 74,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,234,255,0.14)",
  },
  radarActionText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 13,
  },
  radarCopy: {
    flex: 1,
    gap: 3,
  },
  radarDetail: {
    color: "rgba(247,251,255,0.54)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  radarLine: {
    color: "rgba(139,234,255,0.9)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  radarName: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
  },
  radarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  radarStack: {
    gap: 2,
  },
  recapCopy: {
    flex: 1,
    gap: 2,
  },
  recapDetail: {
    color: "rgba(247,251,255,0.58)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  recapIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(124,58,237,0.22)",
  },
  recapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  recapTitle: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
  },
  sectionGap: {
    gap: 12,
  },
  statusPill: {
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  statusText: {
    color: "rgba(247,251,255,0.86)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
  },
});
