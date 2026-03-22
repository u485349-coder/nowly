import { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { nowlyColors } from "../../constants/theme";

const isWeb = Platform.OS === "web";

export const GlassCard = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <View
    className={`overflow-hidden rounded-[30px] bg-[#091224]/74 ${className}`}
    style={styles.shell}
  >
    {!isWeb ? <BlurView intensity={26} tint="dark" style={StyleSheet.absoluteFillObject} /> : null}
    <LinearGradient
      colors={["rgba(119,205,255,0.12)", "rgba(255,255,255,0.015)", "rgba(255,255,255,0.00)"]}
      start={{ x: 0.06, y: 0.02 }}
      end={{ x: 0.74, y: 0.96 }}
      style={styles.topGlow}
      pointerEvents="none"
    />
    <LinearGradient
      colors={["rgba(139,234,255,0.12)", "rgba(139,234,255,0.03)", "rgba(139,234,255,0.00)"]}
      start={{ x: 0.28, y: 0.1 }}
      end={{ x: 1, y: 0.9 }}
      style={styles.bottomGlow}
      pointerEvents="none"
    />
    <LinearGradient
      colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.015)", "rgba(255,255,255,0.00)"]}
      start={{ x: 0.12, y: 0 }}
      end={{ x: 0.88, y: 0.86 }}
      style={styles.highlight}
      pointerEvents="none"
    />
    <View style={styles.edgeWash} pointerEvents="none" />
    <View className="relative">{children}</View>
  </View>
);

const styles = StyleSheet.create({
  shell: {
    shadowColor: nowlyColors.glow,
    shadowOpacity: isWeb ? 0.12 : 0.2,
    shadowRadius: isWeb ? 18 : 26,
    shadowOffset: {
      width: 0,
      height: isWeb ? 10 : 16,
    },
    elevation: isWeb ? 0 : 8,
  },
  topGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  highlight: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.82,
  },
  edgeWash: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.035)",
  },
});
