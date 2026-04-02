import { useLocalSearchParams } from "expo-router";
import { ProposalScreen } from "../../src/screens/proposal/ProposalScreen";

export default function ProposalRoute() {
  const params = useLocalSearchParams<{ hangoutId?: string | string[] }>();
  const rawHangoutId = params.hangoutId;
  const hangoutId = Array.isArray(rawHangoutId) ? rawHangoutId[0] ?? "" : rawHangoutId ?? "";

  return <ProposalScreen hangoutId={hangoutId} />;
}
