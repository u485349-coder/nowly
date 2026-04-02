import { StyleSheet, View } from "react-native";
import { EntityRow } from "../../../components/display/EntityRow";
import { PillButton } from "../../../components/primitives/PillButton";
import { AppText } from "../../../components/primitives/AppText";
import { spacing } from "../../../theme";

type Edge = {
  id: string;
  name: string;
  subtitle: string;
  actionLabel: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  disabled?: boolean;
};

type Props = {
  items: Edge[];
  emptyMessage?: string;
};

export const SocialEdgeList = ({ items, emptyMessage = "No social edges to surface right now." }: Props) => {
  if (!items.length) {
    return (
      <AppText variant="body" color="rgba(247,251,255,0.6)">
        {emptyMessage}
      </AppText>
    );
  }

  return (
    <View style={styles.list}>
      {items.map((item) => (
        <EntityRow
          key={item.id}
          title={item.name}
          subtitle={item.subtitle}
          trailing={
            <View style={styles.actions}>
              <PillButton
                label={item.actionLabel}
                onPress={item.onAction}
                variant="secondary"
                disabled={item.disabled}
              />
              {item.secondaryActionLabel && item.onSecondaryAction ? (
                <PillButton label={item.secondaryActionLabel} onPress={item.onSecondaryAction} variant="ghost" />
              ) : null}
            </View>
          }
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
    minWidth: 88,
    alignItems: "flex-end",
    gap: spacing[8],
  },
});
