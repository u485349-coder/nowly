import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { gradients } from "../../constants/theme";
const isWeb = Platform.OS === "web";
const isAndroid = Platform.OS === "android";
const shouldAnimateMesh = !isAndroid;
const shouldRenderBlur = Platform.OS === "ios";
export const GradientMesh = ({ children }) => {
    const drift = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (!shouldAnimateMesh) {
            drift.setValue(0.44);
            return;
        }
        const animation = Animated.loop(Animated.sequence([
            Animated.timing(drift, {
                toValue: 1,
                duration: 18000,
                useNativeDriver: true,
            }),
            Animated.timing(drift, {
                toValue: 0,
                duration: 18000,
                useNativeDriver: true,
            }),
        ]));
        animation.start();
        return () => {
            animation.stop();
        };
    }, [drift]);
    const northStyle = {
        transform: [
            {
                translateY: drift.interpolate({
                    inputRange: [0, 1],
                    outputRange: shouldAnimateMesh ? [-8, 14] : [0, 0],
                }),
            },
            {
                translateX: drift.interpolate({
                    inputRange: [0, 1],
                    outputRange: shouldAnimateMesh ? [-10, 12] : [0, 0],
                }),
            },
        ],
    };
    const eastStyle = {
        transform: [
            {
                translateY: drift.interpolate({
                    inputRange: [0, 1],
                    outputRange: shouldAnimateMesh ? [16, -14] : [0, 0],
                }),
            },
            {
                translateX: drift.interpolate({
                    inputRange: [0, 1],
                    outputRange: shouldAnimateMesh ? [8, -10] : [0, 0],
                }),
            },
        ],
    };
    const southStyle = {
        transform: [
            {
                translateY: drift.interpolate({
                    inputRange: [0, 1],
                    outputRange: shouldAnimateMesh ? [0, -10] : [0, 0],
                }),
            },
            {
                translateX: drift.interpolate({
                    inputRange: [0, 1],
                    outputRange: shouldAnimateMesh ? [-4, 10] : [0, 0],
                }),
            },
        ],
    };
    return (_jsxs(View, { className: "flex-1 bg-ink", children: [_jsxs(View, { className: "absolute inset-0 overflow-hidden", pointerEvents: "none", children: [_jsx(LinearGradient, { colors: gradients.background, className: "absolute inset-0" }), _jsx(Animated.View, { style: [styles.northGlow, northStyle], children: _jsx(LinearGradient, { colors: ["rgba(124,58,237,0.28)", "rgba(92,77,255,0.14)", "rgba(124,58,237,0.00)"], start: { x: 0.18, y: 0.08 }, end: { x: 0.88, y: 0.92 }, style: StyleSheet.absoluteFillObject }) }), _jsx(Animated.View, { style: [styles.eastGlow, eastStyle], children: _jsx(LinearGradient, { colors: ["rgba(124,58,237,0.18)", "rgba(92,77,255,0.12)", "rgba(139,234,255,0.00)"], start: { x: 0.18, y: 0.12 }, end: { x: 0.88, y: 0.86 }, style: StyleSheet.absoluteFillObject }) }), _jsx(Animated.View, { style: [styles.southGlow, southStyle], children: _jsx(LinearGradient, { colors: ["rgba(124,58,237,0.18)", "rgba(92,77,255,0.1)", "rgba(124,58,237,0.00)"], start: { x: 0.18, y: 0.12 }, end: { x: 0.88, y: 0.9 }, style: StyleSheet.absoluteFillObject }) }), _jsx(LinearGradient, { colors: ["rgba(255,255,255,0.05)", "rgba(255,255,255,0.015)", "rgba(255,255,255,0.00)"], start: { x: 0.4, y: 0 }, end: { x: 0.56, y: 0.72 }, style: styles.verticalLift }), shouldRenderBlur ? _jsx(BlurView, { intensity: 24, tint: "dark", style: StyleSheet.absoluteFillObject }) : null, _jsx(LinearGradient, { colors: isWeb
                            ? ["rgba(3,8,18,0.10)", "rgba(5,10,20,0.20)", "rgba(5,10,20,0.48)"]
                            : ["rgba(3,8,18,0.06)", "rgba(5,10,20,0.18)", "rgba(5,10,20,0.42)"], style: StyleSheet.absoluteFillObject })] }), _jsx(View, { className: "flex-1", children: children })] }));
};
const styles = StyleSheet.create({
    northGlow: {
        position: "absolute",
        top: -112,
        left: -128,
        width: 420,
        height: 420,
        borderRadius: 999,
        opacity: 0.95,
    },
    eastGlow: {
        position: "absolute",
        top: 76,
        right: -148,
        width: 520,
        height: 520,
        borderRadius: 999,
        opacity: 0.94,
    },
    southGlow: {
        position: "absolute",
        bottom: -112,
        left: -56,
        width: 360,
        height: 360,
        borderRadius: 999,
        opacity: 0.9,
    },
    verticalLift: {
        position: "absolute",
        top: -60,
        left: "24%",
        width: "52%",
        height: "78%",
        opacity: 0.78,
    },
});
