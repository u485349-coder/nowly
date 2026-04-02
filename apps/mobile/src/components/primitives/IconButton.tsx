import type { ComponentProps } from "react";
import { Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, radii } from "../../theme";

type Props = {
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  onPress: () => void;
  tone?: "default" | "accent";
};

export const IconButton = ({ icon, onPress, tone = "default" }: Props) => {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.base, tone === "accent" ? styles.accent : null, pressed ? styles.pressed : null]}>
      <MaterialCommunityIcons name={icon} size={20} color={tone === "accent" ? colors.aqua : colors.cloud} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  accent: {
    backgroundColor: "rgba(139,234,255,0.12)",
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.96 }],
  },
});
