import { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

const isWeb = Platform.OS === "web";

export const GlassCard = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <View
    className={`overflow-hidden rounded-[30px] border border-white/8 bg-[#0E1527]/78 ${className}`}
    style={styles.shell}
  >
    {!isWeb ? <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFillObject} /> : null}
    <LinearGradient
      colors={["rgba(124,58,237,0.14)", "rgba(124,58,237,0.03)", "rgba(124,58,237,0.00)"]}
      start={{ x: 0.08, y: 0.02 }}
      end={{ x: 0.7, y: 0.95 }}
      style={styles.topGlow}
      pointerEvents="none"
    />
    <LinearGradient
      colors={["rgba(34,211,238,0.10)", "rgba(34,211,238,0.03)", "rgba(34,211,238,0.00)"]}
      start={{ x: 0.3, y: 0.1 }}
      end={{ x: 1, y: 0.92 }}
      style={styles.bottomGlow}
      pointerEvents="none"
    />
    <LinearGradient
      colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.01)", "rgba(255,255,255,0.00)"]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 0.85 }}
      style={styles.highlight}
      pointerEvents="none"
    />
    <View style={styles.innerStroke} pointerEvents="none" />
    <View className="relative">{children}</View>
  </View>
);

const styles = StyleSheet.create({
  shell: {
    shadowColor: "#020617",
    shadowOpacity: isWeb ? 0.18 : 0.34,
    shadowRadius: isWeb ? 16 : 24,
    shadowOffset: {
      width: 0,
      height: isWeb ? 8 : 12,
    },
    elevation: isWeb ? 0 : 10,
  },
  topGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  highlight: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.7,
  },
  innerStroke: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
});
