import { useLocalSearchParams } from "expo-router";
import { MatchScreen } from "../../src/screens/match/MatchScreen";

export default function MatchRoute() {
  const params = useLocalSearchParams<{ matchId?: string | string[] }>();
  const rawMatchId = params.matchId;
  const matchId = Array.isArray(rawMatchId) ? rawMatchId[0] ?? "" : rawMatchId ?? "";

  return <MatchScreen matchId={matchId} />;
}
