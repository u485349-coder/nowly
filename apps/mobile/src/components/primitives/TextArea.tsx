import type { TextInputProps } from "react-native";
import { StyleSheet, TextInput, View } from "react-native";
import { colors, radii, spacing, typography } from "../../theme";

type Props = TextInputProps;

export const TextArea = ({ style, multiline = true, textAlignVertical = "top", ...props }: Props) => {
  return (
    <View style={styles.shell}>
      <TextInput
        {...props}
        multiline={multiline}
        textAlignVertical={textAlignVertical}
        placeholderTextColor="rgba(247,251,255,0.42)"
        style={[styles.input, style]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {
    minHeight: 120,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[14],
  },
  input: {
    minHeight: 92,
    color: colors.cloud,
    ...typography.body,
  },
});
