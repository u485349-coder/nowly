import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Platform, ScrollView, Share, Text, TextInput, View, useWindowDimensions, } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { GradientMesh } from "../components/ui/GradientMesh";
import { GlassCard } from "../components/ui/GlassCard";
import { PillButton } from "../components/ui/PillButton";
import { SignalChip } from "../components/ui/SignalChip";
import { NowlyMark } from "../components/branding/NowlyMark";
import { api } from "../lib/api";
import { track } from "../lib/analytics";
import { pickAvatarImage } from "../lib/avatar";
import { NOWLY_DESCRIPTION, NOWLY_SLOGAN } from "../lib/branding";
import { useAppStore } from "../store/useAppStore";
const HOME_ROUTE = "/home";
const QR_GRID_SIZE = 23;
const DESKTOP_CARD_WIDTH = 820;
const qrCells = Array.from({ length: QR_GRID_SIZE * QR_GRID_SIZE }, (_, index) => {
    const x = index % QR_GRID_SIZE;
    const y = Math.floor(index / QR_GRID_SIZE);
    const inTopLeftFinder = x < 7 && y < 7;
    const inTopRightFinder = x >= QR_GRID_SIZE - 7 && y < 7;
    const inBottomLeftFinder = x < 7 && y >= QR_GRID_SIZE - 7;
    const inFinder = inTopLeftFinder || inTopRightFinder || inBottomLeftFinder;
    if (inFinder) {
        const localX = inTopRightFinder ? x - (QR_GRID_SIZE - 7) : x;
        const localY = inBottomLeftFinder ? y - (QR_GRID_SIZE - 7) : y;
        const onOuterRing = localX === 0 || localX === 6 || localY === 0 || localY === 6;
        const onInnerRing = localX === 2 || localX === 4 || localY === 2 || localY === 4;
        const inCore = localX >= 2 && localX <= 4 && localY >= 2 && localY <= 4;
        return onOuterRing || inCore || (onInnerRing && !(localX === 3 && localY === 3));
    }
    const onTimingRow = y === 6 && x > 7 && x < QR_GRID_SIZE - 8 && x % 2 === 0;
    const onTimingColumn = x === 6 && y > 7 && y < QR_GRID_SIZE - 8 && y % 2 === 0;
    if (onTimingRow || onTimingColumn) {
        return true;
    }
    return ((x * 17 + y * 11) % 7 === 0) || ((x + y * 3) % 13 === 0);
});
const showMessage = (title, message) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(`${title}\n\n${message}`);
        return;
    }
    Alert.alert(title, message);
};
export default function OnboardingScreen() {
    const params = useLocalSearchParams();
    const bookingInviteCode = Array.isArray(params.bookingInviteCode)
        ? params.bookingInviteCode[0]
        : params.bookingInviteCode;
    const referralToken = Array.isArray(params.referralToken)
        ? params.referralToken[0]
        : params.referralToken;
    const setSession = useAppStore((state) => state.setSession);
    const finishOnboarding = useAppStore((state) => state.finishOnboarding);
    const clearSession = useAppStore((state) => state.clearSession);
    const user = useAppStore((state) => state.user);
    const onboardingComplete = useAppStore((state) => state.onboardingComplete);
    const token = useAppStore((state) => state.token);
    const { width } = useWindowDimensions();
    const [stage, setStage] = useState("phone");
    const [phone, setPhone] = useState("+1");
    const [otp, setOtp] = useState("");
    const [name, setName] = useState("Avery");
    const [city, setCity] = useState("New York");
    const [communityTag, setCommunityTag] = useState("NYU");
    const [photoUrl, setPhotoUrl] = useState("");
    const [photoFileName, setPhotoFileName] = useState(null);
    const [devCode, setDevCode] = useState(null);
    const [contacts, setContacts] = useState([]);
    const [inviteStatus, setInviteStatus] = useState("Build your crew immediately.");
    const [isFinishing, setIsFinishing] = useState(false);
    const [checkingSavedSession, setCheckingSavedSession] = useState(false);
    const hasSavedSession = Boolean(token && user && (onboardingComplete || user.onboardingCompleted));
    const stageIndex = useMemo(() => ({
        phone: 1,
        otp: 2,
        profile: 3,
    })[stage], [stage]);
    const isDesktopWeb = Platform.OS === "web" && width >= 1080;
    useEffect(() => {
        if (!token || !referralToken) {
            return;
        }
        api.redeemInvite(token, referralToken).catch(() => undefined);
    }, [referralToken, token]);
    useEffect(() => {
        if (!hasSavedSession || !token || !user) {
            return;
        }
        let active = true;
        setCheckingSavedSession(true);
        api
            .fetchDashboard(token, user.id)
            .then(() => {
            if (!active) {
                return;
            }
            if (bookingInviteCode) {
                router.replace({
                    pathname: "/booking/[inviteCode]",
                    params: { inviteCode: bookingInviteCode },
                });
                return;
            }
            router.replace(HOME_ROUTE);
        })
            .catch(() => {
            if (!active) {
                return;
            }
            clearSession();
        })
            .finally(() => {
            if (!active) {
                return;
            }
            setCheckingSavedSession(false);
        });
        return () => {
            active = false;
        };
    }, [bookingInviteCode, clearSession, hasSavedSession, token, user]);
    const loadContacts = async () => {
        if (Platform.OS === "web") {
            setInviteStatus("Contact import stays in the app for now. Use invite cards below in browser.");
            return;
        }
        const Contacts = await import("expo-contacts");
        const permission = await Contacts.requestPermissionsAsync();
        if (permission.status !== "granted") {
            return;
        }
        const response = await Contacts.getContactsAsync({
            fields: [Contacts.Fields.PhoneNumbers],
        });
        setContacts(response.data
            .filter((contact) => contact.phoneNumbers?.[0]?.number)
            .slice(0, 6)
            .map((contact) => ({
            id: contact.id ?? contact.name,
            name: contact.name,
            phone: contact.phoneNumbers?.[0]?.number ?? "",
        })));
    };
    const handleRequestOtp = async () => {
        const response = await api.requestOtp(phone);
        setDevCode(response.devCode ?? null);
        setStage("otp");
    };
    const handleVerifyOtp = async () => {
        const session = await api.verifyOtp(phone, otp || devCode || "111111");
        setSession(session.token, session.user);
        if (referralToken) {
            await api.redeemInvite(session.token, referralToken).catch(() => undefined);
        }
        if (session.user.onboardingCompleted) {
            if (bookingInviteCode) {
                router.replace({
                    pathname: "/booking/[inviteCode]",
                    params: { inviteCode: bookingInviteCode },
                });
                return;
            }
            router.replace(HOME_ROUTE);
            return;
        }
        setStage("profile");
    };
    const handleInvite = async (invitePhone) => {
        const invites = await api.sendInvite(token, [invitePhone]);
        const invite = invites[0];
        if (invite) {
            if (Platform.OS === "web" && typeof navigator !== "undefined") {
                if (navigator.share) {
                    await navigator.share({
                        text: invite.smsTemplate,
                    });
                }
                else if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(invite.smsTemplate);
                }
            }
            else {
                await Share.share({
                    message: invite.smsTemplate,
                });
            }
            setInviteStatus(`Invite ready for ${invitePhone}`);
        }
    };
    const handleDiscordLink = async () => {
        const url = await api.getDiscordOauthUrl(token);
        if (Platform.OS === "web" && typeof window !== "undefined") {
            window.location.assign(url);
            return;
        }
        Linking.openURL(url);
    };
    const handlePickPhoto = async () => {
        try {
            const avatar = await pickAvatarImage();
            if (!avatar) {
                return;
            }
            setPhotoUrl(avatar.dataUrl);
            setPhotoFileName(avatar.fileName);
        }
        catch (error) {
            const message = error instanceof Error && error.message
                ? error.message
                : "We couldn't prep that photo right now. Try again in a moment.";
            showMessage("Photo couldn't be added", message);
        }
    };
    const handleRemovePhoto = () => {
        setPhotoUrl("");
        setPhotoFileName(null);
    };
    const handleFinish = async () => {
        if (isFinishing) {
            return;
        }
        const trimmedName = name.trim();
        const trimmedCity = city.trim();
        const trimmedCommunityTag = communityTag.trim();
        const latestToken = useAppStore.getState().token;
        if (trimmedName.length < 2) {
            showMessage("Add your name", "Use at least 2 characters so your friends know it's you.");
            return;
        }
        if (trimmedCity.length < 2) {
            showMessage("Add your city", "Pick the city or area where you usually link up.");
            return;
        }
        if (trimmedCommunityTag.length === 1) {
            showMessage("Community tag is too short", "Use at least 2 characters, or leave it blank.");
            return;
        }
        if (!latestToken) {
            showMessage("Session expired", "Your sign-in session dropped before setup finished. Verify your phone again and we'll keep moving.");
            return;
        }
        setIsFinishing(true);
        try {
            const user = await api.completeOnboarding(latestToken, {
                name: trimmedName,
                city: trimmedCity,
                communityTag: trimmedCommunityTag || null,
                photoUrl: photoUrl || null,
                referralToken,
            });
            finishOnboarding(user);
            if (bookingInviteCode) {
                router.replace({
                    pathname: "/booking/[inviteCode]",
                    params: { inviteCode: bookingInviteCode },
                });
            }
            else {
                router.replace(HOME_ROUTE);
            }
            void track(latestToken, "onboarding_completed", { city: trimmedCity });
        }
        catch (error) {
            const message = error instanceof Error && error.message
                ? error.message
                : "We couldn't finish setup right now. Try again in a moment.";
            console.error("[onboarding:finish]", error);
            showMessage("Couldn't finish setup", message);
        }
        finally {
            setIsFinishing(false);
        }
    };
    const renderPhoneStage = () => (_jsxs(View, { className: "gap-5", children: [hasSavedSession && user ? (_jsxs(View, { className: "gap-3 rounded-[24px] border border-aqua/25 bg-aqua/10 p-4", children: [_jsxs(Text, { className: "font-display text-xl text-cloud", children: ["Welcome back, ", user.name, "."] }), _jsx(Text, { className: "font-body text-sm leading-6 text-white/70", children: "You are already signed in on this device. Jump straight in, or switch accounts." }), _jsxs(View, { className: "gap-2", children: [_jsx(PillButton, { label: checkingSavedSession ? "Opening Nowly..." : "Open Nowly", onPress: () => {
                                    if (bookingInviteCode) {
                                        router.replace({
                                            pathname: "/booking/[inviteCode]",
                                            params: { inviteCode: bookingInviteCode },
                                        });
                                        return;
                                    }
                                    router.replace(HOME_ROUTE);
                                }, disabled: checkingSavedSession }), _jsx(PillButton, { label: "Use another account", variant: "secondary", onPress: clearSession, disabled: checkingSavedSession })] })] })) : null, isDesktopWeb ? (_jsxs(View, { className: "items-center gap-2", children: [_jsx(Text, { className: "text-center font-display text-[34px] leading-[38px] text-cloud", children: "Welcome back." }), _jsx(Text, { className: "max-w-[360px] text-center font-body text-base leading-7 text-white/70", children: "Sign in with your phone and jump right back into your crew's live availability." })] })) : (_jsx(Text, { className: "font-display text-2xl text-cloud", children: "Sign in with your phone" })), _jsxs(View, { className: "gap-2", children: [isDesktopWeb ? (_jsx(Text, { className: "font-body text-sm text-white/82", children: "Phone number *" })) : null, _jsx(TextInput, { value: phone, onChangeText: setPhone, className: "rounded-2xl border border-white/12 bg-white/8 px-4 py-4 font-body text-base text-cloud", placeholder: "+1 555 555 5555", placeholderTextColor: "rgba(248,250,252,0.4)", keyboardType: "phone-pad" })] }), _jsx(PillButton, { label: "Send OTP", onPress: handleRequestOtp }), isDesktopWeb ? (_jsx(Text, { className: "font-body text-sm leading-6 text-white/52", children: "We text you a one-time code so private chats, booking links, and live signals stay tied to real people." })) : null] }));
    const renderOtpStage = () => (_jsxs(View, { className: "gap-5", children: [isDesktopWeb ? (_jsxs(View, { className: "items-center gap-2", children: [_jsx(Text, { className: "text-center font-display text-[34px] leading-[38px] text-cloud", children: "Check your code." }), _jsx(Text, { className: "max-w-[360px] text-center font-body text-base leading-7 text-white/70", children: "Drop in the OTP and we'll bring you straight into your live graph." })] })) : (_jsx(Text, { className: "font-display text-2xl text-cloud", children: "Drop in the code" })), _jsxs(View, { className: "gap-2", children: [isDesktopWeb ? (_jsx(Text, { className: "font-body text-sm text-white/82", children: "One-time code *" })) : null, _jsx(TextInput, { value: otp, onChangeText: setOtp, className: "rounded-2xl border border-white/12 bg-white/8 px-4 py-4 font-body text-base tracking-[8px] text-cloud", placeholder: "111111", placeholderTextColor: "rgba(248,250,252,0.4)", keyboardType: "number-pad", maxLength: 6 })] }), _jsxs(Text, { className: "font-body text-sm text-white/58", children: ["Dev shortcut: ", devCode ?? "check your SMS"] }), _jsx(PillButton, { label: "Verify phone", onPress: handleVerifyOtp }), isDesktopWeb ? (_jsx(Text, { className: "font-body text-sm leading-6 text-white/52", children: "Once you're in, your browser and phone stay synced around the same account." })) : null] }));
    const renderProfileStage = () => (_jsxs(View, { className: "gap-4", children: [_jsxs(View, { className: "gap-2", children: [_jsx(Text, { className: "font-display text-2xl text-cloud", children: "Build your account" }), _jsx(Text, { className: "font-body text-sm leading-6 text-white", children: "Start with your profile, then tell Nowly who you hang with so your crew is ready when you are." })] }), _jsx(TextInput, { value: name, onChangeText: setName, className: "rounded-3xl border border-white/12 bg-white/8 px-4 py-4 font-body text-base text-cloud", placeholder: "Your name", placeholderTextColor: "rgba(248,250,252,0.4)" }), _jsx(TextInput, { value: city, onChangeText: setCity, className: "rounded-3xl border border-white/12 bg-white/8 px-4 py-4 font-body text-base text-cloud", placeholder: "City", placeholderTextColor: "rgba(248,250,252,0.4)" }), _jsx(TextInput, { value: communityTag, onChangeText: setCommunityTag, className: "rounded-3xl border border-white/12 bg-white/8 px-4 py-4 font-body text-base text-cloud", placeholder: "Campus / neighborhood (optional)", placeholderTextColor: "rgba(248,250,252,0.4)" }), _jsxs(View, { className: "gap-3 rounded-[28px] border border-white/12 bg-white/8 p-4", children: [_jsxs(View, { className: "flex-row items-center gap-4", children: [_jsx(View, { className: "h-16 w-16 overflow-hidden rounded-full border border-white/14 bg-white/8", children: photoUrl ? (_jsx(Image, { source: { uri: photoUrl }, className: "h-full w-full", resizeMode: "cover" })) : (_jsx(View, { className: "h-full w-full items-center justify-center", children: _jsx(Text, { className: "font-display text-xl text-white/70", children: (name.trim()[0] ?? "N").toUpperCase() }) })) }), _jsxs(View, { className: "flex-1", children: [_jsx(Text, { className: "font-display text-lg text-cloud", children: "Add a profile photo" }), _jsx(Text, { className: "mt-1 font-body text-sm leading-5 text-white/60", children: "Optional, but it helps your friends recognize you fast. We square-crop and downsize it automatically." }), photoFileName ? (_jsx(Text, { className: "mt-2 font-body text-xs text-aqua", children: photoFileName })) : null] })] }), _jsxs(View, { className: "flex-row gap-3", children: [_jsx(View, { className: "flex-1", children: _jsx(PillButton, { label: photoUrl ? "Change photo" : "Upload photo", variant: "secondary", onPress: handlePickPhoto }) }), photoUrl ? (_jsx(View, { className: "flex-1", children: _jsx(PillButton, { label: "Remove", variant: "ghost", onPress: handleRemovePhoto }) })) : null] })] }), _jsxs(View, { className: "gap-3 rounded-[24px] bg-white/5 p-4", children: [_jsxs(View, { className: "flex-row items-center justify-between", children: [_jsxs(View, { className: "max-w-[72%]", children: [_jsx(Text, { className: "font-display text-lg text-cloud", children: "Add friends faster with Discord" }), _jsx(Text, { className: "mt-1 font-body text-sm text-white/60", children: "Optional, permission-based, and only used to tighten up your real friend graph." })] }), _jsx(SignalChip, { label: "Optional", active: true, onPress: () => undefined })] }), _jsx(PillButton, { label: "Link Discord", variant: "secondary", onPress: handleDiscordLink })] }), _jsx(PillButton, { label: isFinishing ? "Finishing..." : "Finish setup", onPress: handleFinish })] }));
    const renderInvitePeople = () => (_jsx(GlassCard, { className: "p-5", children: _jsxs(View, { className: "gap-4", children: [_jsxs(View, { className: "flex-row items-center justify-between", children: [_jsxs(View, { children: [_jsx(Text, { className: "font-display text-xl text-cloud", children: "Invite your people" }), _jsx(Text, { className: "mt-1 font-body text-sm text-white/60", children: inviteStatus })] }), _jsx(PillButton, { label: Platform.OS === "web" ? "Invite links" : "Load contacts", variant: "secondary", onPress: loadContacts })] }), _jsx(View, { className: "flex-row flex-wrap gap-2", children: (contacts.length
                        ? contacts
                        : [
                            { id: "1", name: "Maya", phone: "+15550001000" },
                            { id: "2", name: "Theo", phone: "+15550001001" },
                            { id: "3", name: "Syd", phone: "+15550001002" },
                        ]).map((contact) => (_jsxs(View, { className: "w-[48%] rounded-[24px] border border-white/10 bg-white/6 p-4", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: contact.name }), _jsx(Text, { className: "mt-1 font-body text-xs text-white/50", children: contact.phone }), _jsx(View, { className: "mt-3", children: _jsx(PillButton, { label: "Invite", variant: "secondary", onPress: () => handleInvite(contact.phone) }) })] }, contact.id))) })] }) }));
    const renderDesktopAside = () => (_jsxs(View, { className: "flex-1 items-center justify-center gap-6 px-8 py-10", children: [_jsx(View, { className: "rounded-[26px] border border-white/8 bg-white/[0.035] p-3", children: _jsxs(View, { className: "h-44 w-44 overflow-hidden rounded-[18px] bg-cloud p-3", children: [_jsx(View, { style: {
                                flexDirection: "row",
                                flexWrap: "wrap",
                                width: "100%",
                                height: "100%",
                            }, children: qrCells.map((filled, index) => (_jsx(View, { style: {
                                    width: `${100 / QR_GRID_SIZE}%`,
                                    height: `${100 / QR_GRID_SIZE}%`,
                                    backgroundColor: filled ? "#060B16" : "transparent",
                                } }, index))) }), _jsx(View, { className: "absolute inset-0 items-center justify-center", children: _jsx(View, { className: "rounded-full border border-[#060B16]/10 bg-cloud p-2", children: _jsx(NowlyMark, { variant: "icon", size: 34 }) }) })] }) }), _jsxs(View, { className: "items-center gap-2", children: [_jsx(Text, { className: "text-center font-display text-[30px] leading-[34px] text-cloud", children: "Keep Nowly in your pocket" }), _jsx(Text, { className: "max-w-[250px] text-center font-body text-sm leading-6 text-white/68", children: "Sign in with your phone here, then pick back up instantly on mobile when the moment goes live." })] }), _jsxs(View, { className: "w-full gap-3", children: [_jsxs(View, { className: "flex-row items-center gap-3 rounded-[20px] border border-white/6 bg-white/[0.03] px-4 py-3.5", children: [_jsx(MaterialCommunityIcons, { name: "calendar-clock-outline", size: 20, color: "#7DD3FC" }), _jsx(Text, { className: "font-body text-sm text-white/80", children: "Book windows and recurring slots" })] }), _jsxs(View, { className: "flex-row items-center gap-3 rounded-[20px] border border-white/6 bg-white/[0.03] px-4 py-3.5", children: [_jsx(MaterialCommunityIcons, { name: "chat-processing-outline", size: 20, color: "#7DD3FC" }), _jsx(Text, { className: "font-body text-sm text-white/80", children: "Keep private chats and group threads warm" })] }), _jsxs(View, { className: "flex-row items-center gap-3 rounded-[20px] border border-white/6 bg-white/[0.03] px-4 py-3.5", children: [_jsx(MaterialCommunityIcons, { name: "lightning-bolt-circle", size: 20, color: "#7DD3FC" }), _jsx(Text, { className: "font-body text-sm text-white/80", children: "Turn overlap into a real hangout fast" })] })] })] }));
    return (_jsx(GradientMesh, { children: _jsx(ScrollView, { className: "flex-1", contentContainerStyle: {
                paddingHorizontal: isDesktopWeb ? 32 : 20,
                paddingTop: isDesktopWeb ? 28 : 72,
                paddingBottom: isDesktopWeb ? 56 : 40,
                flexGrow: 1,
                gap: 18,
            }, showsVerticalScrollIndicator: false, children: _jsx(View, { style: {
                    width: "100%",
                    maxWidth: isDesktopWeb ? 1160 : undefined,
                    alignSelf: "center",
                    gap: 18,
                    flex: isDesktopWeb ? 1 : undefined,
                    justifyContent: isDesktopWeb ? "center" : undefined,
                }, children: isDesktopWeb ? (_jsxs(_Fragment, { children: [_jsx(View, { style: {
                                width: "100%",
                                maxWidth: DESKTOP_CARD_WIDTH,
                                alignSelf: "center",
                                paddingBottom: 18,
                            }, children: _jsx(NowlyMark, { variant: "lockup", size: 54 }) }), stage === "profile" ? (_jsxs(_Fragment, { children: [_jsx(GlassCard, { className: "p-6", children: renderProfileStage() }), renderInvitePeople()] })) : (_jsx(GlassCard, { className: "self-center overflow-hidden border-white/7 bg-[#1A1F2B]/88 p-0", children: _jsxs(View, { style: {
                                    flexDirection: "row",
                                    width: DESKTOP_CARD_WIDTH,
                                    minHeight: 468,
                                }, children: [_jsx(View, { style: {
                                            width: "54%",
                                            paddingHorizontal: 32,
                                            paddingVertical: 34,
                                            justifyContent: "center",
                                        }, children: _jsxs(View, { className: "gap-5", children: [_jsx(View, { className: "flex-row gap-2", children: [1, 2, 3].map((step) => (_jsx(View, { className: `h-1.5 flex-1 rounded-full ${step <= stageIndex ? "bg-aqua" : "bg-white/12"}` }, step))) }), stage === "phone" ? renderPhoneStage() : renderOtpStage()] }) }), _jsx(View, { style: {
                                            width: "46%",
                                            borderLeftWidth: 1,
                                            borderLeftColor: "rgba(255,255,255,0.06)",
                                        }, children: renderDesktopAside() })] }) }))] })) : (_jsxs(_Fragment, { children: [_jsx(NowlyMark, {}), _jsxs(View, { children: [_jsx(Text, { className: "font-display text-[38px] leading-[42px] text-cloud", children: NOWLY_SLOGAN }), _jsx(Text, { className: "mt-3 font-body text-base leading-6 text-white", children: NOWLY_DESCRIPTION })] }), _jsx(View, { className: "flex-row gap-2", children: [1, 2, 3].map((step) => (_jsx(View, { className: `h-1.5 flex-1 rounded-full ${step <= stageIndex ? "bg-aqua" : "bg-white/12"}` }, step))) }), _jsxs(GlassCard, { className: "p-5", children: [stage === "phone" ? renderPhoneStage() : null, stage === "otp" ? renderOtpStage() : null, stage === "profile" ? renderProfileStage() : null] }), stage === "profile" ? renderInvitePeople() : null] })) }) }) }));
}
