import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "../../theme";
import { AppText } from "../primitives/AppText";

type Props = {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  detail?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  selected?: boolean;
};

export const EntityRow = ({ leading, title, subtitle, detail, trailing, onPress, selected = false }: Props) => {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        selected ? styles.selected : null,
        pressed && onPress ? styles.pressed : null,
      ]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.body}>
        <AppText variant="h3">{title}</AppText>
        {subtitle ? (
          <AppText variant="bodySmall" color={colors.muted}>
            {subtitle}
          </AppText>
        ) : null}
        {detail ? (
          <AppText variant="bodySmall" color="rgba(139,234,255,0.82)">
            {detail}
          </AppText>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[16],
    borderRadius: radii.lg,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[16],
  },
  selected: {
    borderColor: "rgba(139,234,255,0.4)",
    backgroundColor: "rgba(139,234,255,0.1)",
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.992 }],
  },
  leading: {
    alignSelf: "flex-start",
  },
  body: {
    flex: 1,
    gap: spacing[4],
  },
  trailing: {
    alignItems: "flex-end",
    gap: spacing[8],
  },
});
