import { Text, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";
import { nowlyColors } from "../../constants/theme";
import { NOWLY_SLOGAN } from "../../lib/branding";

type Variant = "icon" | "wordmark" | "lockup" | "monochrome" | "mini";

type Props = {
  variant?: Variant;
  size?: number;
};

const Icon = ({ size = 72, monochrome = false, mini = false }: { size?: number; monochrome?: boolean; mini?: boolean }) => (
  <Svg width={size} height={size} viewBox="0 0 96 96">
    <Defs>
      <SvgGradient id="nowly-grad" x1="18" y1="14" x2="78" y2="86" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor={monochrome ? "#FFFFFF" : "#A855F7"} />
        <Stop offset="0.58" stopColor={monochrome ? "#E3EBFA" : "#6366F1"} />
        <Stop offset="1" stopColor={monochrome ? "#FFFFFF" : "#22D3EE"} />
      </SvgGradient>
      <SvgGradient id="nowly-n-glow" x1={mini ? "38.8" : "38.4"} y1={mini ? "30.2" : "29.9"} x2={mini ? "56.9" : "57.6"} y2={mini ? "45.6" : "46.2"} gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor={monochrome ? "rgba(255,255,255,0.08)" : "rgba(96,165,250,0.28)"} />
        <Stop offset="0.5" stopColor={monochrome ? "rgba(255,255,255,0.04)" : "rgba(99,102,241,0.08)"} />
        <Stop offset="1" stopColor={monochrome ? "rgba(255,255,255,0.08)" : "rgba(34,211,238,0.3)"} />
      </SvgGradient>
    </Defs>
    <Path
      d={mini
        ? "M48 11.9C32.3 11.9 19.8 23.9 19.8 39.1C19.8 49.6 26 59 33.3 66.9C38.9 73 44.1 78.7 46.8 81.8C47.4 82.6 48.6 82.6 49.2 81.8C51.9 78.7 57.1 73 62.7 66.9C70 59 76.2 49.6 76.2 39.1C76.2 23.9 63.7 11.9 48 11.9Z"
        : "M48 11.5C31.7 11.5 18.8 23.8 18.8 39.5C18.8 50.2 25.1 59.8 32.7 68.1C38.5 74.4 44 80.2 46.7 83.3C47.4 84.1 48.6 84.1 49.3 83.3C52 80.2 57.5 74.4 63.3 68.1C70.9 59.8 77.2 50.2 77.2 39.5C77.2 23.8 64.3 11.5 48 11.5Z"}
      fill="url(#nowly-grad)"
    />
    <Ellipse cx={mini ? 34.1 : 34} cy={mini ? 21.4 : 21.2} rx={mini ? 10.2 : 10.8} ry={mini ? 7.2 : 7.6} fill="rgba(255,255,255,0.08)" />
    {!monochrome ? (
      <>
        <Circle cx={mini ? 38.8 : 38.4} cy={mini ? 30.2 : 29.9} r={mini ? 3.2 : 3.5} fill="rgba(96,165,250,0.16)" />
        <Circle cx={mini ? 38.8 : 38.4} cy={mini ? 45.6 : 46.2} r={mini ? 3.2 : 3.5} fill="rgba(96,165,250,0.16)" />
        <Circle cx={mini ? 56.9 : 57.6} cy={mini ? 30.2 : 29.9} r={mini ? 3.2 : 3.5} fill="rgba(34,211,238,0.18)" />
        <Circle cx={mini ? 56.9 : 57.6} cy={mini ? 45.6 : 46.2} r={mini ? 3.2 : 3.5} fill="rgba(34,211,238,0.18)" />
      </>
    ) : null}
    <Path
      d={mini ? "M38.8 30.2V45.6L56.9 30.2V45.6" : "M38.4 29.9V46.2L57.6 29.9V46.2"}
      stroke="url(#nowly-n-glow)"
      strokeWidth={mini ? 7.4 : 8.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={monochrome ? 0.32 : 1}
    />
    <Path
      d={mini ? "M38.8 30.2V45.6L56.9 30.2V45.6" : "M38.4 29.9V46.2L57.6 29.9V46.2"}
      stroke={monochrome ? "rgba(11,16,32,0.56)" : "#F8FAFC"}
      strokeWidth={mini ? 4.1 : 4.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
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
    return <Icon size={size} mini />;
  }

  if (variant === "wordmark") {
    return <Wordmark />;
  }

  if (variant === "monochrome") {
    return (
      <View className="flex-row items-center gap-3">
        <Icon size={size} monochrome />
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
