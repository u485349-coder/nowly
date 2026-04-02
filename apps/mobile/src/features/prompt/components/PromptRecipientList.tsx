import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Avatar } from "../../../components/primitives/Avatar";
import { AppText } from "../../../components/primitives/AppText";
import { colors, radii, spacing } from "../../../theme";

type RecipientItem = {
  id: string;
  name: string;
  photoUrl?: string | null;
  eyebrow: string;
  detail: string;
  selected: boolean;
  onPress: () => void;
};

type Props = {
  items: RecipientItem[];
};

export const PromptRecipientList = ({ items }: Props) => {
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          onPress={item.onPress}
          style={({ pressed }) => [
            styles.card,
            item.selected ? styles.cardSelected : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <View style={styles.identity}>
            <Avatar name={item.name} photoUrl={item.photoUrl} size={52} />
            <View style={styles.copy}>
              <AppText variant="body" color={colors.cloud} style={styles.name}>
                {item.name}
              </AppText>
              <AppText variant="bodySmall" color="rgba(247,251,255,0.6)">
                {item.eyebrow}
              </AppText>
              <AppText variant="bodySmall" color="rgba(139,234,255,0.82)">
                {item.detail}
              </AppText>
            </View>
          </View>

          <View style={[styles.selection, item.selected ? styles.selectionActive : null]}>
            <MaterialCommunityIcons
              name={item.selected ? "check" : "plus"}
              size={18}
              color={item.selected ? colors.ink : colors.cloud}
            />
          </View>
        </Pressable>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: spacing[12],
  },
  card: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[12],
    borderRadius: radii.xl,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[14],
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardSelected: {
    backgroundColor: "rgba(139,234,255,0.08)",
    borderColor: "rgba(139,234,255,0.24)",
  },
  identity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
    minWidth: 0,
  },
  copy: {
    flex: 1,
    gap: spacing[4],
    minWidth: 0,
  },
  name: {
    fontFamily: "SpaceGrotesk_700Bold",
  },
  selection: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectionActive: {
    backgroundColor: "rgba(247,251,255,0.96)",
    borderColor: "rgba(247,251,255,0.96)",
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
});

