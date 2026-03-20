import { ReactNode } from "react";
import { Pressable, Text } from "react-native";

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
  const styleByVariant = {
    primary: "bg-cloud",
    secondary: "bg-white/10 border border-white/15",
    ghost: "bg-transparent border border-transparent",
  }[variant];

  const textByVariant = {
    primary: "text-ink",
    secondary: "text-cloud",
    ghost: "text-cloud",
  }[variant];

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`flex-row items-center justify-center gap-2 rounded-full px-4 py-3 ${styleByVariant} ${disabled ? "opacity-45" : ""}`}
    >
      {leftSlot}
      <Text className={`font-display text-[15px] ${textByVariant}`}>{label}</Text>
    </Pressable>
  );
};
