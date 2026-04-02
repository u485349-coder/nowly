import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../../components/primitives/AppText";
import { colors, radii, spacing } from "../../../theme";

type Option = {
  key: string;
  label: string;
  onPress: () => void;
  selected?: boolean;
};

type Props = {
  options: Option[];
};

export const SignalChipGroup = ({ options }: Props) => {
  return (
    <View style={styles.wrap}>
      {options.map((option) => (
        <Pressable
          key={option.key}
          accessibilityRole="button"
          onPress={option.onPress}
          style={({ pressed }) => [styles.chip, option.selected ? styles.selected : null, pressed ? styles.pressed : null]}
        >
          <AppText variant="label" color={option.selected ? colors.ink : colors.cloud}>
            {option.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[10],
  },
  chip: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    paddingHorizontal: spacing[16],
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: {
    backgroundColor: colors.aqua,
    borderColor: "rgba(255,255,255,0.2)",
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
});
