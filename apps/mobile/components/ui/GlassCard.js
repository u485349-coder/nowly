import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { nowlyColors } from "../../constants/theme";
const isWeb = Platform.OS === "web";
export const GlassCard = ({ children, className = "", }) => (_jsxs(View, { className: `overflow-hidden rounded-[30px] bg-[#091224]/74 ${className}`, style: styles.shell, children: [!isWeb ? _jsx(BlurView, { intensity: 26, tint: "dark", style: StyleSheet.absoluteFillObject }) : null, _jsx(LinearGradient, { colors: ["rgba(124,58,237,0.14)", "rgba(255,255,255,0.015)", "rgba(255,255,255,0.00)"], start: { x: 0.06, y: 0.02 }, end: { x: 0.74, y: 0.96 }, style: styles.topGlow, pointerEvents: "none" }), _jsx(LinearGradient, { colors: ["rgba(124,58,237,0.12)", "rgba(92,77,255,0.04)", "rgba(124,58,237,0.00)"], start: { x: 0.28, y: 0.1 }, end: { x: 1, y: 0.9 }, style: styles.bottomGlow, pointerEvents: "none" }), _jsx(LinearGradient, { colors: ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.015)", "rgba(255,255,255,0.00)"], start: { x: 0.12, y: 0 }, end: { x: 0.88, y: 0.86 }, style: styles.highlight, pointerEvents: "none" }), _jsx(View, { style: styles.edgeWash, pointerEvents: "none" }), _jsx(View, { className: "relative", children: children })] }));
const styles = StyleSheet.create({
    shell: {
        shadowColor: nowlyColors.glow,
        shadowOpacity: isWeb ? 0.12 : 0.2,
        shadowRadius: isWeb ? 18 : 26,
        shadowOffset: {
            width: 0,
            height: isWeb ? 10 : 16,
        },
        elevation: isWeb ? 0 : 8,
    },
    topGlow: {
        ...StyleSheet.absoluteFillObject,
    },
    bottomGlow: {
        ...StyleSheet.absoluteFillObject,
    },
    highlight: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.82,
    },
    edgeWash: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.035)",
    },
});
