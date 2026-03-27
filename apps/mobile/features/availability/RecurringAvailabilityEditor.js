import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { hangoutIntentOptions, vibeOptions, } from "@nowly/shared";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { SignalChip } from "../../components/ui/SignalChip";
import { formatMinutesOfDay, formatOrdinalDay, parseTimeInput, recurringWindowLabel, toTimeInputValue, weekdayOptionLabels, } from "../../lib/recurring-availability";
import { hangoutIntentLabel, vibeLabel } from "../../lib/labels";
const createDraftWindow = (recurrence = "WEEKLY") => ({
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    recurrence,
    dayOfWeek: recurrence === "WEEKLY" ? 2 : null,
    dayOfMonth: recurrence === "MONTHLY" ? 15 : null,
    startInput: "6:00 PM",
    endInput: "8:00 PM",
    label: "",
    vibe: null,
    hangoutIntent: null,
});
const toDraft = (window) => ({
    id: window.id,
    recurrence: window.recurrence,
    dayOfWeek: window.dayOfWeek ?? null,
    dayOfMonth: window.dayOfMonth ?? null,
    startInput: toTimeInputValue(window.startMinute),
    endInput: toTimeInputValue(window.endMinute),
    label: window.label ?? "",
    vibe: window.vibe ?? null,
    hangoutIntent: window.hangoutIntent ?? null,
});
export const RecurringAvailabilityEditor = ({ windows, onSave, }) => {
    const initialDrafts = useMemo(() => (windows.length ? windows.map((window) => toDraft(window)) : [createDraftWindow()]), [windows]);
    const [drafts, setDrafts] = useState(initialDrafts);
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        setDrafts(initialDrafts);
    }, [initialDrafts]);
    const updateDraft = (id, patch) => {
        setDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
    };
    const save = async () => {
        const utcOffsetMinutes = new Date().getTimezoneOffset();
        const payload = drafts.map((draft) => {
            const startMinute = parseTimeInput(draft.startInput);
            const endMinute = parseTimeInput(draft.endInput);
            if (startMinute === null || endMinute === null) {
                throw new Error("Use a time like 6:30 PM.");
            }
            if (endMinute <= startMinute) {
                throw new Error("End time must be later than start time.");
            }
            return {
                recurrence: draft.recurrence,
                dayOfWeek: draft.recurrence === "WEEKLY" ? draft.dayOfWeek : null,
                dayOfMonth: draft.recurrence === "MONTHLY" ? draft.dayOfMonth : null,
                startMinute,
                endMinute,
                utcOffsetMinutes,
                label: draft.label.trim() || null,
                vibe: draft.vibe,
                hangoutIntent: draft.hangoutIntent,
            };
        });
        try {
            setSaving(true);
            await onSave(payload);
        }
        catch (error) {
            Alert.alert("Could not save schedule", error instanceof Error ? error.message : "Try that again.");
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs(View, { className: "gap-4", children: [_jsxs(View, { className: "gap-2", children: [_jsx(Text, { className: "font-display text-xl text-cloud", children: "Recurring hang windows" }), _jsx(Text, { className: "font-body text-sm leading-6 text-white/60", children: "Set weekly or monthly windows once, and Nowly will look for mutual time that actually lines up." })] }), drafts.map((draft, index) => (_jsx(GlassCard, { className: "p-5", children: _jsxs(View, { className: "gap-4", children: [_jsxs(View, { className: "flex-row items-start justify-between gap-4", children: [_jsxs(View, { className: "max-w-[72%] gap-1", children: [_jsxs(Text, { className: "font-display text-lg text-cloud", children: ["Window ", index + 1] }), _jsx(Text, { className: "font-body text-sm text-aqua/80", children: draft.recurrence === "WEEKLY" ? "Repeats every week" : "Repeats every month" })] }), _jsx(PillButton, { label: "Remove", variant: "ghost", onPress: () => setDrafts((current) => current.length > 1 ? current.filter((item) => item.id !== draft.id) : current) })] }), _jsxs(View, { className: "gap-2", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: "Repeat" }), _jsx(View, { className: "flex-row gap-2", children: ["WEEKLY", "MONTHLY"].map((option) => (_jsx(SignalChip, { label: option === "WEEKLY" ? "Weekly" : "Monthly", active: draft.recurrence === option, onPress: () => updateDraft(draft.id, {
                                            recurrence: option,
                                            dayOfWeek: option === "WEEKLY" ? draft.dayOfWeek ?? 2 : null,
                                            dayOfMonth: option === "MONTHLY" ? draft.dayOfMonth ?? 15 : null,
                                        }) }, option))) })] }), draft.recurrence === "WEEKLY" ? (_jsxs(View, { className: "gap-2", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: "Day of week" }), _jsx(View, { className: "flex-row flex-wrap gap-2", children: weekdayOptionLabels.map((label, optionIndex) => (_jsx(SignalChip, { label: label, active: draft.dayOfWeek === optionIndex, onPress: () => updateDraft(draft.id, { dayOfWeek: optionIndex }) }, label))) })] })) : (_jsxs(View, { className: "gap-2", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: "Day of month" }), _jsx(TextInput, { value: String(draft.dayOfMonth ?? 15), onChangeText: (value) => updateDraft(draft.id, {
                                        dayOfMonth: value ? Math.max(1, Math.min(31, Number(value))) : 15,
                                    }), keyboardType: "number-pad", className: "rounded-[22px] border border-white/12 bg-white/6 px-4 py-3 font-body text-cloud", placeholder: "15", placeholderTextColor: "rgba(248,250,252,0.35)" })] })), _jsxs(View, { className: "flex-row gap-3", children: [_jsxs(View, { className: "flex-1 gap-2", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: "Start" }), _jsx(TextInput, { value: draft.startInput, onChangeText: (value) => updateDraft(draft.id, { startInput: value }), autoCapitalize: "characters", autoCorrect: false, className: "rounded-[22px] border border-white/12 bg-white/6 px-4 py-3 font-body text-cloud", placeholder: "6:00 PM", placeholderTextColor: "rgba(248,250,252,0.35)" })] }), _jsxs(View, { className: "flex-1 gap-2", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: "End" }), _jsx(TextInput, { value: draft.endInput, onChangeText: (value) => updateDraft(draft.id, { endInput: value }), autoCapitalize: "characters", autoCorrect: false, className: "rounded-[22px] border border-white/12 bg-white/6 px-4 py-3 font-body text-cloud", placeholder: "8:00 PM", placeholderTextColor: "rgba(248,250,252,0.35)" })] })] }), _jsxs(View, { className: "gap-2", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: "Custom mode name" }), _jsx(Text, { className: "font-body text-sm leading-6 text-white/60", children: "Name this window however your life actually works, not just the preset tags." }), _jsx(TextInput, { value: draft.label, onChangeText: (value) => updateDraft(draft.id, { label: value }), className: "rounded-[22px] border border-white/12 bg-white/6 px-4 py-3 font-body text-cloud", placeholder: "After class, Friday reset, Sunday recharge...", placeholderTextColor: "rgba(248,250,252,0.35)" })] }), _jsxs(View, { className: "gap-2", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: "Best for" }), _jsx(View, { className: "flex-row flex-wrap gap-2", children: hangoutIntentOptions.map((option) => (_jsx(SignalChip, { label: hangoutIntentLabel(option), active: draft.hangoutIntent === option, onPress: () => updateDraft(draft.id, {
                                            hangoutIntent: draft.hangoutIntent === option ? null : option,
                                        }) }, option))) })] }), _jsxs(View, { className: "gap-2", children: [_jsx(Text, { className: "font-display text-base text-cloud", children: "Vibe" }), _jsx(View, { className: "flex-row flex-wrap gap-2", children: vibeOptions.map((option) => (_jsx(SignalChip, { label: vibeLabel(option), active: draft.vibe === option, onPress: () => updateDraft(draft.id, {
                                            vibe: draft.vibe === option ? null : option,
                                        }) }, option))) })] }), _jsxs(Text, { className: "font-body text-sm leading-6 text-aqua/80", children: ["Preview:", " ", parseTimeInput(draft.startInput) !== null && parseTimeInput(draft.endInput) !== null
                                    ? `${draft.recurrence === "WEEKLY" ? weekdayOptionLabels[draft.dayOfWeek ?? 0] : `Monthly on the ${formatOrdinalDay(draft.dayOfMonth ?? 15)}`} - ${formatMinutesOfDay(parseTimeInput(draft.startInput) ?? 0)} - ${formatMinutesOfDay(parseTimeInput(draft.endInput) ?? 0)}`
                                    : recurringWindowLabel({
                                        id: draft.id,
                                        recurrence: draft.recurrence,
                                        dayOfWeek: draft.dayOfWeek,
                                        dayOfMonth: draft.dayOfMonth,
                                        startMinute: 18 * 60,
                                        endMinute: 20 * 60,
                                        utcOffsetMinutes: 0,
                                        label: null,
                                        vibe: draft.vibe,
                                        hangoutIntent: draft.hangoutIntent,
                                        createdAt: new Date().toISOString(),
                                    })] })] }) }, draft.id))), _jsxs(View, { className: "flex-row gap-3", children: [_jsx(View, { className: "flex-1", children: _jsx(PillButton, { label: "Add weekly window", variant: "secondary", onPress: () => setDrafts((current) => [...current, createDraftWindow("WEEKLY")]) }) }), _jsx(View, { className: "flex-1", children: _jsx(PillButton, { label: "Add monthly window", variant: "secondary", onPress: () => setDrafts((current) => [...current, createDraftWindow("MONTHLY")]) }) })] }), _jsx(PillButton, { label: saving ? "Saving..." : "Save recurring schedule", onPress: () => void save() })] }));
};
