import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { nowlyColors } from "../../constants/theme";
import { webPressableStyle } from "../../lib/web-pressable";
export const NowlyToast = ({ toast, top = 14 }) => {
    const insets = useSafeAreaInsets();
    if (!toast) {
        return null;
    }
    const safeTop = Math.max(top, insets.top + 8);
    const pressable = Boolean(toast.onPress);
    return (_jsx(View, { pointerEvents: "box-none", style: [styles.host, { top: safeTop }], children: _jsx(Animated.View, { entering: FadeInDown.duration(180), exiting: FadeOutUp.duration(180), children: _jsx(Pressable, { disabled: !pressable, onPress: toast.onPress, style: ({ pressed }) => [
                    styles.shell,
                    webPressableStyle(pressed, {
                        disabled: !pressable,
                        pressedOpacity: 0.95,
                        pressedScale: 0.99,
                    }),
                ], children: _jsxs(LinearGradient, { colors: ["rgba(14,22,43,0.96)", "rgba(24,42,62,0.9)", "rgba(15,21,39,0.96)"], start: { x: 0.05, y: 0 }, end: { x: 1, y: 1 }, style: styles.card, children: [_jsx(View, { style: styles.iconWrap, children: _jsx(MaterialCommunityIcons, { name: toast.icon ?? "bell-ring-outline", size: 18, color: "#081120" }) }), _jsxs(View, { style: styles.copy, children: [_jsx(Text, { style: styles.title, children: toast.title }), _jsx(Text, { style: styles.message, children: toast.message })] }), toast.ctaLabel ? (_jsx(View, { style: styles.ctaPill, children: _jsx(Text, { style: styles.ctaText, children: toast.ctaLabel }) })) : null] }) }) }) }));
};
const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 20,
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
    copy: {
        flex: 1,
        gap: 2,
    },
    ctaPill: {
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.12)",
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    ctaText: {
        color: "rgba(248,250,252,0.9)",
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 11,
    },
    host: {
        position: "absolute",
        left: 16,
        right: 16,
        zIndex: 60,
    },
    iconWrap: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: nowlyColors.aqua,
        shadowColor: nowlyColors.aqua,
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
    },
    message: {
        color: "rgba(248,250,252,0.76)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 12,
        lineHeight: 18,
    },
    shell: {
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: nowlyColors.glow,
        shadowOpacity: 0.2,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
    },
    title: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 14,
        lineHeight: 18,
    },
});
