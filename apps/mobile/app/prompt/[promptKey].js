import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { findPromptAction } from "../../features/prompts/prompt-actions";
import { api } from "../../lib/api";
import { availabilityLabel } from "../../lib/labels";
import { webPressableStyle } from "../../lib/web-pressable";
import { useAppStore } from "../../store/useAppStore";
export default function PromptPickerScreen() {
    const { promptKey, recipientId } = useLocalSearchParams();
    const token = useAppStore((state) => state.token);
    const user = useAppStore((state) => state.user);
    const matches = useAppStore((state) => state.matches);
    const friends = useAppStore((state) => state.friends);
    const upsertHangout = useAppStore((state) => state.upsertHangout);
    const prompt = findPromptAction(promptKey);
    const [customLabel, setCustomLabel] = useState(prompt?.label ?? "");
    const [customDetail, setCustomDetail] = useState(prompt?.detail ?? "");
    const [customActivity, setCustomActivity] = useState(prompt?.activity ?? "");
    const matchByRecipientId = useMemo(() => new Map(matches.map((match) => [match.matchedUser.id, match])), [matches]);
    const recipients = useMemo(() => {
        const seen = new Set();
        const next = [];
        matches.forEach((match) => {
            if (seen.has(match.matchedUser.id)) {
                return;
            }
            seen.add(match.matchedUser.id);
            next.push({
                id: match.matchedUser.id,
                name: match.matchedUser.name,
                photoUrl: match.matchedUser.photoUrl,
                eyebrow: match.reason.meetingStyle === "ONLINE"
                    ? `${availabilityLabel(match.matchedSignal.state).toLowerCase()} · ${match.reason.onlineVenue ?? "online"}`
                    : `${availabilityLabel(match.matchedSignal.state).toLowerCase()} · ${match.reason.travelMinutes ?? 15} min away`,
                detail: match.insightLabel ?? match.reason.momentumLabel ?? "Strong short-notice fit",
            });
        });
        friends.forEach((friend) => {
            if (seen.has(friend.id)) {
                return;
            }
            seen.add(friend.id);
            next.push({
                id: friend.id,
                name: friend.name,
                photoUrl: friend.photoUrl,
                eyebrow: friend.lastSignal
                    ? `${availabilityLabel(friend.lastSignal).toLowerCase()} · crew friend`
                    : "crew friend",
                detail: friend.insight?.cadenceNote ??
                    friend.sharedLabel ??
                    "Send the prompt now and let timing do the rest.",
            });
        });
        return next;
    }, [friends, matches]);
    const [selectedRecipientId, setSelectedRecipientId] = useState(recipients[0]?.id ?? null);
    const preferredRecipientId = Array.isArray(recipientId) ? recipientId[0] : recipientId;
    useEffect(() => {
        if (!recipients.length) {
            setSelectedRecipientId(null);
            return;
        }
        if (preferredRecipientId && recipients.some((recipient) => recipient.id === preferredRecipientId)) {
            setSelectedRecipientId(preferredRecipientId);
            return;
        }
        if (!selectedRecipientId || !recipients.some((recipient) => recipient.id === selectedRecipientId)) {
            setSelectedRecipientId(recipients[0].id);
        }
    }, [preferredRecipientId, recipients, selectedRecipientId]);
    useEffect(() => {
        setCustomLabel(prompt?.label ?? "");
        setCustomDetail(prompt?.detail ?? "");
        setCustomActivity(prompt?.activity ?? "");
    }, [prompt?.activity, prompt?.detail, prompt?.label]);
    const selectedRecipient = recipients.find((recipient) => recipient.id === selectedRecipientId) ?? null;
    const selectedMatch = selectedRecipientId
        ? matchByRecipientId.get(selectedRecipientId) ?? null
        : null;
    const handleSendPrompt = async () => {
        if (!prompt || !selectedRecipientId) {
            return;
        }
        const nextActivity = customActivity.trim() || prompt.activity;
        try {
            const hangout = await api.createHangout(token, {
                activity: nextActivity,
                microType: prompt.microType,
                commitmentLevel: prompt.commitmentLevel,
                locationName: selectedMatch?.reason.onlineVenue ||
                    user?.communityTag ||
                    user?.city ||
                    "nearby",
                participantIds: [selectedRecipientId],
                scheduledFor: new Date(Date.now() + 35 * 60 * 1000).toISOString(),
            });
            upsertHangout(hangout);
            router.replace(`/proposal/${hangout.id}`);
        }
        catch (error) {
            Alert.alert("Could not send that prompt", error instanceof Error ? error.message : "Try that again.");
        }
    };
    if (!prompt) {
        return (_jsx(GradientMesh, { children: _jsxs(View, { className: "flex-1 items-center justify-center px-6", children: [_jsx(Text, { className: "font-display text-3xl text-cloud", children: "Prompt not found" }), _jsx(Text, { className: "mt-3 text-center font-body text-base leading-7 text-white/60", children: "That prompt does not exist anymore. Head back and pick another one." })] }) }));
    }
    return (_jsx(GradientMesh, { children: _jsxs(ScrollView, { className: "flex-1", contentContainerStyle: {
                paddingHorizontal: 20,
                paddingTop: 62,
                paddingBottom: 48,
                gap: 18,
            }, showsVerticalScrollIndicator: false, children: [_jsxs(View, { className: "flex-row items-start justify-between gap-4", children: [_jsxs(View, { className: "max-w-[82%] gap-2", children: [_jsx(Text, { className: "font-body text-sm uppercase tracking-[2px] text-aqua/80", children: "Send prompt" }), _jsx(Text, { className: "font-display text-[34px] leading-[38px] text-cloud", children: "Choose who should get this nudge." }), _jsx(Text, { className: "font-body text-sm leading-6 text-white/60", children: "Pick a match or friend, then send one clean low-pressure move." })] }), _jsx(Pressable, { onPress: () => router.back(), className: "h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/6", style: ({ pressed }) => webPressableStyle(pressed, { pressedOpacity: 0.88, pressedScale: 0.97 }), children: _jsx(MaterialCommunityIcons, { name: "close", size: 20, color: "#F8FAFC" }) })] }), _jsx(GlassCard, { className: "p-5", children: _jsxs(View, { className: "gap-3", children: [_jsx(View, { className: "self-start rounded-full border border-white/10 bg-white/6 px-4 py-2.5", children: _jsx(Text, { className: "font-body text-xs text-cloud", children: customLabel.trim() || prompt.label }) }), _jsx(Text, { className: "font-body text-base leading-7 text-cloud", children: customDetail.trim() || prompt.detail }), _jsx(Text, { className: "font-body text-sm leading-6 text-white/60", children: "This will open a real proposal thread, not just send a vague ping." })] }) }), _jsx(GlassCard, { className: "p-5", children: _jsxs(View, { className: "gap-3", children: [_jsx(Text, { className: "font-display text-xl text-cloud", children: "Make it yours" }), _jsx(Text, { className: "font-body text-sm leading-6 text-white/60", children: "Keep the preset if it already works, or tweak the wording before you send it." }), _jsx(TextInput, { value: customLabel, onChangeText: setCustomLabel, placeholder: prompt.label, placeholderTextColor: "rgba(248,250,252,0.4)", className: "rounded-[24px] border border-white/12 bg-white/8 px-4 py-4 font-body text-base text-cloud" }), _jsx(TextInput, { value: customDetail, onChangeText: setCustomDetail, placeholder: prompt.detail, placeholderTextColor: "rgba(248,250,252,0.4)", className: "rounded-[24px] border border-white/12 bg-white/8 px-4 py-4 font-body text-base text-cloud" }), _jsx(TextInput, { value: customActivity, onChangeText: setCustomActivity, placeholder: prompt.activity, placeholderTextColor: "rgba(248,250,252,0.4)", className: "rounded-[24px] border border-white/12 bg-white/8 px-4 py-4 font-body text-base text-cloud" }), _jsxs(Text, { className: "font-body text-sm leading-6 text-aqua/80", children: ["The final plan line becomes: ", customActivity.trim() || prompt.activity] })] }) }), _jsxs(View, { className: "gap-3", children: [_jsx(Text, { className: "font-display text-2xl text-cloud", children: "Who should see it?" }), recipients.length ? (recipients.map((recipient) => {
                            const selected = recipient.id === selectedRecipientId;
                            return (_jsx(Pressable, { onPress: () => setSelectedRecipientId(recipient.id), className: `rounded-[28px] border p-4 ${selected ? "border-aqua/55 bg-aqua/10" : "border-white/10 bg-white/[0.04]"}`, style: ({ pressed }) => webPressableStyle(pressed), children: _jsxs(View, { className: "flex-row items-center gap-4", children: [recipient.photoUrl ? (_jsx(Image, { source: { uri: recipient.photoUrl }, className: "h-14 w-14 rounded-full" })) : (_jsx(View, { className: "h-14 w-14 items-center justify-center rounded-full bg-white/10", children: _jsx(Text, { className: "font-display text-lg text-cloud", children: recipient.name.slice(0, 1).toUpperCase() }) })), _jsxs(View, { className: "flex-1 gap-1", children: [_jsx(Text, { className: "font-display text-lg text-cloud", children: recipient.name }), _jsx(Text, { className: "font-body text-sm text-white/58", children: recipient.eyebrow }), _jsx(Text, { className: "font-body text-sm leading-6 text-aqua/82", children: recipient.detail })] }), selected ? (_jsx(MaterialCommunityIcons, { name: "check-circle", size: 24, color: "#22D3EE" })) : null] }) }, recipient.id));
                        })) : (_jsxs(GlassCard, { className: "p-5", children: [_jsx(Text, { className: "font-display text-xl text-cloud", children: "No crew available yet" }), _jsx(Text, { className: "mt-2 font-body text-sm leading-6 text-white/60", children: "Once matches and friends populate, you will be able to send this prompt from here." })] }))] }), _jsx(PillButton, { label: selectedRecipient
                        ? `Send to ${selectedRecipient.name}`
                        : "Pick someone first", onPress: () => void handleSendPrompt(), disabled: !selectedRecipient })] }) }));
}
