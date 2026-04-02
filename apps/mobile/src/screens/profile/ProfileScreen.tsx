import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GradientMeshBackground } from "../../components/layout/GradientMeshBackground";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { Section } from "../../components/layout/Section";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { AppText } from "../../components/primitives/AppText";
import { Avatar } from "../../components/primitives/Avatar";
import { Chip } from "../../components/primitives/Chip";
import { GlassCard } from "../../components/primitives/GlassCard";
import { HeroCard } from "../../components/primitives/HeroCard";
import { IconButton } from "../../components/primitives/IconButton";
import { PillButton } from "../../components/primitives/PillButton";
import { useBreakpoint } from "../../hooks/layout/useBreakpoint";
import { colors, radii, spacing } from "../../theme";
import { EnergySlider } from "../../features/profile/components/EnergySlider";
import { ProfileNotificationSettings } from "../../features/profile/components/ProfileNotificationSettings";
import { useProfileScreen } from "./useProfileScreen";

export const ProfileScreen = () => {
  const layout = useBreakpoint();
  const screen = useProfileScreen();

  return (
    <GradientMeshBackground>
      <ScreenContainer includeBottomNavInset contentStyle={{ paddingBottom: 148 }}>
        <ScreenHeader
          eyebrow="You"
          title="Your action center"
          subtitle="Keep your social signal warm, clear, and easy to act on."
        />

        <Section>
          <HeroCard>
            <View style={[styles.heroRow, layout.isDesktop ? styles.heroRowDesktop : null]}>
              <View style={styles.heroIdentity}>
                <Pressable
                  accessibilityRole="button"
                  onPress={screen.onChangePhoto}
                  style={({ pressed }) => [styles.avatarPressable, pressed ? styles.heroPressed : null]}
                >
                  <Avatar name={screen.name} photoUrl={screen.photoUrl} size={92} />
                  <View style={styles.cameraBadge}>
                    <MaterialCommunityIcons name="camera-outline" size={14} color={colors.ink} />
                  </View>
                </Pressable>

                <View style={styles.heroCopy}>
                  <View style={styles.heroHeading}>
                    <AppText variant="h1">{screen.name}</AppText>
                    <AppText variant="body" color={colors.muted}>
                      {screen.statusLine}
                    </AppText>
                  </View>

                  <View style={styles.chipRow}>
                    <Chip label={screen.liveStateLabel} selected />
                    {screen.communityLabel ? <Chip label={screen.communityLabel} /> : null}
                    {screen.discordLabel ? <Chip label={screen.discordLabel} /> : null}
                  </View>

                  <View style={styles.photoActions}>
                    <PillButton
                      label={screen.photoAction === "change" ? "Updating photo..." : "Change photo"}
                      variant="secondary"
                      onPress={screen.photoAction ? undefined : screen.onChangePhoto}
                      loading={screen.photoAction === "change"}
                      style={styles.photoButton}
                    />
                    {screen.canRemovePhoto ? (
                      <PillButton
                        label={screen.photoAction === "remove" ? "Removing..." : "Remove"}
                        variant="ghost"
                        onPress={screen.photoAction ? undefined : screen.onRemovePhoto}
                        loading={screen.photoAction === "remove"}
                      />
                    ) : null}
                  </View>
                </View>
              </View>

              <View style={styles.heroStatus}>
                <View style={styles.statusCard}>
                  <AppText variant="eyebrow" color="rgba(139,234,255,0.84)">
                    Live status
                  </AppText>
                  <AppText variant="h3">{screen.liveStateLabel}</AppText>
                  <AppText variant="bodySmall" color={colors.muted}>
                    {screen.overlapCount > 0
                      ? `${screen.overlapCount} overlap window${screen.overlapCount === 1 ? "" : "s"} already ahead.`
                      : "No overlap yet. A live signal helps the next move feel easy."}
                  </AppText>
                </View>

                <View style={styles.heroMetaRow}>
                  <View style={styles.heroMetaCard}>
                    <AppText variant="eyebrow" color="rgba(247,251,255,0.48)">
                      Crew reach
                    </AppText>
                    <AppText variant="h3">{screen.crewReach}</AppText>
                    <AppText variant="bodySmall" color={colors.muted}>
                      close people likely to notice
                    </AppText>
                  </View>
                  <View style={styles.heroMetaCard}>
                    <AppText variant="eyebrow" color="rgba(247,251,255,0.48)">
                      Streak
                    </AppText>
                    <AppText variant="h3">{screen.streakCount}</AppText>
                    <AppText variant="bodySmall" color={colors.muted}>
                      recent hangs held together
                    </AppText>
                  </View>
                </View>
              </View>
            </View>
          </HeroCard>
        </Section>

        <Section>
          <View style={[styles.actionRow, layout.isDesktop ? styles.actionRowDesktop : null]}>
            <PillButton
              label="Go Live"
              onPress={screen.onGoLive}
              leftSlot={<MaterialCommunityIcons name="lightning-bolt" size={18} color={colors.ink} />}
              style={styles.actionButton}
            />
            <PillButton
              label="Start Hang"
              variant="secondary"
              onPress={screen.onStartHang}
              leftSlot={<MaterialCommunityIcons name="message-plus-outline" size={18} color={colors.cloud} />}
              style={styles.actionButton}
            />
          </View>
        </Section>

        <Section>
          <SectionHeader label="Status" title="Tune how you show up" />
          <GlassCard>
            <View style={styles.cardStack}>
              <View style={styles.statusIntro}>
                <View style={styles.statusIntroCopy}>
                  <AppText variant="h3">Energy and visibility</AppText>
                  <AppText variant="bodySmall" color={colors.muted}>
                    This is the soft social dial. Keep it accurate so the app feels easy instead of noisy.
                  </AppText>
                </View>
                <IconButton icon="lightning-bolt-outline" onPress={screen.onGoLive} tone="accent" />
              </View>

              <EnergySlider
                options={screen.energyOptions}
                selectedKey={screen.energyKey}
                onChange={screen.onChangeEnergy}
              />

              <View style={[styles.metricsRow, layout.isDesktop ? styles.metricsRowDesktop : null]}>
                <View style={styles.metricCard}>
                  <AppText variant="eyebrow" color="rgba(247,251,255,0.48)">
                    Overlaps ahead
                  </AppText>
                  <AppText variant="h3">{screen.overlapCount}</AppText>
                  <AppText variant="bodySmall" color={colors.muted}>
                    windows already lined up
                  </AppText>
                </View>
                <View style={styles.metricCard}>
                  <AppText variant="eyebrow" color="rgba(247,251,255,0.48)">
                    Reach right now
                  </AppText>
                  <AppText variant="h3">{screen.crewReach}</AppText>
                  <AppText variant="bodySmall" color={colors.muted}>
                    people likely to catch the vibe
                  </AppText>
                </View>
              </View>
            </View>
          </GlassCard>
        </Section>

        <Section>
          <SectionHeader label="Pulse" title="Rhythm and momentum" />
          <View style={[styles.pulseGrid, layout.isDesktop ? styles.pulseGridDesktop : null]}>
            <GlassCard style={styles.pulseCard}>
              <View style={styles.cardStack}>
                <View style={styles.sectionLead}>
                  <AppText variant="h3">{screen.rhythmTitle}</AppText>
                  <AppText variant="bodySmall" color={colors.muted}>
                    {screen.rhythmSubtitle}
                  </AppText>
                </View>

                <View style={styles.dayRow}>
                  {screen.rhythmDays.map((day) => (
                    <View
                      key={day.label}
                      style={[styles.dayPill, day.active ? styles.dayPillActive : null]}
                    >
                      <AppText
                        variant="label"
                        color={day.active ? colors.ink : "rgba(247,251,255,0.62)"}
                      >
                        {day.label}
                      </AppText>
                    </View>
                  ))}
                </View>

                <PillButton
                  label="Adjust availability"
                  variant="secondary"
                  onPress={screen.onOpenRhythm}
                />
              </View>
            </GlassCard>

            <GlassCard style={styles.pulseCard}>
              <View style={styles.cardStack}>
                <View style={styles.sectionLead}>
                  <AppText variant="h3">{screen.momentumTitle}</AppText>
                  <AppText variant="bodySmall" color={colors.muted}>
                    {screen.momentumCopy}
                  </AppText>
                </View>

                <View style={styles.momentumRow}>
                  <View style={styles.momentumChip}>
                    <AppText variant="label" color={colors.cloud}>
                      {screen.streakCount} streak
                    </AppText>
                  </View>
                  <View style={styles.momentumChip}>
                    <AppText variant="label" color={colors.cloud}>
                      {screen.inviteCount} invites sent
                    </AppText>
                  </View>
                  <View style={styles.momentumChip}>
                    <AppText variant="label" color={colors.cloud}>
                      {screen.overlapCount} overlaps
                    </AppText>
                  </View>
                </View>
              </View>
            </GlassCard>
          </View>
        </Section>

        <Section>
          <SectionHeader label="Settings" title="Notifications that stay human" />
          <ProfileNotificationSettings
            intensityOptions={screen.notificationIntensityOptions}
            toggles={screen.notificationToggles}
          />
        </Section>

        <Section>
          <Pressable
            accessibilityRole="button"
            onPress={screen.onLogout}
            style={({ pressed }) => [styles.logoutCard, pressed ? styles.heroPressed : null]}
          >
            <View style={styles.logoutIcon}>
              <MaterialCommunityIcons name="logout-variant" size={18} color={colors.cloud} />
            </View>
            <View style={styles.logoutCopy}>
              <AppText variant="body" style={styles.logoutTitle}>
                Log out
              </AppText>
              <AppText variant="bodySmall" color={colors.muted}>
                Sign out of this account and head back to onboarding.
              </AppText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(247,251,255,0.62)" />
          </Pressable>
        </Section>
      </ScreenContainer>
    </GradientMeshBackground>
  );
};

