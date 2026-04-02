import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../../components/primitives/AppText";
import { PillButton } from "../../../components/primitives/PillButton";
import { colors, radii, spacing } from "../../../theme";

type PlanItem = {
  key: string;
  title: string;
  hint: string;
  onPress: () => void;
  loading?: boolean;
};

type Props = {
  items: PlanItem[];
};

export const MatchFastPlans = ({ items }: Props) => {
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          onPress={item.onPress}
          disabled={item.loading}
          style={({ pressed }) => [styles.card, item.loading ? styles.disabled : null, pressed && !item.loading ? styles.pressed : null]}
        >
          <View style={styles.copy}>
            <AppText variant="h3" color={colors.cloud}>
              {item.title}
            </AppText>
            <AppText variant="bodySmall" color={colors.muted}>
              {item.hint}
            </AppText>
          </View>
          <PillButton
            label={item.loading ? "Starting..." : "Start"}
            variant="secondary"
            onPress={item.onPress}
            disabled={item.loading}
          />
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: spacing[12],
  },
  card: {
    gap: spacing[16],
    borderRadius: radii.lg,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[16],
  },
  copy: {
    gap: spacing[8],
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.58,
  },
});
