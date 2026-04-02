import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "../../../components/primitives/AppText";
import { colors, radii, spacing } from "../../../theme";

type ResponseOption = {
  key: string;
  label: string;
  description: string;
  selected?: boolean;
  destructive?: boolean;
  loading?: boolean;
  onPress: () => void;
};

type Props = {
  options: ResponseOption[];
};

export const ProposalResponseOptions = ({ options }: Props) => {
  return (
    <View style={styles.list}>
      {options.map((option) => (
        <Pressable
          key={option.key}
          accessibilityRole="button"
          onPress={option.onPress}
          disabled={option.loading}
          style={({ pressed }) => [
            styles.card,
            option.selected ? styles.cardSelected : null,
            option.destructive ? styles.cardDestructive : null,
            option.loading ? styles.disabled : null,
            pressed && !option.loading ? styles.pressed : null,
          ]}
        >
          <View style={styles.cardCopy}>
            <AppText
              variant="body"
              color={option.selected ? colors.ink : option.destructive ? colors.dangerSoft : colors.cloud}
              style={styles.cardLabel}
            >
              {option.label}
            </AppText>
            <AppText
              variant="bodySmall"
              color={option.selected ? "rgba(4,8,20,0.72)" : colors.muted}
            >
              {option.loading ? "Saving your response..." : option.description}
            </AppText>
          </View>

          {option.selected ? (
            <MaterialCommunityIcons name="check-circle" size={20} color={colors.ink} />
          ) : (
            <MaterialCommunityIcons
              name={option.destructive ? "close-circle-outline" : "chevron-right"}
              size={20}
              color={option.destructive ? colors.dangerSoft : "rgba(247,251,255,0.46)"}
            />
          )}
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
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[12],
    borderRadius: radii.lg,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[14],
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardSelected: {
    backgroundColor: "rgba(247,251,255,0.96)",
    borderColor: "rgba(247,251,255,0.98)",
  },
  cardDestructive: {
    backgroundColor: "rgba(246,163,180,0.08)",
    borderColor: "rgba(246,163,180,0.18)",
  },
  cardCopy: {
    flex: 1,
    gap: spacing[4],
  },
  cardLabel: {
    fontFamily: "SpaceGrotesk_700Bold",
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.6,
  },
});
