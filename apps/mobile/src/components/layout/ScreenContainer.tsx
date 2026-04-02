import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBreakpoint } from "../../hooks/layout/useBreakpoint";
import { spacing } from "../../theme";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  includeBottomNavInset?: boolean;
};

export const ScreenContainer = ({
  children,
  style,
  contentStyle,
  includeBottomNavInset = false,
}: Props) => {
  const insets = useSafeAreaInsets();
  const layout = useBreakpoint();

  return (
    <ScrollView
      style={[styles.scroll, style]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + layout.topPadding,
          paddingBottom: insets.bottom + spacing[32] + (includeBottomNavInset ? layout.bottomNavInset : 0),
          paddingHorizontal: layout.horizontalPadding,
          paddingLeft: layout.horizontalPadding + layout.railOffset,
        },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.inner, { maxWidth: layout.maxContentWidth }]}>{children}</View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    alignItems: "center",
  },
  inner: {
    width: "100%",
  },
});
