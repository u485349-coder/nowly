import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { nowlyColors } from "../../constants/theme";
import { webPressableStyle } from "../../lib/web-pressable";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const AnimatedIcon = Animated.createAnimatedComponent(MaterialCommunityIcons);

type FABToggleProps = {
  bottom: number;
  open: boolean;
  onPress: () => void;
  progress: SharedValue<number>;
  icon?: IconName;
  accentColor?: string;
  size?: number;
};

export const FABToggle = ({
  bottom,
  open,
  onPress,
  progress,
  icon = "plus",
  accentColor = nowlyColors.violet,
  size = 70,
}: FABToggleProps) => {
  const pressProgress = useSharedValue(0);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.16 + progress.value * 0.18,
    transform: [
      {
        scale: interpolate(progress.value, [0, 1], [0.94, 1.12], Extrapolation.CLAMP),
      },
    ],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.06, 0.18], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(progress.value, [0, 1], [0.96, 1.18], Extrapolation.CLAMP),
      },
    ],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(pressProgress.value, [0, 1], [1, 0.94], Extrapolation.CLAMP),
      },
    ],
    shadowOpacity: 0.24 + progress.value * 0.16,
    shadowRadius: 16 + progress.value * 7,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], ["#FFFFFF", "#FFFFFF"]),
    transform: [
      {
        rotate: `${interpolate(progress.value, [0, 1], [0, 45], Extrapolation.CLAMP)}deg`,
      },
      {
        scale: interpolate(progress.value, [0, 1], [1, 1.04], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      hitSlop={12}
      onPress={onPress}
      onPressIn={() => {
        pressProgress.value = withSpring(1, {
          damping: 16,
          stiffness: 240,
        });
      }}
      onPressOut={() => {
        pressProgress.value = withSpring(0, {
          damping: 18,
          stiffness: 220,
        });
      }}
      style={({ pressed }) => [
        styles.pressable,
        {
          bottom,
          width: size,
          height: size,
          marginLeft: -(size / 2),
        },
        webPressableStyle(pressed, { pressedOpacity: 0.96, pressedScale: 0.985 }),
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pulseRing,
          pulseStyle,
          {
            width: size + 10,
            height: size + 10,
            borderRadius: (size + 10) / 2,
            borderColor: `${accentColor}66`,
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          haloStyle,
          {
            backgroundColor: accentColor,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.button,
          buttonStyle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            shadowColor: accentColor,
          },
        ]}
      >
        <LinearGradient
          colors={[accentColor, nowlyColors.sky]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0.05, y: 0.1 }}
          style={[
            styles.gradientFill,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          <View style={styles.innerSheen} />
          <AnimatedIcon name={icon} size={28} style={iconStyle} />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    position: "absolute",
    left: "50%",
    zIndex: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  pulseRing: {
    position: "absolute",
    borderWidth: 1.5,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    shadowOffset: { width: 0, height: 8 },
    elevation: 0,
    overflow: "hidden",
  },
  gradientFill: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  innerSheen: {
    position: "absolute",
    top: 8,
    left: 10,
    width: 24,
    height: 16,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
});
