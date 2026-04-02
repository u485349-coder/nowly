import { ScrollView, StyleSheet, View } from "react-native";
import { Chip } from "../../../components/primitives/Chip";
import { spacing } from "../../../theme";

type PromptItem = {
  key: string;
  label: string;
  onPress: () => void;
};

type Props = {
  prompts: PromptItem[];
};

export const PromptRail = ({ prompts }: Props) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.row}>
        {prompts.map((prompt) => (
          <Chip key={prompt.key} label={prompt.label} onPress={prompt.onPress} />
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingRight: spacing[8],
  },
  row: {
    flexDirection: "row",
    gap: spacing[12],
  },
});
