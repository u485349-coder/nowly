import { Pressable, StyleSheet, View } from "react-native";
import { GlassCard } from "../../../components/primitives/GlassCard";
import { AppText } from "../../../components/primitives/AppText";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, spacing } from "../../../theme";

type Props = {
  title: string;
  detail: string;
  onPress: () => void;
};

export const TimingSignalCard = ({ title, detail, onPress }: Props) => {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.pressable, pressed ? styles.pressed : null]}>
      <GlassCard>
        <View style={styles.row}>
          <View style={styles.copy}>
            <AppText variant="eyebrow" color="rgba(247,251,255,0.5)">
              Best next window
            </AppText>
            <AppText variant="h3">{title}</AppText>
            <AppText variant="body" color="rgba(247,251,255,0.64)">
              {detail}
            </AppText>
          </View>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="arrow-top-right" size={18} color={colors.cloud} />
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    width: "100%",
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.994 }],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[16],
  },
  copy: {
    flex: 1,
    gap: spacing[8],
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
});
