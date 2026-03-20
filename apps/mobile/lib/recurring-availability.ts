import type { MobileRecurringAvailabilityWindow } from "@nowly/shared";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const formatMinutesOfDay = (minutes: number) => {
  const normalizedHours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const suffix = normalizedHours >= 12 ? "PM" : "AM";
  const hours12 = ((normalizedHours + 11) % 12) + 1;

  return `${hours12}:${String(mins).padStart(2, "0")} ${suffix}`;
};

export const toTimeInputValue = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

export const parseTimeInput = (value: string) => {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
};

export const recurringWindowLabel = (window: MobileRecurringAvailabilityWindow) => {
  const dayLabel =
    window.recurrence === "WEEKLY"
      ? weekdayLabels[window.dayOfWeek ?? 0]
      : `Monthly ${window.dayOfMonth}`;

  return `${dayLabel} - ${formatMinutesOfDay(window.startMinute)} to ${formatMinutesOfDay(window.endMinute)}`;
};

export const weekdayOptionLabels = weekdayLabels;
