import { StyleSheet, View } from "react-native";
import { Avatar } from "../../../components/primitives/Avatar";
import { AppText } from "../../../components/primitives/AppText";
import { colors, radii, spacing } from "../../../theme";

type ParticipantItem = {
  id: string;
  name: string;
  responseLabel: string;
  statusLabel: string;
  photoUrl?: string | null;
  isCurrentUser?: boolean;
};

type Props = {
  items: ParticipantItem[];
};

export const ProposalParticipantList = ({ items }: Props) => {
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item.id} style={[styles.row, item.isCurrentUser ? styles.currentRow : null]}>
          <View style={styles.identity}>
            <Avatar name={item.name} photoUrl={item.photoUrl} size={44} />
            <View style={styles.copy}>
              <AppText variant="body" color={colors.cloud} style={styles.name}>
                {item.name}
              </AppText>
              <AppText variant="bodySmall" color={item.isCurrentUser ? "rgba(139,234,255,0.9)" : colors.muted}>
                {item.responseLabel}
              </AppText>
            </View>
          </View>

          <View style={[styles.statusPill, item.isCurrentUser ? styles.currentStatusPill : null]}>
            <AppText variant="label" color={item.isCurrentUser ? colors.ink : colors.cloud}>
              {item.statusLabel}
            </AppText>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: spacing[12],
  },
  row: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[12],
    borderRadius: radii.lg,
    paddingHorizontal: spacing[12],
    paddingVertical: spacing[12],
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentRow: {
    backgroundColor: "rgba(139,234,255,0.08)",
    borderColor: "rgba(139,234,255,0.22)",
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
    fontFamily: "SpaceGrotesk_500Medium",
  },
  statusPill: {
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    paddingHorizontal: spacing[12],
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentStatusPill: {
    backgroundColor: "rgba(247,251,255,0.96)",
    borderColor: "rgba(247,251,255,0.96)",
  },
});
