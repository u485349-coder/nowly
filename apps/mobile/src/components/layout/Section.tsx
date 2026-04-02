import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { spacing } from "../../theme";

type Props = {
  children: ReactNode;
};

export const Section = ({ children }: Props) => {
  return <View style={styles.section}>{children}</View>;
};

const styles = StyleSheet.create({
  section: {
    gap: spacing[16],
    marginBottom: spacing[24],
  },
});
