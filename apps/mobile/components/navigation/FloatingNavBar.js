import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useEffect, useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { Easing, Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming, } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { nowlyColors } from "../../constants/theme";
import { webPressableStyle } from "../../lib/web-pressable";
import { FABToggle } from "./FABToggle";
const AnimatedIcon = Animated.createAnimatedComponent(MaterialCommunityIcons);
const AnimatedText = Animated.createAnimatedComponent(Text);
const isWeb = Platform.OS === "web";
const FloatingTabItem = memo(({ accessibilityLabel, focused, icon, label, badgeCount, onLongPress, onPress, }) => {
    const progress = useSharedValue(focused ? 1 : 0);
    useEffect(() => {
        progress.value = withTiming(focused ? 1 : 0, {
            duration: 180,
            easing: Easing.out(Easing.cubic),
        });
    }, [focused, progress]);
    const iconMotionStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0, 1], [0.76, 1], Extrapolation.CLAMP),
        transform: [
            {
                scale: interpolate(progress.value, [0, 1], [0.96, 1.08], Extrapolation.CLAMP),
            },
        ],
    }));
    const labelMotionStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0, 1], [0.72, 1], Extrapolation.CLAMP),
        transform: [
            {
                translateY: interpolate(progress.value, [0, 1], [1, 0], Extrapolation.CLAMP),
            },
        ],
    }));
    return (_jsxs(Pressable, { accessibilityLabel: accessibilityLabel, accessibilityRole: "button", android_ripple: { color: "transparent" }, hitSlop: 10, onLongPress: onLongPress, onPress: onPress, style: ({ pressed }) => [
            styles.tabPressable,
            isWeb ? webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.998 }) : null,
        ], children: [_jsxs(View, { style: styles.iconWrap, children: [_jsx(AnimatedIcon, { name: icon, size: 21, style: [
                            styles.tabIcon,
                            focused ? styles.tabIconActive : styles.tabIconInactive,
                            iconMotionStyle,
                        ] }), badgeCount && badgeCount > 0 ? (_jsx(View, { style: styles.badgeDot, children: _jsx(Text, { style: styles.badgeText, children: badgeCount > 99 ? "99+" : badgeCount }) })) : null] }), _jsx(AnimatedText, { style: [
                    styles.tabLabel,
                    focused ? styles.tabLabelActive : styles.tabLabelInactive,
                    labelMotionStyle,
                ], children: label })] }));
});
const FloatingNavBarComponent = ({ descriptors, fabAccentColor = nowlyColors.violet, fabIcon = "plus", badges = {}, icons, navigation, state, }) => {
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
    const renderTab = (routeKey) => {
        const route = state.routes.find((item) => item.key === routeKey);
        if (!route) {
            return null;
        }
        const descriptor = descriptors[route.key];
        const focused = state.index === state.routes.findIndex((item) => item.key === route.key);
        const label = typeof descriptor.options.tabBarLabel === "string"
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
        return (_jsx(FloatingTabItem, { accessibilityLabel: descriptor.options.tabBarAccessibilityLabel, focused: focused, icon: icons[route.name] ?? "circle-outline", label: label, badgeCount: badges[route.name], onLongPress: onLongPress, onPress: onPress }, route.key));
    };
    return (_jsxs(View, { pointerEvents: "box-none", style: StyleSheet.absoluteFill, children: [_jsxs(Animated.View, { style: [
                    styles.barWrap,
                    barStyle,
                    {
                        bottom: barBottom,
                        left: barLeft,
                        width: barWidth,
                    },
                ], children: [_jsx(View, { style: styles.barTint }), _jsxs(Animated.View, { style: [styles.navRow, navContentStyle], children: [_jsx(View, { style: styles.sideGroup, children: leftRoutes.map((route) => renderTab(route.key)) }), _jsx(View, { style: styles.centerGap }), _jsx(View, { style: styles.sideGroup, children: rightRoutes.map((route) => renderTab(route.key)) })] })] }), _jsx(FABToggle, { accentColor: fabAccentColor, bottom: toggleBottom, icon: fabIcon, onPress: () => setOpen((current) => !current), open: open, progress: menuProgress })] }));
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
    iconWrap: {
        position: "relative",
        width: 24,
        height: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    badgeDot: {
        position: "absolute",
        top: -7,
        right: -11,
        minWidth: 16,
        height: 16,
        paddingHorizontal: 4,
        borderRadius: 10,
        backgroundColor: "#EF4444",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(8,17,32,0.9)",
    },
    badgeText: {
        color: "#FFFFFF",
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 9,
        lineHeight: 11,
        includeFontPadding: false,
    },
    tabLabel: {
        fontFamily: "SpaceGrotesk_500Medium",
        fontSize: 10.5,
        includeFontPadding: false,
    },
    tabLabelActive: {
        color: "rgba(255,255,255,0.88)",
    },
    tabLabelInactive: {
        color: "rgba(148,163,184,0.62)",
    },
    tabIcon: {
        textShadowOffset: { width: 0, height: 0 },
    },
    tabIconActive: {
        color: "#FFFFFF",
        textShadowColor: "rgba(255,255,255,0.7)",
        textShadowRadius: 12,
    },
    tabIconInactive: {
        color: "rgba(148,163,184,0.46)",
        textShadowColor: "rgba(255,255,255,0)",
        textShadowRadius: 0,
    },
});
