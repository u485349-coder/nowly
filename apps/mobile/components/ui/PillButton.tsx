import { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { nowlyColors } from "../../constants/theme";
import { webPressableStyle } from "../../lib/web-pressable";

type Props = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  leftSlot?: ReactNode;
  disabled?: boolean;
};

export const PillButton = ({
  label,
  onPress,
  variant = "primary",
  leftSlot,
  disabled = false,
}: Props) => {
  const { width } = useWindowDimensions();
  const isCompactPhone = width < 390;
  const isWeb = Platform.OS === "web";
  const textColor = variant === "primary" ? styles.primaryText : styles.secondaryText;
  const baseHeight = isCompactPhone ? 50 : 54;
  const fontSize = isCompactPhone ? 15 : 16;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressable,
        { minHeight: baseHeight },
        variant === "ghost" ? styles.ghostPressable : styles.filledPressable,
        disabled ? styles.disabled : null,
        isWeb ? webPressableStyle(pressed, { disabled, pressedOpacity: 0.9, pressedScale: 0.986 }) : null,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      {variant === "primary" ? (
        <LinearGradient
          colors={["#F7FBFF", "#D9EEFF", "#BFE7FF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, variant === "secondary" ? styles.secondaryFill : styles.ghostFill]} />
      )}

      <View
        style={[
          styles.inner,
          { minHeight: baseHeight, paddingHorizontal: isCompactPhone ? 18 : 22 },
          variant === "secondary" ? styles.secondaryInner : null,
          variant === "ghost" ? styles.ghostInner : null,
        ]}
      >
        {leftSlot}
        <Text style={[styles.label, textColor, { fontSize }]}>{label}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    overflow: "hidden",
    borderRadius: 999,
  },
  filledPressable: {
    shadowColor: nowlyColors.glow,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    elevation: 6,
  },
  ghostPressable: {
    alignSelf: "flex-start",
  },
  disabled: {
    opacity: 0.5,
  },
  secondaryFill: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  ghostFill: {
    backgroundColor: "transparent",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  secondaryInner: {
    minHeight: 52,
  },
  ghostInner: {
    minHeight: 40,
    paddingHorizontal: 0,
    paddingVertical: 0,
    justifyContent: "flex-start",
  },
  label: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
  },
  primaryText: {
    color: "#081120",
  },
  secondaryText: {
    color: nowlyColors.cloud,
  },
});
