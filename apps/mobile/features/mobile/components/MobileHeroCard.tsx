import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { nowlyColors } from "../../../constants/theme";

export const MobileHeroCard = ({
  eyebrow,
  title,
  copy,
  meta,
  children,
}: {
  eyebrow?: string;
  title: string;
  copy?: string;
  meta?: ReactNode;
  children?: ReactNode;
}) => (
  <LinearGradient
    colors={["rgba(18,24,58,0.96)", "rgba(46,32,92,0.88)", "rgba(10,14,28,0.98)"]}
    start={{ x: 0.04, y: 0.04 }}
    end={{ x: 1, y: 1 }}
    style={styles.shell}
  >
    <View style={styles.glowOne} pointerEvents="none" />
    <View style={styles.glowTwo} pointerEvents="none" />
    {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
    <Text style={styles.title}>{title}</Text>
    {copy ? <Text style={styles.copy}>{copy}</Text> : null}
    {meta}
    {children}
  </LinearGradient>
);

const styles = StyleSheet.create({
  copy: {
    color: "rgba(247,251,255,0.72)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  eyebrow: {
    color: "rgba(139,234,255,0.82)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  glowOne: {
    position: "absolute",
    top: -56,
    right: -36,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(124,58,237,0.22)",
  },
  glowTwo: {
    position: "absolute",
    bottom: -48,
    left: -26,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(117,207,255,0.12)",
  },
  shell: {
    borderRadius: 30,
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 10,
    shadowColor: nowlyColors.glow,
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
  },
  title: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 28,
    lineHeight: 32,
  },
});
