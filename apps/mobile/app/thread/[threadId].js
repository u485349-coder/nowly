import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { api } from "../../lib/api";
import { track } from "../../lib/analytics";
import { formatTime } from "../../lib/format";
import { getSocket } from "../../lib/socket";
import { webPressableStyle } from "../../lib/web-pressable";
import { useAppStore } from "../../store/useAppStore";
const normalizeIncomingMessage = (message) => ({
    id: message.id,
    threadId: message.threadId,
    senderId: message.senderId,
    senderName: message.senderName ?? message.sender?.name ?? "Friend",
    text: message.text,
    type: message.type,
    createdAt: message.createdAt,
});
export default function ThreadScreen() {
    const { threadId } = useLocalSearchParams();
    const token = useAppStore((state) => state.token);
    const user = useAppStore((state) => state.user);
    const hangouts = useAppStore((state) => state.hangouts);
    const threadMessages = useAppStore((state) => state.threadMessages[threadId] ?? []);
    const setThreadMessages = useAppStore((state) => state.setThreadMessages);
    const appendMessage = useAppStore((state) => state.appendMessage);
    const [text, setText] = useState("");
    const hangout = hangouts.find((item) => item.threadId === threadId);
    const isCompleted = hangout?.status === "COMPLETED";
    useEffect(() => {
        if (hangout?.id && isCompleted) {
            router.replace(`/recap/${hangout.id}`);
        }
    }, [hangout?.id, isCompleted]);
    useEffect(() => {
        if (!threadId || isCompleted) {
            return;
        }
        api.fetchThreadMessages(token, threadId).then((messages) => {
            setThreadMessages(threadId, messages);
        });
    }, [isCompleted, setThreadMessages, threadId, token]);
    useEffect(() => {
        if (!threadId || isCompleted) {
            return;
        }
        const socket = getSocket(token);
        if (!socket) {
            return;
        }
        socket.emit("thread:join", { threadId });
        const handleIncoming = (message) => {
            if (message.threadId !== threadId) {
                return;
            }
            appendMessage(threadId, normalizeIncomingMessage(message));
        };
        socket.on("thread:message", handleIncoming);
        socket.on("thread:reaction", handleIncoming);
        socket.on("thread:poll", handleIncoming);
        return () => {
            socket.off("thread:message", handleIncoming);
            socket.off("thread:reaction", handleIncoming);
            socket.off("thread:poll", handleIncoming);
        };
    }, [appendMessage, isCompleted, threadId, token]);
    const quickReactions = useMemo(() => ["Fire", "Ramen", "Run", "Coffee"], []);
    const sendLocalMessage = (payload) => {
        appendMessage(threadId, payload);
    };
    const handleSend = () => {
        if (!text.trim() || !user || isCompleted) {
            return;
        }
        const socket = getSocket(token);
        if (socket) {
            socket.emit("thread:message", { threadId, text });
        }
        else {
            sendLocalMessage({
                id: `local-${Date.now()}`,
                threadId,
                senderId: user.id,
                senderName: user.name,
                text,
                type: "TEXT",
                createdAt: new Date().toISOString(),
            });
        }
        void track(token, "message_sent", { threadId });
        setText("");
    };
    const handleReaction = (emoji) => {
        if (!user || isCompleted) {
            return;
        }
        const socket = getSocket(token);
        if (socket) {
            socket.emit("thread:reaction", { threadId, emoji });
        }
        else {
            sendLocalMessage({
                id: `reaction-${Date.now()}`,
                threadId,
                senderId: user.id,
                senderName: user.name,
                text: emoji,
                type: "REACTION",
                createdAt: new Date().toISOString(),
            });
        }
    };
    const handleEta = () => {
        if (!hangout || isCompleted) {
            return;
        }
        const socket = getSocket(token);
        if (socket) {
            socket.emit("thread:eta", {
                hangoutId: hangout.id,
                etaMinutes: 12,
            });
        }
        sendLocalMessage({
            id: `eta-${Date.now()}`,
            threadId,
            senderId: user?.id ?? "me",
            senderName: user?.name ?? "You",
            text: "ETA 12 min",
            type: "SYSTEM",
            createdAt: new Date().toISOString(),
        });
    };
    if (isCompleted && hangout?.id) {
        return (_jsx(GradientMesh, { children: _jsx(View, { className: "flex-1 items-center justify-center px-6", children: _jsx(Text, { className: "font-body text-base text-white/60", children: "Opening recap..." }) }) }));
    }
    return (_jsx(GradientMesh, { children: _jsxs(View, { className: "flex-1 px-5 pb-8 pt-16", children: [_jsxs(GlassCard, { className: "mb-4 p-5", children: [_jsx(Text, { className: "font-display text-2xl text-cloud", children: hangout?.activity ?? "Crew thread" }), _jsx(Text, { className: "mt-1 font-body text-sm text-white/60", children: "Quick chat, polls, ETA, and live location belong here." })] }), _jsx(ScrollView, { className: "flex-1", contentContainerStyle: { gap: 12, paddingBottom: 24 }, children: threadMessages.map((message) => (_jsxs(GlassCard, { className: "p-4", children: [_jsxs(View, { className: "flex-row items-center justify-between", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: message.senderName }), _jsx(Text, { className: "font-body text-xs text-white/45", children: formatTime(message.createdAt) })] }), _jsx(Text, { className: "mt-2 font-body text-base leading-6 text-white/70", children: message.text })] }, message.id))) }), _jsxs(View, { className: "mb-3 flex-row gap-2", children: [quickReactions.map((emoji) => (_jsx(Pressable, { onPress: () => handleReaction(emoji), className: "rounded-full bg-white/10 px-4 py-3", style: ({ pressed }) => webPressableStyle(pressed, { pressedOpacity: 0.86, pressedScale: 0.99 }), children: _jsx(Text, { className: "font-body text-sm text-cloud", children: emoji }) }, emoji))), _jsx(PillButton, { label: "ETA 12m", variant: "secondary", onPress: handleEta })] }), _jsxs(View, { className: "flex-row items-center gap-3", children: [_jsx(TextInput, { value: text, onChangeText: setText, placeholder: "Drop a quick update", placeholderTextColor: "rgba(248,250,252,0.4)", className: "flex-1 rounded-[24px] border border-white/12 bg-white/8 px-4 py-4 font-body text-base text-cloud" }), _jsx(PillButton, { label: "Send", onPress: handleSend })] })] }) }));
}
