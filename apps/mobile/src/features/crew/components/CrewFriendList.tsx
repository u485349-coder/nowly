import { StyleSheet, View } from "react-native";
import { EntityRow } from "../../../components/display/EntityRow";
import { Avatar } from "../../../components/primitives/Avatar";
import { IconButton } from "../../../components/primitives/IconButton";
import { AppText } from "../../../components/primitives/AppText";
import { spacing } from "../../../theme";

type FriendItem = {
  id: string;
  name: string;
  subtitle: string;
  detail?: string;
  photoUrl?: string | null;
  onMessage: () => void;
  onShare: () => void;
  onRemove: () => void;
};

type Props = {
  items: FriendItem[];
};

export const CrewFriendList = ({ items }: Props) => {
  if (!items.length) {
    return (
      <AppText variant="body" color="rgba(247,251,255,0.6)">
        Add a few people and your crew graph will start to move here.
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
              <IconButton icon="chat-processing-outline" onPress={item.onMessage} />
              <IconButton icon="share-variant-outline" onPress={item.onShare} tone="accent" />
              <IconButton icon="account-minus-outline" onPress={item.onRemove} />
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
    minWidth: 52,
    alignItems: "flex-end",
    gap: spacing[8],
  },
});
