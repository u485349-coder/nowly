
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { GradientMeshBackground } from "../../components/layout/GradientMeshBackground";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { Section } from "../../components/layout/Section";
import { SectionHeader } from "../../components/layout/SectionHeader";
import { StickyFooter } from "../../components/layout/StickyFooter";
import { AppText } from "../../components/primitives/AppText";
import { Chip } from "../../components/primitives/Chip";
import { ErrorState } from "../../components/primitives/ErrorState";
import { GlassCard } from "../../components/primitives/GlassCard";
import { HeroCard } from "../../components/primitives/HeroCard";
import { Input } from "../../components/primitives/Input";
import { LoadingState } from "../../components/primitives/LoadingState";
import { PillButton } from "../../components/primitives/PillButton";
import { Surface } from "../../components/primitives/Surface";
import { TextArea } from "../../components/primitives/TextArea";
import { colors, radii, spacing } from "../../theme";
import { useBreakpoint } from "../../hooks/layout/useBreakpoint";
import { TimeRangeEditorRow } from "../../features/availability/components/TimeRangeEditorRow";
import { FormatOptionCard } from "../../features/booking/components/FormatOptionCard";
import { MetricStepper } from "../../features/booking/components/MetricStepper";
import { MonthCalendar } from "../../features/booking/components/MonthCalendar";
import { useAvailabilityPreferencesScreen } from "./useAvailabilityPreferencesScreen";

type OptionItem = {
  key: string;
  label: string;
  value: string;
};

