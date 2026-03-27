import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { api } from "../../lib/api";
import { webPressableStyle } from "../../lib/web-pressable";
import { useAppStore } from "../../store/useAppStore";
export default function NewGroupChatScreen() {
    const token = useAppStore((state) => state.token);
    const friends = useAppStore((state) => state.friends);
    const upsertDirectChat = useAppStore((state) => state.upsertDirectChat);
    const acceptedFriends = useMemo(() => friends.filter((friend) => friend.status === "ACCEPTED"), [friends]);
    const [title, setTitle] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const toggleFriend = (friendId) => {
        setSelectedIds((current) => current.includes(friendId)
            ? current.filter((id) => id !== friendId)
            : [...current, friendId]);
    };
    const handleCreate = async () => {
        if (selectedIds.length < 2 || isCreating) {
            return;
        }
        try {
            setIsCreating(true);
            const idempotencyKey = `group-chat:${token ?? "anon"}:${[...selectedIds].sort().join(",")}:${title.trim().toLowerCase()}`;
            const chat = await api.createGroupChat(token, {
                title: title.trim() || null,
                participantIds: selectedIds,
                idempotencyKey,
            });
            upsertDirectChat(chat);
            router.replace({
                pathname: "/chat/[chatId]",
                params: { chatId: chat.id },
            });
        }
        catch (error) {
            Alert.alert("Could not create that chat", error instanceof Error ? error.message : "Try that again.");
        }
        finally {
            setIsCreating(false);
        }
    };
    return (_jsx(GradientMesh, { children: _jsxs(ScrollView, { className: "flex-1", contentContainerStyle: {
                paddingHorizontal: 20,
                paddingTop: 62,
                paddingBottom: 48,
                gap: 18,
            }, showsVerticalScrollIndicator: false, children: [_jsxs(View, { className: "flex-row items-start justify-between gap-4", children: [_jsxs(View, { className: "max-w-[82%] gap-2", children: [_jsx(Text, { className: "font-body text-sm uppercase tracking-[2px] text-aqua/80", children: "New group chat" }), _jsx(Text, { className: "font-display text-[34px] leading-[38px] text-cloud", children: "Start a private thread with a few friends." }), _jsx(Text, { className: "font-body text-sm leading-6 text-white/60", children: "These chats stay separate from hangout threads and you can come back to them anytime." })] }), _jsx(Pressable, { onPress: () => router.back(), className: "h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/6", style: ({ pressed }) => webPressableStyle(pressed, { pressedOpacity: 0.88, pressedScale: 0.97 }), children: _jsx(MaterialCommunityIcons, { name: "close", size: 20, color: "#F8FAFC" }) })] }), _jsx(GlassCard, { className: "p-5", children: _jsxs(View, { className: "gap-3", children: [_jsx(Text, { className: "font-display text-xl text-cloud", children: "Group name" }), _jsx(TextInput, { value: title, onChangeText: setTitle, placeholder: "Friday after class, Uptown crew, Study break...", placeholderTextColor: "rgba(248,250,252,0.4)", className: "rounded-[24px] border border-white/12 bg-white/8 px-4 py-4 font-body text-base text-cloud" }), _jsx(Text, { className: "font-body text-sm text-white/60", children: "Optional. If you skip it, Nowly will use the people in the thread." })] }) }), _jsxs(View, { className: "gap-3", children: [_jsx(Text, { className: "font-display text-2xl text-cloud", children: "Pick at least 2 friends" }), acceptedFriends.map((friend) => {
                            const selected = selectedIds.includes(friend.id);
                            return (_jsx(Pressable, { onPress: () => toggleFriend(friend.id), className: `rounded-[28px] border p-4 ${selected ? "border-aqua/55 bg-aqua/10" : "border-white/10 bg-white/[0.04]"}`, style: ({ pressed }) => webPressableStyle(pressed), children: _jsxs(View, { className: "flex-row items-center gap-4", children: [_jsx(View, { className: "h-14 w-14 overflow-hidden rounded-full border border-white/12 bg-white/8", children: friend.photoUrl ? (_jsx(Image, { source: { uri: friend.photoUrl }, className: "h-full w-full", resizeMode: "cover" })) : (_jsx(View, { className: "h-full w-full items-center justify-center", children: _jsx(Text, { className: "font-display text-xl text-white/70", children: (friend.name[0] ?? "N").toUpperCase() }) })) }), _jsxs(View, { className: "flex-1", children: [_jsx(Text, { className: "font-display text-lg text-cloud", children: friend.name }), _jsx(Text, { className: "mt-1 font-body text-sm text-white/60", children: friend.communityTag || friend.city })] }), _jsx(MaterialCommunityIcons, { name: selected ? "check-circle" : "circle-outline", size: 24, color: selected ? "#22D3EE" : "rgba(248,250,252,0.38)" })] }) }, friend.id));
                        })] }), _jsx(PillButton, { label: selectedIds.length >= 2
                        ? isCreating
                            ? "Creating..."
                            : `Create chat with ${selectedIds.length} friends`
                        : "Pick 2 friends", onPress: () => void handleCreate(), disabled: selectedIds.length < 2 || isCreating })] }) }));
}
