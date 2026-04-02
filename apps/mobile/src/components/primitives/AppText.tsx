import type { ReactNode } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";
import { colors, typography } from "../../theme";

type Variant = keyof typeof typography;

type Props = {
  children: ReactNode;
  variant?: Variant;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

export const AppText = ({
  children,
  variant = "body",
  color = colors.cloud,
  style,
  numberOfLines,
}: Props) => {
  return (
    <Text numberOfLines={numberOfLines} style={[typography[variant], { color }, style]}>
      {children}
    </Text>
  );
};
