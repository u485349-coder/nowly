import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Image, Text, View } from "react-native";
import { nowlyColors } from "../../constants/theme";
import { NOWLY_SLOGAN } from "../../lib/branding";
const iconAsset = require("../../assets/icon.png");
const Icon = ({ size = 72 }) => (_jsx(Image, { source: iconAsset, resizeMode: "contain", style: {
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.24),
    } }));
const Wordmark = ({ monochrome = false }) => (_jsxs(View, { children: [_jsx(Text, { style: {
                color: monochrome ? "#FFFFFF" : nowlyColors.cloud,
                fontFamily: "SpaceGrotesk_700Bold",
                fontSize: 28,
                letterSpacing: -1.2,
            }, children: "Nowly" }), _jsx(Text, { style: {
                color: monochrome ? "rgba(255,255,255,0.72)" : nowlyColors.muted,
                fontFamily: "SpaceGrotesk_500Medium",
                fontSize: 12,
                letterSpacing: 0.2,
                marginTop: -1,
            }, children: NOWLY_SLOGAN })] }));
export const NowlyMark = ({ variant = "lockup", size = 72 }) => {
    if (variant === "icon") {
        return _jsx(Icon, { size: size });
    }
    if (variant === "mini") {
        return _jsx(Icon, { size: size });
    }
    if (variant === "wordmark") {
        return _jsx(Wordmark, {});
    }
    if (variant === "monochrome") {
        return (_jsxs(View, { className: "flex-row items-center gap-3", children: [_jsx(Icon, { size: size }), _jsx(Wordmark, { monochrome: true })] }));
    }
    return (_jsxs(View, { className: "flex-row items-center gap-3", children: [_jsx(Icon, { size: size }), _jsx(Wordmark, {})] }));
};
