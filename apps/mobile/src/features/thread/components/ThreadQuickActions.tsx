import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "../../../components/primitives/AppText";
import { colors, radii, spacing } from "../../../theme";

type Props = {
  reactions: string[];
  onReaction: (reaction: string) => void;
  onEta: () => void;
  etaLabel: string;
  disabled?: boolean;
};

export const ThreadQuickActions = ({
  reactions,
  onReaction,
  onEta,
  etaLabel,
  disabled = false,
}: Props) => {
  return (
    <View style={styles.root}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.reactionRail}
      >
        {reactions.map((reaction) => (
          <Pressable
            key={reaction}
            accessibilityRole="button"
            onPress={() => onReaction(reaction)}
            disabled={disabled}
            style={({ pressed }) => [
              styles.reactionChip,
              disabled ? styles.disabled : null,
              pressed && !disabled ? styles.pressed : null,
            ]}
          >
            <AppText variant="bodySmall" color={colors.cloud} style={styles.reactionText}>
              {reaction}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        onPress={onEta}
        disabled={disabled}
        style={({ pressed }) => [
          styles.etaButton,
          disabled ? styles.disabled : null,
          pressed && !disabled ? styles.pressed : null,
        ]}
      >
        <MaterialCommunityIcons name="timer-outline" size={18} color={colors.ink} />
        <AppText variant="label" color={colors.ink}>
          {etaLabel}
        </AppText>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    gap: spacing[12],
  },
  reactionRail: {
    gap: spacing[10],
    paddingRight: spacing[8],
  },
  reactionChip: {
    minHeight: 40,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[14],
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  reactionText: {
    fontFamily: "SpaceGrotesk_500Medium",
  },
  etaButton: {
    minHeight: 46,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[8],
    borderRadius: radii.pill,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    backgroundColor: "rgba(247,251,255,0.94)",
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  disabled: {
    opacity: 0.48,
  },
});
