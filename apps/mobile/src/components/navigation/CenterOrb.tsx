import type { ComponentProps } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, gradients, radii, shadows } from "../../theme";

type Props = {
  onPress: () => void;
  icon?: ComponentProps<typeof MaterialCommunityIcons>["name"];
};

export const CenterOrb = ({ onPress, icon = "lightning-bolt" }: Props) => {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.hitArea, pressed ? styles.pressed : null]}>
      <LinearGradient colors={gradients.orb} style={styles.orb}>
        <View style={styles.innerGlow} />
        <MaterialCommunityIcons name={icon} size={24} color={colors.cloud} />
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  hitArea: {
    position: "absolute",
    top: -24,
    left: "50%",
    marginLeft: -34,
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  orb: {
    width: 68,
    height: 68,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...shadows.glow,
  },
  innerGlow: {
    position: "absolute",
    top: -18,
    left: -10,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.96,
  },
});
