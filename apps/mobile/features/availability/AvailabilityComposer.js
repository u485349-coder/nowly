import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { encodeSignalLabelMetadata, hangoutIntentOptions, onlineVenueSuggestions, signalCrowdModes, signalMeetModes, } from "@nowly/shared";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { SignalChip } from "../../components/ui/SignalChip";
import { budgetLabel, energyLabel, hangoutIntentLabel, socialBatteryLabel, vibeLabel, } from "../../lib/labels";
const stateOptions = [
    { state: "FREE_NOW", label: "Free now", hint: "Quick plan, low friction", duration: 3 },
    { state: "FREE_LATER", label: "Free later", hint: "Later today works", duration: 6 },
    { state: "BUSY", label: "Busy", hint: "Quiet the pings", duration: 4 },
    { state: "DOWN_THIS_WEEKEND", label: "Weekend", hint: "Open to a bigger plan", duration: 48 },
];
const vibeOptions = ["FOOD", "GYM", "CHILL", "PARTY", "COFFEE", "OUTDOORS"];
const radiusOptions = [3, 8, 15];
const energyOptions = ["LOW", "MEDIUM", "HIGH"];
const batteryOptions = ["LOW_KEY", "OPEN", "SOCIAL"];
const budgetOptions = ["LOW_SPEND", "FLEXIBLE", "TREAT_MYSELF"];
const durationOptions = [0.5, 1, 2, 3, 6, 12, 24, 48];
const meetModeLabels = {
    IN_PERSON: "In person",
    ONLINE: "Online",
    EITHER: "Either",
};
const crowdModeLabels = {
    ONE_ON_ONE: "1:1",
    GROUP: "Group",
    EITHER: "Either",
};
const clampDurationHours = (value) => Math.max(0.25, Math.min(72, value));
const parseDurationInput = (value) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
        return null;
    }
    const minutesMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)$/);
    if (minutesMatch) {
        return clampDurationHours(Number(minutesMatch[1]) / 60);
    }
    const hoursMatch = normalized.match(/^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)?$/);
    if (hoursMatch) {
        return clampDurationHours(Number(hoursMatch[1]));
    }
    return null;
};
const formatDurationInput = (value) => {
    if (value < 1) {
        return `${Math.round(value * 60)}m`;
    }
    if (Number.isInteger(value)) {
        return `${value}h`;
    }
    return `${value.toFixed(2).replace(/\.?0+$/, "")}h`;
};
export const AvailabilityComposer = ({ activeSignal, defaultLocationLabel, onSave, signalPreferences, onSignalPreferencesChange, }) => {
    const estimateDuration = (signal, fallback) => {
        if (!signal) {
            return fallback;
        }
        const diffHours = (new Date(signal.expiresAt).getTime() - Date.now()) / (60 * 60 * 1000);
        return clampDurationHours(Math.max(0.25, Math.round(diffHours * 4) / 4));
    };
    const initialState = stateOptions.find((item) => item.state === activeSignal?.state) ?? stateOptions[0];
    const [state, setState] = useState(initialState.state);
    const [radiusKm, setRadiusKm] = useState(activeSignal?.radiusKm ?? 8);
    const [vibe, setVibe] = useState(activeSignal?.vibe ?? "COFFEE");
    const [hangoutIntent, setHangoutIntent] = useState(activeSignal?.hangoutIntent ?? "PULL_UP");
    const [energyLevel, setEnergyLevel] = useState(activeSignal?.energyLevel ?? "MEDIUM");
    const [socialBattery, setSocialBattery] = useState(activeSignal?.socialBattery ?? "OPEN");
    const [budgetMood, setBudgetMood] = useState(activeSignal?.budgetMood ?? "LOW_SPEND");
    const [label, setLabel] = useState(activeSignal?.label ?? "");
    const [showLocation, setShowLocation] = useState(signalPreferences.showLocation);
    const [locationLabel, setLocationLabel] = useState(signalPreferences.locationLabel);
    const [durationHours, setDurationHours] = useState(estimateDuration(activeSignal, initialState.duration));
    const [durationInput, setDurationInput] = useState(formatDurationInput(estimateDuration(activeSignal, initialState.duration)));
    const [meetMode, setMeetMode] = useState(activeSignal?.meetMode ?? "IN_PERSON");
    const [crowdMode, setCrowdMode] = useState(activeSignal?.crowdMode ?? "EITHER");
    const [onlineVenue, setOnlineVenue] = useState(activeSignal?.onlineVenue ?? "");
    useEffect(() => {
        const nextState = stateOptions.find((item) => item.state === activeSignal?.state) ?? stateOptions[0];
        const nextDuration = estimateDuration(activeSignal, nextState.duration);
        setState(nextState.state);
        setRadiusKm(activeSignal?.radiusKm ?? 8);
        setVibe(activeSignal?.vibe ?? "COFFEE");
        setHangoutIntent(activeSignal?.hangoutIntent ?? "PULL_UP");
        setEnergyLevel(activeSignal?.energyLevel ?? "MEDIUM");
        setSocialBattery(activeSignal?.socialBattery ?? "OPEN");
        setBudgetMood(activeSignal?.budgetMood ?? "LOW_SPEND");
        setLabel(activeSignal?.label ?? "");
        setMeetMode(activeSignal?.meetMode ?? "IN_PERSON");
        setCrowdMode(activeSignal?.crowdMode ?? "EITHER");
        setOnlineVenue(activeSignal?.onlineVenue ?? "");
        setDurationHours(nextDuration);
        setDurationInput(formatDurationInput(nextDuration));
    }, [activeSignal]);
    useEffect(() => {
        setShowLocation(signalPreferences.showLocation);
        setLocationLabel(signalPreferences.locationLabel);
    }, [signalPreferences.locationLabel, signalPreferences.showLocation]);
    const selectedState = useMemo(() => stateOptions.find((item) => item.state === state) ?? stateOptions[0], [state]);
    const durationSummary = useMemo(() => formatDurationInput(durationHours), [durationHours]);
    return (_jsx(GlassCard, { className: "p-5", children: _jsxs(View, { className: "gap-4", children: [_jsxs(View, { children: [_jsx(Text, { className: "font-display text-xl text-cloud", children: "Now mode setup" }), _jsx(Text, { className: "mt-1 font-body text-sm text-white/60", children: "Tune the live signal, then let Nowly line up the right kind of overlap." })] }), _jsx(View, { className: "gap-3", children: stateOptions.map((option) => (_jsx(SignalChip, { label: `${option.label} - ${option.hint}`, active: option.state === state, onPress: () => setState(option.state) }, option.state))) }), _jsxs(View, { className: "gap-2", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: "Signal line" }), _jsx(Text, { className: "font-body text-sm leading-6 text-white/60", children: "Give the moment a simple line your friends can instantly understand." }), _jsx(TextInput, { value: label, onChangeText: setLabel, className: "rounded-[22px] border border-white/12 bg-white/6 px-4 py-3 font-body text-cloud", placeholder: "After class coffee, late-night VC, study break...", placeholderTextColor: "rgba(248,250,252,0.35)" })] }), _jsxs(View, { className: "gap-2", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: "Meet style" }), _jsx(View, { className: "flex-row flex-wrap gap-2", children: signalMeetModes.map((option) => (_jsx(SignalChip, { label: meetModeLabels[option], active: meetMode === option, onPress: () => setMeetMode(option) }, option))) }), _jsx(Text, { className: "font-body text-sm text-aqua/80", children: "In-person prefers nearby hangs. Online skips distance and works for Discord, Reddit, Roblox, and other digital spots." })] }), _jsxs(View, { className: "gap-2", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: "Crowd style" }), _jsx(View, { className: "flex-row flex-wrap gap-2", children: signalCrowdModes.map((option) => (_jsx(SignalChip, { label: crowdModeLabels[option], active: crowdMode === option, onPress: () => setCrowdMode(option) }, option))) })] }), meetMode !== "IN_PERSON" ? (_jsxs(View, { className: "gap-2", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: "Online spot" }), _jsx(Text, { className: "font-body text-sm leading-6 text-white/60", children: "Add the platform if this hang could happen online." }), _jsx(TextInput, { value: onlineVenue, onChangeText: setOnlineVenue, className: "rounded-[22px] border border-white/12 bg-white/6 px-4 py-3 font-body text-cloud", placeholder: "Discord, Reddit, Roblox...", placeholderTextColor: "rgba(248,250,252,0.35)" }), _jsx(View, { className: "flex-row flex-wrap gap-2", children: onlineVenueSuggestions.map((option) => (_jsx(SignalChip, { label: option, active: onlineVenue.trim().toLowerCase() === option.toLowerCase(), onPress: () => setOnlineVenue(option) }, option))) })] })) : null, _jsxs(View, { className: "gap-2", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: "Go live for" }), _jsx(View, { className: "flex-row flex-wrap gap-2", children: durationOptions.map((hours) => (_jsx(SignalChip, { label: formatDurationInput(hours), active: durationHours === hours, onPress: () => {
                                    setDurationHours(hours);
                                    setDurationInput(formatDurationInput(hours));
                                } }, hours))) }), _jsx(TextInput, { value: durationInput, onChangeText: (value) => {
                                setDurationInput(value);
                                const nextDuration = parseDurationInput(value);
                                if (nextDuration !== null) {
                                    setDurationHours(nextDuration);
                                }
                            }, className: "rounded-[22px] border border-white/12 bg-white/6 px-4 py-3 font-body text-cloud", placeholder: "Custom duration: 45m, 1.5h, 4h...", placeholderTextColor: "rgba(248,250,252,0.35)" }), _jsxs(Text, { className: "font-body text-sm text-aqua/80", children: [selectedState.label, " is just the preset mood. The live timer is fully yours."] })] }), meetMode !== "ONLINE" ? (_jsxs(View, { className: "gap-2", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: "Location sharing" }), _jsx(Text, { className: "font-body text-sm leading-6 text-white/60", children: "Let friends know where to catch you when your signal goes live." }), _jsxs(View, { className: "flex-row gap-2", children: [_jsx(SignalChip, { label: "Hide spot", active: !showLocation, onPress: () => {
                                        setShowLocation(false);
                                        onSignalPreferencesChange({ showLocation: false });
                                    } }), _jsx(SignalChip, { label: "Show area", active: showLocation, onPress: () => {
                                        setShowLocation(true);
                                        onSignalPreferencesChange({ showLocation: true });
                                    } })] }), showLocation ? (_jsxs(_Fragment, { children: [_jsx(TextInput, { value: locationLabel, onChangeText: (nextValue) => {
                                        setLocationLabel(nextValue);
                                        onSignalPreferencesChange({ locationLabel: nextValue });
                                    }, className: "rounded-[22px] border border-white/12 bg-white/6 px-4 py-3 font-body text-cloud", placeholder: defaultLocationLabel ?? "Near campus, downtown, west side...", placeholderTextColor: "rgba(248,250,252,0.35)" }), _jsx(Text, { className: "font-body text-sm text-aqua/80", children: "This area label can ride with the live alert and overlap copy." })] })) : null] })) : (_jsx(Text, { className: "font-body text-sm text-aqua/80", children: "Online mode skips physical distance, so your platform matters more than your radius." })), meetMode !== "ONLINE" ? (_jsxs(View, { className: "gap-2", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: "Radius" }), _jsx(View, { className: "flex-row gap-2", children: radiusOptions.map((radius) => (_jsx(SignalChip, { label: `${radius} km`, active: radiusKm === radius, onPress: () => setRadiusKm(radius) }, radius))) })] })) : null, _jsxs(View, { className: "gap-2", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: "Intent" }), _jsx(View, { className: "flex-row flex-wrap gap-2", children: hangoutIntentOptions.map((option) => (_jsx(SignalChip, { label: hangoutIntentLabel(option), active: hangoutIntent === option, onPress: () => setHangoutIntent(option) }, option))) })] }), _jsxs(View, { className: "gap-2", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: "Vibe" }), _jsx(View, { className: "flex-row flex-wrap gap-2", children: vibeOptions.map((option) => (_jsx(SignalChip, { label: vibeLabel(option), active: vibe === option, onPress: () => setVibe(option) }, option))) })] }), _jsxs(View, { className: "gap-2", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: "Energy" }), _jsx(View, { className: "flex-row gap-2", children: energyOptions.map((option) => (_jsx(SignalChip, { label: energyLabel(option), active: energyLevel === option, onPress: () => setEnergyLevel(option) }, option))) })] }), _jsxs(View, { className: "gap-2", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: "Social battery" }), _jsx(View, { className: "flex-row gap-2", children: batteryOptions.map((option) => (_jsx(SignalChip, { label: socialBatteryLabel(option), active: socialBattery === option, onPress: () => setSocialBattery(option) }, option))) })] }), _jsxs(View, { className: "gap-2", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: "Spend mood" }), _jsx(View, { className: "flex-row flex-wrap gap-2", children: budgetOptions.map((option) => (_jsx(SignalChip, { label: budgetLabel(option), active: budgetMood === option, onPress: () => setBudgetMood(option) }, option))) })] }), _jsx(PillButton, { label: `Go live for ${durationSummary}`, onPress: () => onSave({
                        state,
                        label: encodeSignalLabelMetadata(label.trim() || null, {
                            meetMode,
                            crowdMode,
                            onlineVenue,
                        }),
                        radiusKm,
                        showLocation: meetMode === "ONLINE" ? false : showLocation,
                        locationLabel: meetMode === "ONLINE"
                            ? null
                            : showLocation
                                ? locationLabel.trim() || defaultLocationLabel || null
                                : null,
                        vibe,
                        energyLevel,
                        budgetMood,
                        socialBattery,
                        hangoutIntent,
                        durationHours,
                    }) })] }) }));
};
