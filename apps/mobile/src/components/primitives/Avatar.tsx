import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radii, spacing } from "../../theme";
import { AppText } from "./AppText";

type Props = {
  name: string;
  photoUrl?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export const Avatar = ({ name, photoUrl, size = 48, style }: Props) => {
  const radius = size / 2;

  return (
    <View style={[styles.shell, { width: size, height: size, borderRadius: radius }, style]}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.fallback, { borderRadius: radius }]}> 
          <AppText variant="body" color={colors.cloud} style={styles.initial}>
            {(name[0] ?? "N").toUpperCase()}
          </AppText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: spacing[8],
  },
  initial: {
    fontFamily: "SpaceGrotesk_700Bold",
  },
});
