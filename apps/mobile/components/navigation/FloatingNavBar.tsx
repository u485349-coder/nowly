import { memo, useEffect, useMemo, useState } from "react";
import type { ComponentProps } from "react";
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { nowlyColors } from "../../constants/theme";
import { webPressableStyle } from "../../lib/web-pressable";
import { FABToggle } from "./FABToggle";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const AnimatedIcon = Animated.createAnimatedComponent(MaterialCommunityIcons);
const AnimatedText = Animated.createAnimatedComponent(Text);
const isWeb = Platform.OS === "web";

type FloatingNavBarProps = BottomTabBarProps & {
  fabAccentColor?: string;
  fabIcon?: IconName;
  icons: Record<string, IconName>;
};

const FloatingTabItem = memo(
  ({
    accessibilityLabel,
    focused,
    icon,
    label,
    onLongPress,
    onPress,
  }: {
    accessibilityLabel?: string;
    focused: boolean;
    icon: IconName;
    label: string;
    onLongPress: () => void;
    onPress: () => void;
  }) => {
    const progress = useSharedValue(focused ? 1 : 0);

    useEffect(() => {
      progress.value = withTiming(focused ? 1 : 0, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      });
    }, [focused, progress]);

    const iconStyle = useAnimatedStyle(() => ({
      color: interpolateColor(
        progress.value,
        [0, 1],
        ["rgba(255,255,255,0.35)", "#FFFFFF"],
      ),
      textShadowColor: interpolateColor(
        progress.value,
        [0, 1],
        ["rgba(255,255,255,0)", "rgba(255,255,255,0.35)"],
      ),
      textShadowRadius: interpolate(progress.value, [0, 1], [0, 8], Extrapolation.CLAMP),
      textShadowOffset: { width: 0, height: 0 },
      transform: [
        {
          scale: interpolate(progress.value, [0, 1], [1, 1.08], Extrapolation.CLAMP),
        },
      ],
    }));

    const labelStyle = useAnimatedStyle(() => ({
      color: interpolateColor(
        progress.value,
        [0, 1],
        ["rgba(255,255,255,0.5)", "rgba(255,255,255,0.72)"],
      ),
      transform: [
        {
          translateY: interpolate(progress.value, [0, 1], [0, -1], Extrapolation.CLAMP),
        },
      ],
    }));

    return (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        android_ripple={{ color: "transparent" }}
        hitSlop={10}
        onLongPress={onLongPress}
        onPress={onPress}
        style={({ pressed }) => [
          styles.tabPressable,
          isWeb ? webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.998 }) : null,
        ]}
      >
        <AnimatedIcon name={icon} size={21} style={iconStyle} />
        <AnimatedText style={[styles.tabLabel, labelStyle]}>{label}</AnimatedText>
      </Pressable>
    );
  },
);

const FloatingNavBarComponent = ({
  descriptors,
  fabAccentColor = nowlyColors.violet,
  fabIcon = "plus",
  icons,
  navigation,
  state,
}: FloatingNavBarProps) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const menuProgress = useSharedValue(0);

  useEffect(() => {
    menuProgress.value = withSpring(open ? 1 : 0, {
      damping: 18,
      stiffness: 220,
      mass: 0.86,
    });
  }, [menuProgress, open]);

  useEffect(() => {
    setOpen(false);
  }, [state.index]);

  const barBottom = Math.max(22, insets.bottom + 10);
  const barWidth = Math.min(width - 28, width >= 768 ? 430 : width * 0.9);
  const barLeft = (width - barWidth) / 2;
  const toggleBottom = barBottom + 18;

  const splitIndex = Math.max(1, Math.floor(state.routes.length / 2));
  const leftRoutes = useMemo(() => state.routes.slice(0, splitIndex), [splitIndex, state.routes]);
  const rightRoutes = useMemo(() => state.routes.slice(splitIndex), [splitIndex, state.routes]);

  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(menuProgress.value, [0, 1], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        scaleX: interpolate(menuProgress.value, [0, 1], [1, 0.82], Extrapolation.CLAMP),
      },
      {
        scaleY: interpolate(menuProgress.value, [0, 1], [1, 0.78], Extrapolation.CLAMP),
      },
      {
        translateY: interpolate(menuProgress.value, [0, 1], [0, 10], Extrapolation.CLAMP),
      },
    ],
  }));

  const navContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(menuProgress.value, [0, 1], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(menuProgress.value, [0, 1], [0, 6], Extrapolation.CLAMP),
      },
    ],
  }));

  const renderTab = (routeKey: string) => {
    const route = state.routes.find((item) => item.key === routeKey);
    if (!route) {
      return null;
    }

    const descriptor = descriptors[route.key];
    const focused = state.index === state.routes.findIndex((item) => item.key === route.key);
    const label =
      typeof descriptor.options.tabBarLabel === "string"
        ? descriptor.options.tabBarLabel
        : typeof descriptor.options.title === "string"
          ? descriptor.options.title
          : route.name;

    const onPress = () => {
      setOpen(false);
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });

      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    const onLongPress = () => {
      navigation.emit({
        type: "tabLongPress",
        target: route.key,
      });
    };

    return (
      <FloatingTabItem
        key={route.key}
        accessibilityLabel={descriptor.options.tabBarAccessibilityLabel}
        focused={focused}
        icon={icons[route.name] ?? "circle-outline"}
        label={label}
        onLongPress={onLongPress}
        onPress={onPress}
      />
    );
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.barWrap,
          barStyle,
          {
            bottom: barBottom,
            left: barLeft,
            width: barWidth,
          },
        ]}
      >
        <View style={styles.barTint} />

        <Animated.View style={[styles.navRow, navContentStyle]}>
          <View style={styles.sideGroup}>{leftRoutes.map((route) => renderTab(route.key))}</View>
          <View style={styles.centerGap} />
          <View style={styles.sideGroup}>{rightRoutes.map((route) => renderTab(route.key))}</View>
        </Animated.View>
      </Animated.View>

      <FABToggle
        accentColor={fabAccentColor}
        bottom={toggleBottom}
        icon={fabIcon}
        onPress={() => setOpen((current) => !current)}
        open={open}
        progress={menuProgress}
      />
    </View>
  );
};

export const FloatingNavBar = memo(FloatingNavBarComponent);

const styles = StyleSheet.create({
  barWrap: {
    position: "absolute",
    height: 64,
    borderRadius: 34,
    overflow: "hidden",
    backgroundColor: isWeb ? "rgba(7,13,26,0.86)" : "rgba(7,13,26,0.72)",
    shadowColor: nowlyColors.glow,
    shadowOpacity: isWeb ? 0.08 : 0.14,
    shadowRadius: isWeb ? 16 : 24,
    shadowOffset: { width: 0, height: isWeb ? 10 : 14 },
    elevation: 0,
  },
  barTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: isWeb ? "rgba(9,16,31,0.68)" : "rgba(9,16,31,0.5)",
  },
  navRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  sideGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  centerGap: {
    width: 104,
  },
  tabPressable: {
    minWidth: 56,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
  },
  tabLabel: {
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 10.5,
    includeFontPadding: false,
  },
});
