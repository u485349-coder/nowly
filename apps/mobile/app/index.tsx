import { useEffect } from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { NowlyMark } from "../components/branding/NowlyMark";
import { NOWLY_SLOGAN } from "../lib/branding";
import { useAppStore } from "../store/useAppStore";

export default function IndexScreen() {
  const router = useRouter();
  const introSeen = useAppStore((state) => state.introSeen);
  const onboardingComplete = useAppStore((state) => state.onboardingComplete);
  const setIntroSeen = useAppStore((state) => state.setIntroSeen);

  const leftX = useSharedValue(introSeen ? -28 : -52);
  const rightX = useSharedValue(introSeen ? 28 : 52);
  const glowOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(0.7);
  const pulseOpacity = useSharedValue(0);
  const lockupOpacity = useSharedValue(0);
  const wordmarkY = useSharedValue(introSeen ? 10 : 18);

  useEffect(() => {
    const duration = introSeen ? 680 : 1280;

    glowOpacity.value = withTiming(1, { duration: duration * 0.45 });
    leftX.value = withDelay(120, withTiming(0, { duration: duration * 0.55 }));
    rightX.value = withDelay(120, withTiming(0, { duration: duration * 0.55 }));
    pulseOpacity.value = withDelay(360, withTiming(0.8, { duration: duration * 0.16 }));
    pulseScale.value = withDelay(360, withTiming(1.7, { duration: duration * 0.35 }));
    lockupOpacity.value = withDelay(420, withTiming(1, { duration: duration * 0.28 }));
    wordmarkY.value = withDelay(420, withTiming(0, { duration: duration * 0.28 }));

    const timeout = setTimeout(() => {
      setIntroSeen();
      router.replace(onboardingComplete ? "/home" : "/onboarding");
    }, introSeen ? 920 : 1700);

    return () => clearTimeout(timeout);
  }, [glowOpacity, introSeen, leftX, lockupOpacity, onboardingComplete, pulseOpacity, pulseScale, rightX, router, setIntroSeen, wordmarkY]);

  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: leftX.value }],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: rightX.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));
  const lockupStyle = useAnimatedStyle(() => ({
    opacity: lockupOpacity.value,
    transform: [{ translateY: wordmarkY.value }],
  }));

  return (
    <View className="flex-1 items-center justify-center overflow-hidden bg-ink">
      <LinearGradient colors={["#050813", "#0B1020", "#1A1F3D"]} className="absolute inset-0" />
      <Animated.View
        style={glowStyle}
        className="absolute h-72 w-72 rounded-full bg-aqua/15"
      />
      <Animated.View
        style={[pulseStyle]}
        className="absolute h-44 w-44 rounded-full border border-white/20"
      />
      <View className="items-center">
        <View className="relative h-56 w-72 items-center justify-center">
          <Animated.View
            style={[leftStyle]}
            className="absolute h-24 w-24 rounded-full bg-violet/55"
          />
          <Animated.View
            style={[rightStyle]}
            className="absolute h-24 w-24 rounded-full bg-sky/45"
          />
          <Animated.View style={[lockupStyle]} className="absolute items-center">
            <NowlyMark variant="icon" size={68} />
            <Text className="mt-5 font-display text-[30px] leading-[32px] text-cloud">
              Nowly
            </Text>
            <Text
              className="mt-1.5 font-body text-sm text-white/60"
              style={{
                marginLeft: -6,
              }}
            >
              {NOWLY_SLOGAN}
            </Text>
          </Animated.View>
        </View>

      </View>
    </View>
  );
}
