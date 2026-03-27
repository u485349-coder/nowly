import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { NowlyMark } from "../../components/branding/NowlyMark";
import { api } from "../../lib/api";
import { useAppStore } from "../../store/useAppStore";
export default function DiscordCallbackScreen() {
    const params = useLocalSearchParams();
    const token = useAppStore((state) => state.token);
    const updateUser = useAppStore((state) => state.updateUser);
    const [status, setStatus] = useState("linking");
    const [message, setMessage] = useState("Connecting your Discord servers to Nowly...");
    const code = useMemo(() => (Array.isArray(params.code) ? params.code[0] : params.code), [params.code]);
    const oauthError = useMemo(() => (Array.isArray(params.error) ? params.error[0] : params.error), [params.error]);
    useEffect(() => {
        if (oauthError) {
            setStatus("error");
            setMessage("Discord canceled the link or sent back an invalid auth response.");
            return;
        }
        if (!token) {
            setStatus("error");
            setMessage("Your Nowly session expired before Discord came back. Sign in again and retry.");
            return;
        }
        if (!code) {
            setStatus("error");
            setMessage("Discord did not return an authorization code. Try linking again.");
            return;
        }
        let active = true;
        void (async () => {
            try {
                const user = await api.linkDiscord(token, code);
                if (!active) {
                    return;
                }
                updateUser({
                    discordUsername: user.discordUsername,
                    sharedServerCount: user.sharedServerCount,
                    hasDiscordLinked: user.hasDiscordLinked,
                });
                setStatus("success");
                setMessage("Discord is linked. Nowly can use your shared servers to tighten up your graph.");
                setTimeout(() => {
                    router.replace("/friends");
                }, 1100);
            }
            catch (error) {
                if (!active) {
                    return;
                }
                const text = error instanceof Error && error.message
                    ? error.message
                    : "We couldn't finish the Discord link right now.";
                setStatus("error");
                setMessage(text);
            }
        })();
        return () => {
            active = false;
        };
    }, [code, oauthError, token, updateUser]);
    return (_jsx(GradientMesh, { children: _jsx(View, { className: "flex-1 items-center justify-center px-5", children: _jsx(GlassCard, { className: "w-full max-w-[520px] p-6", children: _jsxs(View, { className: "items-center gap-5", children: [_jsx(NowlyMark, { variant: "icon", size: 72 }), _jsxs(View, { className: "items-center gap-2", children: [_jsx(Text, { className: "text-center font-display text-[32px] leading-[34px] text-cloud", children: status === "success"
                                        ? "Discord linked"
                                        : status === "error"
                                            ? "Discord link failed"
                                            : "Linking Discord" }), _jsx(Text, { className: "max-w-[380px] text-center font-body text-base leading-7 text-white/70", children: message })] }), status !== "linking" ? (_jsx(View, { className: "w-full gap-3", children: _jsx(PillButton, { label: status === "success" ? "Open friends" : "Back to setup", onPress: () => router.replace(status === "success" ? "/friends" : "/onboarding") }) })) : null] }) }) }) }));
}
