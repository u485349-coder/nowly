import { Pressable, StyleSheet, type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native";
import { colors, radii, spacing } from "../../theme";
import { AppText } from "./AppText";

type Props = {
  label: string;
  selected?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
};

export const Chip = ({ label, selected = false, onPress, style }: Props) => {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : null,
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      <AppText variant="label" color={selected ? colors.ink : colors.cloud}>
        {label}
      </AppText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: spacing[16],
  },
  selected: {
    backgroundColor: colors.aqua,
  },
  pressed: {
    opacity: 0.92,
  },
});
