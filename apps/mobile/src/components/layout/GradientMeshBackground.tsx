import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { colors, gradients } from "../../theme";

type Props = {
  children: ReactNode;
};

export const GradientMeshBackground = ({ children }: Props) => {
  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.appBackground} style={StyleSheet.absoluteFill} />
      <View style={[styles.glow, styles.glowA]} />
      <View style={[styles.glow, styles.glowB]} />
      <View style={[styles.glow, styles.glowC]} />
      {Platform.OS === "ios" ? <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} /> : null}
      <View style={styles.overlay} />
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  glow: {
    position: "absolute",
    borderRadius: 999,
  },
  glowA: {
    top: -140,
    left: -80,
    width: 320,
    height: 320,
    backgroundColor: "rgba(124,58,237,0.18)",
  },
  glowB: {
    top: 120,
    right: -140,
    width: 360,
    height: 360,
    backgroundColor: "rgba(117,207,255,0.08)",
  },
  glowC: {
    bottom: -160,
    left: 40,
    width: 260,
    height: 260,
    backgroundColor: "rgba(92,77,255,0.14)",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4,8,20,0.22)",
  },
  content: {
    flex: 1,
  },
});
