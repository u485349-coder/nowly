import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, } from "react-native-reanimated";
import { nowlyColors } from "../../constants/theme";
import { webPressableStyle } from "../../lib/web-pressable";
const isWeb = Platform.OS === "web";
const MenuItem = ({ action, accentColor, index, labelPosition, onActionPress, progress, }) => {
    const itemStyle = useAnimatedStyle(() => {
        const start = index * 0.12;
        const itemProgress = Math.max(0, Math.min(1, (progress.value - start) / Math.max(0.01, 1 - start)));
        return {
            opacity: itemProgress,
            transform: [
                {
                    translateY: interpolate(itemProgress, [0, 1], [14, -((index + 1) * 72)], Extrapolation.CLAMP),
                },
                {
                    translateX: interpolate(itemProgress, [0, 1], [6, 0], Extrapolation.CLAMP),
                },
                {
                    scale: interpolate(itemProgress, [0, 1], [0.9, 1], Extrapolation.CLAMP),
                },
            ],
        };
    });
    return (_jsx(Animated.View, { style: [styles.itemWrap, itemStyle], children: _jsxs(Pressable, { accessibilityRole: "button", accessibilityLabel: action.accessibilityLabel ?? action.label, onPress: () => onActionPress(action), style: ({ pressed }) => [
                styles.actionPressable,
                labelPosition === "right" ? styles.actionPressableRight : null,
                isWeb ? webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.99 }) : null,
            ], children: [action.label && labelPosition === "left" ? (_jsx(View, { style: styles.labelPill, children: _jsx(Text, { style: styles.labelText, children: action.label }) })) : null, _jsx(View, { style: [
                        styles.miniFab,
                        {
                            borderColor: `${action.accentColor ?? accentColor}26`,
                            shadowColor: action.accentColor ?? accentColor,
                        },
                    ], children: _jsx(MaterialCommunityIcons, { name: action.icon, size: 20, color: nowlyColors.cloud }) }), action.label && labelPosition === "right" ? (_jsx(View, { style: styles.labelPill, children: _jsx(Text, { style: styles.labelText, children: action.label }) })) : null] }) }));
};
export const FABMenu = ({ bottom, progress, open, actions, onActionPress, accentColor = nowlyColors.violet, labelPosition = "left", }) => {
    const backdropStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
        transform: [
            {
                scale: interpolate(progress.value, [0, 1], [0.86, 1.02], Extrapolation.CLAMP),
            },
        ],
    }));
    return (_jsxs(View, { pointerEvents: open ? "box-none" : "none", style: [
            styles.menuRoot,
            {
                bottom,
                marginLeft: -120,
            },
        ], children: [_jsx(Animated.View, { pointerEvents: "none", style: [
                    styles.backdropGlow,
                    backdropStyle,
                    {
                        backgroundColor: accentColor,
                    },
                ] }), actions.map((action, index) => (_jsx(MenuItem, { action: action, accentColor: accentColor, index: index, labelPosition: labelPosition, onActionPress: onActionPress, progress: progress }, action.id)))] }));
};
const styles = StyleSheet.create({
    menuRoot: {
        position: "absolute",
        left: "50%",
        width: 280,
        height: 320,
        zIndex: 24,
        alignItems: "center",
    },
    backdropGlow: {
        position: "absolute",
        bottom: 0,
        width: 156,
        height: 156,
        borderRadius: 999,
        opacity: 0.16,
    },
    itemWrap: {
        position: "absolute",
        bottom: 0,
        alignSelf: "center",
    },
    actionPressable: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    actionPressableRight: {
        flexDirection: "row-reverse",
    },
    labelPill: {
        paddingHorizontal: 16,
        paddingVertical: 11,
        borderRadius: 999,
        backgroundColor: "rgba(8,15,28,0.82)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
    },
    labelText: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 13,
    },
    miniFab: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(8,15,28,0.92)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.05)",
        shadowOpacity: 0.16,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 0,
    },
});
