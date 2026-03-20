import { Image, Text, View } from "react-native";
import { nowlyColors } from "../../constants/theme";
import { NOWLY_SLOGAN } from "../../lib/branding";

type Variant = "icon" | "wordmark" | "lockup" | "monochrome" | "mini";

type Props = {
  variant?: Variant;
  size?: number;
};

const iconAsset = require("../../assets/icon.png");

const Icon = ({ size = 72 }: { size?: number }) => (
  <Image
    source={iconAsset}
    resizeMode="contain"
    style={{
      width: size,
      height: size,
      borderRadius: Math.round(size * 0.24),
    }}
  />
);

const Wordmark = ({ monochrome = false }: { monochrome?: boolean }) => (
  <View>
    <Text
      style={{
        color: monochrome ? "#FFFFFF" : nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 28,
        letterSpacing: -1.2,
      }}
    >
      Nowly
    </Text>
    <Text
      style={{
        color: monochrome ? "rgba(255,255,255,0.72)" : nowlyColors.muted,
        fontFamily: "SpaceGrotesk_500Medium",
        fontSize: 12,
        letterSpacing: 0.2,
        marginTop: -1,
      }}
    >
      {NOWLY_SLOGAN}
    </Text>
  </View>
);

export const NowlyMark = ({ variant = "lockup", size = 72 }: Props) => {
  if (variant === "icon") {
    return <Icon size={size} />;
  }

  if (variant === "mini") {
    return <Icon size={size} />;
  }

  if (variant === "wordmark") {
    return <Wordmark />;
  }

  if (variant === "monochrome") {
    return (
      <View className="flex-row items-center gap-3">
        <Icon size={size} />
        <Wordmark monochrome />
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-3">
      <Icon size={size} />
      <Wordmark />
    </View>
  );
};
