import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "../../../components/primitives/AppText";
import { colors, radii, spacing, typography } from "../../../theme";

type Props = {
  startValue: string;
  endValue: string;
  onChangeStart: (value: string) => void;
  onChangeEnd: (value: string) => void;
  onRemove: () => void;
};

export const TimeRangeEditorRow = ({
  startValue,
  endValue,
  onChangeStart,
  onChangeEnd,
  onRemove,
}: Props) => {
  return (
    <View style={styles.row}>
      <View style={styles.field}>
        <AppText variant="bodySmall" color={colors.muted}>
          Start
        </AppText>
        <TextInput
          value={startValue}
          onChangeText={onChangeStart}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="6:00 PM"
          placeholderTextColor="rgba(247,251,255,0.42)"
          style={styles.input}
        />
      </View>

      <AppText variant="body" color={colors.muted}>
        -
      </AppText>

      <View style={styles.field}>
        <AppText variant="bodySmall" color={colors.muted}>
          End
        </AppText>
        <TextInput
          value={endValue}
          onChangeText={onChangeEnd}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="8:00 PM"
          placeholderTextColor="rgba(247,251,255,0.42)"
          style={styles.input}
        />
      </View>

      <Pressable accessibilityRole="button" onPress={onRemove} style={({ pressed }) => [styles.removeButton, pressed ? styles.pressed : null]}>
        <MaterialCommunityIcons name="close" size={16} color={colors.cloud} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
  },
  field: {
    flex: 1,
    gap: spacing[6],
    borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[10],
  },
  input: {
    color: colors.cloud,
    ...typography.body,
    paddingVertical: 0,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.96 }],
  },
});
