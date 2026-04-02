import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, gradients, radii, shadows, spacing } from "../../theme";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export const HeroCard = ({ children, style }: Props) => {
  return (
    <LinearGradient colors={gradients.heroSurface} style={[styles.shell, style]}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <View style={styles.content}>{children}</View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    ...shadows.glow,
  },
  glowTop: {
    position: "absolute",
    top: -88,
    right: -44,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(167,139,250,0.18)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -96,
    left: -32,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(139,234,255,0.09)",
  },
  content: {
    gap: spacing[20],
    padding: spacing[24],
  },
});
