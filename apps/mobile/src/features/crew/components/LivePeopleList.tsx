import { StyleSheet, View } from "react-native";
import { EntityRow } from "../../../components/display/EntityRow";
import { Avatar } from "../../../components/primitives/Avatar";
import { PillButton } from "../../../components/primitives/PillButton";
import { AppText } from "../../../components/primitives/AppText";
import { spacing } from "../../../theme";

type LivePerson = {
  id: string;
  name: string;
  subtitle: string;
  detail?: string;
  photoUrl?: string | null;
  onMessage: () => void;
  onNudge: () => void;
};

type Props = {
  items: LivePerson[];
};

export const LivePeopleList = ({ items }: Props) => {
  if (!items.length) {
    return (
      <AppText variant="body" color="rgba(247,251,255,0.6)">
        No live crew signals yet. Go live or invite someone in.
      </AppText>
    );
  }

  return (
    <View style={styles.list}>
      {items.map((item) => (
        <EntityRow
          key={item.id}
          leading={<Avatar name={item.name} photoUrl={item.photoUrl} size={52} />}
          title={item.name}
          subtitle={item.subtitle}
          detail={item.detail}
          trailing={
            <View style={styles.actions}>
              <PillButton label="Message" onPress={item.onMessage} variant="secondary" />
              <PillButton label="Nudge" onPress={item.onNudge} variant="ghost" />
            </View>
          }
          onPress={item.onMessage}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: spacing[12],
  },
  actions: {
    minWidth: 96,
    alignItems: "flex-end",
    gap: spacing[8],
  },
});
