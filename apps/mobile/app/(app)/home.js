import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { startTransition, useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View, } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { PillButton } from "../../components/ui/PillButton";
import { useResponsiveLayout } from "../../components/ui/useResponsiveLayout";
import { nowlyColors } from "../../constants/theme";
import { api } from "../../lib/api";
import { formatDayTime } from "../../lib/format";
import { availabilityLabel } from "../../lib/labels";
import { webPressableStyle } from "../../lib/web-pressable";
import { useAppStore } from "../../store/useAppStore";
const quickPrompts = [
    { key: "quick-bite", label: "Quick bite", route: "/prompt/quick-bite" },
    { key: "walk-nearby", label: "Walk nearby", route: "/prompt/walk-nearby" },
    { key: "study-sprint", label: "Study sprint", route: "/prompt/custom-prompt" },
    { key: "coffee-run", label: "Coffee run", route: "/prompt/coffee-run" },
    { key: "custom-nudge", label: "Custom nudge", route: "/prompt/custom-prompt" },
];
const AvatarChip = ({ name, photoUrl }) => (_jsx(View, { style: styles.avatarChip, children: photoUrl ? (_jsx(Image, { source: { uri: photoUrl }, style: styles.avatarImage, resizeMode: "cover" })) : (_jsx(View, { style: styles.avatarFallback, children: _jsx(Text, { style: styles.avatarInitial, children: (name[0] ?? "N").toUpperCase() }) })) }));
const formatWindowLine = (startsAt) => {
    if (!startsAt) {
        return "Tonight around 8pm.";
    }
    const date = new Date(startsAt);
    return `${date.toLocaleDateString([], {
        weekday: "short",
    })} around ${date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
    })}.`;
};
export default function HomeScreen() {
    const token = useAppStore((state) => state.token);
    const user = useAppStore((state) => state.user);
    const matches = useAppStore((state) => state.matches);
    const activeSignal = useAppStore((state) => state.activeSignal);
    const recaps = useAppStore((state) => state.recaps);
    const scheduledOverlaps = useAppStore((state) => state.scheduledOverlaps);
    const radar = useAppStore((state) => state.radar);
    const setDashboard = useAppStore((state) => state.setDashboard);
    const bootstrapDemo = useAppStore((state) => state.bootstrapDemo);
    const layout = useResponsiveLayout();
    const pulse = useRef(new Animated.Value(0)).current;
    const orderedLiveMatches = useMemo(() => [...matches].sort((left, right) => right.score - left.score), [matches]);
    const orderedScheduledOverlaps = useMemo(() => [...scheduledOverlaps].sort((left, right) => right.score - left.score), [scheduledOverlaps]);
    const openBookingPreview = () => {
        router.push("/availability-preferences");
    };
    useEffect(() => {
        if (!user) {
            return;
        }
        let active = true;
        api
            .fetchDashboard(token, user.id)
            .then((payload) => {
            if (!active) {
                return;
            }
            startTransition(() => {
                setDashboard(payload);
            });
        })
            .catch(() => {
            bootstrapDemo();
        });
        return () => {
            active = false;
        };
    }, [bootstrapDemo, setDashboard, token, user]);
    useEffect(() => {
        const animation = Animated.loop(Animated.sequence([
            Animated.timing(pulse, {
                toValue: 1,
                duration: 2400,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.timing(pulse, {
                toValue: 0,
                duration: 0,
                useNativeDriver: true,
            }),
        ]));
        animation.start();
        return () => {
            animation.stop();
        };
    }, [pulse]);
    const warmPeople = useMemo(() => {
        const seen = new Set();
        return [...orderedLiveMatches, ...orderedScheduledOverlaps]
            .flatMap((item) => {
            const person = "matchedUser" in item ? item.matchedUser : null;
            if (!person || seen.has(person.id)) {
                return [];
            }
            seen.add(person.id);
            return [person];
        })
            .slice(0, 4);
    }, [orderedLiveMatches, orderedScheduledOverlaps]);
    const liveRadarRows = useMemo(() => [
        ...orderedLiveMatches.map((match) => ({
            id: match.id,
            name: match.matchedUser.name,
            line: match.insightLabel ?? match.reason.momentumLabel ?? "Strong live signal fit",
            detail: match.reason.meetingStyle === "ONLINE"
                ? `${Math.round(match.score * 100)}% fit · ${match.reason.overlapMinutes} min overlap · ${match.reason.onlineVenue ?? "online"}`
                : `${Math.round(match.score * 100)}% fit · ${match.reason.overlapMinutes} min overlap · ${match.reason.travelMinutes ?? 15} min away`,
            action: "Open",
            onPress: () => router.push(`/match/${match.id}`),
        })),
        ...orderedScheduledOverlaps.slice(0, 2).map((overlap) => ({
            id: overlap.id,
            name: overlap.matchedUser.name,
            line: overlap.label,
            detail: overlap.summary,
            action: "Suggest",
            onPress: openBookingPreview,
        })),
    ], [openBookingPreview, orderedLiveMatches, orderedScheduledOverlaps]);
    const statusLine = orderedLiveMatches.length
        ? activeSignal
            ? `${availabilityLabel(activeSignal.state)} until ${formatDayTime(activeSignal.expiresAt)}`
            : `${orderedLiveMatches[0].matchedUser.name} is the strongest live match right now.`
        : orderedScheduledOverlaps.length
            ? activeSignal
                ? `${availabilityLabel(activeSignal.state)} until ${formatDayTime(activeSignal.expiresAt)}`
                : orderedScheduledOverlaps[0].label
            : activeSignal
                ? `${availabilityLabel(activeSignal.state)} until ${formatDayTime(activeSignal.expiresAt)}`
                : radar?.rhythm.detail || "No overlap yet.";
    const heroSupport = orderedLiveMatches.length
        ? `${orderedLiveMatches.length} ${orderedLiveMatches.length === 1 ? "friend looks" : "friends look"} warm on the line.`
        : orderedScheduledOverlaps.length
            ? orderedScheduledOverlaps[0].summary
            : matches.length
                ? `${matches.length} ${matches.length === 1 ? "friend looks" : "friends look"} warm on the line.`
                : activeSignal
                    ? `Your light signal is up and ${availabilityLabel(activeSignal.state).toLowerCase()} still feels easy.`
                    : radar?.suggestionLine || "Wake the radar up and let timing do the rest.";
    const plannedWindowLine = formatWindowLine(orderedScheduledOverlaps[0]?.startsAt ?? (activeSignal ? activeSignal.expiresAt : null));
    const pulseScale = pulse.interpolate({
        inputRange: [0, 1],
        outputRange: [0.96, 3.8],
    });
    const pulseOpacity = pulse.interpolate({
        inputRange: [0, 0.24, 1],
        outputRange: [0, 0.36, 0],
    });
    const heroHeight = Math.max(layout.height * 0.35, layout.isDesktop ? 360 : 320);
    const shellStyle = layout.isDesktop
        ? {
            flexDirection: "row",
            alignItems: "flex-start",
            gap: layout.splitGap,
        }
        : undefined;
    return (_jsx(GradientMesh, { children: _jsx(ScrollView, { className: "flex-1", contentContainerStyle: {
                alignItems: "center",
                paddingBottom: 170,
                paddingHorizontal: layout.screenPadding,
                paddingTop: layout.isDesktop ? 40 : 58,
            }, showsVerticalScrollIndicator: false, children: _jsxs(View, { style: [{ width: layout.shellWidth, gap: layout.sectionGap }, shellStyle], children: [_jsxs(View, { style: { width: layout.leftColumnWidth, gap: 22 }, children: [_jsxs(View, { style: styles.heroHeader, children: [_jsxs(View, { style: { gap: 10, maxWidth: layout.isDesktop ? 380 : undefined }, children: [_jsx(Text, { style: styles.eyebrow, children: "LIVE RADAR" }), _jsx(Text, { style: styles.heroTitle, children: "Who can you catch right now?" })] }), _jsx(Pressable, { onPress: () => router.push("/availability-preferences"), style: ({ pressed }) => [
                                            styles.heroUtility,
                                            webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                                        ], children: _jsx(MaterialCommunityIcons, { name: "cog-outline", size: 20, color: "#F7FBFF" }) })] }), _jsx(View, { style: [styles.heroShell, { minHeight: heroHeight }], children: _jsxs(LinearGradient, { colors: ["rgba(24,17,56,0.95)", "rgba(36,31,90,0.82)", "rgba(8,14,29,0.98)"], start: { x: 0.08, y: 0.02 }, end: { x: 1, y: 1 }, style: styles.heroPanel, children: [_jsx(View, { style: styles.heroGlowA, pointerEvents: "none" }), _jsx(View, { style: styles.heroGlowB, pointerEvents: "none" }), _jsxs(View, { style: { gap: 14 }, children: [_jsx(Text, { style: styles.heroPanelTitle, children: "Who can you catch right now?" }), _jsx(Text, { style: styles.heroSupport, children: heroSupport }), _jsx(View, { style: styles.heroClusterRow, children: warmPeople.length ? (warmPeople.map((person) => (_jsx(AvatarChip, { name: person.name, photoUrl: person.photoUrl }, person.id)))) : (_jsx(View, { style: styles.ambientDot })) })] }), _jsxs(View, { style: styles.heroActions, children: [_jsx(PillButton, { label: "Send light signal", onPress: () => router.push("/now-mode") }), _jsx(Pressable, { onPress: openBookingPreview, style: ({ pressed }) => [
                                                        styles.ghostAction,
                                                        webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.985 }),
                                                    ], children: _jsx(Text, { style: styles.ghostActionText, children: "View best windows" }) })] }), _jsxs(View, { style: styles.pulseField, pointerEvents: "none", children: [_jsx(View, { style: styles.pulseCore }), _jsx(Animated.View, { style: [
                                                        styles.pulseRing,
                                                        {
                                                            opacity: pulseOpacity,
                                                            transform: [{ scale: pulseScale }],
                                                        },
                                                    ] }), _jsx(Animated.View, { style: [
                                                        styles.pulseRingSecondary,
                                                        {
                                                            opacity: pulseOpacity.interpolate({
                                                                inputRange: [0, 1],
                                                                outputRange: [0, 0.28],
                                                            }),
                                                            transform: [
                                                                {
                                                                    scale: pulse.interpolate({
                                                                        inputRange: [0, 1],
                                                                        outputRange: [1.1, 4.6],
                                                                    }),
                                                                },
                                                            ],
                                                        },
                                                    ] })] })] }) })] }), _jsxs(View, { style: { width: layout.rightColumnWidth, gap: layout.sectionGap }, children: [_jsx(View, { style: styles.statusStrip, children: _jsx(Text, { style: styles.statusText, children: statusLine }) }), _jsxs(View, { style: { gap: 12 }, children: [_jsx(Text, { style: styles.sectionLabel, children: "LIVE RADAR" }), liveRadarRows.length ? (liveRadarRows.slice(0, 5).map((item) => (_jsxs(View, { style: styles.radarRow, children: [_jsxs(View, { style: { flex: 1, gap: 4 }, children: [_jsx(Text, { style: styles.radarName, children: item.name }), _jsx(Text, { style: styles.radarLine, children: item.line }), _jsx(Text, { style: styles.radarDetail, children: item.detail })] }), _jsx(Pressable, { onPress: item.onPress, style: ({ pressed }) => [
                                                    styles.radarAction,
                                                    webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.985 }),
                                                ], children: _jsx(Text, { style: styles.radarActionText, children: item.action }) })] }, item.id)))) : (_jsx(Text, { style: styles.radarEmpty, children: "Go live or save a hang rhythm and the radar feed will stack your best fits here." }))] }), _jsxs(View, { style: { gap: 12 }, children: [_jsx(Text, { style: styles.sectionLabel, children: "LOW PRESSURE PROMPTS" }), _jsx(ScrollView, { horizontal: true, showsHorizontalScrollIndicator: false, children: _jsx(View, { style: styles.promptRow, children: quickPrompts.map((prompt) => (_jsx(Pressable, { onPress: () => router.push(prompt.route), style: ({ pressed }) => [
                                                    styles.promptChip,
                                                    pressed ? styles.promptChipPressed : null,
                                                    webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.985 }),
                                                ], children: _jsx(Text, { style: styles.promptChipText, children: prompt.label }) }, prompt.key))) }) })] }), _jsxs(Pressable, { onPress: openBookingPreview, style: ({ pressed }) => [
                                    styles.teaserCard,
                                    webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.99 }),
                                ], children: [_jsx(Text, { style: styles.sectionLabel, children: "BEST UPCOMING WINDOW" }), _jsx(Text, { style: styles.teaserTitle, children: plannedWindowLine }), _jsx(Text, { style: styles.teaserMeta, children: "Tap to open setup and tune your hang rhythm." })] }), _jsxs(View, { style: { gap: 12 }, children: [_jsx(Text, { style: styles.sectionLabel, children: "PAST HANGS" }), recaps.length ? (recaps.slice(0, 3).map((recap, index) => (_jsxs(Pressable, { onPress: () => router.push(`/recap/${recap.hangoutId}`), style: ({ pressed }) => [
                                            styles.recapCard,
                                            {
                                                marginLeft: index * 8,
                                                opacity: 1 - index * 0.12,
                                            },
                                            webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.99 }),
                                        ], children: [_jsx(Text, { style: styles.recapBadge, children: recap.badge }), _jsx(Text, { style: styles.recapTitle, children: recap.title }), _jsx(Text, { style: styles.recapSummary, children: recap.summary })] }, recap.id)))) : (_jsx(View, { style: styles.ghostStack, children: _jsx(Text, { style: styles.recapSummary, children: "Your recent hangs will collect here as soft recaps." }) }))] })] })] }) }) }));
}
const styles = StyleSheet.create({
    ambientDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "rgba(139,234,255,0.68)",
        shadowColor: nowlyColors.aqua,
        shadowOpacity: 0.4,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
    },
    avatarChip: {
        width: 52,
        height: 52,
        overflow: "hidden",
        borderRadius: 26,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
    },
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
        fontSize: 18,
    },
    eyebrow: {
        color: "rgba(167,139,250,0.86)",
        fontFamily: "SpaceGrotesk_500Medium",
        fontSize: 12,
        letterSpacing: 2.4,
    },
    ghostAction: {
        alignSelf: "flex-start",
        paddingVertical: 6,
    },
    ghostActionText: {
        color: "rgba(247,251,255,0.76)",
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 15,
    },
    ghostStack: {
        borderRadius: 28,
        backgroundColor: "rgba(255,255,255,0.04)",
        paddingHorizontal: 18,
        paddingVertical: 18,
    },
    heroActions: {
        gap: 10,
    },
    heroClusterRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    heroHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
    },
    heroPanel: {
        flex: 1,
        justifyContent: "space-between",
        borderRadius: 34,
        overflow: "hidden",
        paddingHorizontal: 22,
        paddingVertical: 22,
    },
    heroPanelTitle: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 29,
        lineHeight: 34,
        maxWidth: 360,
    },
    heroShell: {
        overflow: "hidden",
        borderRadius: 34,
        shadowColor: nowlyColors.glow,
        shadowOpacity: 0.16,
        shadowRadius: 28,
        shadowOffset: {
            width: 0,
            height: 16,
        },
        elevation: 10,
    },
    heroGlowA: {
        position: "absolute",
        right: -56,
        top: -68,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: "rgba(167,139,250,0.16)",
    },
    heroGlowB: {
        position: "absolute",
        left: -56,
        bottom: -120,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: "rgba(124,58,237,0.14)",
    },
    heroSupport: {
        color: "rgba(247,251,255,0.72)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 15,
        lineHeight: 24,
        maxWidth: 420,
    },
    heroTitle: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 34,
        lineHeight: 38,
    },
    heroUtility: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.04)",
    },
    promptChip: {
        height: 40,
        justifyContent: "center",
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.06)",
        paddingHorizontal: 16,
        shadowColor: nowlyColors.glow,
        shadowOpacity: 0.1,
        shadowRadius: 14,
        shadowOffset: {
            width: 0,
            height: 10,
        },
    },
    promptChipPressed: {
        backgroundColor: "rgba(255,255,255,0.1)",
        shadowOpacity: 0.18,
    },
    promptChipText: {
        color: "rgba(247,251,255,0.92)",
        fontFamily: "SpaceGrotesk_500Medium",
        fontSize: 14,
    },
    promptRow: {
        flexDirection: "row",
        gap: 10,
        paddingRight: 6,
    },
    radarAction: {
        borderRadius: 999,
        backgroundColor: "rgba(124,58,237,0.18)",
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    radarActionText: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 13,
    },
    radarDetail: {
        color: "rgba(247,251,255,0.54)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 13,
        lineHeight: 20,
    },
    radarEmpty: {
        color: "rgba(247,251,255,0.6)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 14,
        lineHeight: 22,
    },
    radarLine: {
        color: "rgba(196,181,253,0.9)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 13,
        lineHeight: 20,
    },
    radarName: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 18,
        lineHeight: 22,
    },
    radarRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 4,
    },
    pulseCore: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "#B8F3FF",
        shadowColor: nowlyColors.aqua,
        shadowOpacity: 0.66,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
    },
    pulseField: {
        position: "absolute",
        right: 34,
        bottom: 26,
        width: 120,
        height: 70,
        alignItems: "center",
        justifyContent: "center",
    },
    pulseRing: {
        position: "absolute",
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: "rgba(139,234,255,0.44)",
    },
    pulseRingSecondary: {
        position: "absolute",
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(117,207,255,0.22)",
    },
    recapBadge: {
        color: "rgba(196,181,253,0.82)",
        fontFamily: "SpaceGrotesk_500Medium",
        fontSize: 11,
        letterSpacing: 1.6,
        textTransform: "uppercase",
    },
    recapCard: {
        borderRadius: 28,
        backgroundColor: "rgba(255,255,255,0.05)",
        paddingHorizontal: 18,
        paddingVertical: 18,
        gap: 8,
    },
    recapSummary: {
        color: "rgba(247,251,255,0.62)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 14,
        lineHeight: 22,
    },
    recapTitle: {
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
    statusStrip: {
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.04)",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    statusText: {
        color: "rgba(247,251,255,0.82)",
        fontFamily: "SpaceGrotesk_500Medium",
        fontSize: 14,
    },
    teaserCard: {
        borderRadius: 30,
        backgroundColor: "rgba(255,255,255,0.05)",
        paddingHorizontal: 18,
        paddingVertical: 18,
        gap: 8,
    },
    teaserMeta: {
        color: "rgba(247,251,255,0.56)",
        fontFamily: "SpaceGrotesk_400Regular",
        fontSize: 13,
    },
    teaserTitle: {
        color: nowlyColors.cloud,
        fontFamily: "SpaceGrotesk_700Bold",
        fontSize: 20,
        lineHeight: 24,
    },
});
