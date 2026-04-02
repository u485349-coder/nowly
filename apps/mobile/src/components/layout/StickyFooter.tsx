import type { ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBreakpoint } from "../../hooks/layout/useBreakpoint";
import { colors, radii, spacing } from "../../theme";

type Props = {
  children: ReactNode;
};

export const StickyFooter = ({ children }: Props) => {
  const insets = useSafeAreaInsets();
  const layout = useBreakpoint();

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.host,
        {
          paddingBottom: Math.max(insets.bottom, spacing[12]),
          paddingHorizontal: layout.horizontalPadding,
          paddingLeft: layout.horizontalPadding + layout.railOffset,
        },
      ]}
    >
      <View style={[styles.inner, { maxWidth: layout.maxContentWidth }]}> 
        <LinearGradient
          colors={["rgba(4,8,20,0)", "rgba(4,8,20,0.78)", "rgba(4,8,20,0.96)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.panel}>{children}</View>
        </LinearGradient>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    alignItems: "center",
    pointerEvents: "box-none",
  },
  inner: {
    width: "100%",
  },
  gradient: {
    width: "100%",
    paddingTop: spacing[24],
  },
  panel: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(10,14,30,0.86)",
    padding: spacing[8],
  },
});
