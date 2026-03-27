import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { useResponsiveLayout } from "../../components/ui/useResponsiveLayout";
import { nowlyColors } from "../../constants/theme";
import { api } from "../../lib/api";
import { track } from "../../lib/analytics";
import { createSmartOpenUrl } from "../../lib/smart-links";
import { webPressableStyle } from "../../lib/web-pressable";
import { useAppStore } from "../../store/useAppStore";
const Avatar = ({ name, photoUrl }) => (_jsx(View, { className: "h-14 w-14 overflow-hidden rounded-full border border-white/12 bg-white/8", children: photoUrl ? (_jsx(Image, { source: { uri: photoUrl }, className: "h-full w-full", resizeMode: "cover" })) : (_jsx(View, { className: "h-full w-full items-center justify-center", children: _jsx(Text, { className: "font-display text-xl text-white/70", children: (name[0] ?? "N").toUpperCase() }) })) }));
const chatDisplayName = (chat) => chat.title ||
    chat.participants.map((participant) => participant.name).join(", ") ||
    "Private chat";
const chatSubline = (chat) => chat.lastMessageText ||
    (chat.isGroup
        ? `${chat.memberCount} people in this private thread`
        : chat.participants[0]?.communityTag || chat.participants[0]?.city || "Private line");
const clusterPositions = [
    { left: 12, top: 18 },
    { right: 18, top: 14 },
    { left: 70, top: 86 },
    { right: 72, top: 96 },
    { left: 144, top: 30 },
];
export default function FriendsScreen() {
    const token = useAppStore((state) => state.token);
    const user = useAppStore((state) => state.user);
    const friends = useAppStore((state) => state.friends);
    const suggestions = useAppStore((state) => state.suggestions);
    const radar = useAppStore((state) => state.radar);
    const directChats = useAppStore((state) => state.directChats);
    const setFriends = useAppStore((state) => state.setFriends);
    const setSuggestions = useAppStore((state) => state.setSuggestions);
    const setDirectChats = useAppStore((state) => state.setDirectChats);
    const upsertFriend = useAppStore((state) => state.upsertFriend);
    const removeFriend = useAppStore((state) => state.removeFriend);
    const removeSuggestion = useAppStore((state) => state.removeSuggestion);
    const upsertDirectChat = useAppStore((state) => state.upsertDirectChat);
    const layout = useResponsiveLayout();
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    useEffect(() => {
        if (!user) {
            return;
        }
        let active = true;
        Promise.all([
            api.fetchFriends(token, user.id),
            api.fetchFriendSuggestions(token),
            api.fetchDirectChats(token),
        ]).then(([nextFriends, nextSuggestions, nextChats]) => {
            if (!active) {
                return;
            }
            startTransition(() => {
                setFriends(nextFriends);
                setSuggestions(nextSuggestions);
                setDirectChats(nextChats);
            });
        });
        return () => {
            active = false;
        };
    }, [setDirectChats, setFriends, setSuggestions, token, user]);
    const normalizedSearch = deferredSearch.trim().toLowerCase();
    const filteredFriends = useMemo(() => friends.filter((friend) => [friend.name, friend.communityTag, friend.city, friend.sharedLabel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)), [friends, normalizedSearch]);
    const filteredSuggestions = useMemo(() => suggestions.filter((friend) => [friend.name, friend.communityTag, friend.city, friend.sharedLabel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)), [normalizedSearch, suggestions]);
    const filteredChats = useMemo(() => directChats.filter((chat) => [chatDisplayName(chat), chatSubline(chat)]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)), [directChats, normalizedSearch]);
    const acceptedFriends = filteredFriends.filter((friend) => friend.status === "ACCEPTED");
    const incomingRequests = filteredFriends.filter((friend) => friend.status === "PENDING" && friend.requestDirection === "INCOMING");
    const outgoingRequests = filteredFriends.filter((friend) => friend.status === "PENDING" && friend.requestDirection === "OUTGOING");
    const pendingRequests = [...incomingRequests, ...outgoingRequests];
    const liveClusterPeople = acceptedFriends.slice(0, 5);
    const handleDiscordPing = async (name) => {
        await track(token, "user_reactivated", { via: "discord_ping", friendName: name });
        await Share.share({
            message: `Anyone free tonight? Let's link on Nowly -> ${createSmartOpenUrl("/onboarding")}`,
        });
    };
    const handleQuickAdd = async (friendId) => {
        if (!user) {
            return;
        }
        const friend = await api.requestFriend(token, user.id, friendId);
        upsertFriend(friend);
        removeSuggestion(friendId);
    };
    const handleRespond = async (friend, action) => {
        if (!user) {
            return;
        }
        const updated = await api.respondToFriendRequest(token, user.id, friend.friendshipId, action);
        if (updated) {
            upsertFriend(updated);
        }
        else {
            removeFriend(friend.id);
        }
    };
    const handleOpenChat = async (friendId) => {
        const chat = await api.openDirectChat(token, friendId);
        upsertDirectChat(chat);
        router.push({
            pathname: "/chat/[chatId]",
            params: { chatId: chat.id },
        });
    };
    const handleOpenGroupBuilder = () => {
        router.push("/chat/new");
    };
    return (_jsx(GradientMesh, { children: _jsx(ScrollView, { className: "flex-1", contentContainerStyle: {
                alignItems: "center",
                paddingHorizontal: layout.screenPadding,
                paddingTop: layout.isDesktop ? 40 : 58,
                paddingBottom: 160,
            }, showsVerticalScrollIndicator: false, children: _jsxs(View, { style: [
                    styles.contentShell,
                    { width: layout.shellWidth },
                    layout.isDesktop ? styles.desktopShell : null,
                ], children: [_jsxs(View, { style: { width: layout.leftColumnWidth, gap: layout.sectionGap }, children: [_jsx(View, { style: styles.heroHeader, children: _jsxs(View, { style: { gap: 10, flex: 1 }, children: [_jsx(Text, { style: styles.eyebrow, children: "YOUR PEOPLE" }), _jsx(Text, { style: styles.heroTitle, children: "Signals feel stronger together." }), _jsxs(Text, { style: styles.heroHint, children: [(radar?.localDensity.activeNowCount ?? 0).toString(), " active now \u00B7", " ", (radar?.localDensity.nearbyFriendsCount ?? acceptedFriends.length).toString(), " nearby in your graph"] })] }) }), _jsxs(View, { style: styles.clusterShell, children: [_jsx(View, { style: styles.clusterGlow, pointerEvents: "none" }), _jsx(Text, { style: styles.sectionLabel, children: "LIVE CLUSTER" }), _jsx(Text, { style: styles.clusterHeadline, children: liveClusterPeople.length
                                            ? `${liveClusterPeople.length} friends feel warm enough to nudge.`
                                            : "Start adding people and the cluster will wake up here." }), _jsx(View, { style: styles.clusterField, children: liveClusterPeople.length ? (liveClusterPeople.map((friend, index) => (_jsxs(Pressable, { onPress: () => void handleOpenChat(friend.id), style: ({ pressed }) => [
                                                styles.clusterAvatarWrap,
                                                clusterPositions[index % clusterPositions.length],
                                                webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.97 }),
                                            ], children: [_jsx(View, { style: styles.clusterRing }), _jsx(Avatar, { name: friend.name, photoUrl: friend.photoUrl })] }, friend.id)))) : (_jsx(View, { style: styles.clusterEmpty, children: _jsx(Text, { style: styles.clusterEmptyText, children: "Your closest people will float here." }) })) })] }), _jsxs(Pressable, { onPress: handleOpenGroupBuilder, style: ({ pressed }) => [
                                    styles.threadCta,
                                    webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.99 }),
                                ], children: [_jsxs(View, { style: { gap: 6, flex: 1 }, children: [_jsx(Text, { style: styles.sectionLabel, children: "PRIVATE CHATS" }), _jsx(Text, { style: styles.threadTitle, children: "Start a quick thread" }), _jsx(Text, { style: styles.threadHint, children: "Spin up a 1:1 or group line without turning this into a scheduling form." })] }), _jsx(View, { style: styles.threadArrow, children: _jsx(MaterialCommunityIcons, { name: "arrow-top-right", size: 18, color: "#E2E8F0" }) })] }), _jsxs(Pressable, { onPress: () => Share.share({
                                    message: `Anyone free tonight? Let's link on Nowly -> ${createSmartOpenUrl("/onboarding")}`,
                                }), style: ({ pressed }) => [
                                    styles.ghostInvite,
                                    webPressableStyle(pressed, { pressedOpacity: 0.94, pressedScale: 0.985 }),
                                ], children: [_jsx(MaterialCommunityIcons, { name: "account-plus-outline", size: 16, color: "#E2E8F0" }), _jsx(Text, { style: styles.ghostInviteText, children: "Invite locals" })] })] }), _jsxs(View, { style: { width: layout.rightColumnWidth, gap: layout.sectionGap }, children: [_jsxs(View, { style: { gap: 12 }, children: [_jsx(Text, { style: styles.sectionLabel, children: "PENDING REQUESTS" }), pendingRequests.length ? (pendingRequests.map((friend) => {
                                        const incoming = friend.requestDirection === "INCOMING" && friend.status === "PENDING";
                                        return (_jsxs(View, { style: styles.requestRow, children: [_jsx(Avatar, { name: friend.name, photoUrl: friend.photoUrl }), _jsxs(View, { style: { flex: 1, gap: 4 }, children: [_jsx(Text, { style: styles.rowName, children: friend.name }), _jsx(Text, { style: styles.rowMeta, children: incoming ? "Wants in on your circle." : "Waiting on their reply." })] }), incoming ? (_jsxs(View, { style: { flexDirection: "row", gap: 8 }, children: [_jsx(Pressable, { onPress: () => void handleRespond(friend, "ACCEPT"), style: ({ pressed }) => [
                                                                styles.rowAction,
                                                                webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.98 }),
                                                            ], children: _jsx(Text, { style: styles.rowActionText, children: "Accept" }) }), _jsx(Pressable, { onPress: () => void handleRespond(friend, "DECLINE"), style: ({ pressed }) => [
                                                                styles.rowGhostAction,
                                                                webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.98 }),
                                                            ], children: _jsx(Text, { style: styles.rowGhostText, children: "Ignore" }) })] })) : (_jsx(View, { style: styles.pendingPill, children: _jsx(Text, { style: styles.pendingPillText, children: "Pending" }) }))] }, friend.id));
                                    })) : (_jsx(Text, { style: styles.emptyText, children: "No pending requests right now." }))] }), _jsxs(View, { style: { gap: 12 }, children: [_jsx(Text, { style: styles.sectionLabel, children: "CREW" }), acceptedFriends.length ? (acceptedFriends.map((friend) => (_jsxs(View, { style: styles.friendRow, children: [_jsx(Avatar, { name: friend.name, photoUrl: friend.photoUrl }), _jsxs(View, { style: { flex: 1, gap: 4 }, children: [_jsx(Text, { style: styles.rowName, children: friend.name }), _jsxs(Text, { style: styles.rowMeta, children: [friend.communityTag || friend.city, " \u00B7 ", Math.round(friend.responsivenessScore * 100), "% response"] }), _jsx(Text, { style: styles.rowInsight, children: friend.insight?.cadenceNote ||
                                                            friend.insight?.reliabilityLabel ||
                                                            friend.sharedLabel ||
                                                            "Easy person to catch on short notice." })] }), _jsxs(View, { style: styles.friendActions, children: [_jsx(Pressable, { accessibilityLabel: `Open private chat with ${friend.name}`, accessibilityRole: "button", onPress: () => void handleOpenChat(friend.id), style: ({ pressed }) => [
                                                            styles.iconButton,
                                                            webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                                                        ], children: _jsx(MaterialCommunityIcons, { name: "chat-processing-outline", size: 20, color: "#F8FAFC" }) }), _jsx(Pressable, { accessibilityLabel: `Share quick invite link with ${friend.name}`, accessibilityRole: "button", onPress: () => void handleDiscordPing(friend.name), style: ({ pressed }) => [
                                                            styles.iconButton,
                                                            webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                                                        ], children: _jsx(MaterialCommunityIcons, { name: "share-variant-outline", size: 18, color: "#8BEAFF" }) })] })] }, friend.id)))) : (_jsx(Text, { style: styles.emptyText, children: "Add a few people and this feed will start to move." }))] }), _jsxs(View, { style: { gap: 12 }, children: [_jsx(Text, { style: styles.sectionLabel, children: "PRIVATE THREADS" }), filteredChats.length ? (filteredChats.slice(0, 3).map((chat) => (_jsxs(Pressable, { onPress: () => router.push({
                                            pathname: "/chat/[chatId]",
                                            params: { chatId: chat.id },
                                        }), style: ({ pressed }) => [
                                            styles.chatRow,
                                            webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.99 }),
                                        ], children: [_jsx(Text, { style: styles.rowName, children: chatDisplayName(chat) }), _jsx(Text, { style: styles.rowInsight, children: chatSubline(chat) })] }, chat.id)))) : (_jsx(Text, { style: styles.emptyText, children: "Start your first thread and it will land here." }))] }), _jsxs(View, { style: { gap: 12 }, children: [_jsx(Text, { style: styles.sectionLabel, children: "PEOPLE NEARBY" }), filteredSuggestions.length ? (filteredSuggestions.map((friend) => (_jsxs(View, { style: styles.suggestionRow, children: [_jsx(Avatar, { name: friend.name, photoUrl: friend.photoUrl }), _jsxs(View, { style: { flex: 1, gap: 4 }, children: [_jsx(Text, { style: styles.rowName, children: friend.name }), _jsx(Text, { style: styles.rowMeta, children: friend.sharedLabel || friend.communityTag || friend.city })] }), _jsx(Pressable, { onPress: () => void handleQuickAdd(friend.id), style: ({ pressed }) => [
                                                    styles.rowGhostAction,
                                                    webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.98 }),
                                                ], children: _jsx(Text, { style: styles.rowGhostText, children: "Add" }) })] }, friend.id)))) : (_jsx(Text, { style: styles.emptyText, children: "No nearby suggestions to surface yet." }))] })] })] }) }) }));
}
const styles = StyleSheet.create({
    chatRow: {
        borderRadius: 24,
        backgroundColor: "rgba(255,255,255,0.05)",
        paddingHorizontal: 18,
        paddingVertical: 16,
        gap: 4,
    },
    clusterAvatarWrap: {
        position: "absolute",
    },
    clusterEmpty: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    clusterEmptyText: {
        color: "rgba(247,251,255,0.56)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 13,
    },
    clusterField: {
        position: "relative",
        height: 176,
        borderRadius: 28,
        backgroundColor: "rgba(255,255,255,0.03)",
        overflow: "hidden",
    },
    clusterGlow: {
        position: "absolute",
        right: -44,
        top: -60,
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: "rgba(139,234,255,0.16)",
    },
    clusterHeadline: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 22,
        lineHeight: 28,
        maxWidth: 360,
    },
    clusterRing: {
        position: "absolute",
        top: -4,
        right: -4,
        bottom: -4,
        left: -4,
        borderRadius: 40,
        borderWidth: 1,
        borderColor: "rgba(139,234,255,0.34)",
    },
    clusterShell: {
        borderRadius: 32,
        backgroundColor: "rgba(255,255,255,0.05)",
        paddingHorizontal: 20,
        paddingVertical: 20,
        gap: 12,
        overflow: "hidden",
    },
    contentShell: {
        gap: 24,
    },
    desktopShell: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 28,
    },
    emptyText: {
        color: "rgba(247,251,255,0.58)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 14,
        lineHeight: 22,
    },
    eyebrow: {
        color: "rgba(139,234,255,0.8)",
        fontFamily: "SpaceGrotesk_500Medium",
        fontSize: 12,
        letterSpacing: 2.2,
    },
    friendActions: {
        flexDirection: "row",
        gap: 10,
    },
    friendRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        borderRadius: 26,
        backgroundColor: "rgba(255,255,255,0.05)",
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    ghostInvite: {
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.06)",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    ghostInviteText: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 14,
    },
    heroHeader: {
        gap: 6,
    },
    heroHint: {
        color: "rgba(247,251,255,0.68)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 14,
        lineHeight: 22,
    },
    heroTitle: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 34,
        lineHeight: 38,
        maxWidth: 400,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.06)",
    },
    pendingPill: {
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.08)",
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    pendingPillText: {
        color: "rgba(247,251,255,0.8)",
        fontFamily: "SpaceGrotesk_500Medium",
        fontSize: 12,
    },
    requestRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        borderRadius: 26,
        backgroundColor: "rgba(255,255,255,0.05)",
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    rowAction: {
        borderRadius: 999,
        backgroundColor: "#E9F7FF",
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    rowActionText: {
        color: "#081120",
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 13,
    },
    rowGhostAction: {
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.08)",
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    rowGhostText: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 13,
    },
    rowInsight: {
        color: "rgba(139,234,255,0.82)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 13,
        lineHeight: 20,
    },
    rowMeta: {
        color: "rgba(247,251,255,0.58)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 13,
    },
    rowName: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 18,
        lineHeight: 22,
    },
    sectionLabel: {
        color: "rgba(247,251,255,0.52)",
        fontFamily: "SpaceGrotesk_500Medium",
        fontSize: 12,
        letterSpacing: 2,
    },
    suggestionRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        borderRadius: 24,
        backgroundColor: "rgba(255,255,255,0.05)",
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    threadArrow: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.06)",
    },
    threadCta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        borderRadius: 30,
        backgroundColor: "rgba(255,255,255,0.05)",
        paddingHorizontal: 18,
        paddingVertical: 18,
    },
    threadHint: {
        color: "rgba(247,251,255,0.62)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 14,
        lineHeight: 22,
    },
    threadTitle: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 22,
        lineHeight: 26,
    },
});
