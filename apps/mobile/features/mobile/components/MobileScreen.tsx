import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GradientMesh } from "../../../components/ui/GradientMesh";
import { nowlyColors } from "../../../constants/theme";
import { useResponsiveLayout } from "../../../components/ui/useResponsiveLayout";
import { webPressableStyle } from "../../../lib/web-pressable";

export const MobileScreen = ({
  label,
  title,
  subtitle,
  onBack,
  right,
  footer,
  children,
}: {
  label?: string;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) => {
  const layout = useResponsiveLayout();

  return (
    <GradientMesh>
      <View style={styles.screen}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            alignItems: "center",
            paddingHorizontal: layout.screenPadding,
            paddingTop: layout.topPadding + 12,
            paddingBottom: footer ? 164 : 56,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ width: layout.shellWidth, gap: 18 }}>
            <View style={styles.headerRow}>
              {onBack ? (
                <Pressable
                  onPress={onBack}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.iconButton,
                    webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                  ]}
                >
                  <MaterialCommunityIcons name="chevron-left" size={22} color={nowlyColors.cloud} />
                </Pressable>
              ) : (
                <View style={styles.headerSpacer} />
              )}

              <View style={styles.headerCopy}>
                {label ? <Text style={styles.eyebrow}>{label}</Text> : null}
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>

              {right ? <View style={styles.headerRight}>{right}</View> : <View style={styles.headerSpacer} />}
            </View>

            {children}
          </View>
        </ScrollView>

        {footer ? <View style={styles.footerWrap}>{footer}</View> : null}
      </View>
    </GradientMesh>
  );
};

const styles = StyleSheet.create({
  eyebrow: {
    color: "rgba(139,234,255,0.76)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  footerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  headerRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 40,
  },
  headerRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerSpacer: {
    width: 40,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  screen: {
    flex: 1,
  },
  subtitle: {
    color: "rgba(247,251,255,0.62)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 24,
    lineHeight: 28,
  },
});
