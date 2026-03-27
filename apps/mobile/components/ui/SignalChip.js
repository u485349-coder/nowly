import { jsx as _jsx } from "react/jsx-runtime";
import { Platform, Pressable, Text } from "react-native";
import { webPressableStyle } from "../../lib/web-pressable";
export const SignalChip = ({ label, active, onPress, }) => (_jsx(Pressable, { onPress: onPress, className: `rounded-full border px-4 py-2 ${active
        ? "border-violet/55 bg-violet/18"
        : "border-white/8 bg-white/[0.045]"}`, style: ({ pressed }) => Platform.OS === "web"
        ? webPressableStyle(pressed, { pressedOpacity: 0.86, pressedScale: 0.99 })
        : undefined, children: _jsx(Text, { className: `font-body text-sm ${active ? "text-cloud" : "text-white/78"}`, children: label }) }));
