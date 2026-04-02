import { StyleSheet, View } from "react-native";
import { EntityRow } from "../../../components/display/EntityRow";
import { Avatar } from "../../../components/primitives/Avatar";
import { Badge } from "../../../components/primitives/Badge";
import { AppText } from "../../../components/primitives/AppText";
import { spacing } from "../../../theme";

type Conversation = {
  id: string;
  title: string;
  subtitle: string;
  timestamp?: string;
  unreadCount?: number;
  photoUrl?: string | null;
  onPress: () => void;
};

type Props = {
  conversations: Conversation[];
};

export const ConversationList = ({ conversations }: Props) => {
  if (!conversations.length) {
    return (
      <AppText variant="body" color="rgba(247,251,255,0.6)">
        Start your first thread and it will land here.
      </AppText>
    );
  }

  return (
    <View style={styles.list}>
      {conversations.map((item) => (
        <EntityRow
          key={item.id}
          leading={<Avatar name={item.title} photoUrl={item.photoUrl} size={52} />}
          title={item.title}
          subtitle={item.subtitle}
          trailing={
            <View style={styles.trailing}>
              {item.timestamp ? (
                <AppText variant="bodySmall" color="rgba(247,251,255,0.48)">
                  {item.timestamp}
                </AppText>
              ) : null}
              {item.unreadCount ? <Badge value={item.unreadCount > 99 ? "99+" : item.unreadCount} /> : null}
            </View>
          }
          onPress={item.onPress}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: spacing[12],
  },
  trailing: {
    alignItems: "flex-end",
    gap: spacing[8],
  },
});
