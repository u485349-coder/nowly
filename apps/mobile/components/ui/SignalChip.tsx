import { Platform, Pressable, Text } from "react-native";
import { webPressableStyle } from "../../lib/web-pressable";

export const SignalChip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    className={`rounded-full border px-4 py-2 ${
      active
        ? "border-aqua/55 bg-aqua/16"
        : "border-white/8 bg-white/[0.045]"
    }`}
    style={({ pressed }) =>
      Platform.OS === "web"
        ? webPressableStyle(pressed, { pressedOpacity: 0.86, pressedScale: 0.99 })
        : undefined
    }
  >
    <Text className={`font-body text-sm ${active ? "text-cloud" : "text-white/78"}`}>{label}</Text>
  </Pressable>
);
