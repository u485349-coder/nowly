import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { nowlyColors } from "../../../constants/theme";

export const MobileSectionHeader = ({
  label,
  title,
  right,
}: {
  label?: string;
  title: string;
  right?: ReactNode;
}) => (
  <View style={styles.row}>
    <View style={styles.copy}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Text style={styles.title}>{title}</Text>
    </View>
    {right}
  </View>
);

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: 4,
  },
  label: {
    color: "rgba(247,251,255,0.54)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  title: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 20,
    lineHeight: 24,
  },
});
