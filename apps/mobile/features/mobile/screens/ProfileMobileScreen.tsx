import type { ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassCard } from "../../../components/ui/GlassCard";
import { PillButton } from "../../../components/ui/PillButton";
import { SignalChip } from "../../../components/ui/SignalChip";
import { nowlyColors } from "../../../constants/theme";
import { webPressableStyle } from "../../../lib/web-pressable";
import { MobileHeroCard } from "../components/MobileHeroCard";
import { MobileScreen } from "../components/MobileScreen";
import { MobileSectionHeader } from "../components/MobileSectionHeader";

export const ProfileMobileScreen = ({
  name,
  photoUrl,
  subtitle,
  communityTag,
  statusLine,
  onChangePhoto,
  onGoLive,
  onStartHang,
  activeEnergyKey,
  activeEnergyLabel,
  energyFeedback,
  energyOptions,
  onSelectEnergy,
  friendsLiveCount,
  overlapCount,
  momentumTitle,
  momentumDetail,
  rhythmDays,
  onOpenRhythm,
  notificationSection,
  onLogout,
}: {
  name: string;
  photoUrl?: string | null;
  subtitle: string;
  communityTag?: string | null;
  statusLine: string;
  onChangePhoto: () => void;
  onGoLive: () => void;
  onStartHang: () => void;
  activeEnergyKey: string;
  activeEnergyLabel: string;
  energyFeedback: string;
  energyOptions: Array<{ key: string; label: string }>;
  onSelectEnergy: (key: string) => void;
  friendsLiveCount: number;
  overlapCount: number;
  momentumTitle: string;
  momentumDetail: string;
  rhythmDays: Array<{ label: string; active: boolean }>;
  onOpenRhythm: () => void;
  notificationSection: ReactNode;
  onLogout: () => void;
}) => (
  <MobileScreen
    label="You"
    title="Keep your line warm"
    subtitle="Identity, control, and signal tuning all live here."
  >
    <MobileHeroCard eyebrow="Profile signal" title={name} copy={subtitle}>
      <View style={styles.identityRow}>
        <View style={styles.avatarWrap}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.avatarImage} resizeMode="cover" />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial}>{(name[0] ?? "N").toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.identityCopy}>
          {communityTag ? <Text style={styles.identityMeta}>{communityTag}</Text> : null}
          <Text style={styles.identityStatus}>{statusLine}</Text>
          <Pressable
            onPress={onChangePhoto}
            style={({ pressed }) => [styles.inlineLink, webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.98 })]}
          >
            <MaterialCommunityIcons name="camera-outline" size={15} color={nowlyColors.cloud} />
            <Text style={styles.inlineLinkText}>Edit profile</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.actionStack}>
        <PillButton label="Go Live" onPress={onGoLive} />
        <PillButton label="Start Hang" variant="secondary" onPress={onStartHang} />
      </View>
    </MobileHeroCard>

    <GlassCard className="p-4">
      <View style={styles.cardStack}>
        <MobileSectionHeader label="Social energy" title={`${activeEnergyLabel} mode`} />
        <Text style={styles.supportingCopy}>{energyFeedback}</Text>
        <View style={styles.energyRail}>
          {energyOptions.map((option) => (
            <SignalChip
              key={option.key}
              label={option.label}
              active={option.key === activeEnergyKey}
              onPress={() => onSelectEnergy(option.key)}
            />
          ))}
        </View>
      </View>
    </GlassCard>

    <View style={styles.statsGrid}>
      <GlassCard className="p-4 flex-1">
        <Text style={styles.statLabel}>Friends live</Text>
        <Text style={styles.statValue}>{friendsLiveCount}</Text>
        <Text style={styles.supportingCopy}>people nearby right now</Text>
      </GlassCard>
      <GlassCard className="p-4 flex-1">
        <Text style={styles.statLabel}>Overlap</Text>
        <Text style={styles.statValue}>{overlapCount}</Text>
        <Text style={styles.supportingCopy}>good reads ahead</Text>
      </GlassCard>
    </View>

    <GlassCard className="p-4">
      <View style={styles.cardStack}>
        <MobileSectionHeader label="Momentum" title={momentumTitle} />
        <Text style={styles.supportingCopy}>{momentumDetail}</Text>
      </View>
    </GlassCard>

    <Pressable onPress={onOpenRhythm}>
      <GlassCard className="p-4">
        <View style={styles.cardStack}>
          <MobileSectionHeader
            label="Rhythm"
            title="Set your usual hang windows"
            right={<MaterialCommunityIcons name="chevron-right" size={18} color="rgba(247,251,255,0.62)" />}
          />
          <View style={styles.rhythmRail}>
            {rhythmDays.map((day) => (
              <View key={day.label} style={[styles.rhythmDay, day.active ? styles.rhythmDayActive : null]}>
                <Text style={[styles.rhythmDayText, day.active ? styles.rhythmDayTextActive : null]}>{day.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </GlassCard>
    </Pressable>

    <GlassCard className="p-4">
      <View style={styles.cardStack}>
        <MobileSectionHeader label="Notifications" title="Tune what reaches you" />
        {notificationSection}
      </View>
    </GlassCard>

    <Pressable onPress={onLogout}>
      <GlassCard className="p-4">
        <View style={styles.logoutRow}>
          <View style={styles.logoutIcon}>
            <MaterialCommunityIcons name="logout-variant" size={18} color={nowlyColors.cloud} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.logoutTitle}>Log out</Text>
            <Text style={styles.supportingCopy}>Sign out of this account</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={18} color="rgba(247,251,255,0.62)" />
        </View>
      </GlassCard>
    </Pressable>
  </MobileScreen>
);

const styles = StyleSheet.create({
  actionStack: { gap: 10, marginTop: 2 },
  avatarFallback: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)" },
  avatarImage: { width: "100%", height: "100%" },
  avatarInitial: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_700Bold", fontSize: 28 },
  avatarWrap: { width: 74, height: 74, borderRadius: 37, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.08)" },
  cardStack: { gap: 12 },
  energyRail: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  identityCopy: { flex: 1, gap: 6 },
  identityMeta: { color: "rgba(247,251,255,0.56)", fontFamily: "SpaceGrotesk_500Medium", fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase" },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  identityStatus: { color: "rgba(247,251,255,0.8)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 14, lineHeight: 20 },
  inlineLink: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6 },
  inlineLinkText: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_500Medium", fontSize: 13 },
  logoutIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" },
  logoutRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoutTitle: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_700Bold", fontSize: 17 },
  rhythmDay: { minWidth: 38, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  rhythmDayActive: { backgroundColor: "rgba(139,234,255,0.16)", borderColor: "rgba(139,234,255,0.18)" },
  rhythmDayText: { color: "rgba(247,251,255,0.56)", fontFamily: "SpaceGrotesk_500Medium", fontSize: 12 },
  rhythmDayTextActive: { color: nowlyColors.cloud },
  rhythmRail: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statLabel: { color: "rgba(247,251,255,0.52)", fontFamily: "SpaceGrotesk_500Medium", fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase" },
  statValue: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_700Bold", fontSize: 30, lineHeight: 34, marginTop: 2 },
  statsGrid: { flexDirection: "row", gap: 10 },
  supportingCopy: { color: "rgba(247,251,255,0.62)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 13, lineHeight: 20 },
});
