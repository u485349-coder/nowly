import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "../../../components/primitives/AppText";
import { Avatar } from "../../../components/primitives/Avatar";
import { colors, radii, spacing } from "../../../theme";

type Participant = {
  id: string;
  name: string;
  photoUrl?: string | null;
};

type Props = {
  title: string;
  subtitle: string;
  participants: Participant[];
  isGroup: boolean;
  onBack: () => void;
  onOpenOptions: () => void;
};

export const ChatHeader = ({ title, subtitle, participants, isGroup, onBack, onOpenOptions }: Props) => {
  const visibleParticipants = participants.slice(0, 3);
  const overflowCount = Math.max(0, participants.length - visibleParticipants.length);
  const leadParticipant = participants[0];

  return (
    <View style={styles.root}>
      <Pressable accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
        <MaterialCommunityIcons name="chevron-left" size={22} color={colors.cloud} />
      </Pressable>

      <View style={styles.identity}>
        {isGroup ? (
          <View style={styles.avatarStack}>
            {visibleParticipants.map((participant, index) => (
              <Avatar
                key={participant.id}
                name={participant.name}
                photoUrl={participant.photoUrl}
                size={30}
                style={[styles.stackedAvatar, index > 0 ? { marginLeft: -10 } : null, { zIndex: visibleParticipants.length - index }]}
              />
            ))}
            {overflowCount > 0 ? (
              <View style={styles.overflowPill}>
                <AppText variant="label" color={colors.cloud} style={styles.overflowText}>
                  +{overflowCount}
                </AppText>
              </View>
            ) : null}
          </View>
        ) : leadParticipant ? (
          <Avatar name={leadParticipant.name} photoUrl={leadParticipant.photoUrl} size={34} />
        ) : null}

        <View style={styles.copy}>
          <AppText variant="h3" numberOfLines={1}>
            {title}
          </AppText>
          <AppText variant="bodySmall" color={colors.muted} numberOfLines={1}>
            {subtitle}
          </AppText>
        </View>
      </View>

      <Pressable accessibilityRole="button" onPress={onOpenOptions} style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
        <MaterialCommunityIcons name="information-outline" size={20} color={colors.cloud} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[12],
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
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.96 }],
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  stackedAvatar: {
    borderColor: "rgba(4,8,20,0.76)",
  },
  overflowPill: {
    marginLeft: -10,
    minWidth: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[8],
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  overflowText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 11,
    lineHeight: 12,
  },
});
