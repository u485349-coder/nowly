import { StyleSheet, View } from "react-native";
import { EntityRow } from "../../../components/display/EntityRow";
import { Avatar } from "../../../components/primitives/Avatar";
import { PillButton } from "../../../components/primitives/PillButton";
import { spacing } from "../../../theme";

type RadarItem = {
  id: string;
  name: string;
  line: string;
  detail?: string;
  photoUrl?: string | null;
  action: string;
  onPress: () => void;
};

type Props = {
  items: RadarItem[];
};

export const RadarList = ({ items }: Props) => {
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <EntityRow
          key={item.id}
          leading={<Avatar name={item.name} photoUrl={item.photoUrl} size={48} />}
          title={item.name}
          subtitle={item.line}
          detail={item.detail}
          trailing={<PillButton label={item.action} onPress={item.onPress} variant="secondary" />}
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
});
