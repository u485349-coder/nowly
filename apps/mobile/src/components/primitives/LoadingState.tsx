import { ActivityIndicator, StyleSheet, View } from "react-native";
import { colors, spacing } from "../../theme";
import { GlassCard } from "./GlassCard";
import { AppText } from "./AppText";

type Props = {
  title: string;
  message?: string;
};

export const LoadingState = ({ title, message }: Props) => {
  return (
    <GlassCard>
      <View style={styles.row}>
        <ActivityIndicator color={colors.aqua} />
        <View style={styles.copy}>
          <AppText variant="h3">{title}</AppText>
          {message ? (
            <AppText variant="body" color={colors.muted}>
              {message}
            </AppText>
          ) : null}
        </View>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[16],
  },
  copy: {
    flex: 1,
    gap: spacing[8],
  },
});
