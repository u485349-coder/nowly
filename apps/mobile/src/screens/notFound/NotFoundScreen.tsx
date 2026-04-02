import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { GradientMeshBackground } from "../../components/layout/GradientMeshBackground";
import { AppText } from "../../components/primitives/AppText";
import { GlassCard } from "../../components/primitives/GlassCard";
import { PillButton } from "../../components/primitives/PillButton";
import { colors, radii, spacing } from "../../theme";

export const NotFoundScreen = () => {
  const router = useRouter();

  return (
    <GradientMeshBackground>
      <View style={styles.root}>
        <View style={styles.inner}>
          <GlassCard style={styles.card}>
            <View style={styles.iconShell}>
              <MaterialCommunityIcons
                name="compass-off-outline"
                size={28}
                color={colors.aqua}
              />
            </View>

            <View style={styles.copy}>
              <AppText variant="display" style={styles.title}>
                Lost the vibe
              </AppText>
              <AppText variant="body" color="rgba(247,251,255,0.7)" style={styles.message}>
                That screen is gone, expired, or was never live in the first place. We can take you
                straight back to the live part of the app.
              </AppText>
            </View>

            <View style={styles.action}>
              <PillButton label="Back home" onPress={() => router.replace("/home")} />
            </View>
          </GlassCard>
        </View>
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
  inner: {
    width: "100%",
    maxWidth: 440,
  },
  card: {
    alignItems: "center",
    paddingVertical: spacing[32],
  },
  iconShell: {
    width: 68,
    height: 68,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,234,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(139,234,255,0.18)",
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
    maxWidth: 320,
  },
  action: {
    width: "100%",
    marginTop: spacing[4],
  },
});
