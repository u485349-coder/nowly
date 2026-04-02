import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "../../../components/primitives/AppText";
import { colors, radii, spacing } from "../../../theme";

type Props = {
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  selected: boolean;
  onPress: () => void;
};

export const FormatOptionCard = ({ title, subtitle, icon, selected, onPress }: Props) => {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, selected ? styles.cardSelected : null, pressed ? styles.pressed : null]}>
      <View style={[styles.iconWrap, selected ? styles.iconWrapSelected : null]}>
        <MaterialCommunityIcons name={icon} size={20} color={selected ? colors.ink : colors.cloud} />
      </View>
      <View style={styles.copy}>
        <AppText variant="h3" color={selected ? colors.ink : colors.cloud}>
          {title}
        </AppText>
        <AppText variant="bodySmall" color={selected ? "rgba(4,8,20,0.74)" : colors.muted}>
          {subtitle}
        </AppText>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    gap: spacing[12],
    borderRadius: radii.lg,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[16],
  },
  cardSelected: {
    backgroundColor: "rgba(139,234,255,0.94)",
    borderColor: "rgba(255,255,255,0.2)",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  iconWrapSelected: {
    backgroundColor: "rgba(4,8,20,0.08)",
  },
  copy: {
    gap: spacing[6],
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
});
