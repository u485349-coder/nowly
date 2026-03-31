import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsiveLayout } from "../../../components/ui/useResponsiveLayout";

export const MobileStickyActions = ({ children }: { children: ReactNode }) => {
  const layout = useResponsiveLayout();
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={["rgba(4,8,20,0.00)", "rgba(4,8,20,0.82)", "rgba(4,8,20,0.98)"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[
        styles.fade,
        {
          paddingHorizontal: layout.screenPadding,
          paddingTop: 18,
          paddingBottom: Math.max(14, insets.bottom + 8),
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={{ width: layout.shellWidth, alignSelf: "center", gap: 10 }}>{children}</View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  fade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
});
