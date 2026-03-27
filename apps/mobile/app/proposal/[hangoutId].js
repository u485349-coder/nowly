import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Share, ScrollView, Text, View } from "react-native";
import { useEffect } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { formatDayTime } from "../../lib/format";
import { hangoutIntentLabel, microCommitmentLabel, microResponseLabel, } from "../../lib/labels";
import { api } from "../../lib/api";
import { useAppStore } from "../../store/useAppStore";
import { createSmartOpenUrl } from "../../lib/smart-links";
const responseActions = [
    {
        label: "Pull up",
        responseStatus: "ACCEPTED",
        microResponse: "PULLING_UP",
    },
    {
        label: "10 min only",
        responseStatus: "ACCEPTED",
        microResponse: "TEN_MIN_ONLY",
    },
    {
        label: "Maybe later",
        responseStatus: "SUGGESTED_CHANGE",
        microResponse: "MAYBE_LATER",
    },
    {
        label: "Pass",
        responseStatus: "DECLINED",
        microResponse: "PASS",
    },
];
export default function ProposalScreen() {
    const { hangoutId } = useLocalSearchParams();
    const token = useAppStore((state) => state.token);
    const user = useAppStore((state) => state.user);
    const hangouts = useAppStore((state) => state.hangouts);
    const recaps = useAppStore((state) => state.recaps);
    const updateHangoutResponse = useAppStore((state) => state.updateHangoutResponse);
    const hangout = hangouts.find((item) => item.id === hangoutId);
    const recap = recaps.find((item) => item.hangoutId === hangoutId);
    const isCompleted = hangout?.status === "COMPLETED";
    const confirmationHint = hangout && hangout.participants.length <= 2
        ? "This 1:1 locks once both of you are in."
        : "This group hang locks once at least 3 people are in.";
    useEffect(() => {
        if (hangout && isCompleted) {
            router.replace(`/recap/${hangout.id}`);
        }
    }, [hangout, isCompleted]);
    const handleRespond = async (action) => {
        if (!hangout || !user || isCompleted) {
            return;
        }
        updateHangoutResponse(hangout.id, user.id, action.responseStatus, action.microResponse);
        await api.respondToHangout(token, hangout.id, {
            responseStatus: action.responseStatus,
            microResponse: action.microResponse,
        });
    };
    if (!hangout) {
        return (_jsx(GradientMesh, { children: _jsx(View, { className: "flex-1 items-center justify-center px-6", children: _jsx(Text, { className: "font-display text-3xl text-cloud", children: "Proposal not found" }) }) }));
    }
    if (isCompleted) {
        return (_jsx(GradientMesh, { children: _jsx(View, { className: "flex-1 items-center justify-center px-6", children: _jsx(Text, { className: "font-body text-base text-white/60", children: "Opening recap..." }) }) }));
    }
    return (_jsx(GradientMesh, { children: _jsxs(ScrollView, { className: "flex-1", contentContainerStyle: {
                paddingHorizontal: 20,
                paddingTop: 62,
                paddingBottom: 40,
                gap: 18,
            }, showsVerticalScrollIndicator: false, children: [_jsxs(GlassCard, { className: "p-6", children: [_jsxs(View, { className: "flex-row items-start justify-between gap-4", children: [_jsxs(View, { className: "max-w-[76%]", children: [_jsx(Text, { className: "font-display text-[34px] leading-[38px] text-cloud", children: hangout.activity }), _jsxs(Text, { className: "mt-3 font-body text-base leading-6 text-white/60", children: [hangout.locationName, " - ", formatDayTime(hangout.scheduledFor)] })] }), _jsx(View, { className: "rounded-full bg-white/10 px-3 py-2", children: _jsx(Text, { className: "font-body text-xs uppercase tracking-[1px] text-aqua", children: hangout.status }) })] }), _jsxs(View, { className: "mt-4 flex-row flex-wrap gap-2", children: [_jsx(View, { className: "rounded-full bg-aqua/20 px-3 py-2", children: _jsx(Text, { className: "font-body text-sm text-cloud", children: hangout.microType ? hangoutIntentLabel(hangout.microType) : "quick link" }) }), _jsx(View, { className: "rounded-full bg-white/10 px-3 py-2", children: _jsx(Text, { className: "font-body text-sm text-cloud", children: microCommitmentLabel(hangout.commitmentLevel) }) })] }), _jsxs(Text, { className: "mt-4 font-body text-sm leading-6 text-aqua/80", children: ["Keep it light. This is meant to feel easy to join, easy to exit, and fast to turn into a real link. ", confirmationHint] })] }), _jsxs(GlassCard, { className: "p-5", children: [_jsx(Text, { className: "font-display text-xl text-cloud", children: "React with low pressure" }), _jsx(View, { className: "mt-4 flex-row flex-wrap gap-3", children: responseActions.map((action) => (_jsx(PillButton, { label: action.label, variant: action.label === "Pass" ? "ghost" : "secondary", onPress: () => handleRespond(action) }, action.label))) })] }), _jsxs(GlassCard, { className: "p-5", children: [_jsx(Text, { className: "font-display text-xl text-cloud", children: "Crew status" }), _jsx(View, { className: "mt-4 gap-3", children: hangout.participantsInfo.map((participant) => (_jsxs(View, { className: "flex-row items-center justify-between gap-4", children: [_jsxs(View, { className: "max-w-[60%]", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: participant.name }), participant.microResponse ? (_jsx(Text, { className: "mt-1 font-body text-sm text-aqua/80", children: microResponseLabel(participant.microResponse) })) : null] }), _jsx(View, { className: "rounded-full bg-white/10 px-3 py-2", children: _jsx(Text, { className: "font-body text-xs uppercase tracking-[1px] text-aqua", children: participant.responseStatus }) })] }, participant.userId))) })] }), _jsxs(GlassCard, { className: "p-5", children: [_jsx(Text, { className: "font-display text-xl text-cloud", children: "Send it into the thread" }), _jsx(Text, { className: "mt-2 font-body text-sm leading-6 text-white/60", children: "Once people react, the thread becomes the lightweight room for quick updates, ETA, and last-minute pivots." }), _jsxs(View, { className: "mt-4 flex-row gap-3", children: [_jsx(PillButton, { label: "Open thread", onPress: () => router.push(`/thread/${hangout.threadId}`) }), _jsx(PillButton, { label: "Share link", variant: "secondary", onPress: () => Share.share({
                                        message: `Join our Nowly link-up -> ${createSmartOpenUrl(`/proposal/${hangout.id}`)}`,
                                    }) })] })] })] }) }));
}
