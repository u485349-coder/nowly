import { GlassCard } from "../../../components/primitives/GlassCard";
import { AppText } from "../../../components/primitives/AppText";

type Props = {
  title: string;
  detail: string;
  onPress?: () => void;
};

export const RecapSummaryCard = ({ title, detail }: Props) => {
  return (
    <GlassCard>
      <AppText variant="eyebrow" color="rgba(196,181,253,0.84)">
        Past hangs
      </AppText>
      <AppText variant="h3">{title}</AppText>
      <AppText variant="body" color="rgba(247,251,255,0.64)">
        {detail}
      </AppText>
    </GlassCard>
  );
};
