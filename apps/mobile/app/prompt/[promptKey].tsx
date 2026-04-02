import { useLocalSearchParams } from "expo-router";
import { PromptScreen } from "../../src/screens/prompt/PromptScreen";

export default function PromptRoute() {
  const params = useLocalSearchParams<{ promptKey?: string | string[]; recipientId?: string | string[] }>();
  const rawPromptKey = params.promptKey;
  const rawRecipientId = params.recipientId;
  const promptKey = Array.isArray(rawPromptKey) ? rawPromptKey[0] ?? "" : rawPromptKey ?? "";
  const recipientId = Array.isArray(rawRecipientId) ? rawRecipientId[0] ?? null : rawRecipientId ?? null;

  return <PromptScreen promptKey={promptKey} recipientId={recipientId} />;
}
