import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { nowlyColors } from "../../constants/theme";
import { webPressableStyle } from "../../lib/web-pressable";
export const PillButton = ({ label, onPress, variant = "primary", leftSlot, disabled = false, }) => {
    const isWeb = Platform.OS === "web";
    const textColor = variant === "primary" ? styles.primaryText : styles.secondaryText;
    return (_jsxs(Pressable, { disabled: disabled, onPress: onPress, style: ({ pressed }) => [
            styles.pressable,
            variant === "ghost" ? styles.ghostPressable : styles.filledPressable,
            disabled ? styles.disabled : null,
            isWeb ? webPressableStyle(pressed, { disabled, pressedOpacity: 0.9, pressedScale: 0.986 }) : null,
        ], accessibilityRole: "button", accessibilityState: { disabled }, children: [variant === "primary" ? (_jsx(LinearGradient, { colors: ["#F7FBFF", "#D9EEFF", "#BFE7FF"], start: { x: 0, y: 0 }, end: { x: 1, y: 1 }, style: StyleSheet.absoluteFillObject })) : (_jsx(View, { style: [StyleSheet.absoluteFillObject, variant === "secondary" ? styles.secondaryFill : styles.ghostFill] })), _jsxs(View, { style: [
                    styles.inner,
                    variant === "secondary" ? styles.secondaryInner : null,
                    variant === "ghost" ? styles.ghostInner : null,
                ], children: [leftSlot, _jsx(Text, { style: [styles.label, textColor], children: label })] })] }));
};
const styles = StyleSheet.create({
    pressable: {
        minHeight: 54,
        overflow: "hidden",
        borderRadius: 999,
    },
    filledPressable: {
        shadowColor: nowlyColors.glow,
        shadowOpacity: 0.18,
        shadowRadius: 18,
        shadowOffset: {
            width: 0,
            height: 12,
        },
        elevation: 6,
    },
    ghostPressable: {
        alignSelf: "flex-start",
    },
    disabled: {
        opacity: 0.5,
    },
    secondaryFill: {
        backgroundColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
    ghostFill: {
        backgroundColor: "transparent",
    },
    inner: {
        minHeight: 54,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingHorizontal: 22,
        paddingVertical: 14,
    },
    secondaryInner: {
        minHeight: 52,
    },
    ghostInner: {
        minHeight: 40,
        paddingHorizontal: 0,
        paddingVertical: 0,
        justifyContent: "flex-start",
    },
    label: {
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 16,
    },
    primaryText: {
        color: "#081120",
    },
    secondaryText: {
        color: nowlyColors.cloud,
    },
});
