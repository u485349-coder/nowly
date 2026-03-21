import { memo, useEffect, useMemo, useState } from "react";
import type { ComponentProps } from "react";
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
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
import { FABMenu, type FloatingFabAction } from "./FABMenu";
import { FABToggle } from "./FABToggle";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const AnimatedIcon = Animated.createAnimatedComponent(MaterialCommunityIcons);
const AnimatedText = Animated.createAnimatedComponent(Text);
const isWeb = Platform.OS === "web";

type FloatingNavBarProps = BottomTabBarProps & {
  actions: FloatingFabAction[];
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
  actions,
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

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(menuProgress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const barBottom = Math.max(24, insets.bottom + 10);
  const barWidth = Math.min(width - 40, width * 0.8);
  const barLeft = (width - barWidth) / 2;
  const toggleBottom = barBottom + 18;
  const menuBottom = barBottom + 36;

  const splitIndex = Math.max(1, Math.floor(state.routes.length / 2));
  const leftRoutes = useMemo(() => state.routes.slice(0, splitIndex), [splitIndex, state.routes]);
  const rightRoutes = useMemo(() => state.routes.slice(splitIndex), [splitIndex, state.routes]);

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
        pointerEvents={open ? "auto" : "none"}
        style={[StyleSheet.absoluteFillObject, backdropStyle]}
      >
        <Pressable onPress={() => setOpen(false)} style={StyleSheet.absoluteFillObject}>
          {!isWeb ? <BlurView intensity={14} tint="dark" style={StyleSheet.absoluteFillObject} /> : null}
          <View style={styles.backdropTint} />
        </Pressable>
      </Animated.View>

      <FABMenu
        actions={actions}
        accentColor={fabAccentColor}
        bottom={menuBottom}
        labelPosition="left"
        onActionPress={(action) => {
          setOpen(false);
          action.onPress();
        }}
        open={open}
        progress={menuProgress}
      />

      <View
        style={[
          styles.barWrap,
          {
            bottom: barBottom,
            left: barLeft,
            width: barWidth,
          },
        ]}
      >
        <View style={styles.blurClip}>
          {!isWeb ? <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFillObject} /> : null}
          <View style={styles.barTint} />
        </View>

        <View style={styles.navRow}>
          <View style={styles.sideGroup}>{leftRoutes.map((route) => renderTab(route.key))}</View>
          <View style={styles.centerGap} />
          <View style={styles.sideGroup}>{rightRoutes.map((route) => renderTab(route.key))}</View>
        </View>
      </View>

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
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: isWeb ? "rgba(5,8,19,0.08)" : "rgba(5,8,19,0.16)",
  },
  barWrap: {
    position: "absolute",
    height: 58,
    borderRadius: 40,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: isWeb ? "rgba(10,14,30,0.88)" : "rgba(10,14,30,0.75)",
    shadowColor: "#020617",
    shadowOpacity: isWeb ? 0.08 : 0.18,
    shadowRadius: isWeb ? 12 : 18,
    shadowOffset: { width: 0, height: isWeb ? 8 : 12 },
    elevation: 0,
  },
  blurClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 40,
    overflow: "hidden",
  },
  barTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: isWeb ? "rgba(10,14,30,0.64)" : "rgba(10,14,30,0.42)",
  },
  navRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  sideGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  centerGap: {
    width: 92,
  },
  tabPressable: {
    minWidth: 56,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 8,
  },
  tabLabel: {
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 10,
    includeFontPadding: false,
  },
});