type DraftItem = {
  id: string;
  title: string;
  timeLine: string;
  moodSummary: string;
  label: string;
  vibe: string | null;
  hangoutIntent: string | null;
  startInput: string;
  endInput: string;
  onChangeLabel: (value: string) => void;
  onChangeStart: (value: string) => void;
  onChangeEnd: (value: string) => void;
  onChangeVibe: (value: string | null) => void;
  onChangeIntent: (value: string | null) => void;
  onRemove: () => void;
  onChangeDayOfMonth?: (value: number) => void;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const OptionPicker = ({
  title,
  selected,
  options,
  onSelect,
}: {
  title: string;
  selected: string | null;
  options: OptionItem[];
  onSelect: (value: string | null) => void;
}) => {
  return (
    <View style={styles.optionGroup}>
      <AppText variant="bodySmall" color={colors.muted}>
        {title}
      </AppText>
      <View style={styles.optionWrap}>
        <Chip label="None" selected={!selected} onPress={() => onSelect(null)} />
        {options.map((option) => (
          <Chip
            key={option.key}
            label={option.label}
            selected={selected === option.value}
            onPress={() => onSelect(option.value)}
          />
        ))}
      </View>
    </View>
  );
};

const DraftEditorCard = ({
  draft,
  vibeOptions,
  intentOptions,
  monthly = false,
}: {
  draft: DraftItem;
  vibeOptions: OptionItem[];
  intentOptions: OptionItem[];
  monthly?: boolean;
}) => {
  return (
    <Surface style={styles.draftCard}>
      <View style={styles.draftHeader}>
        <View style={styles.draftCopy}>
          <AppText variant="h3">{draft.title}</AppText>
          <AppText variant="bodySmall" color={colors.muted}>
            {draft.timeLine} · {draft.moodSummary}
          </AppText>
        </View>
        <PillButton label="Remove" variant="ghost" onPress={draft.onRemove} />
      </View>

      {monthly && draft.onChangeDayOfMonth ? (
        <Input
          icon="calendar-month-outline"
          placeholder="Day of month"
          value={draft.title.match(/(\d+)/)?.[0] ?? "15"}
          keyboardType="number-pad"
          onChangeText={(value) => {
            const parsed = Number.parseInt(value, 10);
            if (Number.isFinite(parsed)) {
              draft.onChangeDayOfMonth?.(Math.max(1, Math.min(31, parsed)));
            }
          }}
        />
      ) : null}

      <Input
        icon="tag-outline"
        placeholder="Optional label like after class or post-work"
        value={draft.label}
        onChangeText={draft.onChangeLabel}
      />

      <TimeRangeEditorRow
        startValue={draft.startInput}
        endValue={draft.endInput}
        onChangeStart={draft.onChangeStart}
        onChangeEnd={draft.onChangeEnd}
        onRemove={draft.onRemove}
      />

      <OptionPicker title="Vibe" selected={draft.vibe} options={vibeOptions} onSelect={draft.onChangeVibe} />
      <OptionPicker
        title="Intent"
        selected={draft.hangoutIntent}
        options={intentOptions}
        onSelect={draft.onChangeIntent}
      />
    </Surface>
  );
};

const DateWindowCard = ({
  startInput,
  endInput,
  onChangeStart,
  onChangeEnd,
  onRemove,
}: {
  startInput: string;
  endInput: string;
  onChangeStart: (value: string) => void;
  onChangeEnd: (value: string) => void;
  onRemove: () => void;
}) => {
  return (
    <Surface style={styles.draftCard}>
      <View style={styles.draftHeader}>
        <View style={styles.draftCopy}>
          <AppText variant="h3">One-off window</AppText>
          <AppText variant="bodySmall" color={colors.muted}>
            This date only. Great for special nights or one-time openings.
          </AppText>
        </View>
        <PillButton label="Remove" variant="ghost" onPress={onRemove} />
      </View>
      <TimeRangeEditorRow
        startValue={startInput}
        endValue={endInput}
        onChangeStart={onChangeStart}
        onChangeEnd={onChangeEnd}
        onRemove={onRemove}
      />
    </Surface>
  );
};

export const AvailabilityPreferencesScreen = () => {
  const screen = useAvailabilityPreferencesScreen();
  const layout = useBreakpoint();

  if (screen.status === "error") {
    return (
      <GradientMeshBackground>
        <View style={styles.centerState}>
          <ErrorState title="Hang rhythm needs your session" message="Sign back in and your availability setup will be ready again." />
        </View>
      </GradientMeshBackground>
    );
  }

  if (screen.isLoading) {
    return (
      <GradientMeshBackground>
        <View style={styles.centerState}>
          <LoadingState title="Loading hang rhythm" message="Pulling your recurring windows and booking setup into place." />
        </View>
      </GradientMeshBackground>
    );
  }

  if (screen.isError) {
    return (
      <GradientMeshBackground>
        <View style={styles.centerState}>
          <ErrorState title="Hang rhythm hit a snag" message="We couldn't load your availability setup right now." actionLabel="Try again" onAction={screen.onRetry} />
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
              paddingBottom: 220,
              paddingHorizontal: layout.horizontalPadding,
              paddingLeft: layout.horizontalPadding + layout.railOffset,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.inner, { maxWidth: layout.maxContentWidth }]}> 
            <ScreenHeader
              eyebrow="Hang Rhythm"
              title={screen.title}
              subtitle={screen.subtitle}
              onBack={screen.onBack}
            />

            <Section>
              <HeroCard>
                <View style={styles.heroCopy}>
                  <AppText variant="display">{screen.heroTitle}</AppText>
                  <AppText variant="body" color={colors.muted}>
                    {screen.heroCopy}
                  </AppText>
                </View>

                <View style={styles.heroMetaWrap}>
                  {screen.heroMeta.map((item) => (
                    <View key={item} style={styles.heroMetaPill}>
                      <AppText variant="bodySmall">{item}</AppText>
                    </View>
                  ))}
                </View>

                <View style={styles.heroActions}>
                  <PillButton label="Preview link" variant="secondary" onPress={screen.onPreview} style={styles.heroAction} />
                  <PillButton label="Copy link" variant="secondary" onPress={screen.onCopyLink} disabled={!screen.canShareLink} style={styles.heroAction} />
                  <PillButton label="Share" variant="ghost" onPress={screen.onShareLink} disabled={!screen.canShareLink} style={styles.heroAction} />
                </View>

                {screen.feedback ? (
                  <GlassCard style={styles.feedbackCard}>
                    <View style={styles.feedbackCopy}>
                      <AppText variant="h3">{screen.feedback.title}</AppText>
                      <AppText variant="bodySmall" color={colors.muted}>
                        {screen.feedback.detail}
                      </AppText>
                    </View>
                  </GlassCard>
                ) : null}
              </HeroCard>
            </Section>

            <Section>
              <SectionHeader label="Recurring" title="Weekly windows" />
              <GlassCard>
                <View style={styles.optionWrap}>
                  {screen.weekdayRows.map((row) => (
                    <Chip
                      key={row.key}
                      label={row.count ? `${row.label} · ${row.count}` : row.label}
                      selected={row.active}
                      onPress={row.onToggle}
                    />
                  ))}
                </View>

                <View style={styles.cardStack}>
                  {screen.weekdayRows.flatMap((row) =>
                    row.drafts.map((draft) => (
                      <DraftEditorCard
                        key={draft.id}
                        draft={draft}
                        vibeOptions={screen.vibeOptions}
                        intentOptions={screen.intentOptions}
                      />
                    )),
                  )}
                </View>

                <PillButton label="Add monthly repeating window" variant="secondary" onPress={screen.onAddMonthlyRange} />
              </GlassCard>
            </Section>

            {screen.monthlyDrafts.length ? (
              <Section>
                <SectionHeader label="Monthly" title="Specific day each month" />
                <GlassCard>
                  <View style={styles.cardStack}>
                    {screen.monthlyDrafts.map((draft) => (
                      <DraftEditorCard
                        key={draft.id}
                        draft={draft}
                        vibeOptions={screen.vibeOptions}
                        intentOptions={screen.intentOptions}
                        monthly
                      />
                    ))}
                  </View>
                </GlassCard>
              </Section>
            ) : null}

            <Section>
              <SectionHeader label="Dates" title="One-off openings" />
              <GlassCard>
                <MonthCalendar
                  monthLabel={screen.specificMonthLabel}
                  weekdayLabels={WEEKDAY_LABELS}
                  cells={screen.specificCalendarCells}
                  onPrevMonth={screen.onPrevSpecificMonth}
                  onNextMonth={screen.onNextSpecificMonth}
                />

                <Surface>
                  <View style={styles.dateHeader}>
                    <View style={styles.dateCopy}>
                      <AppText variant="h3">{screen.selectedSpecificLabel}</AppText>
                      <AppText variant="bodySmall" color={colors.muted}>
                        Add one-off windows for specific nights, travel, or special plans.
                      </AppText>
                    </View>
                    <PillButton label="Add date window" variant="secondary" onPress={screen.onAddSpecificDateRange} />
                  </View>
                </Surface>

                <View style={styles.cardStack}>
                  {screen.selectedSpecificWindows.length ? (
                    screen.selectedSpecificWindows.map((window) => (
                      <DateWindowCard key={window.id} {...window} />
                    ))
                  ) : (
                    <Surface>
                      <AppText variant="body" color={colors.muted}>
                        No one-off windows on this date yet. Add one if this specific night feels more open than your usual rhythm.
                      </AppText>
                    </Surface>
                  )}
                </View>

                {screen.selectedRepeatingDrafts.length ? (
                  <Surface>
                    <View style={styles.cardStack}>
                      <View style={styles.quietHeader}>
                        <AppText variant="h3">Repeating on this day</AppText>
                        <AppText variant="bodySmall" color={colors.muted}>
                          These monthly windows already repeat on the same day number.
                        </AppText>
                      </View>
                      {screen.selectedRepeatingDrafts.map((draft) => (
                        <View key={draft.id} style={styles.quietRow}>
                          <AppText variant="body">{draft.title}</AppText>
                          <AppText variant="bodySmall" color={colors.muted}>
                            {draft.timeLine} · {draft.moodSummary}
                          </AppText>
                        </View>
                      ))}
                    </View>
                  </Surface>
                ) : null}
              </GlassCard>
            </Section>

            <Section>
              <SectionHeader label="Booking" title="Shared booking setup" />
              <GlassCard>
                <View style={styles.formatRow}>
                  {screen.formatOptions.map((option) => (
                    <FormatOptionCard
                      key={option.key}
                      title={option.title}
                      subtitle={option.subtitle}
                      icon={option.icon}
                      selected={option.selected}
                      onPress={option.onPress}
                    />
                  ))}
                </View>

                <Input
                  icon="calendar-star"
                  placeholder="Quick catch-up"
                  value={screen.bookingTitle}
                  onChangeText={screen.onChangeBookingTitle}
                />
                <TextArea
                  placeholder="Give the link a warm line so people know what kind of hang they’re stepping into."
                  value={screen.bookingDescription}
                  onChangeText={screen.onChangeBookingDescription}
                />
                <Input
                  icon="map-marker-outline"
                  placeholder="Campus, downtown, east side..."
                  value={screen.bookingLocation}
                  onChangeText={screen.onChangeBookingLocation}
                />

                {screen.bookingFormat === "GROUP" ? (
                  <View style={styles.cardStack}>
                    <View style={styles.metricGrid}>
                      <MetricStepper label="Duration" value={screen.groupDurationMinutes} min={15} max={360} step={15} suffix="m" onChange={screen.onChangeGroupDurationMinutes} />
                      <MetricStepper label="Participant cap" value={screen.groupParticipantCap} min={2} max={24} onChange={screen.onChangeGroupParticipantCap} />
                      <MetricStepper label="Min yes" value={screen.groupMinimumConfirmations} min={2} max={screen.groupParticipantCap} onChange={screen.onChangeGroupMinimumConfirmations} />
                      <MetricStepper label="Response window" value={screen.groupResponseDeadlineHours} min={1} max={168} step={6} suffix="h" onChange={screen.onChangeGroupResponseDeadlineHours} />
                    </View>

                    <Surface>
                      <View style={styles.cardStack}>
                        <View style={styles.quietHeader}>
                          <AppText variant="h3">Decision mode</AppText>
                          <AppText variant="bodySmall" color={colors.muted}>
                            Keep the rule obvious before anyone opens the link.
                          </AppText>
                        </View>
                        <View style={styles.optionWrap}>
                          {screen.groupDecisionOptions.map((option) => (
                            <Chip
                              key={option.value}
                              label={option.label}
                              selected={screen.groupDecisionMode === option.value}
                              onPress={() => screen.onSetGroupDecisionMode(option.value)}
                            />
                          ))}
                        </View>
                        <AppText variant="bodySmall" color={colors.muted}>
                          {screen.groupDecisionOptions.find((option) => option.value === screen.groupDecisionMode)?.hint}
                        </AppText>
                      </View>
                    </Surface>

                    <Surface>
                      <View style={styles.cardStack}>
                        <View style={styles.quietHeader}>
                          <AppText variant="h3">Visibility</AppText>
                          <AppText variant="bodySmall" color={colors.muted}>
                            Decide whether votes stay public or anonymous.
                          </AppText>
                        </View>
                        <View style={styles.optionWrap}>
                          {screen.groupVisibilityOptions.map((option) => (
                            <Chip
                              key={option.value}
                              label={option.label}
                              selected={screen.groupVisibilityMode === option.value}
                              onPress={() => screen.onSetGroupVisibilityMode(option.value)}
                            />
                          ))}
                        </View>
                        <AppText variant="bodySmall" color={colors.muted}>
                          {screen.groupVisibilityOptions.find((option) => option.value === screen.groupVisibilityMode)?.hint}
                        </AppText>
                      </View>
                    </Surface>
                  </View>
                ) : null}
              </GlassCard>
            </Section>

            <Section>
              <SectionHeader label="Preview" title="What your booking link looks like" />
              <GlassCard>
                <View style={styles.optionWrap}>
                  <Chip label="Preview" selected={screen.detailTab === "PREVIEW"} onPress={() => screen.setDetailTab("PREVIEW")} />
                  <Chip label="Suggested" selected={screen.detailTab === "SUGGESTED"} onPress={() => screen.setDetailTab("SUGGESTED")} />
                </View>

                {screen.detailTab === "PREVIEW" ? (
                  <View style={styles.cardStack}>
                    {screen.previewRows.length ? (
                      screen.previewRows.map((row) => (
                        <Surface key={row.id}>
                          <View style={styles.previewRow}>
                            <AppText variant="h3">{row.title}</AppText>
                            <AppText variant="bodySmall" color={colors.cloud}>
                              {row.subtitle}
                            </AppText>
                            <AppText variant="bodySmall" color={colors.muted}>
                              {row.meta}
                            </AppText>
                          </View>
                        </Surface>
                      ))
                    ) : (
                      <Surface>
                        <AppText variant="body" color={colors.muted}>
                          Add recurring or one-off windows and your booking preview will populate here.
                        </AppText>
                      </Surface>
                    )}
                  </View>
                ) : (
                  <View style={styles.cardStack}>
                    {screen.suggestedRows.length ? (
                      screen.suggestedRows.map((row) => (
                        <Surface key={row.id}>
                          <View style={styles.suggestedRow}>
                            <View style={styles.suggestedCopy}>
                              <AppText variant="eyebrow" color="rgba(139,234,255,0.78)">
                                {row.name}
                              </AppText>
                              <AppText variant="h3">{row.title}</AppText>
                              <AppText variant="bodySmall" color={colors.muted}>
                                {row.summary}
                              </AppText>
                            </View>
                            <View style={styles.scorePill}>
                              <AppText variant="bodySmall" color={colors.ink}>
                                {row.scoreLabel}
                              </AppText>
                            </View>
                          </View>
                        </Surface>
                      ))
                    ) : (
                      <Surface>
                        <AppText variant="body" color={colors.muted}>
                          Once your crew has compatible saved time, the strongest overlaps will gather here.
                        </AppText>
                      </Surface>
                    )}
                  </View>
                )}
              </GlassCard>
            </Section>
          </View>
        </ScrollView>

        <StickyFooter>
          <View style={styles.footerWrap}>
            <AppText variant="bodySmall" color={colors.muted} style={styles.footerHint}>
              Keep the setup clean, then save once. Your link and overlap engine will both update together.
            </AppText>
            <PillButton label={screen.saveLabel} onPress={screen.onSave} disabled={screen.saveDisabled} />
          </View>
        </StickyFooter>
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
  heroCopy: { gap: spacing[12] },
  heroMetaWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing[8] },
  heroMetaPill: {
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
  },
  heroActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing[8] },
  heroAction: { minWidth: 120 },
  feedbackCard: { backgroundColor: "rgba(255,255,255,0.04)" },
  feedbackCopy: { gap: spacing[6] },
  cardStack: { gap: spacing[12] },
  optionWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing[8] },
  optionGroup: { gap: spacing[8] },
  draftCard: { gap: spacing[12] },
  draftHeader: { flexDirection: "row", justifyContent: "space-between", gap: spacing[12] },
  draftCopy: { flex: 1, gap: spacing[4] },
  dateHeader: { gap: spacing[12] },
  dateCopy: { gap: spacing[4] },
  quietHeader: { gap: spacing[4] },
  quietRow: {
    gap: spacing[4],
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: spacing[16],
  },
  formatRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing[12] },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[12] },
  previewRow: { gap: spacing[4] },
  suggestedRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing[12] },
  suggestedCopy: { flex: 1, gap: spacing[4] },
  scorePill: {
    borderRadius: radii.pill,
    backgroundColor: colors.aqua,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
  },
  footerWrap: { gap: spacing[8] },
  footerHint: { textAlign: "center" },
});
