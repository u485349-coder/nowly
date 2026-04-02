import { useLocalSearchParams } from "expo-router";
import { ThreadScreen } from "../../src/screens/thread/ThreadScreen";

export default function ThreadRoute() {
  const params = useLocalSearchParams<{ threadId?: string | string[] }>();
  const rawThreadId = params.threadId;
  const threadId = Array.isArray(rawThreadId) ? rawThreadId[0] ?? "" : rawThreadId ?? "";

  return <ThreadScreen threadId={threadId} />;
}
