import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Image, Platform, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { NOWLY_SLOGAN } from "../../../lib/branding";
import { useAppStore } from "../../../store/useAppStore";
import { GradientMeshBackground } from "../../components/layout/GradientMeshBackground";
import { AppText } from "../../components/primitives/AppText";
import { colors, gradients, radii, shadows, spacing } from "../../theme";

const iconAsset = require("../../../assets/icon.png");

export const SplashScreen = () => {
  const router = useRouter();
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const introSeen = useAppStore((state) => state.introSeen);
  const onboardingComplete = useAppStore((state) => state.onboardingComplete);
  const setIntroSeen = useAppStore((state) => state.setIntroSeen);

  const canSkipOnboarding = Boolean(token && (onboardingComplete || user?.onboardingCompleted));

  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(introSeen ? 1 : 0.84);
  const ringOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.78);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(introSeen ? 1 : 0.9);
  const lockupOpacity = useSharedValue(0);
  const lockupY = useSharedValue(introSeen ? 4 : 14);
  const driftY = useSharedValue(0);

  useEffect(() => {
    driftY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [driftY]);

  useEffect(() => {
    if (Platform.OS === "web") {
      const timeout = setTimeout(() => {
        setIntroSeen();
        router.replace(canSkipOnboarding ? "/home" : "/onboarding");
      }, 40);

      return () => clearTimeout(timeout);
    }

    const duration = introSeen ? 680 : 1280;

    glowOpacity.value = withTiming(1, { duration: duration * 0.45 });
    glowScale.value = withTiming(1.08, { duration: duration * 0.55 });
    ringOpacity.value = withDelay(180, withTiming(0.8, { duration: duration * 0.22 }));
    ringScale.value = withDelay(180, withTiming(1.34, { duration: duration * 0.34 }));
    logoOpacity.value = withDelay(200, withTiming(1, { duration: duration * 0.26 }));
    logoScale.value = withDelay(200, withTiming(1, { duration: duration * 0.26 }));
    lockupOpacity.value = withDelay(340, withTiming(1, { duration: duration * 0.24 }));
    lockupY.value = withDelay(340, withTiming(0, { duration: duration * 0.24 }));

    const timeout = setTimeout(() => {
      setIntroSeen();
      router.replace(canSkipOnboarding ? "/home" : "/onboarding");
    }, introSeen ? 920 : 1700);

    return () => clearTimeout(timeout);
  }, [
    canSkipOnboarding,
    glowOpacity,
    glowScale,
    introSeen,
    lockupOpacity,
    lockupY,
    logoOpacity,
    logoScale,
    ringOpacity,
    ringScale,
    router,
    setIntroSeen,
  ]);

  const ambientGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }, { translateY: driftY.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }, { translateY: driftY.value * 0.6 }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }, { translateY: driftY.value * 0.4 }],
  }));

  const lockupStyle = useAnimatedStyle(() => ({
    opacity: lockupOpacity.value,
    transform: [{ translateY: lockupY.value + driftY.value * 0.2 }],
  }));

  return (
    <GradientMeshBackground>
      <View style={styles.root}>
        <View style={styles.center}>
          <Animated.View style={[styles.ambientGlow, ambientGlowStyle]} />
          <Animated.View style={[styles.pulseRing, ringStyle]} />

          <Animated.View style={[styles.logoShell, logoStyle]}>
            <LinearGradient colors={gradients.orb} style={StyleSheet.absoluteFill} />
            <View style={styles.logoInner}>
              <Image source={iconAsset} resizeMode="contain" style={styles.logoImage} />
            </View>
          </Animated.View>

          <Animated.View style={[styles.lockup, lockupStyle]}>
            <AppText variant="display" style={styles.wordmark}>
              Nowly
            </AppText>
            <AppText variant="body" color="rgba(247,251,255,0.68)" style={styles.tagline}>
              {NOWLY_SLOGAN}
            </AppText>
          </Animated.View>
        </View>
      </View>
    </GradientMeshBackground>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[24],
  },
  center: {
    width: "100%",
    maxWidth: 420,
    minHeight: 320,
    alignItems: "center",
    justifyContent: "center",
  },
  ambientGlow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: "rgba(139,234,255,0.12)",
  },
  pulseRing: {
    position: "absolute",
    width: 188,
    height: 188,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(247,251,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  logoShell: {
    width: 118,
    height: 118,
    borderRadius: 38,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(247,251,255,0.18)",
    ...shadows.glow,
  },
  logoInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(4,8,20,0.12)",
  },
  logoImage: {
    width: 88,
    height: 88,
    borderRadius: 28,
  },
  lockup: {
    marginTop: spacing[24],
    alignItems: "center",
    gap: spacing[8],
  },
  wordmark: {
    textAlign: "center",
  },
  tagline: {
    textAlign: "center",
  },
});
