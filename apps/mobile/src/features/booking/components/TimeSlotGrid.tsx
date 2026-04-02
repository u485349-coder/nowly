import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../../components/primitives/AppText";
import { colors, radii, spacing } from "../../../theme";

type SlotItem = {
  id: string;
  label: string;
  active: boolean;
  recommended?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

type Props = {
  items: SlotItem[];
  fullWidth?: boolean;
};

export const TimeSlotGrid = ({ items, fullWidth = false }: Props) => {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          disabled={item.disabled}
          accessibilityRole={item.disabled ? undefined : "button"}
          onPress={item.onPress}
          style={({ pressed }) => [
            styles.pill,
            fullWidth ? styles.fullWidth : null,
            item.active ? styles.pillActive : styles.pillIdle,
            item.disabled ? styles.disabled : null,
            pressed && !item.disabled ? styles.pressed : null,
          ]}
        >
          <AppText variant="body" color={item.active ? colors.ink : colors.cloud} style={item.active ? styles.activeText : undefined}>
            {item.label}
          </AppText>
          {item.recommended && !item.active ? <View style={styles.dot} /> : null}
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[12],
  },
  pill: {
    minHeight: 52,
    minWidth: 132,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[14],
    position: "relative",
    overflow: "hidden",
  },
  fullWidth: {
    width: "100%",
  },
  pillIdle: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.aqua,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  activeText: {
    fontFamily: "SpaceGrotesk_700Bold",
  },
  dot: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.violet,
  },
  disabled: {
    opacity: 0.58,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
});
