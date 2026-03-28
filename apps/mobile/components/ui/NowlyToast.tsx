import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { nowlyColors } from "../../constants/theme";
import { webPressableStyle } from "../../lib/web-pressable";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export type NowlyToastPayload = {
  id: string;
  title: string;
  message: string;
  icon?: IconName;
  ctaLabel?: string;
  onPress?: () => void;
};

type NowlyToastProps = {
  toast: NowlyToastPayload | null;
  top?: number;
};

export const NowlyToast = ({ toast, top = 14 }: NowlyToastProps) => {
  const insets = useSafeAreaInsets();

  if (!toast) {
    return null;
  }

  const safeTop = Math.max(top, insets.top + 8);
  const pressable = Boolean(toast.onPress);

  return (
    <View pointerEvents="box-none" style={[styles.host, { top: safeTop }]}>
      <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOutUp.duration(180)}>
        <Pressable
          disabled={!pressable}
          onPress={toast.onPress}
          style={({ pressed }) => [
            styles.shell,
            webPressableStyle(pressed, {
              disabled: !pressable,
              pressedOpacity: 0.95,
              pressedScale: 0.99,
            }),
          ]}
        >
          <LinearGradient
            colors={["rgba(20,30,56,0.98)", "rgba(32,54,80,0.94)", "rgba(20,28,49,0.98)"]}
            start={{ x: 0.05, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name={toast.icon ?? "bell-ring-outline"} size={18} color="#081120" />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{toast.title}</Text>
              <Text style={styles.message}>{toast.message}</Text>
            </View>
            {toast.ctaLabel ? (
              <View style={styles.ctaPill}>
                <Text style={styles.ctaText}>{toast.ctaLabel}</Text>
              </View>
            ) : null}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  ctaPill: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ctaText: {
    color: "rgba(248,250,252,0.9)",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 11,
  },
  host: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 60,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: nowlyColors.aqua,
    shadowColor: nowlyColors.aqua,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  message: {
    color: "rgba(248,250,252,0.88)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  shell: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: nowlyColors.glow,
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  title: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 14,
    lineHeight: 18,
  },
});
