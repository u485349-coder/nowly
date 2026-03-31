import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { nowlyColors } from "../../../constants/theme";

export const MobileSearchField = ({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) => (
  <View style={styles.shell}>
    <MaterialCommunityIcons name="magnify" size={18} color="rgba(247,251,255,0.48)" />
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="rgba(247,251,255,0.42)"
      style={styles.input}
    />
    {value ? (
      <Pressable onPress={() => onChangeText("")} hitSlop={8}>
        <MaterialCommunityIcons name="close" size={18} color="rgba(247,251,255,0.48)" />
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  input: {
    flex: 1,
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 15,
    lineHeight: 18,
    paddingVertical: 0,
  },
  shell: {
    minHeight: 52,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
