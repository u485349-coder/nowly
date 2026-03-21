import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { NowlyMark } from "../../components/branding/NowlyMark";
import { api } from "../../lib/api";
import { useAppStore } from "../../store/useAppStore";

type LinkState = "linking" | "success" | "error";

export default function DiscordCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string | string[]; error?: string | string[] }>();
  const token = useAppStore((state) => state.token);
  const updateUser = useAppStore((state) => state.updateUser);

  const [status, setStatus] = useState<LinkState>("linking");
  const [message, setMessage] = useState("Connecting your Discord servers to Nowly...");

  const code = useMemo(
    () => (Array.isArray(params.code) ? params.code[0] : params.code),
    [params.code],
  );
  const oauthError = useMemo(
    () => (Array.isArray(params.error) ? params.error[0] : params.error),
    [params.error],
  );

  useEffect(() => {
    if (oauthError) {
      setStatus("error");
      setMessage("Discord canceled the link or sent back an invalid auth response.");
      return;
    }

    if (!token) {
      setStatus("error");
      setMessage("Your Nowly session expired before Discord came back. Sign in again and retry.");
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("Discord did not return an authorization code. Try linking again.");
      return;
    }

    let active = true;

    void (async () => {
      try {
        const user = await api.linkDiscord(token, code);

        if (!active) {
          return;
        }

        updateUser({
          discordUsername: user.discordUsername,
          sharedServerCount: user.sharedServerCount,
          hasDiscordLinked: user.hasDiscordLinked,
        });
        setStatus("success");
        setMessage("Discord is linked. Nowly can use your shared servers to tighten up your graph.");

        setTimeout(() => {
          router.replace("/friends");
        }, 1100);
      } catch (error) {
        if (!active) {
          return;
        }

        const text =
          error instanceof Error && error.message
            ? error.message
            : "We couldn't finish the Discord link right now.";

        setStatus("error");
        setMessage(text);
      }
    })();

    return () => {
      active = false;
    };
  }, [code, oauthError, token, updateUser]);

  return (
    <GradientMesh>
      <View className="flex-1 items-center justify-center px-5">
        <GlassCard className="w-full max-w-[520px] p-6">
          <View className="items-center gap-5">
            <NowlyMark variant="icon" size={72} />
            <View className="items-center gap-2">
              <Text className="text-center font-display text-[32px] leading-[34px] text-cloud">
                {status === "success"
                  ? "Discord linked"
                  : status === "error"
                    ? "Discord link failed"
                    : "Linking Discord"}
              </Text>
              <Text className="max-w-[380px] text-center font-body text-base leading-7 text-white/70">
                {message}
              </Text>
            </View>

            {status !== "linking" ? (
              <View className="w-full gap-3">
                <PillButton
                  label={status === "success" ? "Open friends" : "Back to setup"}
                  onPress={() => router.replace(status === "success" ? "/friends" : "/onboarding")}
                />
              </View>
            ) : null}
          </View>
        </GlassCard>
      </View>
    </GradientMesh>
  );
}
