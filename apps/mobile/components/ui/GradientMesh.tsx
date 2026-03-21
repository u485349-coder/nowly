import { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { gradients } from "../../constants/theme";

const isWeb = Platform.OS === "web";

export const GradientMesh = ({ children }: { children: ReactNode }) => (
  <View className="flex-1 bg-ink">
    <View className="absolute inset-0 overflow-hidden" pointerEvents="none">
      <LinearGradient colors={gradients.background} className="absolute inset-0" />
      <LinearGradient
        colors={["rgba(124,58,237,0.28)", "rgba(79,70,229,0.14)", "rgba(124,58,237,0.02)"]}
        start={{ x: 0.12, y: 0.08 }}
        end={{ x: 0.88, y: 0.92 }}
        style={styles.topLeftBlob}
      />
      <LinearGradient
        colors={["rgba(34,211,238,0.20)", "rgba(56,189,248,0.12)", "rgba(34,211,238,0.02)"]}
        start={{ x: 0.3, y: 0.15 }}
        end={{ x: 0.88, y: 0.88 }}
        style={styles.rightBlob}
      />
      <LinearGradient
        colors={["rgba(99,102,241,0.14)", "rgba(124,58,237,0.08)", "rgba(124,58,237,0.01)"]}
        start={{ x: 0.15, y: 0.15 }}
        end={{ x: 0.8, y: 0.95 }}
        style={styles.lowerLeftBlob}
      />
      <LinearGradient
        colors={["rgba(34,211,238,0.10)", "rgba(34,211,238,0.03)", "rgba(34,211,238,0.00)"]}
        start={{ x: 0.2, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
        style={styles.centerWash}
      />
      {!isWeb ? <BlurView intensity={72} tint="dark" style={StyleSheet.absoluteFillObject} /> : null}
      <LinearGradient
        colors={
          isWeb
            ? ["rgba(5, 8, 19, 0.12)", "rgba(8, 12, 26, 0.26)", "rgba(8, 12, 26, 0.56)"]
            : ["rgba(5, 8, 19, 0.08)", "rgba(8, 12, 26, 0.22)", "rgba(8, 12, 26, 0.48)"]
        }
        style={StyleSheet.absoluteFillObject}
      />
    </View>
    <View className="flex-1">{children}</View>
  </View>
);

const styles = StyleSheet.create({
  topLeftBlob: {
    position: "absolute",
    top: -76,
    left: -112,
    width: 360,
    height: 360,
    borderRadius: 999,
    opacity: 0.9,
  },
  rightBlob: {
    position: "absolute",
    top: 148,
    right: -120,
    width: 430,
    height: 430,
    borderRadius: 999,
    opacity: 0.95,
  },
  lowerLeftBlob: {
    position: "absolute",
    bottom: -86,
    left: -44,
    width: 290,
    height: 290,
    borderRadius: 999,
    opacity: 0.9,
  },
  centerWash: {
    position: "absolute",
    top: 250,
    right: 10,
    width: 320,
    height: 320,
    borderRadius: 999,
    opacity: 0.8,
  },
});
