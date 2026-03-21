import { ReactNode } from "react";
import { Platform, Pressable, Text } from "react-native";
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
  const isWeb = Platform.OS === "web";
  const styleByVariant = {
    primary: "bg-aqua/18 border border-aqua/28",
    secondary: "bg-white/10 border border-white/15",
    ghost: "bg-transparent border border-transparent",
  }[variant];

  const textByVariant = {
    primary: "text-cloud",
    secondary: "text-cloud",
    ghost: "text-cloud",
  }[variant];

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`flex-row items-center justify-center gap-2 rounded-full px-4 py-3 ${styleByVariant} ${disabled ? "opacity-45" : ""}`}
      style={({ pressed }) =>
        isWeb
          ? webPressableStyle(pressed, { disabled, pressedOpacity: 0.88, pressedScale: 0.99 })
          : undefined
      }
    >
      {leftSlot}
      <Text className={`font-display text-[15px] ${textByVariant}`}>{label}</Text>
    </Pressable>
  );
};
