import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { GradientMesh } from "../components/ui/GradientMesh";
import { PillButton } from "../components/ui/PillButton";
export default function NotFoundScreen() {
    return (_jsx(GradientMesh, { children: _jsxs(View, { className: "flex-1 items-center justify-center px-6", children: [_jsx(Text, { className: "font-display text-4xl text-cloud", children: "Lost the vibe" }), _jsx(Text, { className: "mt-3 text-center font-body text-base text-white/60", children: "That screen is gone, expired, or was never live in the first place." }), _jsx(View, { className: "mt-6", children: _jsx(PillButton, { label: "Back home", onPress: () => router.replace("/home") }) })] }) }));
}
