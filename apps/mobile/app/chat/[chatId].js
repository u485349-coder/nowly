import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { useResponsiveLayout } from "../../components/ui/useResponsiveLayout";
import { nowlyColors } from "../../constants/theme";
import { api } from "../../lib/api";
import { track } from "../../lib/analytics";
import { formatTime } from "../../lib/format";
import { getSocket } from "../../lib/socket";
import { webPressableStyle } from "../../lib/web-pressable";
import { useAppStore } from "../../store/useAppStore";
const normalizeIncomingMessage = (message) => ({
    id: message.id,
    chatId: message.threadId,
    senderId: message.senderId,
    senderName: message.sender?.name ?? "Friend",
    text: message.text,
    type: message.type,
    createdAt: message.createdAt,
});
const chatDisplayName = (chat) => chat?.title ||
    chat?.participants.map((participant) => participant.name).join(", ") ||
    "Private chat";
const Avatar = ({ name, photoUrl, size, borderColor = "rgba(255,255,255,0.14)", textSize = 18, }) => (_jsx(View, { style: [
        styles.avatarShell,
        {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor,
        },
    ], children: photoUrl ? (_jsx(Image, { source: { uri: photoUrl }, style: styles.avatarImage, resizeMode: "cover" })) : (_jsx(View, { style: styles.avatarFallback, children: _jsx(Text, { style: [styles.avatarInitial, { fontSize: textSize }], children: (name[0] ?? "N").toUpperCase() }) })) }));
