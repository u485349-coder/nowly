import { ReactNode, useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { gradients } from "../../constants/theme";

const isWeb = Platform.OS === "web";

export const GradientMesh = ({ children }: { children: ReactNode }) => {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 18000,
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 18000,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [drift]);

  const northStyle = {
    transform: [
      {
        translateY: drift.interpolate({
          inputRange: [0, 1],
          outputRange: [-8, 14],
        }),
      },
      {
        translateX: drift.interpolate({
          inputRange: [0, 1],
          outputRange: [-10, 12],
        }),
      },
    ],
  };

  const eastStyle = {
    transform: [
      {
        translateY: drift.interpolate({
          inputRange: [0, 1],
          outputRange: [16, -14],
        }),
      },
      {
        translateX: drift.interpolate({
          inputRange: [0, 1],
          outputRange: [8, -10],
        }),
      },
    ],
  };

  const southStyle = {
    transform: [
      {
        translateY: drift.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10],
        }),
      },
      {
        translateX: drift.interpolate({
          inputRange: [0, 1],
          outputRange: [-4, 10],
        }),
      },
    ],
  };

  return (
    <View className="flex-1 bg-ink">
      <View className="absolute inset-0 overflow-hidden" pointerEvents="none">
        <LinearGradient colors={gradients.background} className="absolute inset-0" />

        <Animated.View style={[styles.northGlow, northStyle]}>
          <LinearGradient
            colors={["rgba(76,175,255,0.24)", "rgba(41,98,255,0.12)", "rgba(76,175,255,0.00)"]}
            start={{ x: 0.18, y: 0.08 }}
            end={{ x: 0.88, y: 0.92 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

        <Animated.View style={[styles.eastGlow, eastStyle]}>
          <LinearGradient
            colors={["rgba(139,234,255,0.22)", "rgba(87,198,255,0.12)", "rgba(139,234,255,0.00)"]}
            start={{ x: 0.18, y: 0.12 }}
            end={{ x: 0.88, y: 0.86 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

        <Animated.View style={[styles.southGlow, southStyle]}>
          <LinearGradient
            colors={["rgba(56,189,248,0.14)", "rgba(24,67,126,0.1)", "rgba(56,189,248,0.00)"]}
            start={{ x: 0.18, y: 0.12 }}
            end={{ x: 0.88, y: 0.9 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

        <LinearGradient
          colors={["rgba(255,255,255,0.05)", "rgba(255,255,255,0.015)", "rgba(255,255,255,0.00)"]}
          start={{ x: 0.4, y: 0 }}
          end={{ x: 0.56, y: 0.72 }}
          style={styles.verticalLift}
        />

        {!isWeb ? <BlurView intensity={48} tint="dark" style={StyleSheet.absoluteFillObject} /> : null}

        <LinearGradient
          colors={
            isWeb
              ? ["rgba(3,8,18,0.10)", "rgba(5,10,20,0.20)", "rgba(5,10,20,0.48)"]
              : ["rgba(3,8,18,0.06)", "rgba(5,10,20,0.18)", "rgba(5,10,20,0.42)"]
          }
          style={StyleSheet.absoluteFillObject}
        />
      </View>
      <View className="flex-1">{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  northGlow: {
    position: "absolute",
    top: -112,
    left: -128,
    width: 420,
    height: 420,
    borderRadius: 999,
    opacity: 0.95,
  },
  eastGlow: {
    position: "absolute",
    top: 76,
    right: -148,
    width: 520,
    height: 520,
    borderRadius: 999,
    opacity: 0.94,
  },
  southGlow: {
    position: "absolute",
    bottom: -112,
    left: -56,
    width: 360,
    height: 360,
    borderRadius: 999,
    opacity: 0.9,
  },
  verticalLift: {
    position: "absolute",
    top: -60,
    left: "24%",
    width: "52%",
    height: "78%",
    opacity: 0.78,
  },
});
