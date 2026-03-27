import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Share, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { api } from "../../lib/api";
import { track } from "../../lib/analytics";
import { useAppStore } from "../../store/useAppStore";
export default function RecapScreen() {
    const { hangoutId } = useLocalSearchParams();
    const token = useAppStore((state) => state.token);
    const hangouts = useAppStore((state) => state.hangouts);
    const recaps = useAppStore((state) => state.recaps);
    const addRecap = useAppStore((state) => state.addRecap);
    const setHangoutStatus = useAppStore((state) => state.setHangoutStatus);
    const hangout = hangouts.find((item) => item.id === hangoutId);
    const recap = recaps.find((item) => item.hangoutId === hangoutId);
    const handleConfirm = async () => {
        const created = await api.createRecap(token, hangoutId);
        addRecap(created);
        setHangoutStatus(hangoutId, "COMPLETED");
    };
    return (_jsx(GradientMesh, { children: _jsxs(ScrollView, { className: "flex-1", contentContainerStyle: {
                paddingHorizontal: 20,
                paddingTop: 62,
                paddingBottom: 40,
                gap: 18,
            }, showsVerticalScrollIndicator: false, children: [_jsxs(LinearGradient, { colors: ["#4F46E5", "#7C3AED", "#22D3EE"], className: "overflow-hidden rounded-[32px] p-6", children: [_jsx(Text, { className: "font-body text-sm uppercase tracking-[2px] text-cloud/75", children: recap?.badge ?? "Did you hang?" }), _jsx(Text, { className: "mt-4 font-display text-[36px] leading-[40px] text-cloud", children: recap?.title ?? hangout?.activity ?? "Spontaneous win" }), _jsx(Text, { className: "mt-3 font-body text-base leading-6 text-cloud/85", children: recap?.summary ?? "Confirm the hang and turn it into a momentum loop for next week." }), _jsxs(View, { className: "mt-6 rounded-[24px] bg-black/20 p-4", children: [_jsx(Text, { className: "font-body text-xs uppercase tracking-[2px] text-cloud/70", children: "Streak" }), _jsx(Text, { className: "mt-2 font-display text-4xl text-cloud", children: recap?.streakCount ?? 1 })] })] }), _jsxs(GlassCard, { className: "p-5", children: [_jsx(Text, { className: "font-display text-xl text-cloud", children: "Post-hang loop" }), _jsx(Text, { className: "mt-2 font-body text-sm leading-6 text-white/60", children: "The recap becomes social proof, a memory card, and a retention nudge all at once." }), _jsxs(View, { className: "mt-5 flex-row gap-3", children: [_jsx(PillButton, { label: recap ? "Refresh recap" : "Yes, we hung", onPress: handleConfirm }), _jsx(PillButton, { label: "Share recap", variant: "secondary", onPress: async () => {
                                        await track(token, "recap_shared", { hangoutId });
                                        await Share.share({
                                            message: `We actually linked up on Nowly: ${recap?.title ?? hangout?.activity ?? "spontaneous hangout"}`,
                                        });
                                    } })] })] })] }) }));
}
