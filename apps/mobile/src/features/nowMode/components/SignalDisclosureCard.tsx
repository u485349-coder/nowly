import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassCard } from "../../../components/primitives/GlassCard";
import { AppText } from "../../../components/primitives/AppText";
import { colors, spacing } from "../../../theme";

type Props = {
  title: string;
  summary: string;
  children: ReactNode;
  defaultExpanded?: boolean;
};

export const SignalDisclosureCard = ({
  title,
  summary,
  children,
  defaultExpanded = false,
}: Props) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <GlassCard>
      <View style={styles.headerWrap}>
        <View style={styles.copy}>
          <AppText variant="h3">{title}</AppText>
          <AppText variant="bodySmall" color={colors.muted}>
            {summary}
          </AppText>
        </View>
        <Pressable accessibilityRole="button" onPress={() => setExpanded((current) => !current)} style={({ pressed }) => [styles.toggle, pressed ? styles.pressed : null]}>
          <MaterialCommunityIcons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={colors.cloud} />
        </Pressable>
      </View>

      {expanded ? <View style={styles.content}>{children}</View> : null}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  headerWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[12],
  },
  copy: {
    flex: 1,
    gap: spacing[6],
  },
  toggle: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  content: {
    gap: spacing[16],
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.96 }],
  },
});
