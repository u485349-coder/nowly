const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const formatOrdinalDay = (day) => {
    const remainder = day % 10;
    const teen = day % 100;
    if (teen >= 11 && teen <= 13) {
        return `${day}th`;
    }
    if (remainder === 1) {
        return `${day}st`;
    }
    if (remainder === 2) {
        return `${day}nd`;
    }
    if (remainder === 3) {
        return `${day}rd`;
    }
    return `${day}th`;
};
export const formatMinutesOfDay = (minutes) => {
    const normalizedHours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const suffix = normalizedHours >= 12 ? "PM" : "AM";
    const hours12 = ((normalizedHours + 11) % 12) + 1;
    return `${hours12}:${String(mins).padStart(2, "0")} ${suffix}`;
};
export const toTimeInputValue = (minutes) => {
    return formatMinutesOfDay(minutes);
};
export const parseTimeInput = (value) => {
    const normalized = value.trim().replace(/\./g, "").replace(/\s+/g, " ");
    const twelveHourMatch = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*([AaPp])[Mm]?$/);
    if (twelveHourMatch) {
        const hours = Number(twelveHourMatch[1]);
        const minutes = Number(twelveHourMatch[2] ?? "0");
        const meridiem = twelveHourMatch[3].toUpperCase();
        if (Number.isNaN(hours) ||
            Number.isNaN(minutes) ||
            hours < 1 ||
            hours > 12 ||
            minutes < 0 ||
            minutes > 59) {
            return null;
        }
        const normalizedHours = hours % 12 + (meridiem === "P" ? 12 : 0);
        return normalizedHours * 60 + minutes;
    }
    const twentyFourHourMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
    if (!twentyFourHourMatch) {
        return null;
    }
    const hours = Number(twentyFourHourMatch[1]);
    const minutes = Number(twentyFourHourMatch[2]);
    if (Number.isNaN(hours) ||
        Number.isNaN(minutes) ||
        hours < 0 ||
        hours > 23 ||
        minutes < 0 ||
        minutes > 59) {
        return null;
    }
    return hours * 60 + minutes;
};
export const recurringWindowLabel = (window) => {
    const dayLabel = window.recurrence === "WEEKLY"
        ? weekdayLabels[window.dayOfWeek ?? 0]
        : `Monthly on the ${formatOrdinalDay(window.dayOfMonth ?? 15)}`;
    return `${dayLabel} - ${formatMinutesOfDay(window.startMinute)} to ${formatMinutesOfDay(window.endMinute)}`;
};
export const weekdayOptionLabels = weekdayLabels;
