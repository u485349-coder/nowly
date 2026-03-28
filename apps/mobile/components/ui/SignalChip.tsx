import { Platform, Pressable, Text, useWindowDimensions } from "react-native";
import { webPressableStyle } from "../../lib/web-pressable";

export const SignalChip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) => {
  const { width } = useWindowDimensions();
  const isCompactPhone = width < 390;

  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border ${
        active
          ? "border-violet/55 bg-violet/18"
          : "border-white/8 bg-white/[0.045]"
      }`}
      style={({ pressed }) => [
        {
          paddingHorizontal: isCompactPhone ? 12 : 16,
          paddingVertical: isCompactPhone ? 7 : 8,
        },
        Platform.OS === "web"
          ? webPressableStyle(pressed, { pressedOpacity: 0.86, pressedScale: 0.99 })
          : undefined,
      ]}
    >
      <Text
        className={`font-body ${active ? "text-cloud" : "text-white/78"}`}
        style={{ fontSize: isCompactPhone ? 13 : 14 }}
      >
        {label}
      </Text>
    </Pressable>
  );
};
