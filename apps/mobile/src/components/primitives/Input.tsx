import type { ComponentProps } from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, radii, spacing, typography } from "../../theme";

type Props = TextInputProps & {
  icon?: ComponentProps<typeof MaterialCommunityIcons>["name"];
};

export const Input = ({ icon = "magnify", style, ...props }: Props) => {
  return (
    <View style={styles.shell}>
      <MaterialCommunityIcons name={icon} size={18} color="rgba(247,251,255,0.54)" />
      <TextInput
        {...props}
        placeholderTextColor="rgba(247,251,255,0.42)"
        style={[styles.input, style]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: spacing[16],
  },
  input: {
    flex: 1,
    color: colors.cloud,
    ...typography.body,
    paddingVertical: spacing[12],
  },
});
