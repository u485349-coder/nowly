import { useLocalSearchParams } from "expo-router";
import { DiscordCallbackScreen } from "../../src/screens/discordCallback/DiscordCallbackScreen";

export default function DiscordCallbackRoute() {
  const params = useLocalSearchParams<{ code?: string | string[]; error?: string | string[] }>();
  const code = Array.isArray(params.code) ? params.code[0] : params.code;
  const oauthError = Array.isArray(params.error) ? params.error[0] : params.error;

  return <DiscordCallbackScreen code={code} oauthError={oauthError} />;
}
