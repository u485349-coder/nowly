import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../../components/primitives/AppText";
import { Chip } from "../../../components/primitives/Chip";
import { GlassCard } from "../../../components/primitives/GlassCard";
import { Switch } from "../../../components/primitives/Switch";
import { colors, radii, spacing } from "../../../theme";

type IntensityOption = {
  key: string;
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
};

type ToggleOption = {
  key: string;
  label: string;
  description: string;
  value: boolean;
  loading?: boolean;
  onPress: () => void;
};

type Props = {
  intensityOptions: IntensityOption[];
  toggles: ToggleOption[];
};

export const ProfileNotificationSettings = ({ intensityOptions, toggles }: Props) => {
  return (
    <GlassCard>
      <View style={styles.root}>
        <View style={styles.intensityWrap}>
          {intensityOptions.map((option) => (
            <Chip
              key={option.key}
              label={option.label}
              onPress={option.disabled ? undefined : option.onPress}
              selected={option.selected}
              style={option.disabled ? styles.disabledChip : undefined}
            />
          ))}
        </View>

        <View style={styles.toggleList}>
          {toggles.map((toggle) => (
            <Pressable
              key={toggle.key}
              accessibilityRole="button"
              onPress={toggle.loading ? undefined : toggle.onPress}
              style={({ pressed }) => [
                styles.toggleRow,
                pressed && !toggle.loading ? styles.toggleRowPressed : null,
                toggle.loading ? styles.toggleRowDisabled : null,
              ]}
            >
              <View style={styles.toggleCopy}>
                <AppText variant="body" style={styles.toggleLabel}>
                  {toggle.label}
                </AppText>
                <AppText variant="bodySmall" color={colors.muted}>
                  {toggle.description}
                </AppText>
              </View>
              <Switch value={toggle.value} loading={toggle.loading} />
            </Pressable>
          ))}
        </View>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  root: {
    gap: spacing[16],
  },
  intensityWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
  },
  disabledChip: {
    opacity: 0.56,
  },
  toggleList: {
    gap: spacing[12],
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[16],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[16],
  },
  toggleRowPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.992 }],
  },
  toggleRowDisabled: {
    opacity: 0.7,
  },
  toggleCopy: {
    flex: 1,
    gap: spacing[4],
  },
  toggleLabel: {
    fontFamily: "SpaceGrotesk_700Bold",
  },
});
