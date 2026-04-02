import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "../../../components/primitives/AppText";
import { colors, radii, spacing } from "../../../theme";

type Option = {
  key: string;
  label: string;
  hint: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  selected?: boolean;
  onPress: () => void;
};

type Props = {
  options: Option[];
};

export const SignalStateList = ({ options }: Props) => {
  return (
    <View style={styles.stack}>
      {options.map((option) => (
        <Pressable
          key={option.key}
          accessibilityRole="button"
          onPress={option.onPress}
          style={({ pressed }) => [styles.card, option.selected ? styles.cardSelected : null, pressed ? styles.pressed : null]}
        >
          <View style={[styles.iconWrap, option.selected ? styles.iconWrapSelected : null]}>
            <MaterialCommunityIcons name={option.icon} size={18} color={option.selected ? colors.ink : colors.aqua} />
          </View>
          <View style={styles.copy}>
            <AppText variant="h3" color={option.selected ? colors.ink : colors.cloud}>
              {option.label}
            </AppText>
            <AppText variant="bodySmall" color={option.selected ? "rgba(4,8,20,0.74)" : colors.muted}>
              {option.hint}
            </AppText>
          </View>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  stack: {
    gap: spacing[12],
  },
  card: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[14],
    borderRadius: radii.lg,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[16],
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardSelected: {
    backgroundColor: "rgba(139,234,255,0.94)",
    borderColor: "rgba(255,255,255,0.2)",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,234,255,0.14)",
  },
  iconWrapSelected: {
    backgroundColor: "rgba(4,8,20,0.08)",
  },
  copy: {
    flex: 1,
    gap: spacing[4],
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
});
