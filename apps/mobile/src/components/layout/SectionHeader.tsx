import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { colors, spacing } from "../../theme";
import { AppText } from "../primitives/AppText";

type Props = {
  label?: string;
  title: string;
  right?: ReactNode;
};

export const SectionHeader = ({ label, title, right }: Props) => {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        {label ? (
          <AppText variant="eyebrow" color="rgba(247,251,255,0.5)">
            {label}
          </AppText>
        ) : null}
        <AppText variant="h3" color={colors.cloud}>
          {title}
        </AppText>
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[16],
  },
  copy: {
    flex: 1,
    gap: spacing[8],
  },
});
