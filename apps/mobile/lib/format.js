export const formatTime = (value) => new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
});
export const formatDayTime = (value) => new Date(value).toLocaleString([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
});
export const formatTimeRange = (startsAt, endsAt) => `${formatDayTime(startsAt)} - ${new Date(endsAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
})}`;
