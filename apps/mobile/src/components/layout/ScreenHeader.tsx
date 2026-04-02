import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing } from "../../theme";
import { AppText } from "../primitives/AppText";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
};

export const ScreenHeader = ({ eyebrow, title, subtitle, onBack, right }: Props) => {
  return (
    <View style={styles.root}>
      <View style={styles.row}>
        <View style={styles.main}>
          {eyebrow ? (
            <AppText variant="eyebrow" color="rgba(247,251,255,0.56)">
              {eyebrow}
            </AppText>
          ) : null}
          <View style={styles.titleRow}>
            {onBack ? (
              <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
                <MaterialCommunityIcons name="chevron-left" size={22} color={colors.cloud} />
              </Pressable>
            ) : null}
            <View style={styles.titleBlock}>
              <AppText variant="h1">{title}</AppText>
              {subtitle ? (
                <AppText variant="body" color={colors.muted}>
                  {subtitle}
                </AppText>
              ) : null}
            </View>
          </View>
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    marginBottom: spacing[24],
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing[16],
  },
  main: {
    flex: 1,
    gap: spacing[8],
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[12],
  },
  titleBlock: {
    flex: 1,
    gap: spacing[8],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  right: {
    paddingTop: spacing[4],
  },
});
