import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { HeroCard } from "../../../components/primitives/HeroCard";
import { AppText } from "../../../components/primitives/AppText";
import { colors, radii, spacing } from "../../../theme";

type Props = {
  title: string;
  copy: string;
  status: string;
  locationLabel?: string | null;
  onOpenWindows: () => void;
};

export const AuraHero = ({ title, copy, status, locationLabel, onOpenWindows }: Props) => {
  return (
    <HeroCard>
      <View style={styles.topRow}>
        <View style={styles.pill}>
          <AppText variant="label" color={colors.cloud}>
            {status}
          </AppText>
        </View>
        {locationLabel ? (
          <View style={styles.locationPill}>
            <MaterialCommunityIcons name="map-marker-radius-outline" size={14} color={colors.aqua} />
            <AppText variant="label" color={colors.cloud}>
              {locationLabel}
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.copyBlock}>
        <AppText variant="eyebrow" color="rgba(247,251,255,0.62)">
          Live aura
        </AppText>
        <AppText variant="h1">{title}</AppText>
        <AppText variant="body" color={colors.muted}>
          {copy}
        </AppText>
      </View>

      <Pressable accessibilityRole="button" onPress={onOpenWindows} style={({ pressed }) => [styles.windowsAction, pressed ? styles.pressed : null]}>
        <AppText variant="bodySmall" color={colors.cloud} style={styles.windowsText}>
          Open availability preferences
        </AppText>
        <MaterialCommunityIcons name="arrow-right" size={16} color={colors.cloud} />
      </Pressable>
    </HeroCard>
  );
};

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[12],
    flexWrap: "wrap",
  },
  pill: {
    minHeight: 36,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[14],
    backgroundColor: "rgba(124,58,237,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  locationPill: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    borderRadius: radii.pill,
    paddingHorizontal: spacing[14],
    backgroundColor: "rgba(139,234,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(139,234,255,0.14)",
  },
  copyBlock: {
    gap: spacing[8],
  },
  windowsAction: {
    minHeight: 44,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    borderRadius: radii.pill,
    paddingHorizontal: spacing[16],
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  windowsText: {
    fontFamily: "SpaceGrotesk_700Bold",
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
  },
});
