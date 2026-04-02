import { StyleSheet, View } from "react-native";
import { spacing } from "../../theme";
import { GlassCard } from "./GlassCard";
import { AppText } from "./AppText";

type Props = {
  title: string;
  message: string;
};

export const EmptyState = ({ title, message }: Props) => {
  return (
    <GlassCard>
      <View style={styles.copy}>
        <AppText variant="h3">{title}</AppText>
        <AppText variant="body" color="rgba(247,251,255,0.64)">
          {message}
        </AppText>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  copy: {
    gap: spacing[8],
  },
});
