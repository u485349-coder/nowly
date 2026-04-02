import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GradientMeshBackground } from "../../components/layout/GradientMeshBackground";
import { AppText } from "../../components/primitives/AppText";
import { GlassCard } from "../../components/primitives/GlassCard";
import { colors, radii, spacing } from "../../theme";
import { useAppStore } from "../../../store/useAppStore";
import { discordApi } from "../../lib/api/discord";

type LinkState = "linking" | "success" | "error";

type Props = {
  code?: string;
  oauthError?: string;
};

export const DiscordCallbackScreen = ({ code, oauthError }: Props) => {
  const router = useRouter();
  const token = useAppStore((state) => state.token);
  const updateUser = useAppStore((state) => state.updateUser);
  const [status, setStatus] = useState<LinkState>("linking");
  const [message, setMessage] = useState("Pairing your shared servers with Nowly now.");

  useEffect(() => {
    if (oauthError) {
      setStatus("error");
      setMessage("Discord canceled the link or sent back an invalid response.");
      return;
    }

    if (!token) {
      setStatus("error");
      setMessage("Your Nowly session expired before Discord came back.");
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("Discord did not return an authorization code.");
      return;
    }

    let active = true;
    let redirectTimer: ReturnType<typeof setTimeout> | null = null;

    void (async () => {
      try {
        const user = await discordApi.linkDiscord(token, code);

        if (!active) {
          return;
        }

        updateUser({
          discordUsername: user.discordUsername,
          sharedServerCount: user.sharedServerCount,
          hasDiscordLinked: user.hasDiscordLinked,
        });
        setStatus("success");
        setMessage("Discord connected. Taking you back to your crew.");

        redirectTimer = setTimeout(() => {
          router.replace("/friends");
        }, 1100);
      } catch (error) {
        if (!active) {
          return;
        }

        setStatus("error");
        setMessage(
          error instanceof Error && error.message
            ? error.message
            : "We couldn't finish the Discord link right now.",
        );
      }
    })();

    return () => {
      active = false;
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [code, oauthError, router, token, updateUser]);

  return (
    <GradientMeshBackground>
      <View style={styles.root}>
        <GlassCard style={styles.card}>
          <View style={styles.stateIconShell}>
            {status === "linking" ? (
              <ActivityIndicator color={colors.aqua} />
            ) : (
              <MaterialCommunityIcons
                name={status === "success" ? "check-circle-outline" : "alert-circle-outline"}
                size={28}
                color={status === "success" ? colors.aqua : colors.dangerSoft}
              />
            )}
          </View>

          <View style={styles.copy}>
            <AppText variant="h1" style={styles.title}>
              {status === "linking"
                ? "Linking your Discord..."
                : status === "success"
                  ? "Discord connected"
                  : "Something went wrong"}
            </AppText>
            <AppText variant="body" color="rgba(247,251,255,0.68)" style={styles.message}>
              {message}
            </AppText>
          </View>
        </GlassCard>
      </View>
    </GradientMeshBackground>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[24],
  },
  card: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
    paddingVertical: spacing[24],
  },
  stateIconShell: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  copy: {
    alignItems: "center",
    gap: spacing[12],
  },
  title: {
    textAlign: "center",
  },
  message: {
    textAlign: "center",
    maxWidth: 300,
  },
});
