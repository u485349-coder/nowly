import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { spacing } from "../../theme";

type Props = {
  children: ReactNode;
  gap?: keyof typeof spacing;
  style?: StyleProp<ViewStyle>;
};

export const Stack = ({ children, gap = 16, style }: Props) => {
  return <View style={[styles.base, { gap: spacing[gap] }, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    width: "100%",
  },
});
