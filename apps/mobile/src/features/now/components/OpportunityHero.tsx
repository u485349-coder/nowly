import { StyleSheet, View } from "react-native";
import { colors, spacing } from "../../../theme";
import { HeroCard } from "../../../components/primitives/HeroCard";
import { PillButton } from "../../../components/primitives/PillButton";
import { AppText } from "../../../components/primitives/AppText";
import { Avatar } from "../../../components/primitives/Avatar";

type Person = {
  id: string;
  name: string;
  photoUrl?: string | null;
};

type Props = {
  eyebrow: string;
  title: string;
  copy: string;
  status: string;
  people: Person[];
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
};

export const OpportunityHero = ({
  eyebrow,
  title,
  copy,
  status,
  people,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: Props) => {
  return (
    <HeroCard>
      <View style={styles.copyBlock}>
        <AppText variant="eyebrow" color="rgba(139,234,255,0.86)">
          {eyebrow}
        </AppText>
        <AppText variant="h1">{title}</AppText>
        <AppText variant="body" color={colors.muted}>
          {copy}
        </AppText>
      </View>
      <View style={styles.peopleRow}>
        {people.length ? (
          people.map((person) => <Avatar key={person.id} name={person.name} photoUrl={person.photoUrl} size={46} />)
        ) : (
          <View style={styles.dot} />
        )}
        <AppText variant="bodySmall" color="rgba(247,251,255,0.78)">
          {status}
        </AppText>
      </View>
      <View style={styles.actions}>
        <PillButton label={primaryLabel} onPress={onPrimary} />
        <PillButton label={secondaryLabel} onPress={onSecondary} variant="ghost" />
      </View>
    </HeroCard>
  );
};

const styles = StyleSheet.create({
  copyBlock: {
    gap: spacing[12],
  },
  peopleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing[12],
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.aqua,
  },
  actions: {
    gap: spacing[12],
  },
});
