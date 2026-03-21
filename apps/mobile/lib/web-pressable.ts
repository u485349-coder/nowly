import { Platform } from "react-native";
import type { ViewStyle } from "react-native";

type WebPressableOptions = {
  disabled?: boolean;
  pressedOpacity?: number;
  pressedScale?: number;
};

export const webPressableStyle = (
  pressed: boolean,
  {
    disabled = false,
    pressedOpacity = 0.9,
    pressedScale = 0.992,
  }: WebPressableOptions = {},
): ViewStyle | null => {
  if (Platform.OS !== "web") {
    return null;
  }

  return {
    cursor: disabled ? "auto" : "pointer",
    opacity: disabled ? 0.45 : pressed ? pressedOpacity : 1,
    transform: [{ scale: pressed ? pressedScale : 1 }],
  };
};
