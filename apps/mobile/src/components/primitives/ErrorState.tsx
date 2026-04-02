import { StyleSheet, View } from "react-native";
import { PillButton } from "./PillButton";
import { GlassCard } from "./GlassCard";
import { AppText } from "./AppText";
import { spacing } from "../../theme";

type Props = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export const ErrorState = ({ title, message, actionLabel, onAction }: Props) => {
  return (
    <GlassCard>
      <View style={styles.copy}>
        <AppText variant="h3">{title}</AppText>
        <AppText variant="body" color="rgba(247,251,255,0.64)">
          {message}
        </AppText>
      </View>
      {actionLabel && onAction ? <PillButton label={actionLabel} onPress={onAction} variant="secondary" /> : null}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  copy: {
    gap: spacing[8],
  },
});
