import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, } from "react-native";
import { schedulingVoteStates, } from "@nowly/shared";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { useResponsiveLayout } from "../../components/ui/useResponsiveLayout";
import { nowlyColors } from "../../constants/theme";
import { api } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { webPressableStyle } from "../../lib/web-pressable";
import { useAppStore } from "../../store/useAppStore";
const voteLabels = {
    AVAILABLE: "Works",
    MAYBE: "Maybe",
    UNAVAILABLE: "Can't",
};
const readErrorMessage = (error) => {
    if (!(error instanceof Error)) {
        return "Something went sideways. Try again in a second.";
    }
    try {
        const parsed = JSON.parse(error.message);
        return parsed.error || error.message;
    }
    catch {
        return error.message;
    }
};
const avatarFallback = (name) => (name.trim()[0] ?? "N").toUpperCase();
const formatDuration = (minutes) => minutes >= 60 && minutes % 60 === 0 ? `${minutes / 60} hr` : `${minutes} min`;
const buildVoteDraft = (session) => Object.fromEntries(session.slots.map((slot) => {
    const currentVote = slot.voters.find((vote) => vote.participantId === session.currentUserParticipantId);
    return [slot.id, currentVote?.status ?? "UNAVAILABLE"];
}));
export const GroupSchedulingSurface = ({ inviteCode, profile }) => {
    const token = useAppStore((state) => state.token);
    const layout = useResponsiveLayout();
    const [session, setSession] = useState(profile.session);
    const [selectedSlotId, setSelectedSlotId] = useState(profile.session.slots[0]?.id ?? null);
    const [voteDraft, setVoteDraft] = useState(() => buildVoteDraft(profile.session));
    const [draftDirty, setDraftDirty] = useState(false);
    const [messageText, setMessageText] = useState("");
    const [submittingVotes, setSubmittingVotes] = useState(false);
    const [finalizing, setFinalizing] = useState(false);
    const [locking, setLocking] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);
    const draftDirtyRef = useRef(draftDirty);
    useEffect(() => {
        setSession(profile.session);
        setSelectedSlotId(profile.session.finalSlotId ?? profile.session.slots[0]?.id ?? null);
        setVoteDraft(buildVoteDraft(profile.session));
        setDraftDirty(false);
    }, [profile.session]);
    useEffect(() => {
        draftDirtyRef.current = draftDirty;
    }, [draftDirty]);
    useEffect(() => {
        const socket = getSocket(token);
        if (!socket) {
            return;
        }
        socket.emit("schedule:join", { shareCode: session.shareCode });
        const handleUpdate = (nextSession) => {
            if (nextSession.shareCode !== session.shareCode) {
                return;
            }
            setSession(nextSession);
            setSelectedSlotId((current) => current ?? nextSession.finalSlotId ?? nextSession.slots[0]?.id ?? null);
            if (!draftDirtyRef.current) {
                setVoteDraft(buildVoteDraft(nextSession));
            }
        };
        const handleMessage = (message) => {
            setSession((current) => ({
                ...current,
                messages: [...current.messages, message],
            }));
        };
        socket.on("schedule:update", handleUpdate);
        socket.on("schedule:message", handleMessage);
        return () => {
            socket.off("schedule:update", handleUpdate);
            socket.off("schedule:message", handleMessage);
        };
    }, [session.shareCode, token]);
    const selectedSlot = session.slots.find((slot) => slot.id === selectedSlotId) ??
        session.slots.find((slot) => slot.isFinal) ??
        session.slots[0] ??
        null;
    const participantCapReached = session.participantCount >= session.participantCap && !session.currentUserParticipantId;
    const visibleBestFits = session.bestFits.slice(0, 3);
    const currentVoteState = selectedSlot ? voteDraft[selectedSlot.id] ?? "UNAVAILABLE" : "UNAVAILABLE";
    const finalizeLabel = session.decisionMode === "HOST_DECIDES" ? "Finalize this time" : "Confirm this time";
    const footerSummary = session.finalizedAt
        ? selectedSlot
            ? `Final slot locked: ${selectedSlot.label}`
            : "This group scheduling link has been finalized."
        : session.currentUserHasSubmittedAvailability
            ? "Availability submitted. You can still update it until the poll closes."
            : "Mark your slots, then submit availability so the crew can compare live.";
    const shellStyle = layout.isDesktop
        ? { flexDirection: "row", alignItems: "flex-start", gap: layout.splitGap }
        : undefined;
    const goToSignIn = () => {
        router.push({
            pathname: "/onboarding",
            params: {
                bookingInviteCode: inviteCode,
                bookingSessionShareCode: session.shareCode,
            },
        });
    };
    const handleVoteChange = (status) => {
        if (!selectedSlot || !session.currentUserCanEdit) {
            return;
        }
        setDraftDirty(true);
        setVoteDraft((current) => ({
            ...current,
            [selectedSlot.id]: status,
        }));
    };
    const handleSubmitAvailability = async () => {
        if (!token) {
            goToSignIn();
            return;
        }
        setSubmittingVotes(true);
        try {
            const nextSession = await api.submitGroupSchedulingAvailability(token, session.shareCode, session.slots.map((slot) => ({
                slotId: slot.id,
                status: voteDraft[slot.id] ?? "UNAVAILABLE",
            })));
            setSession(nextSession);
            setVoteDraft(buildVoteDraft(nextSession));
            setDraftDirty(false);
        }
        catch (error) {
            Alert.alert("Couldn't submit availability", readErrorMessage(error));
        }
        finally {
            setSubmittingVotes(false);
        }
    };
    const handleFinalize = async () => {
        if (!selectedSlot) {
            return;
        }
        if (!token) {
            goToSignIn();
            return;
        }
        setFinalizing(true);
        try {
            const nextSession = await api.finalizeGroupSchedulingSession(token, session.shareCode, selectedSlot.id);
            setSession(nextSession);
            setDraftDirty(false);
        }
        catch (error) {
            Alert.alert("Couldn't lock that time", readErrorMessage(error));
        }
        finally {
            setFinalizing(false);
        }
    };
    const handleLock = async () => {
        if (!token) {
            goToSignIn();
            return;
        }
        setLocking(true);
        try {
            const nextSession = await api.lockGroupSchedulingSession(token, session.shareCode);
            setSession(nextSession);
        }
        catch (error) {
            Alert.alert("Couldn't lock the poll", readErrorMessage(error));
        }
        finally {
            setLocking(false);
        }
    };
    const handleSendMessage = async () => {
        const trimmed = messageText.trim();
        if (!trimmed) {
            return;
        }
        if (!token) {
            goToSignIn();
            return;
        }
        setSendingMessage(true);
        try {
            const socket = getSocket(token);
            if (socket) {
                socket.emit("schedule:message", { shareCode: session.shareCode, text: trimmed });
            }
            else {
                const message = await api.sendGroupSchedulingMessage(token, session.shareCode, trimmed);
                setSession((current) => ({
                    ...current,
                    messages: [...current.messages, message],
                }));
            }
            setMessageText("");
        }
        catch (error) {
            Alert.alert("Couldn't send that note", readErrorMessage(error));
        }
        finally {
            setSendingMessage(false);
        }
    };
    return (_jsx(GradientMesh, { children: _jsxs(View, { className: "flex-1", children: [_jsx(ScrollView, { className: "flex-1", contentContainerStyle: {
                        alignItems: "center",
                        paddingHorizontal: layout.screenPadding,
                        paddingTop: layout.isDesktop ? 28 : 16,
                        paddingBottom: 210,
                    }, showsVerticalScrollIndicator: false, children: _jsxs(View, { style: [{ width: layout.shellWidth, gap: layout.sectionGap }, shellStyle], children: [_jsxs(View, { style: { width: layout.leftColumnWidth, gap: layout.sectionGap }, children: [_jsxs(View, { className: "min-h-[52px] flex-row items-center gap-3", children: [_jsx(Pressable, { onPress: () => router.back(), style: ({ pressed }) => [
                                                    styles.iconButton,
                                                    webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                                                ], children: _jsx(MaterialCommunityIcons, { name: "chevron-left", size: 24, color: "#F7FBFF" }) }), _jsxs(View, { className: "flex-1 items-center", children: [_jsx(Text, { className: "font-display text-2xl text-cloud", children: "Coordinate the group" }), _jsx(Text, { className: "mt-1 font-body text-[13px] text-white/60", children: "Collaborative scheduling stays separate from normal 1:1 booking." })] }), _jsx(View, { style: styles.iconButton })] }), _jsx(GlassCard, { className: "p-5", children: _jsxs(View, { className: "gap-4", children: [_jsxs(View, { className: "flex-row items-start gap-4", children: [_jsx(View, { style: styles.heroAvatar, children: profile.host.photoUrl ? (_jsx(Image, { source: { uri: profile.host.photoUrl }, style: styles.heroAvatarImage })) : (_jsx(View, { style: styles.heroAvatarFallback, children: _jsx(Text, { style: styles.heroAvatarText, children: avatarFallback(profile.host.name) }) })) }), _jsxs(View, { style: { flex: 1, gap: 4 }, children: [_jsx(Text, { className: "font-body text-xs tracking-[2px] text-violet/82", children: "GROUP SCHEDULING" }), _jsx(Text, { className: "font-display text-[30px] leading-[34px] text-cloud", children: session.title }), _jsxs(Text, { className: "font-body text-sm text-white/64", children: [profile.host.name, " opened this for collaborative timing."] })] })] }), _jsx(Text, { className: "font-body text-sm leading-6 text-white/72", children: session.description || "Mark what works, compare the live read, then lock the cleanest time." }), _jsxs(View, { className: "flex-row flex-wrap gap-2", children: [_jsx(View, { style: styles.metaPill, children: _jsx(Text, { style: styles.metaPillText, children: formatDuration(session.durationMinutes) }) }), _jsx(View, { style: styles.metaPill, children: _jsx(Text, { style: styles.metaPillText, children: session.timezone }) }), _jsx(View, { style: styles.metaPill, children: _jsx(Text, { style: styles.metaPillText, children: session.locationName }) }), _jsx(View, { style: styles.metaPill, children: _jsx(Text, { style: styles.metaPillText, children: session.visibilityMode === "PUBLIC" ? "Public votes" : "Anonymous votes" }) })] }), _jsxs(View, { className: "rounded-[24px] bg-white/6 p-4", children: [_jsx(Text, { className: "font-display text-lg text-cloud", children: session.progress.summary }), _jsx(Text, { className: "mt-2 font-body text-sm leading-6 text-white/64", children: session.progress.decisionHint }), session.progress.responseDeadline ? (_jsxs(Text, { className: "mt-2 font-body text-xs text-aqua/78", children: ["Deadline: ", new Date(session.progress.responseDeadline).toLocaleString()] })) : null] }), participantCapReached ? (_jsx(Text, { className: "font-body text-sm leading-6 text-amber-200/82", children: "This group session has hit its participant cap. You can still follow the live read, but new responses are closed." })) : null] }) }), visibleBestFits.length ? (_jsxs(GlassCard, { className: "p-5", children: [_jsx(Text, { className: "font-display text-xl text-cloud", children: "Best fits" }), _jsx(View, { className: "mt-4 gap-3", children: visibleBestFits.map((slot) => (_jsxs(Pressable, { onPress: () => setSelectedSlotId(slot.id), style: ({ pressed }) => [
                                                        styles.listCard,
                                                        slot.id === selectedSlotId ? styles.listCardActive : null,
                                                        webPressableStyle(pressed, { pressedOpacity: 0.94, pressedScale: 0.99 }),
                                                    ], children: [_jsxs(View, { style: { flex: 1, gap: 4 }, children: [_jsx(Text, { style: styles.bestFitTitle, children: slot.highlightLabel ?? "Best overall" }), _jsx(Text, { style: styles.cardTitle, children: slot.label }), _jsxs(Text, { style: styles.cardMeta, children: [slot.yesCount, " yes \u00B7 ", slot.maybeCount, " maybe \u00B7 ", slot.noCount, " no"] })] }), _jsx(View, { style: styles.rankBadge, children: _jsxs(Text, { style: styles.rankBadgeText, children: ["#", slot.rank] }) })] }, slot.id))) })] })) : null, _jsxs(GlassCard, { className: "p-5", children: [_jsxs(View, { className: "flex-row items-center justify-between gap-4", children: [_jsxs(View, { className: "max-w-[76%] gap-1", children: [_jsx(Text, { className: "font-display text-xl text-cloud", children: "Scheduling thread" }), _jsx(Text, { className: "font-body text-sm leading-6 text-white/60", children: "Keep it contextual. This thread only lives around the scheduling session." })] }), session.currentUserIsHost && !session.hostLocked && !session.finalizedAt ? (_jsx(PillButton, { label: locking ? "Locking..." : "Lock poll", variant: "secondary", onPress: () => void handleLock(), disabled: locking })) : null] }), _jsx(View, { className: "mt-4 gap-3", children: session.messages.map((message) => (_jsxs(View, { style: [
                                                        styles.messageRow,
                                                        message.type === "SYSTEM" ? styles.systemMessageRow : null,
                                                    ], children: [message.sender ? (_jsx(View, { style: styles.messageAvatar, children: message.sender.photoUrl ? (_jsx(Image, { source: { uri: message.sender.photoUrl }, style: styles.messageAvatarImage })) : (_jsx(View, { style: styles.messageAvatarFallback, children: _jsx(Text, { style: styles.messageAvatarText, children: avatarFallback(message.sender.name) }) })) })) : (_jsx(View, { style: styles.systemIconShell, children: _jsx(MaterialCommunityIcons, { name: "star-four-points", size: 14, color: "#C4B5FD" }) })), _jsxs(View, { style: { flex: 1, gap: 4 }, children: [_jsx(Text, { style: [
                                                                        styles.messageSender,
                                                                        message.collaborationColor ? { color: message.collaborationColor } : null,
                                                                    ], children: message.sender?.name ?? "Nowly" }), _jsx(Text, { style: styles.messageCopy, children: message.text })] }), _jsx(Text, { style: styles.messageTime, children: new Date(message.createdAt).toLocaleTimeString([], {
                                                                hour: "numeric",
                                                                minute: "2-digit",
                                                            }) })] }, message.id))) }), _jsxs(View, { className: "mt-4 flex-row items-center gap-3", children: [_jsx(TextInput, { value: messageText, onChangeText: setMessageText, placeholder: "I can do after 6, prefer Saturday, driving from campus...", placeholderTextColor: "rgba(248,250,252,0.38)", className: "flex-1 rounded-[24px] border border-white/10 bg-white/6 px-4 py-4 font-body text-base text-cloud" }), _jsx(PillButton, { label: sendingMessage ? "Sending..." : "Send", onPress: () => void handleSendMessage(), disabled: sendingMessage })] })] })] }), _jsxs(View, { style: { width: layout.rightColumnWidth, gap: layout.sectionGap }, children: [_jsxs(GlassCard, { className: "p-5", children: [_jsx(Text, { className: "font-display text-xl text-cloud", children: "Slots" }), _jsx(Text, { className: "mt-2 font-body text-sm leading-6 text-white/60", children: "Counts first, avatars second, details on tap." }), _jsx(View, { className: "mt-4 gap-3", children: session.slots.map((slot) => {
                                                    const visibleAvatars = session.visibilityMode === "PUBLIC"
                                                        ? slot.voters.filter((vote) => vote.status !== "UNAVAILABLE").slice(0, 4)
                                                        : [];
                                                    return (_jsxs(Pressable, { onPress: () => setSelectedSlotId(slot.id), style: ({ pressed }) => [
                                                            styles.listCard,
                                                            slot.id === selectedSlotId ? styles.listCardActive : null,
                                                            slot.isFinal ? styles.listCardFinal : null,
                                                            webPressableStyle(pressed, { pressedOpacity: 0.94, pressedScale: 0.99 }),
                                                        ], children: [_jsxs(View, { className: "flex-row items-start justify-between gap-4", children: [_jsxs(View, { style: { flex: 1, gap: 6 }, children: [_jsx(Text, { style: styles.cardTitle, children: slot.label }), _jsxs(Text, { style: styles.cardMeta, children: [slot.yesCount, " yes \u00B7 ", slot.maybeCount, " maybe \u00B7 ", slot.noCount, " no"] }), slot.highlightLabel ? (_jsx(Text, { style: styles.bestFitTitle, children: slot.highlightLabel })) : null] }), slot.isFinal ? (_jsx(View, { style: styles.lockedBadge, children: _jsx(Text, { style: styles.lockedBadgeText, children: "Locked" }) })) : (_jsx(View, { style: styles.rankBadge, children: _jsxs(Text, { style: styles.rankBadgeText, children: ["#", slot.rank] }) }))] }), visibleAvatars.length ? (_jsx(View, { className: "mt-4 flex-row items-center", children: visibleAvatars.map((vote, index) => (_jsx(View, { style: [
                                                                        styles.stackAvatar,
                                                                        index > 0 ? { marginLeft: -12 } : null,
                                                                        { borderColor: vote.collaborationColor },
                                                                    ], children: vote.photoUrl ? (_jsx(Image, { source: { uri: vote.photoUrl }, style: styles.stackAvatarImage })) : (_jsx(View, { style: styles.stackAvatarFallback, children: _jsx(Text, { style: styles.stackAvatarText, children: avatarFallback(vote.name) }) })) }, `${slot.id}-${vote.participantId}`))) })) : null] }, slot.id));
                                                }) })] }), selectedSlot ? (_jsxs(GlassCard, { className: "p-5", children: [_jsx(Text, { className: "font-display text-xl text-cloud", children: selectedSlot.label }), _jsxs(Text, { className: "mt-2 font-body text-sm text-white/62", children: [selectedSlot.yesCount, " yes \u00B7 ", selectedSlot.maybeCount, " maybe \u00B7 ", selectedSlot.noCount, " no"] }), session.finalizedAt ? (_jsxs(View, { className: "mt-5 gap-3", children: [_jsx(Text, { className: "font-body text-sm leading-6 text-aqua/82", children: "This time is finalized. Availability edits are closed and reminders now follow the confirmed hangout." }), session.finalHangoutId ? (_jsx(PillButton, { label: "Open confirmed hangout", onPress: () => router.push(`/proposal/${session.finalHangoutId}`) })) : null] })) : (_jsxs(_Fragment, { children: [session.currentUserCanEdit ? (_jsxs(View, { className: "mt-5 gap-3", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: "Your read" }), _jsx(View, { className: "flex-row flex-wrap gap-2", children: schedulingVoteStates.map((status) => (_jsx(Pressable, { onPress: () => handleVoteChange(status), style: ({ pressed }) => [
                                                                        styles.voteChip,
                                                                        currentVoteState === status ? styles.voteChipActive : null,
                                                                        webPressableStyle(pressed, {
                                                                            pressedOpacity: 0.92,
                                                                            pressedScale: 0.985,
                                                                        }),
                                                                    ], children: _jsx(Text, { style: [
                                                                            styles.voteChipText,
                                                                            currentVoteState === status ? styles.voteChipTextActive : null,
                                                                        ], children: voteLabels[status] }) }, status))) })] })) : (_jsx(Text, { className: "mt-5 font-body text-sm leading-6 text-white/62", children: token ? "This poll is locked for edits now." : "Sign in to mark what works for you." })), _jsxs(View, { className: "mt-5 gap-3", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: "Slot detail" }), session.visibilityMode === "PUBLIC" ? (selectedSlot.voters.length ? (selectedSlot.voters.map((vote) => (_jsxs(View, { className: "flex-row items-center justify-between gap-4", children: [_jsxs(View, { className: "max-w-[68%] flex-row items-center gap-3", children: [_jsx(View, { style: [styles.detailAvatar, { borderColor: vote.collaborationColor }], children: vote.photoUrl ? (_jsx(Image, { source: { uri: vote.photoUrl }, style: styles.detailAvatarImage })) : (_jsx(View, { style: styles.detailAvatarFallback, children: _jsx(Text, { style: styles.detailAvatarText, children: avatarFallback(vote.name) }) })) }), _jsx(Text, { style: [styles.detailName, { color: vote.collaborationColor }], children: vote.name })] }), _jsx(Text, { style: styles.detailStatus, children: voteLabels[vote.status] })] }, `${selectedSlot.id}-${vote.participantId}`)))) : (_jsx(Text, { className: "font-body text-sm leading-6 text-white/58", children: "Nobody has weighed in on this slot yet." }))) : (_jsx(Text, { className: "font-body text-sm leading-6 text-white/58", children: "Anonymous mode is on. Invitees only see aggregate counts here." }))] }), selectedSlot.eligible && session.currentUserCanFinalize ? (_jsxs(View, { className: "mt-5 gap-3", children: [_jsx(Text, { className: "font-body text-sm leading-6 text-aqua/82", children: "This slot is eligible under the current decision rule." }), _jsx(PillButton, { label: finalizing ? "Locking..." : finalizeLabel, onPress: () => void handleFinalize(), disabled: finalizing })] })) : null] }))] })) : null] })] }) }), _jsx(View, { pointerEvents: "box-none", style: [styles.footerDockWrap, { paddingHorizontal: layout.screenPadding }], children: _jsx(View, { style: { width: layout.shellWidth, alignSelf: "center" }, children: _jsx(LinearGradient, { colors: ["rgba(4,8,20,0.00)", "rgba(4,8,20,0.74)", "rgba(4,8,20,0.94)"], style: styles.footerFade, children: _jsxs(View, { style: styles.footerCard, children: [_jsx(Text, { className: "pb-[10px] text-center font-body text-[13px] text-white/72", children: footerSummary }), _jsx(PillButton, { label: !token
                                            ? "Sign in to respond"
                                            : submittingVotes
                                                ? "Submitting..."
                                                : "Submit availability", onPress: () => void handleSubmitAvailability(), disabled: Boolean(session.finalizedAt) ||
                                            submittingVotes ||
                                            participantCapReached ||
                                            (!session.currentUserCanEdit && Boolean(token)) })] }) }) }) })] }) }));
};
const styles = StyleSheet.create({
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    heroAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        overflow: "hidden",
        backgroundColor: "rgba(255,255,255,0.08)",
    },
    heroAvatarImage: { width: "100%", height: "100%" },
    heroAvatarFallback: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.08)",
    },
    heroAvatarText: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 22,
    },
    metaPill: {
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.08)",
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    metaPillText: {
        color: "rgba(247,251,255,0.86)",
        fontFamily: "SpaceGrotesk_500Medium",
        fontSize: 12,
    },
    listCard: {
        borderRadius: 24,
        backgroundColor: "rgba(255,255,255,0.05)",
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    listCardActive: {
        shadowColor: nowlyColors.glow,
        shadowOpacity: 0.18,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
    },
    listCardFinal: {
        backgroundColor: "rgba(125,211,252,0.1)",
    },
    bestFitTitle: {
        color: "rgba(196,181,253,0.92)",
        fontFamily: "SpaceGrotesk_500Medium",
        fontSize: 12,
        letterSpacing: 1.1,
        textTransform: "uppercase",
    },
    cardTitle: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 17,
        lineHeight: 22,
    },
    cardMeta: {
        color: "rgba(247,251,255,0.58)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 13,
    },
    rankBadge: {
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.08)",
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    rankBadgeText: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 12,
    },
    lockedBadge: {
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.9)",
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    lockedBadgeText: {
        color: "#081120",
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 12,
    },
    stackAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 2,
        backgroundColor: "rgba(255,255,255,0.1)",
    },
    stackAvatarImage: { width: "100%", height: "100%" },
    stackAvatarFallback: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.08)",
    },
    stackAvatarText: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 12,
    },
    voteChip: {
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.06)",
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    voteChipActive: {
        backgroundColor: "rgba(196,181,253,0.22)",
    },
    voteChipText: {
        color: "rgba(247,251,255,0.76)",
        fontFamily: "SpaceGrotesk_500Medium",
        fontSize: 13,
    },
    voteChipTextActive: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
    },
    detailAvatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        overflow: "hidden",
        borderWidth: 2,
        backgroundColor: "rgba(255,255,255,0.08)",
    },
    detailAvatarImage: { width: "100%", height: "100%" },
    detailAvatarFallback: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.08)",
    },
    detailAvatarText: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 12,
    },
    detailName: {
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 15,
    },
    detailStatus: {
        color: "rgba(247,251,255,0.7)",
        fontFamily: "SpaceGrotesk_500Medium",
        fontSize: 13,
    },
    messageRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.04)",
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    systemMessageRow: {
        backgroundColor: "rgba(196,181,253,0.08)",
    },
    messageAvatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        overflow: "hidden",
    },
    messageAvatarImage: { width: "100%", height: "100%" },
    messageAvatarFallback: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.08)",
    },
    messageAvatarText: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 12,
    },
    systemIconShell: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.06)",
    },
    messageSender: {
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 14,
    },
    messageCopy: {
        color: "rgba(247,251,255,0.74)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 14,
        lineHeight: 20,
    },
    messageTime: {
        color: "rgba(247,251,255,0.44)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 11,
    },
    footerDockWrap: {
        position: "absolute",
        right: 0,
        bottom: 0,
        left: 0,
    },
    footerFade: {
        paddingTop: 24,
        paddingBottom: 18,
    },
    footerCard: {
        borderRadius: 30,
        backgroundColor: "rgba(8,14,28,0.76)",
        padding: 8,
    },
});
