import { Pressable, Text } from "react-native";

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
        ? "border-aqua/80 bg-aqua/20"
        : "border-white/10 bg-white/6"
    }`}
  >
    <Text className={`font-body text-sm ${active ? "text-cloud" : "text-white/72"}`}>{label}</Text>
  </Pressable>
);
