import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { api } from "../../lib/api";
import { hangoutIntentLabel, vibeLabel } from "../../lib/labels";
import { useAppStore } from "../../store/useAppStore";
const fastPlans = [
    {
        title: "Pull up for a bit",
        hint: "Lowest pressure. Great when you are already in motion.",
        activity: "pull up for a bit",
        microType: "PULL_UP",
        commitmentLevel: "DROP_IN",
    },
    {
        title: "Quick bite",
        hint: "A clean yes with an obvious exit point.",
        activity: "grab a quick bite",
        microType: "QUICK_BITE",
        commitmentLevel: "QUICK_WINDOW",
    },
    {
        title: "Coffee run",
        hint: "Fast, low-spend, easy to say yes to.",
        activity: "coffee run",
        microType: "COFFEE_RUN",
        commitmentLevel: "QUICK_WINDOW",
    },
    {
        title: "Walk nearby",
        hint: "No venue stress, no big commitment.",
        activity: "walk nearby",
        microType: "WALK_NEARBY",
        commitmentLevel: "DROP_IN",
    },
];
export default function MatchDetailScreen() {
    const { matchId } = useLocalSearchParams();
    const token = useAppStore((state) => state.token);
    const user = useAppStore((state) => state.user);
    const matches = useAppStore((state) => state.matches);
    const upsertHangout = useAppStore((state) => state.upsertHangout);
    const upsertDirectChat = useAppStore((state) => state.upsertDirectChat);
    const match = matches.find((item) => item.id === matchId);
    const isOnlineMatch = match?.reason.meetingStyle === "ONLINE";
    const liveFitLine = match
        ? isOnlineMatch
            ? `${match.reason.overlapMinutes} minutes live, ${match.reason.onlineVenue ? `best on ${match.reason.onlineVenue}, ` : ""}and a ${Math.round(match.score * 100)}% likelihood this turns into a real link.`
            : `${match.reason.overlapMinutes} minutes live, about ${match.reason.travelMinutes ?? 15} min apart, and a ${Math.round(match.score * 100)}% likelihood this turns into a real link.`
        : "";
    const handleOpenChat = async () => {
        if (!match) {
            return;
        }
        const chat = await api.openDirectChat(token, match.matchedUser.id);
        upsertDirectChat(chat);
        router.push({
            pathname: "/chat/[chatId]",
            params: { chatId: chat.id },
        });
    };
    const handleSendPrompt = () => {
        if (!match) {
            return;
        }
        router.push({
            pathname: "/prompt/[promptKey]",
            params: {
                promptKey: "custom-prompt",
                recipientId: match.matchedUser.id,
            },
        });
    };
    const handlePropose = async (plan) => {
        if (!match) {
            return;
        }
        const hangout = await api.createHangout(token, {
            activity: plan.activity,
            microType: plan.microType,
            commitmentLevel: plan.commitmentLevel,
            locationName: match.reason.onlineVenue ||
                match.matchedUser.communityTag ||
                match.matchedUser.city ||
                user?.city ||
                "nearby",
            participantIds: [match.matchedUser.id],
            scheduledFor: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        });
        upsertHangout(hangout);
        router.push(`/proposal/${hangout.id}`);
    };
    if (!match) {
        return (_jsx(GradientMesh, { children: _jsxs(View, { className: "flex-1 items-center justify-center px-6", children: [_jsx(Text, { className: "font-display text-3xl text-cloud", children: "Match expired" }), _jsx(Text, { className: "mt-3 text-center font-body text-base text-white/60", children: "The overlap probably timed out. Head back home and catch the next one." })] }) }));
    }
    return (_jsx(GradientMesh, { children: _jsxs(ScrollView, { className: "flex-1", contentContainerStyle: {
                paddingHorizontal: 20,
                paddingTop: 62,
                paddingBottom: 40,
                gap: 18,
            }, showsVerticalScrollIndicator: false, children: [_jsxs(GlassCard, { className: "p-6", children: [_jsxs(Text, { className: "font-display text-[34px] leading-[38px] text-cloud", children: ["You and ", match.matchedUser.name, " overlap right now"] }), _jsx(Text, { className: "mt-3 font-body text-base leading-6 text-white/60", children: liveFitLine }), _jsxs(View, { className: "mt-5 flex-row flex-wrap gap-2", children: [_jsx(View, { className: "rounded-full bg-aqua/20 px-3 py-2", children: _jsx(Text, { className: "font-body text-sm text-cloud", children: match.reason.sharedIntent
                                            ? hangoutIntentLabel(match.reason.sharedIntent)
                                            : "quick link" }) }), match.reason.sharedVibe ? (_jsx(View, { className: "rounded-full bg-white/10 px-3 py-2", children: _jsxs(Text, { className: "font-body text-sm text-cloud", children: ["shared vibe: ", vibeLabel(match.reason.sharedVibe)] }) })) : null, match.reason.timingLabel ? (_jsx(View, { className: "rounded-full bg-white/10 px-3 py-2", children: _jsxs(Text, { className: "font-body text-sm text-cloud", children: ["strongest ", match.reason.timingLabel] }) })) : null, isOnlineMatch ? (_jsx(View, { className: "rounded-full bg-white/10 px-3 py-2", children: _jsx(Text, { className: "font-body text-sm text-cloud", children: match.reason.onlineVenue ? `online via ${match.reason.onlineVenue}` : "online hang" }) })) : null, match.reason.crowdMode === "GROUP" ? (_jsx(View, { className: "rounded-full bg-white/10 px-3 py-2", children: _jsx(Text, { className: "font-body text-sm text-cloud", children: "group friendly" }) })) : null] }), _jsx(Text, { className: "mt-4 font-body text-sm text-aqua/80", children: match.insightLabel ?? match.reason.momentumLabel ?? "Strong short-notice fit" }), _jsxs(View, { className: "mt-5 flex-row flex-wrap gap-3", children: [_jsx(PillButton, { label: "Open private chat", variant: "secondary", onPress: () => void handleOpenChat() }), _jsx(PillButton, { label: "Send prompt", onPress: handleSendPrompt })] })] }), _jsxs(View, { className: "gap-3", children: [_jsx(Text, { className: "font-display text-2xl text-cloud", children: "Pitch a low-stakes move" }), fastPlans.map((plan) => (_jsx(GlassCard, { className: "p-4", children: _jsxs(View, { className: "gap-3", children: [_jsxs(View, { className: "flex-row items-center justify-between gap-3", children: [_jsx(Text, { className: "font-display text-lg text-cloud", children: plan.title }), _jsx(PillButton, { label: "Send", variant: "secondary", onPress: () => handlePropose(plan) })] }), _jsx(Text, { className: "font-body text-sm leading-6 text-white/60", children: plan.hint })] }) }, plan.title)))] })] }) }));
}
