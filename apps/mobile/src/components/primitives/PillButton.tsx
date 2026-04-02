import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, gradients, radii, spacing } from "../../theme";
import { AppText } from "./AppText";

type Variant = "primary" | "secondary" | "ghost";

type Props = {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  leftSlot?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export const PillButton = ({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  leftSlot,
  style,
}: Props) => {
  const isInteractive = Boolean(onPress) && !disabled && !loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={!isInteractive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "secondary" ? styles.secondary : null,
        variant === "ghost" ? styles.ghost : null,
        pressed && isInteractive ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      {variant === "primary" ? (
        <LinearGradient colors={gradients.primaryAction} style={styles.fill}>
          <View style={styles.content}>
            {loading ? <ActivityIndicator color={colors.ink} /> : leftSlot}
            <AppText variant="body" color={colors.ink} style={styles.label}>
              {label}
            </AppText>
          </View>
        </LinearGradient>
      ) : (
        <View style={styles.content}>
          {loading ? <ActivityIndicator color={colors.cloud} /> : leftSlot}
          <AppText variant="body" color={variant === "ghost" ? colors.muted : colors.cloud} style={styles.label}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    overflow: "hidden",
    borderRadius: radii.pill,
  },
  fill: {
    minHeight: 52,
    justifyContent: "center",
    borderRadius: radii.pill,
    paddingHorizontal: spacing[20],
  },
  secondary: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: spacing[20],
    justifyContent: "center",
  },
  ghost: {
    paddingHorizontal: spacing[4],
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[8],
  },
  label: {
    fontFamily: "SpaceGrotesk_700Bold",
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.48,
  },
});
