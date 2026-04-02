import { StyleSheet, View } from "react-native";
import { SectionHeader } from "../../../components/layout/SectionHeader";
import { EntityRow } from "../../../components/display/EntityRow";
import { AppText } from "../../../components/primitives/AppText";
import { Pressable } from "react-native";
import { colors, radii, spacing } from "../../../theme";

type Item = {
  id: string;
  name: string;
  line: string;
  detail: string;
  action: string;
  onPress: () => void;
};

type Props = {
  label: string;
  title: string;
  emptyText: string;
  items: Item[];
};

export const LiveContextList = ({ label, title, emptyText, items }: Props) => {
  return (
    <View style={styles.section}>
      <SectionHeader label={label} title={title} />
      {items.length ? (
        <View style={styles.list}>
          {items.map((item) => (
            <EntityRow
              key={item.id}
              title={item.name}
              subtitle={item.line}
              detail={item.detail}
              onPress={item.onPress}
              trailing={
                <Pressable accessibilityRole="button" onPress={item.onPress} style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}>
                  <AppText variant="label" color={colors.cloud}>
                    {item.action}
                  </AppText>
                </Pressable>
              }
            />
          ))}
        </View>
      ) : (
        <AppText variant="body" color={colors.muted}>
          {emptyText}
        </AppText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: spacing[16],
  },
  list: {
    gap: spacing[12],
  },
  action: {
    minHeight: 38,
    minWidth: 78,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[12],
    borderRadius: radii.pill,
    backgroundColor: "rgba(124,58,237,0.18)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
});
