
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { GradientMeshBackground } from "../../components/layout/GradientMeshBackground";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { Section } from "../../components/layout/Section";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { StickyFooter } from "../../components/layout/StickyFooter";
import { AppText } from "../../components/primitives/AppText";
import { Avatar } from "../../components/primitives/Avatar";
import { Chip } from "../../components/primitives/Chip";
import { EmptyState } from "../../components/primitives/EmptyState";
import { ErrorState } from "../../components/primitives/ErrorState";
import { GlassCard } from "../../components/primitives/GlassCard";
import { HeroCard } from "../../components/primitives/HeroCard";
import { Input } from "../../components/primitives/Input";
import { LoadingState } from "../../components/primitives/LoadingState";
import { PillButton } from "../../components/primitives/PillButton";
import { Surface } from "../../components/primitives/Surface";
import { colors, radii, spacing } from "../../theme";
import { useBreakpoint } from "../../hooks/layout/useBreakpoint";
import { MonthCalendar } from "../../features/booking/components/MonthCalendar";
import { TimeSlotGrid } from "../../features/booking/components/TimeSlotGrid";
import { BookingSharedSetup, useBookingScreen } from "./useBookingScreen";

type Props = {
  inviteCode: string | null;
  sharedSetup: BookingSharedSetup;
};

const MetaPill = ({ label }: { label: string }) => (
  <View style={styles.metaPill}>
    <AppText variant="bodySmall">{label}</AppText>
  </View>
);