const styles = StyleSheet.create({
  heroRow: {
    gap: spacing[20],
  },
  heroRowDesktop: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  heroIdentity: {
    flex: 1.15,
    gap: spacing[20],
  },
  avatarPressable: {
    alignSelf: "flex-start",
  },
  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.aqua,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  heroCopy: {
    gap: spacing[16],
  },
  heroHeading: {
    gap: spacing[8],
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
  },
  photoActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing[12],
  },
  photoButton: {
    flexGrow: 0,
  },
  heroStatus: {
    flex: 1,
    gap: spacing[12],
  },
  statusCard: {
    gap: spacing[8],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: spacing[16],
  },
  heroMetaRow: {
    flexDirection: "row",
    gap: spacing[12],
  },
  heroMetaCard: {
    flex: 1,
    gap: spacing[8],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: spacing[16],
  },
  actionRow: {
    gap: spacing[12],
  },
  actionRowDesktop: {
    flexDirection: "row",
  },
  actionButton: {
    flex: 1,
  },
  cardStack: {
    gap: spacing[20],
  },
  statusIntro: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing[16],
  },
  statusIntroCopy: {
    flex: 1,
    gap: spacing[8],
  },
  metricsRow: {
    gap: spacing[12],
  },
  metricsRowDesktop: {
    flexDirection: "row",
  },
  metricCard: {
    flex: 1,
    gap: spacing[8],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: spacing[16],
  },
  pulseGrid: {
    gap: spacing[12],
  },
  pulseGridDesktop: {
    flexDirection: "row",
  },
  pulseCard: {
    flex: 1,
  },
  sectionLead: {
    gap: spacing[8],
  },
  dayRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
  },
  dayPill: {
    minWidth: 46,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    paddingHorizontal: spacing[12],
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayPillActive: {
    backgroundColor: colors.aqua,
    borderColor: "rgba(255,255,255,0.18)",
  },
  momentumRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
  },
  momentumChip: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    paddingHorizontal: spacing[16],
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[16],
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[18],
  },
  logoutIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(246,163,180,0.18)",
  },
  logoutCopy: {
    flex: 1,
    gap: spacing[4],
  },
  logoutTitle: {
    fontFamily: "SpaceGrotesk_700Bold",
  },
  heroPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
});