const compactPositions = [
    { left: 0, top: 20 },
    { left: 26, top: 0 },
    { left: 52, top: 20 },
    { left: 26, top: 44 },
];
const CompactAvatarCluster = ({ participants, maxVisible = 4, }) => {
    const visibleParticipants = participants.slice(0, maxVisible);
    const overflowCount = Math.max(0, participants.length - maxVisible);
    return (_jsxs(View, { style: styles.clusterWrap, children: [visibleParticipants.map((participant, index) => (_jsx(View, { style: [
                    styles.clusterAvatarSlot,
                    {
                        left: compactPositions[index]?.left ?? 0,
                        top: compactPositions[index]?.top ?? 0,
                    },
                ], children: _jsx(Avatar, { name: participant.name, photoUrl: participant.photoUrl, size: 48, borderColor: "rgba(8,14,29,0.65)", textSize: 16 }) }, participant.id))), overflowCount > 0 ? (_jsx(View, { style: styles.clusterOverflow, children: _jsxs(Text, { style: styles.clusterOverflowText, children: ["+", overflowCount] }) })) : null] }));
};
const HeaderAvatarStack = ({ participants }) => {
    const visibleParticipants = participants.slice(0, 3);
    const overflowCount = Math.max(0, participants.length - visibleParticipants.length);
    return (_jsxs(View, { style: styles.headerAvatarStack, children: [visibleParticipants.map((participant, index) => (_jsx(View, { style: { marginLeft: index === 0 ? 0 : -10, zIndex: visibleParticipants.length - index }, children: _jsx(Avatar, { name: participant.name, photoUrl: participant.photoUrl, size: 30, borderColor: "rgba(8,14,29,0.76)", textSize: 12 }) }, participant.id))), overflowCount > 0 ? (_jsx(View, { style: styles.headerOverflow, children: _jsxs(Text, { style: styles.headerOverflowText, children: ["+", overflowCount] }) })) : null] }));
};
export default function DirectChatScreen() {
    const { chatId } = useLocalSearchParams();
    const token = useAppStore((state) => state.token);
    const user = useAppStore((state) => state.user);
    const directChats = useAppStore((state) => state.directChats);
    const directMessages = useAppStore((state) => state.directMessages[chatId] ?? []);
    const setDirectMessages = useAppStore((state) => state.setDirectMessages);
    const appendDirectMessage = useAppStore((state) => state.appendDirectMessage);
    const upsertDirectChat = useAppStore((state) => state.upsertDirectChat);
    const layout = useResponsiveLayout();
    const inputRef = useRef(null);
    const [text, setText] = useState("");
    const [showShortcuts, setShowShortcuts] = useState(true);
    const chat = directChats.find((item) => item.id === chatId);
    const otherParticipants = useMemo(() => {
        if (!chat) {
            return [];
        }
        const filtered = chat.participants.filter((participant) => participant.id !== user?.id);
        return filtered.length ? filtered : chat.participants;
    }, [chat, user?.id]);
    const primaryParticipant = otherParticipants[0] ?? chat?.participants[0] ?? null;
    const title = chat?.isGroup
        ? chatDisplayName(chat)
        : primaryParticipant?.name ?? chatDisplayName(chat);
    const subtitle = chat?.isGroup
        ? `${chat.memberCount} people in this private thread`
        : primaryParticipant?.communityTag || primaryParticipant?.city || "Private one-on-one line";
    const heroMeta = chat?.isGroup
        ? "Keep the crew line warm between actual hangs and side plans."
        : "Private space for low-pressure plans, quick updates, and casual check-ins.";
    const quickReplies = useMemo(() => chat?.isGroup
        ? ["Who's around?", "Pull up?", "Tonight?", "Drop a pin"]
        : ["Pull up?", "10 min", "Coffee?", "On my way"], [chat?.isGroup]);
    useEffect(() => {
        if (!chatId) {
            return;
        }
        let active = true;
        if (!useAppStore.getState().directChats.some((item) => item.id === chatId)) {
            api.fetchDirectChat(token, chatId).then((nextChat) => {
                if (!active) {
                    return;
                }
                upsertDirectChat(nextChat);
            });
        }
        api.fetchDirectMessages(token, chatId).then((messages) => {
            if (!active) {
                return;
            }
            setDirectMessages(chatId, messages);
        });
        return () => {
            active = false;
        };
    }, [chatId, setDirectMessages, token, upsertDirectChat]);
    useEffect(() => {
        if (!chatId) {
            return;
        }
        const socket = getSocket(token);
        if (!socket) {
            return;
        }
        socket.emit("chat:join", { chatId });
        const handleIncoming = (message) => {
            if (message.threadId !== chatId) {
                return;
            }
            const nextMessage = normalizeIncomingMessage(message);
            appendDirectMessage(chatId, nextMessage);
            const latestChat = useAppStore.getState().directChats.find((item) => item.id === chatId);
            if (latestChat) {
                upsertDirectChat({
                    ...latestChat,
                    lastMessageAt: nextMessage.createdAt,
                    lastMessageText: nextMessage.text,
                });
            }
        };
        socket.on("chat:message", handleIncoming);
        return () => {
            socket.off("chat:message", handleIncoming);
        };
    }, [appendDirectMessage, chatId, token, upsertDirectChat]);
    const handleSend = async (presetText) => {
        const nextText = (presetText ?? text).trim();
        if (!nextText || !user) {
            return;
        }
        const socket = getSocket(token);
        if (socket) {
            socket.emit("chat:message", { chatId, text: nextText });
        }
        else {
            const message = await api.sendDirectMessage(token, chatId, nextText);
            appendDirectMessage(chatId, message);
        }
        if (chat) {
            upsertDirectChat({
                ...chat,
                lastMessageAt: new Date().toISOString(),
                lastMessageText: nextText,
            });
        }
        void track(token, "message_sent", { threadKind: "direct", chatId });
        setText("");
    };
    const openCrewSurface = () => {
        router.push("/friends");
    };
    const contentWidth = layout.isDesktop ? Math.min(layout.shellWidth, 720) : layout.shellWidth;
    if (!chat) {
        return (_jsx(GradientMesh, { children: _jsxs(View, { style: styles.emptyState, children: [_jsx(Text, { style: styles.emptyTitle, children: "Opening chat..." }), _jsx(Text, { style: styles.emptyCopy, children: "Pulling the thread into place." })] }) }));
    }
    return (_jsx(GradientMesh, { children: _jsxs(View, { style: styles.screen, children: [_jsx(ScrollView, { contentContainerStyle: {
                        alignItems: "center",
                        paddingHorizontal: layout.screenPadding,
                        paddingTop: layout.isDesktop ? 34 : 18,
                        paddingBottom: 170,
                    }, keyboardShouldPersistTaps: "handled", showsVerticalScrollIndicator: false, children: _jsxs(View, { style: [styles.shell, { width: contentWidth }], children: [_jsxs(View, { style: styles.topBar, children: [_jsx(Pressable, { onPress: () => router.back(), style: ({ pressed }) => [
                                            styles.iconButton,
                                            webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                                        ], children: _jsx(MaterialCommunityIcons, { name: "chevron-left", size: 24, color: "#F7FBFF" }) }), _jsxs(View, { style: styles.topIdentity, children: [chat.isGroup ? (_jsx(HeaderAvatarStack, { participants: otherParticipants })) : primaryParticipant ? (_jsx(Avatar, { name: primaryParticipant.name, photoUrl: primaryParticipant.photoUrl, size: 30, borderColor: "rgba(8,14,29,0.7)", textSize: 12 })) : null, _jsxs(View, { style: { flex: 1, gap: 1 }, children: [_jsx(Text, { numberOfLines: 1, style: styles.topTitle, children: title }), _jsx(Text, { numberOfLines: 1, style: styles.topSubtitle, children: chat.isGroup ? "Group line" : "Private line" })] })] }), _jsx(Pressable, { onPress: openCrewSurface, style: ({ pressed }) => [
                                            styles.iconButton,
                                            webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                                        ], children: _jsx(MaterialCommunityIcons, { name: "information-outline", size: 22, color: "#F7FBFF" }) })] }), _jsxs(View, { style: styles.identityHero, children: [_jsx(View, { style: styles.heroGlowPrimary, pointerEvents: "none" }), _jsx(View, { style: styles.heroGlowSecondary, pointerEvents: "none" }), chat.isGroup ? (_jsx(CompactAvatarCluster, { participants: otherParticipants })) : primaryParticipant ? (_jsx(Avatar, { name: primaryParticipant.name, photoUrl: primaryParticipant.photoUrl, size: 104, borderColor: "rgba(255,255,255,0.16)", textSize: 34 })) : null, _jsx(Text, { style: styles.heroTitle, children: title }), _jsx(Text, { style: styles.heroSubtitle, children: subtitle }), _jsx(Text, { style: styles.heroCopy, children: heroMeta }), _jsx(Pressable, { onPress: openCrewSurface, style: ({ pressed }) => [
                                            styles.heroAction,
                                            webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.985 }),
                                        ], children: _jsx(Text, { style: styles.heroActionText, children: chat.isGroup ? "View members" : "View profile" }) })] }), _jsx(View, { style: styles.dayDivider, children: _jsx(Text, { style: styles.dayDividerText, children: "Today" }) }), _jsx(View, { style: styles.messageList, children: directMessages.length ? (directMessages.map((message) => {
                                    const mine = message.senderId === user?.id;
                                    return (_jsxs(View, { style: [
                                            styles.messageRow,
                                            mine ? styles.messageRowMine : styles.messageRowTheirs,
                                        ], children: [!mine && chat.isGroup ? (_jsx(Text, { style: styles.senderLabel, children: message.senderName })) : null, mine ? (_jsx(LinearGradient, { colors: ["#6F4BFF", "#8BEAFF"], start: { x: 0, y: 0.1 }, end: { x: 1, y: 0.9 }, style: styles.messageBubbleMine, children: _jsx(Text, { style: styles.messageTextMine, children: message.text }) })) : (_jsx(View, { style: styles.messageBubbleTheirs, children: _jsx(Text, { style: styles.messageTextTheirs, children: message.text }) })), _jsx(Text, { style: [styles.messageTime, mine ? styles.messageTimeMine : null], children: formatTime(message.createdAt) })] }, message.id));
                                })) : (_jsxs(View, { style: styles.emptyThreadCard, children: [_jsx(Text, { style: styles.emptyThreadTitle, children: "No messages yet" }), _jsx(Text, { style: styles.emptyThreadCopy, children: "Send one clean line and keep it low pressure." })] })) })] }) }), _jsx(LinearGradient, { colors: ["rgba(4,8,20,0.00)", "rgba(4,8,20,0.88)", "rgba(4,8,20,0.98)"], start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 }, style: styles.composerFade, pointerEvents: "box-none", children: _jsxs(View, { style: { width: contentWidth, alignSelf: "center", gap: 12 }, children: [showShortcuts ? (_jsx(ScrollView, { horizontal: true, contentContainerStyle: styles.quickReplyRow, showsHorizontalScrollIndicator: false, children: quickReplies.map((reply) => (_jsx(Pressable, { onPress: () => void handleSend(reply), style: ({ pressed }) => [
                                        styles.quickReplyChip,
                                        webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.985 }),
                                    ], children: _jsx(Text, { style: styles.quickReplyText, children: reply }) }, reply))) })) : null, _jsxs(View, { style: styles.composerRow, children: [_jsx(Pressable, { onPress: () => setShowShortcuts((current) => !current), style: ({ pressed }) => [
                                            styles.composerIconButton,
                                            webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                                        ], children: _jsx(MaterialCommunityIcons, { name: showShortcuts ? "close" : "camera-outline", size: 21, color: "#081120" }) }), _jsxs(View, { style: styles.inputShell, children: [_jsx(TextInput, { ref: inputRef, value: text, onChangeText: setText, placeholder: `Message ${chat.isGroup ? "the group" : primaryParticipant?.name ?? "them"}`, placeholderTextColor: "rgba(247,251,255,0.42)", style: styles.input }), _jsx(Pressable, { onPress: () => {
                                                    setText((current) => `${current}${current ? " " : ""}🙂`);
                                                    inputRef.current?.focus();
                                                }, style: ({ pressed }) => [
                                                    styles.inlineComposerAction,
                                                    webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                                                ], children: _jsx(MaterialCommunityIcons, { name: "emoticon-outline", size: 20, color: "#C9D8FF" }) })] }), _jsx(Pressable, { onPress: () => void handleSend(), disabled: !text.trim(), style: ({ pressed }) => [
                                            styles.sendButton,
                                            !text.trim() ? styles.sendButtonDisabled : null,
                                            webPressableStyle(pressed, {
                                                disabled: !text.trim(),
                                                pressedOpacity: 0.9,
                                                pressedScale: 0.97,
                                            }),
                                        ], children: _jsx(MaterialCommunityIcons, { name: "arrow-up", size: 22, color: "#081120" }) })] })] }) })] }) }));
}
const styles = StyleSheet.create({
    avatarFallback: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.06)",
    },
    avatarImage: {
        width: "100%",
        height: "100%",
    },
    avatarInitial: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
    },
    avatarShell: {
        overflow: "hidden",
        borderWidth: 1,
        backgroundColor: "rgba(255,255,255,0.06)",
    },
    clusterAvatarSlot: {
        position: "absolute",
    },
    clusterOverflow: {
        position: "absolute",
        right: 10,
        bottom: 6,
        minWidth: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(8,17,32,0.92)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
    },
    clusterOverflowText: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 12,
    },
    clusterWrap: {
        width: 116,
        height: 116,
        marginBottom: 4,
    },
    composerFade: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 20,
        paddingTop: 26,
        paddingBottom: 18,
    },
    composerIconButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(139,234,255,0.95)",
        shadowColor: nowlyColors.aqua,
        shadowOpacity: 0.32,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 },
    },
    composerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    dayDivider: {
        alignSelf: "center",
        marginTop: 2,
        marginBottom: 8,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.06)",
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    dayDividerText: {
        color: "rgba(247,251,255,0.62)",
        fontFamily: "SpaceGrotesk_500Medium",
        fontSize: 12,
    },
    emptyCopy: {
        color: "rgba(247,251,255,0.64)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 15,
        lineHeight: 24,
    },
    emptyState: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingHorizontal: 24,
    },
    emptyThreadCard: {
        alignItems: "center",
        gap: 6,
        paddingTop: 18,
        paddingBottom: 26,
    },
    emptyThreadCopy: {
        color: "rgba(247,251,255,0.58)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 14,
        lineHeight: 22,
        textAlign: "center",
    },
    emptyThreadTitle: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 18,
    },
    emptyTitle: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 26,
        lineHeight: 30,
    },
    headerAvatarStack: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 10,
    },
    headerOverflow: {
        marginLeft: -10,
        minWidth: 30,
        height: 30,
        borderRadius: 15,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
    },
    headerOverflowText: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 11,
    },
    heroAction: {
        marginTop: 2,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.08)",
        paddingHorizontal: 18,
        paddingVertical: 11,
    },
    heroActionText: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 14,
    },
    heroCopy: {
        maxWidth: 360,
        color: "rgba(247,251,255,0.64)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 14,
        lineHeight: 22,
        textAlign: "center",
    },
    heroGlowPrimary: {
        position: "absolute",
        top: -70,
        right: -30,
        width: 210,
        height: 210,
        borderRadius: 105,
        backgroundColor: "rgba(167,139,250,0.16)",
    },
    heroGlowSecondary: {
        position: "absolute",
        left: -48,
        bottom: -80,
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: "rgba(139,234,255,0.12)",
    },
    heroSubtitle: {
        color: "rgba(247,251,255,0.7)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 14,
        lineHeight: 22,
        textAlign: "center",
    },
    heroTitle: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 28,
        lineHeight: 32,
        textAlign: "center",
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.04)",
    },
    identityHero: {
        overflow: "hidden",
        alignItems: "center",
        gap: 8,
        borderRadius: 34,
        backgroundColor: "rgba(255,255,255,0.05)",
        paddingHorizontal: 24,
        paddingVertical: 28,
        shadowColor: nowlyColors.glow,
        shadowOpacity: 0.18,
        shadowRadius: 26,
        shadowOffset: { width: 0, height: 16 },
    },
    inlineComposerAction: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
    },
    input: {
        flex: 1,
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 15,
        lineHeight: 20,
        paddingVertical: 14,
    },
    inputShell: {
        flex: 1,
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 28,
        backgroundColor: "rgba(255,255,255,0.07)",
        paddingLeft: 18,
        paddingRight: 8,
    },
    messageBubbleMine: {
        maxWidth: "88%",
        borderRadius: 22,
        borderTopRightRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    messageBubbleTheirs: {
        maxWidth: "88%",
        borderRadius: 22,
        borderTopLeftRadius: 10,
        backgroundColor: "rgba(255,255,255,0.06)",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    messageList: {
        gap: 14,
    },
    messageRow: {
        gap: 6,
    },
    messageRowMine: {
        alignItems: "flex-end",
    },
    messageRowTheirs: {
        alignItems: "flex-start",
    },
    messageTextMine: {
        color: "#081120",
        fontFamily: "SpaceGrotesk_500Medium",
        fontSize: 15,
        lineHeight: 21,
    },
    messageTextTheirs: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 15,
        lineHeight: 21,
    },
    messageTime: {
        color: "rgba(247,251,255,0.36)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 11,
    },
    messageTimeMine: {
        textAlign: "right",
    },
    quickReplyChip: {
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.07)",
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    quickReplyRow: {
        flexDirection: "row",
        gap: 10,
        paddingRight: 4,
    },
    quickReplyText: {
        color: "rgba(247,251,255,0.9)",
        fontFamily: "SpaceGrotesk_500Medium",
        fontSize: 13,
    },
    screen: {
        flex: 1,
    },
    sendButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(139,234,255,0.96)",
        shadowColor: nowlyColors.aqua,
        shadowOpacity: 0.34,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 12 },
    },
    sendButtonDisabled: {
        opacity: 0.45,
    },
    senderLabel: {
        color: "rgba(139,234,255,0.78)",
        fontFamily: "SpaceGrotesk_500Medium",
        fontSize: 11,
        letterSpacing: 1.4,
        textTransform: "uppercase",
    },
    shell: {
        gap: 18,
    },
    topBar: {
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    topIdentity: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    topSubtitle: {
        color: "rgba(247,251,255,0.52)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 12,
    },
    topTitle: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 15,
    },
});
