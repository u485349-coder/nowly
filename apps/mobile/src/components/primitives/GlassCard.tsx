import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, gradients, radii, shadows, spacing } from "../../theme";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export const GlassCard = ({ children, style }: Props) => {
  return (
    <View style={[styles.shell, style]}>
      <LinearGradient colors={gradients.glassSheen} style={styles.sheen} />
      <View style={styles.glowA} />
      <View style={styles.glowB} />
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
    borderRadius: radii.xl,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  sheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 72,
    opacity: 0.55,
  },
  glowA: {
    position: "absolute",
    top: -56,
    right: -40,
    width: 164,
    height: 164,
    borderRadius: 82,
    backgroundColor: "rgba(124,58,237,0.12)",
  },
  glowB: {
    position: "absolute",
    bottom: -62,
    left: -28,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(117,207,255,0.08)",
  },
  content: {
    gap: spacing[16],
    padding: spacing[20],
  },
});