export const BookingScreen = ({ inviteCode, sharedSetup }: Props) => {
  const screen = useBookingScreen({ inviteCode, sharedSetup });
  const layout = useBreakpoint();

  if (screen.status === "missing") {
    return (
      <GradientMeshBackground>
        <View style={styles.centerState}>
          <EmptyState title="Booking link missing" message="This shared availability link does not include an invite code." />
        </View>
      </GradientMeshBackground>
    );
  }

  if (screen.status === "loading") {
    return (
      <GradientMeshBackground>
        <View style={styles.centerState}>
          <LoadingState title="Loading open times" message="Pulling the host summary, open slots, and group state into place." />
        </View>
      </GradientMeshBackground>
    );
  }

  if (screen.status === "error") {
    return (
      <GradientMeshBackground>
        <View style={styles.centerState}>
          <ErrorState title="Booking link hit a snag" message={screen.errorMessage} actionLabel="Try again" onAction={screen.onRetry} />
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
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: layout.topPadding + spacing[12],
              paddingBottom: screen.isGroup ? 220 : screen.isPreview ? 120 : 200,
              paddingHorizontal: layout.horizontalPadding,
              paddingLeft: layout.horizontalPadding + layout.railOffset,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.inner, { maxWidth: layout.maxContentWidth }]}> 
            <ScreenHeader
              eyebrow={screen.isGroup ? "Group Scheduling" : screen.isPreview ? "Booking Preview" : "Booking Invite"}
              title={screen.isGroup ? "Coordinate the group" : "Find a time to hang"}
              subtitle={screen.isGroup ? "Collaborative timing, still warm and low pressure." : "Pick a date first, then lock the easiest time."}
              onBack={screen.onBack}
            />

            <Section>
              <HeroCard>
                <View style={styles.heroTop}>
                  <Avatar name={screen.host?.name ?? screen.hostInitial} photoUrl={screen.host?.photoUrl} size={68} />
                  <View style={styles.heroCopy}>
                    <AppText variant="bodySmall" color="rgba(139,234,255,0.78)">
                      {screen.host?.name ?? "Nowly friend"}
                    </AppText>
                    <AppText variant="display">{screen.title}</AppText>
                    <AppText variant="body" color={colors.muted}>
                      {screen.description}
                    </AppText>
                  </View>
                </View>

                <View style={styles.heroMetaWrap}>
                  {screen.previewTags.map((tag) => (
                    <MetaPill key={tag} label={tag} />
                  ))}
                  <MetaPill label={screen.locationName} />
                  <MetaPill label={screen.timezoneLabel} />
                </View>
              </HeroCard>
            </Section>

            {screen.hasEmptyState ? (
              <Section>
                <EmptyState title={screen.emptyTitle} message={screen.emptyMessage} />
                <PillButton label={screen.emptyActionLabel} onPress={screen.onEmptyAction} />
              </Section>
            ) : screen.isGroup && screen.group ? (
              <>
                <Section>
                  <GlassCard>
                    <View style={styles.quietStack}>
                      <SectionHeader label="Progress" title={screen.group.progressSummary} />
                      <AppText variant="body" color={colors.muted}>
                        {screen.group.progressHint}
                      </AppText>
                      {screen.group.progressDeadline ? (
                        <AppText variant="bodySmall" color="rgba(139,234,255,0.78)">
                          Deadline: {new Date(screen.group.progressDeadline).toLocaleString()}
                        </AppText>
                      ) : null}
                      <View style={styles.heroMetaWrap}>
                        {screen.group.meta.map((item) => (
                          <MetaPill key={item} label={item} />
                        ))}
                      </View>
                    </View>
                  </GlassCard>
                </Section>

                {screen.group.bestFits.length ? (
                  <Section>
                    <SectionHeader label="Best Fits" title="Where the crew lines up fastest" />
                    <GlassCard>
                      <View style={styles.cardStack}>
                        {screen.group.bestFits.map((slot) => (
                          <Pressable key={slot.id} onPress={slot.onPress} style={({ pressed }) => [styles.listCard, slot.selected ? styles.listCardSelected : null, pressed ? styles.pressed : null]}>
                            <View style={styles.listCardRow}>
                              <View style={styles.listCardCopy}>
                                <AppText variant="eyebrow" color="rgba(139,234,255,0.78)">
                                  {slot.highlightLabel}
                                </AppText>
                                <AppText variant="h3">{slot.label}</AppText>
                                <AppText variant="bodySmall" color={colors.muted}>
                                  {slot.counts}
                                </AppText>
                              </View>
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    </GlassCard>
                  </Section>
                ) : null}

                <Section>
                  <SectionHeader label="Slots" title="Compare the live read" />
                  <GlassCard>
                    <View style={styles.cardStack}>
                      {screen.group.slots.map((slot) => (
                        <Pressable key={slot.id} onPress={slot.onPress} style={({ pressed }) => [styles.listCard, slot.selected ? styles.listCardSelected : null, slot.final ? styles.listCardFinal : null, pressed ? styles.pressed : null]}>
                          <View style={styles.listCardRow}>
                            <View style={styles.listCardCopy}>
                              <AppText variant="h3">{slot.label}</AppText>
                              <AppText variant="bodySmall" color={colors.muted}>
                                {slot.counts}
                              </AppText>
                            </View>
                            <View style={[styles.rankPill, slot.final ? styles.rankPillFinal : null]}>
                              <AppText variant="bodySmall" color={slot.final ? colors.ink : colors.cloud}>
                                {slot.rankLabel}
                              </AppText>
                            </View>
                          </View>
                          {slot.voters.length ? (
                            <View style={styles.avatarStack}>
                              {slot.voters.map((vote) => (
                                <Avatar key={vote.id} name={vote.name} photoUrl={vote.photoUrl} size={28} style={{ borderColor: vote.color }} />
                              ))}
                            </View>
                          ) : null}
                        </Pressable>
                      ))}
                    </View>
                  </GlassCard>
                </Section>

                {screen.group.selectedSlot ? (
                  <Section>
                    <SectionHeader label="Selected Slot" title={screen.group.selectedSlot.label} />
                    <GlassCard>
                      <View style={styles.quietStack}>
                        <AppText variant="bodySmall" color={colors.muted}>
                          {screen.group.selectedSlot.counts}
                        </AppText>

                        {screen.group.selectedSlot.canEdit ? (
                          <View style={styles.optionWrap}>
                            {screen.group.selectedSlot.voteOptions.map((option) => (
                              <Chip
                                key={option.key}
                                label={option.label}
                                selected={screen.group.selectedSlot?.currentVote === option.key}
                                onPress={() => screen.group?.selectedSlot?.onChangeVote(option.key)}
                              />
                            ))}
                          </View>
                        ) : (
                          <AppText variant="body" color={colors.muted}>
                            This poll is locked for edits now.
                          </AppText>
                        )}

                        {screen.group.selectedSlot.anonymityHint ? (
                          <AppText variant="bodySmall" color={colors.muted}>
                            {screen.group.selectedSlot.anonymityHint}
                          </AppText>
                        ) : (
                          <View style={styles.cardStack}>
                            {screen.group.selectedSlot.voters.map((vote) => (
                              <Surface key={vote.id}>
                                <View style={styles.voterRow}>
                                  <View style={styles.voterCopy}>
                                    <Avatar name={vote.name} photoUrl={vote.photoUrl} size={34} style={{ borderColor: vote.color }} />
                                    <AppText variant="body" style={{ color: vote.color }}>
                                      {vote.name}
                                    </AppText>
                                  </View>
                                  <AppText variant="bodySmall" color={colors.muted}>
                                    {vote.status}
                                  </AppText>
                                </View>
                              </Surface>
                            ))}
                          </View>
                        )}

                        {screen.group.selectedSlot.canFinalize ? (
                          <PillButton
                            label={screen.group.selectedSlot.finalizeLabel}
                            onPress={screen.group.selectedSlot.onFinalize}
                            loading={screen.group.selectedSlot.finalizing}
                          />
                        ) : null}

                        {screen.group.finalHangoutId && screen.group.openProposal ? (
                          <PillButton label="Open confirmed hangout" variant="secondary" onPress={screen.group.openProposal} />
                        ) : null}
                      </View>
                    </GlassCard>
                  </Section>
                ) : null}

                <Section>
                  <SectionHeader
                    label="Thread"
                    title="Scheduling notes"
                    right={
                      screen.group.canLock ? (
                        <PillButton label={screen.group.locking ? "Locking..." : "Lock poll"} variant="secondary" onPress={screen.group.onLock} />
                      ) : null
                    }
                  />
                  <GlassCard>
                    <View style={styles.cardStack}>
                      {screen.group.messages.map((message) => (
                        <Surface key={message.id} style={message.system ? styles.systemMessage : undefined}>
                          <View style={styles.messageRow}>
                            <Avatar name={message.senderName} photoUrl={message.photoUrl} size={34} />
                            <View style={styles.messageCopy}>
                              <View style={styles.messageMeta}>
                                <AppText variant="body" style={message.color ? { color: message.color } : undefined}>
                                  {message.senderName}
                                </AppText>
                                <AppText variant="bodySmall" color={colors.muted}>
                                  {message.time}
                                </AppText>
                              </View>
                              <AppText variant="body" color={message.system ? colors.cloud : colors.muted}>
                                {message.text}
                              </AppText>
                            </View>
                          </View>
                        </Surface>
                      ))}
                      <Input
                        icon="message-text-outline"
                        placeholder={screen.group.messagePlaceholder}
                        value={screen.group.messageText}
                        onChangeText={screen.group.onChangeMessageText}
                      />
                      <PillButton label={screen.group.sendingMessage ? "Sending..." : "Send note"} variant="secondary" onPress={screen.group.onSendMessage} disabled={screen.group.sendingMessage || !screen.group.messageText.trim()} />
                    </View>
                  </GlassCard>
                </Section>
              </>
            ) : (
              <>
                <Section>
                  <SectionHeader label="Calendar" title="Choose a day" />
                  <GlassCard>
                    <MonthCalendar
                      monthLabel={screen.oneOnOne.monthLabel}
                      weekdayLabels={screen.oneOnOne.weekdayLabels}
                      cells={screen.oneOnOne.calendarCells}
                      onPrevMonth={screen.oneOnOne.onPrevMonth}
                      onNextMonth={screen.oneOnOne.onNextMonth}
                      disablePrev={screen.oneOnOne.disablePrevMonth}
                      disableNext={screen.oneOnOne.disableNextMonth}
                    />
                    <Surface>
                      <View style={styles.quietStack}>
                        <AppText variant="h3">{screen.oneOnOne.selectedDayLabel}</AppText>
                        <AppText variant="bodySmall" color={colors.muted}>
                          {screen.oneOnOne.selectedDayHint}
                        </AppText>
                      </View>
                    </Surface>
                  </GlassCard>
                </Section>

                <Section>
                  <SectionHeader label="Times" title="Open slots" />
                  <GlassCard>
                    {screen.oneOnOne.slotItems.length ? (
                      <TimeSlotGrid items={screen.oneOnOne.slotItems} fullWidth={layout.isPhone} />
                    ) : (
                      <Surface>
                        <AppText variant="body" color={colors.muted}>
                          No live times are open on this date yet. Try another day.
                        </AppText>
                      </Surface>
                    )}

                    <Surface>
                      <View style={styles.quietStack}>
                        <AppText variant="h3">{screen.oneOnOne.slotSummary}</AppText>
                        <AppText variant="bodySmall" color={colors.muted}>
                          {screen.oneOnOne.bookingHint}
                        </AppText>
                        <View style={styles.heroMetaWrap}>
                          <MetaPill label={screen.timezoneLabel} />
                          <MetaPill label={screen.oneOnOne.viewerHint} />
                        </View>
                      </View>
                    </Surface>
                  </GlassCard>
                </Section>
              </>
            )}
          </View>
        </ScrollView>

        {!screen.hasEmptyState ? (
          screen.isGroup && screen.group ? (
            <StickyFooter>
              <View style={styles.footerWrap}>
                <AppText variant="bodySmall" color={colors.muted} style={styles.footerHint}>
                  {screen.group.submitSummary}
                </AppText>
                <PillButton label={screen.group.submitLabel} onPress={screen.group.onSubmitAvailability} disabled={screen.group.submitDisabled} />
              </View>
            </StickyFooter>
          ) : !screen.isPreview ? (
            <StickyFooter>
              <View style={styles.footerWrap}>
                <AppText variant="bodySmall" color={colors.muted} style={styles.footerHint}>
                  {screen.oneOnOne.bookingHint}
                </AppText>
                <PillButton label={screen.oneOnOne.primaryLabel} onPress={screen.oneOnOne.onPrimary} disabled={screen.oneOnOne.primaryDisabled} loading={screen.oneOnOne.primaryLoading} />
              </View>
            </StickyFooter>
          ) : null
        ) : null}
      </KeyboardAvoidingView>
    </GradientMeshBackground>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: { alignItems: "center" },
  inner: { width: "100%" },
  centerState: { flex: 1, justifyContent: "center", paddingHorizontal: spacing[24] },
  heroTop: { flexDirection: "row", gap: spacing[16], alignItems: "flex-start" },
  heroCopy: { flex: 1, gap: spacing[8] },
  heroMetaWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing[8] },
  metaPill: {
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
  },
  quietStack: { gap: spacing[8] },
  cardStack: { gap: spacing[12] },
  listCard: {
    borderRadius: radii.lg,
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: spacing[16],
    gap: spacing[10],
  },
  listCardSelected: { borderWidth: 1, borderColor: colors.borderStrong },
  listCardFinal: { backgroundColor: "rgba(139,234,255,0.1)" },
  listCardRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing[12] },
  listCardCopy: { flex: 1, gap: spacing[4] },
  rankPill: {
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
  },
  rankPillFinal: { backgroundColor: colors.aqua },
  avatarStack: { flexDirection: "row", gap: spacing[8] },
  optionWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing[8] },
  voterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing[12] },
  voterCopy: { flexDirection: "row", alignItems: "center", gap: spacing[10], flex: 1 },
  messageRow: { flexDirection: "row", gap: spacing[12], alignItems: "flex-start" },
  messageCopy: { flex: 1, gap: spacing[6] },
  messageMeta: { flexDirection: "row", justifyContent: "space-between", gap: spacing[8] },
  systemMessage: { backgroundColor: "rgba(139,234,255,0.06)" },
  footerWrap: { gap: spacing[8] },
  footerHint: { textAlign: "center" },
  pressed: { opacity: 0.94, transform: [{ scale: 0.99 }] },
});
