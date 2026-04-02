import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radii, spacing } from "../../theme";
import { AppText } from "./AppText";

type Props = {
  value: string | number;
  style?: StyleProp<ViewStyle>;
};

export const Badge = ({ value, style }: Props) => {
  return (
    <View style={[styles.base, style]}>
      <AppText variant="label" color={colors.ink} style={styles.text}>
        {value}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: colors.aqua,
    paddingHorizontal: spacing[8],
  },
  text: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 10,
    lineHeight: 12,
  },
});
