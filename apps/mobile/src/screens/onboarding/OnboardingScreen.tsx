import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GradientMeshBackground } from "../../components/layout/GradientMeshBackground";
import { Section } from "../../components/layout/Section";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { AppText } from "../../components/primitives/AppText";
import { Chip } from "../../components/primitives/Chip";
import { GlassCard } from "../../components/primitives/GlassCard";
import { HeroCard } from "../../components/primitives/HeroCard";
import { Input } from "../../components/primitives/Input";
import { PillButton } from "../../components/primitives/PillButton";
import { useBreakpoint } from "../../hooks/layout/useBreakpoint";
import { colors, radii, spacing } from "../../theme";
import { NOWLY_DESCRIPTION, NOWLY_SLOGAN } from "../../../lib/branding";
import { useOnboardingScreen } from "./useOnboardingScreen";

const iconAsset = require("../../../assets/icon.png");

type Props = {
  bookingInviteCode?: string;
  referralToken?: string;
};

export const OnboardingScreen = ({ bookingInviteCode, referralToken }: Props) => {
  const layout = useBreakpoint();
  const screen = useOnboardingScreen({ bookingInviteCode, referralToken });
  const maxWidth = screen.stage === "profile"
    ? Math.min(layout.maxContentWidth, 860)
    : Math.min(Math.max(layout.maxContentWidth, 640), 760);

  const renderStepBars = () => (
    <View style={styles.stepBarRow}>
      {[1, 2, 3].map((step) => (
        <View
          key={step}
          style={[styles.stepBar, step <= screen.stageIndex ? styles.stepBarActive : null]}
        />
      ))}
    </View>
  );

  const renderBrandHero = () => (
    <HeroCard style={styles.brandHero}>
      <View style={styles.brandRow}>
        <View style={styles.brandIconShell}>
          <Image source={iconAsset} resizeMode="contain" style={styles.brandIcon} />
        </View>
        <View style={styles.brandCopy}>
          <AppText variant="display">Nowly</AppText>
          <AppText variant="h3" color="rgba(247,251,255,0.78)">
            {NOWLY_SLOGAN}
          </AppText>
          <AppText variant="body" color={colors.muted} style={styles.brandDescription}>
            {NOWLY_DESCRIPTION}
          </AppText>
        </View>
      </View>
    </HeroCard>
  );

  const renderSavedSessionCard = () => {
    if (!screen.hasSavedSession) {
      return null;
    }

    return (
      <GlassCard>
        <View style={styles.savedSessionCard}>
          <View style={styles.savedSessionCopy}>
            <AppText variant="h3">Welcome back, {screen.currentUserName}.</AppText>
            <AppText variant="bodySmall" color={colors.muted}>
              You are already signed in on this device. Jump straight in, or switch accounts.
            </AppText>
          </View>
          <View style={styles.savedSessionActions}>
            <PillButton
              label={screen.checkingSavedSession ? "Opening Nowly..." : "Open Nowly"}
              onPress={screen.checkingSavedSession ? undefined : screen.onContinueSavedSession}
              loading={screen.checkingSavedSession}
            />
            <PillButton
              label="Use another account"
              variant="secondary"
              onPress={screen.checkingSavedSession ? undefined : screen.onUseAnotherAccount}
            />
          </View>
        </View>
      </GlassCard>
    );
  };

  const renderAuthStage = () => (
    <GlassCard>
      <View style={styles.stageCard}>
        <View style={styles.stageLead}>
          <AppText variant="eyebrow" color="rgba(139,234,255,0.84)">
            Step 1
          </AppText>
          <AppText variant="h2">Sign in the easy way</AppText>
          <AppText variant="bodySmall" color={colors.muted}>
            Pick phone or email, get a code, and keep your chats, booking links, and live signal tied to one real account.
          </AppText>
        </View>

        <View style={styles.methodRow}>
          <Chip
            label="Phone"
            selected={screen.authMethod === "phone"}
            onPress={() => screen.setAuthMethod("phone")}
          />
          <Chip
            label="Email"
            selected={screen.authMethod === "email"}
            onPress={() => screen.setAuthMethod("email")}
          />
        </View>

        <View style={styles.formField}>
          <AppText variant="label" color="rgba(247,251,255,0.72)">
            {screen.authMethod === "email" ? "Email address" : "Phone number"}
          </AppText>
          <Input
            icon={screen.authMethod === "email" ? "email-outline" : "phone-outline"}
            value={screen.authMethod === "email" ? screen.email : screen.phone}
            onChangeText={screen.authMethod === "email" ? screen.setEmail : screen.setPhone}
            placeholder={screen.authMethod === "email" ? "you@example.com" : "+1 555 555 5555"}
            keyboardType={screen.authMethod === "email" ? "email-address" : "phone-pad"}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <PillButton
          label={screen.isRequestingCode ? "Sending code..." : screen.authMethod === "email" ? "Send code" : "Send OTP"}
          onPress={screen.isRequestingCode ? undefined : screen.onRequestCode}
          loading={screen.isRequestingCode}
        />

        <AppText variant="bodySmall" color={colors.muted}>
          {screen.authMethod === "email"
            ? "We email a one-time code so your social graph and booking flows stay attached to you."
            : "We text a one-time code so private chats and live overlap stay attached to one person."}
        </AppText>
      </View>
    </GlassCard>
  );

  const renderVerificationStage = () => (
    <GlassCard>
      <View style={styles.stageCard}>
        <View style={styles.stageLead}>
          <AppText variant="eyebrow" color="rgba(139,234,255,0.84)">
            Step 2
          </AppText>
          <AppText variant="h2">Verify and keep moving</AppText>
          <AppText variant="bodySmall" color={colors.muted}>
            Drop in the code we sent to your {screen.authMethod === "email" ? "email" : "phone"} and we will pick right back up.
          </AppText>
        </View>

        <View style={styles.formField}>
          <AppText variant="label" color="rgba(247,251,255,0.72)">
            One-time code
          </AppText>
          <Input
            icon="shield-key-outline"
            value={screen.otp}
            onChangeText={screen.setOtp}
            placeholder="111111"
            keyboardType="number-pad"
            maxLength={6}
            style={styles.codeInput}
          />
        </View>

        <View style={styles.devCodeRow}>
          <MaterialCommunityIcons name="information-outline" size={16} color="rgba(139,234,255,0.84)" />
          <AppText variant="bodySmall" color={colors.muted}>
            Dev shortcut: {screen.devCode ?? (screen.authMethod === "email" ? "check your inbox" : "check your SMS")}
          </AppText>
        </View>

        <PillButton
          label={screen.isVerifyingCode ? "Verifying..." : screen.authMethod === "email" ? "Verify email" : "Verify phone"}
          onPress={screen.isVerifyingCode ? undefined : screen.onVerifyCode}
          loading={screen.isVerifyingCode}
        />
      </View>
    </GlassCard>
  );

  const renderProfileStage = () => (
    <>
      <GlassCard>
        <View style={styles.stageCard}>
          <View style={styles.stageLead}>
            <AppText variant="eyebrow" color="rgba(139,234,255,0.84)">
              Step 3
            </AppText>
            <AppText variant="h2">Set yourself up socially</AppText>
            <AppText variant="bodySmall" color={colors.muted}>
              A little identity goes a long way. Make it easy for people to recognize you and know where you usually link.
            </AppText>
          </View>

          <View style={styles.formField}>
            <AppText variant="label" color="rgba(247,251,255,0.72)">
              Name
            </AppText>
            <Input
              icon="account-outline"
              value={screen.name}
              onChangeText={screen.setName}
              placeholder="Your name"
            />
          </View>

          <View style={styles.formField}>
            <AppText variant="label" color="rgba(247,251,255,0.72)">
              City
            </AppText>
            <Input
              icon="map-marker-outline"
              value={screen.city}
              onChangeText={screen.setCity}
              placeholder="City"
            />
          </View>

          <View style={styles.formField}>
            <AppText variant="label" color="rgba(247,251,255,0.72)">
              Campus or neighborhood
            </AppText>
            <Input
              icon="map-search-outline"
              value={screen.communityTag}
              onChangeText={screen.setCommunityTag}
              placeholder="Optional"
            />
          </View>

          <View style={styles.photoCard}>
            <View style={styles.photoRow}>
              <View style={styles.photoShell}>
                {screen.photoUrl ? (
                  <Image source={{ uri: screen.photoUrl }} resizeMode="cover" style={styles.photoImage} />
                ) : (
                  <View style={styles.photoFallback}>
                    <AppText variant="h2">
                      {(screen.name.trim()[0] ?? "N").toUpperCase()}
                    </AppText>
                  </View>
                )}
              </View>
              <View style={styles.photoCopy}>
                <AppText variant="h3">Add a profile photo</AppText>
                <AppText variant="bodySmall" color={colors.muted}>
                  Optional, but it helps your friends find you quickly. We square-crop and downsize it automatically.
                </AppText>
                {screen.photoFileName ? (
                  <AppText variant="bodySmall" color="rgba(139,234,255,0.84)">
                    {screen.photoFileName}
                  </AppText>
                ) : null}
              </View>
            </View>

            <View style={styles.photoActions}>
              <PillButton
                label={screen.photoUrl ? "Change photo" : "Upload photo"}
                variant="secondary"
                onPress={screen.onPickPhoto}
                style={styles.photoPrimaryAction}
              />
              {screen.photoUrl ? (
                <PillButton label="Remove" variant="ghost" onPress={screen.onRemovePhoto} />
              ) : null}
            </View>
          </View>
        </View>
      </GlassCard>

      <Section>
        <SectionHeader label="Optional social setup" title="Connect your world" />
        <GlassCard>
          <View style={styles.optionalCard}>
            <View style={styles.optionalLead}>
              <View style={styles.optionalIcon}>
                <MaterialCommunityIcons name="discord" size={18} color={colors.cloud} />
              </View>
              <View style={styles.optionalCopy}>
                <AppText variant="h3">Link Discord</AppText>
                <AppText variant="bodySmall" color={colors.muted}>
                  Optional and permission-based. It just helps tighten up your real friend graph.
                </AppText>
              </View>
            </View>
            <PillButton
              label={screen.isLoadingDiscord ? "Opening Discord..." : "Link Discord"}
              variant="secondary"
              onPress={screen.isLoadingDiscord ? undefined : screen.onDiscordLink}
              loading={screen.isLoadingDiscord}
            />
          </View>
        </GlassCard>
      </Section>

      <Section>
        <SectionHeader
          label="Invite your people"
          title="Build your crew early"
          right={
            <PillButton
              label={Platform.OS === "web" ? "Invite links" : "Load contacts"}
              variant="secondary"
              onPress={screen.onLoadContacts}
            />
          }
        />
        <GlassCard>
          <View style={styles.optionalCard}>
            <AppText variant="bodySmall" color={colors.muted}>
              {screen.inviteStatus}
            </AppText>
            <View style={styles.contactGrid}>
              {screen.contacts.map((contact) => (
                <View key={contact.id} style={styles.contactCard}>
                  <View style={styles.contactCopy}>
                    <AppText variant="h3">{contact.name}</AppText>
                    <AppText variant="bodySmall" color={colors.muted}>
                      {contact.phone}
                    </AppText>
                  </View>
                  <PillButton
                    label={screen.invitingPhone === contact.phone ? "Preparing..." : "Invite"}
                    variant="secondary"
                    onPress={screen.invitingPhone ? undefined : () => screen.onInvite(contact.phone)}
                    loading={screen.invitingPhone === contact.phone}
                  />
                </View>
              ))}
            </View>
          </View>
        </GlassCard>
      </Section>

      <Section>
        <SectionHeader label="Keep it in your pocket" title="QR handoff" />
        <GlassCard>
          <View style={[styles.qrRow, layout.isDesktop ? styles.qrRowDesktop : null]}>
            <Pressable
              accessibilityRole="button"
              onPress={screen.onOpenQrTarget}
              style={({ pressed }) => [styles.qrPressable, pressed ? styles.qrPressed : null]}
            >
              <View style={styles.qrImageShell}>
                <Image source={{ uri: screen.qrImageUrl }} resizeMode="cover" style={styles.qrImage} />
                <View style={styles.qrCenterBadge}>
                  <Image source={iconAsset} resizeMode="contain" style={styles.qrCenterIcon} />
                </View>
              </View>
            </Pressable>
            <View style={styles.qrCopy}>
              <AppText variant="h3">Open this flow on mobile anytime</AppText>
              <AppText variant="bodySmall" color={colors.muted}>
                Scan once and pick back up instantly on your phone when the moment goes live.
              </AppText>
              <PillButton label="Open handoff link" variant="secondary" onPress={screen.onOpenQrTarget} />
            </View>
          </View>
        </GlassCard>
      </Section>

      <Section>
        <PillButton
          label={screen.isFinishing ? "Finishing..." : "Finish setup"}
          onPress={screen.isFinishing ? undefined : screen.onFinish}
          loading={screen.isFinishing}
        />
      </Section>
    </>
  );

  return (
    <GradientMeshBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: layout.horizontalPadding,
            paddingTop: layout.topPadding + spacing[8],
            paddingBottom: spacing[40],
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.inner, { maxWidth }]}>
          {renderBrandHero()}
          {renderStepBars()}
          {renderSavedSessionCard()}
          {screen.stage === "auth" ? renderAuthStage() : null}
          {screen.stage === "code" ? renderVerificationStage() : null}
          {screen.stage === "profile" ? renderProfileStage() : null}

          {screen.stage !== "profile" ? (
            <Section>
              <SectionHeader label="Keep it close" title="Phone handoff" />
              <GlassCard>
                <View style={[styles.qrRow, layout.isDesktop ? styles.qrRowDesktop : null]}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={screen.onOpenQrTarget}
                    style={({ pressed }) => [styles.qrPressable, pressed ? styles.qrPressed : null]}
                  >
                    <View style={styles.qrImageShell}>
                      <Image source={{ uri: screen.qrImageUrl }} resizeMode="cover" style={styles.qrImage} />
                      <View style={styles.qrCenterBadge}>
                        <Image source={iconAsset} resizeMode="contain" style={styles.qrCenterIcon} />
                      </View>
                    </View>
                  </Pressable>
                  <View style={styles.qrCopy}>
                    <AppText variant="h3">Keep Nowly in your pocket</AppText>
                    <AppText variant="bodySmall" color={colors.muted}>
                      Sign in here, then pick back up instantly on mobile when the moment goes live.
                    </AppText>
                    <View style={styles.benefitList}>
                      <View style={styles.benefitRow}>
                        <MaterialCommunityIcons name="calendar-clock-outline" size={18} color={colors.aqua} />
                        <AppText variant="bodySmall" color={colors.muted}>
                          Book windows and recurring slots
                        </AppText>
                      </View>
                      <View style={styles.benefitRow}>
                        <MaterialCommunityIcons name="chat-processing-outline" size={18} color={colors.aqua} />
                        <AppText variant="bodySmall" color={colors.muted}>
                          Keep private chats and threads warm
                        </AppText>
                      </View>
                      <View style={styles.benefitRow}>
                        <MaterialCommunityIcons name="lightning-bolt-circle" size={18} color={colors.aqua} />
                        <AppText variant="bodySmall" color={colors.muted}>
                          Turn overlap into a real hangout fast
                        </AppText>
                      </View>
                    </View>
                  </View>
                </View>
              </GlassCard>
            </Section>
          ) : null}
        </View>
      </ScrollView>
    </GradientMeshBackground>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
  },
  inner: {
    width: "100%",
  },
  brandHero: {
    marginBottom: spacing[24],
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[20],
  },
  brandIconShell: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  brandIcon: {
    width: 62,
    height: 62,
    borderRadius: 18,
  },
  brandCopy: {
    flex: 1,
    gap: spacing[8],
  },
  brandDescription: {
    maxWidth: 520,
  },
  stepBarRow: {
    flexDirection: "row",
    gap: spacing[8],
    marginBottom: spacing[24],
  },
  stepBar: {
    flex: 1,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  stepBarActive: {
    backgroundColor: colors.aqua,
  },
  savedSessionCard: {
    gap: spacing[16],
  },
  savedSessionCopy: {
    gap: spacing[8],
  },
  savedSessionActions: {
    gap: spacing[12],
  },
  stageCard: {
    gap: spacing[20],
  },
  stageLead: {
    gap: spacing[8],
  },
  methodRow: {
    flexDirection: "row",
    gap: spacing[8],
  },
  formField: {
    gap: spacing[8],
  },
  codeInput: {
    letterSpacing: 6,
  },
  devCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  photoCard: {
    gap: spacing[16],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: spacing[16],
  },
  photoRow: {
    flexDirection: "row",
    gap: spacing[16],
    alignItems: "center",
  },
  photoShell: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  photoCopy: {
    flex: 1,
    gap: spacing[6],
  },
  photoActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[12],
    alignItems: "center",
  },
  photoPrimaryAction: {
    flexGrow: 0,
  },
  optionalCard: {
    gap: spacing[16],
  },
  optionalLead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[14],
  },
  optionalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  optionalCopy: {
    flex: 1,
    gap: spacing[6],
  },
  contactGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[12],
  },
  contactCard: {
    flexGrow: 1,
    flexBasis: 220,
    gap: spacing[14],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: spacing[16],
  },
  contactCopy: {
    gap: spacing[6],
  },
  qrRow: {
    gap: spacing[20],
    alignItems: "center",
  },
  qrRowDesktop: {
    flexDirection: "row",
    alignItems: "center",
  },
  qrPressable: {
    alignSelf: "center",
  },
  qrPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  qrImageShell: {
    width: 180,
    height: 180,
    borderRadius: 24,
    overflow: "hidden",
    padding: spacing[12],
    backgroundColor: colors.cloud,
  },
  qrImage: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
  qrCenterBadge: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -22,
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cloud,
    borderWidth: 1,
    borderColor: "rgba(4,8,20,0.08)",
  },
  qrCenterIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  qrCopy: {
    flex: 1,
    gap: spacing[12],
    alignSelf: "stretch",
  },
  benefitList: {
    gap: spacing[10],
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[10],
  },
});
