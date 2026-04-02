import { useLocalSearchParams } from "expo-router";
import { ChatScreen } from "../../src/screens/chat/ChatScreen";

export default function ChatRoute() {
  const params = useLocalSearchParams<{ chatId?: string | string[] }>();
  const rawChatId = params.chatId;
  const chatId = Array.isArray(rawChatId) ? rawChatId[0] ?? "" : rawChatId ?? "";

  return <ChatScreen chatId={chatId} />;
}
