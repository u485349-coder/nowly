import { useLocalSearchParams } from "expo-router";
import { RecapScreen } from "../../src/screens/recap/RecapScreen";

export default function RecapRoute() {
  const params = useLocalSearchParams<{ hangoutId?: string | string[] }>();
  const hangoutId = Array.isArray(params.hangoutId) ? params.hangoutId[0] : params.hangoutId;

  return <RecapScreen hangoutId={hangoutId ?? ""} />;
}
