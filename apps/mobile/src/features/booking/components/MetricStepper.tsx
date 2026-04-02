import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "../../../components/primitives/AppText";
import { colors, radii, spacing } from "../../../theme";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
};

export const MetricStepper = ({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
}: Props) => {
  const nextDown = Math.max(min, value - step);
  const nextUp = Math.min(max, value + step);

  return (
    <View style={styles.card}>
      <AppText variant="bodySmall" color={colors.muted}>
        {label}
      </AppText>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" onPress={() => onChange(nextDown)} style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}>
          <MaterialCommunityIcons name="minus" size={16} color={colors.cloud} />
        </Pressable>
        <AppText variant="h3">{`${value}${suffix}`}</AppText>
        <Pressable accessibilityRole="button" onPress={() => onChange(nextUp)} style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}>
          <MaterialCommunityIcons name="plus" size={16} color={colors.cloud} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 136,
    gap: spacing[12],
    borderRadius: radii.lg,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[16],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[12],
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.96 }],
  },
});
