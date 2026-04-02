import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "../../../components/primitives/AppText";
import { Chip } from "../../../components/primitives/Chip";
import { colors, radii, spacing } from "../../../theme";

type Props = {
  title: string;
  peopleLabel: string;
  whenLabel: string;
  locationLabel?: string | null;
  intentLabel?: string | null;
  onBack: () => void;
};

export const ThreadHeader = ({
  title,
  peopleLabel,
  whenLabel,
  locationLabel,
  intentLabel,
  onBack,
}: Props) => {
  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
        >
          <MaterialCommunityIcons name="chevron-left" size={22} color={colors.cloud} />
        </Pressable>

        <View style={styles.copy}>
          <AppText variant="eyebrow" color="rgba(139,234,255,0.76)">
            Coordination Room
          </AppText>
          <AppText variant="h3" numberOfLines={1}>
            {title}
          </AppText>
          <AppText variant="bodySmall" color={colors.muted} numberOfLines={1}>
            {peopleLabel}
          </AppText>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="calendar-clock-outline" size={14} color={colors.aqua} />
          <AppText variant="bodySmall" color={colors.cloud} style={styles.metaText}>
            {whenLabel}
          </AppText>
        </View>

        {locationLabel ? (
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="map-marker-radius-outline" size={14} color={colors.aqua} />
            <AppText variant="bodySmall" color={colors.cloud} style={styles.metaText}>
              {locationLabel}
            </AppText>
          </View>
        ) : null}
      </View>

      {intentLabel ? (
        <View style={styles.chipsRow}>
          <Chip label={intentLabel} selected />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    gap: spacing[12],
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: spacing[4],
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.96 }],
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[12],
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    borderRadius: radii.pill,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[8],
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaText: {
    flexShrink: 1,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
  },
});
