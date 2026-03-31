import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GlassCard } from "../../../components/ui/GlassCard";
import { MobileHeroCard } from "../components/MobileHeroCard";
import { MobileScreen } from "../components/MobileScreen";
import { MobileSectionHeader } from "../components/MobileSectionHeader";
import { nowlyColors } from "../../../constants/theme";

type ActionRow = {
  id: string;
  name: string;
  line: string;
  detail: string;
  action: string;
  onPress: () => void;
};

export const NowModeMobileScreen = ({
  title,
  copy,
  locationLabel,
  composer,
  liveMatches,
  suggestedTimes,
  onBack,
  onOpenWindows,
  onStopLive,
  stoppingLive = false,
}: {
  title: string;
  copy: string;
  locationLabel?: string | null;
  composer: ReactNode;
  liveMatches: ActionRow[];
  suggestedTimes: ActionRow[];
  onBack: () => void;
  onOpenWindows: () => void;
  onStopLive?: () => void;
  stoppingLive?: boolean;
}) => (
  <MobileScreen
    label="Now Mode"
    title="Tune your live signal"
    subtitle="Keep the signal light, clear, and easy to act on."
    onBack={onBack}
  >
    <MobileHeroCard eyebrow="Live aura" title={title} copy={copy} meta={
      locationLabel ? (
        <View style={styles.locationPill}>
          <Text style={styles.locationPillText}>Sharing: {locationLabel}</Text>
        </View>
      ) : undefined
    }>
      <Pressable onPress={onOpenWindows} style={styles.heroInlineAction}>
        <Text style={styles.heroInlineText}>View best windows</Text>
      </Pressable>
    </MobileHeroCard>

    {composer}

    {onStopLive ? (
      <Pressable onPress={onStopLive} disabled={stoppingLive} style={[styles.stopButton, stoppingLive ? styles.stopButtonDisabled : null]}>
        <Text style={styles.stopButtonText}>{stoppingLive ? "Stopping live..." : "Stop live"}</Text>
      </Pressable>
    ) : null}

    <View style={styles.sectionGap}>
      <MobileSectionHeader label="Live matches" title="Who feels reachable now" />
      <View style={styles.stack}>
        {liveMatches.length ? (
          liveMatches.map((item) => (
            <GlassCard key={item.id} className="p-4">
              <View style={styles.row}>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.rowLine}>{item.line}</Text>
                  <Text style={styles.rowDetail}>{item.detail}</Text>
                </View>
                <Pressable onPress={item.onPress} style={styles.rowAction}>
                  <Text style={styles.rowActionText}>{item.action}</Text>
                </Pressable>
              </View>
            </GlassCard>
          ))
        ) : (
          <GlassCard className="p-4">
            <Text style={styles.emptyText}>
              Once your signal is live, the strongest people and timing should surface here first.
            </Text>
          </GlassCard>
        )}
      </View>
    </View>

    <View style={styles.sectionGap}>
      <MobileSectionHeader label="Suggested times" title="Softer overlap ahead" />
      <View style={styles.stack}>
        {suggestedTimes.length ? (
          suggestedTimes.map((item) => (
            <GlassCard key={item.id} className="p-4">
              <View style={styles.row}>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.rowLine}>{item.line}</Text>
                  <Text style={styles.rowDetail}>{item.detail}</Text>
                </View>
                <Pressable onPress={item.onPress} style={styles.rowActionSecondary}>
                  <Text style={styles.rowActionSecondaryText}>{item.action}</Text>
                </Pressable>
              </View>
            </GlassCard>
          ))
        ) : (
          <GlassCard className="p-4">
            <Text style={styles.emptyText}>
              Saved rhythm and recurring windows still show up here when friends have compatible time.
            </Text>
          </GlassCard>
        )}
      </View>
    </View>
  </MobileScreen>
);

const styles = StyleSheet.create({
  emptyText: {
    color: "rgba(247,251,255,0.62)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  heroInlineAction: {
    alignSelf: "flex-start",
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroInlineText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 13,
  },
  locationPill: {
    alignSelf: "flex-start",
    borderRadius: 16,
    backgroundColor: "rgba(139,234,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  locationPillText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowAction: {
    minWidth: 84,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,234,255,0.16)",
  },
  rowActionSecondary: {
    minWidth: 104,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  rowActionSecondaryText: {
    color: "rgba(247,251,255,0.88)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 13,
  },
  rowActionText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 13,
  },
  rowCopy: {
    flex: 1,
    gap: 3,
  },
  rowDetail: {
    color: "rgba(247,251,255,0.56)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  rowLine: {
    color: "rgba(139,234,255,0.86)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  rowName: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
  },
  sectionGap: {
    gap: 12,
  },
  stack: {
    gap: 12,
  },
  stopButton: {
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  stopButtonDisabled: {
    opacity: 0.68,
  },
  stopButtonText: {
    color: "rgba(247,251,255,0.9)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 14,
  },
});
