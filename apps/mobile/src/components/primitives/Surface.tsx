import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radii, shadows, spacing } from "../../theme";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export const Surface = ({ children, style }: Props) => {
  return <View style={[styles.base, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[20],
    ...shadows.card,
  },
});
