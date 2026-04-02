import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "../../theme";

type Props = {
  value: boolean;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export const Switch = ({ value, onPress, disabled = false, loading = false }: Props) => {
  const interactive = Boolean(onPress) && !disabled && !loading;

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !interactive }}
      disabled={!interactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.track,
        value ? styles.trackActive : null,
        pressed && interactive ? styles.pressed : null,
        !interactive ? styles.disabled : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={value ? colors.ink : colors.cloud} size="small" />
      ) : (
        <View style={[styles.knob, value ? styles.knobActive : null]} />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  track: {
    width: 54,
    minHeight: 32,
    borderRadius: radii.pill,
    padding: spacing[4],
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  trackActive: {
    backgroundColor: colors.aqua,
    borderColor: "rgba(255,255,255,0.2)",
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.cloud,
  },
  knobActive: {
    alignSelf: "flex-end",
    backgroundColor: colors.ink,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.56,
  },
});
