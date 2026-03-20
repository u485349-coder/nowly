export const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

export const formatDayTime = (value: string) =>
  new Date(value).toLocaleString([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });

export const formatTimeRange = (startsAt: string, endsAt: string) =>
  `${formatDayTime(startsAt)} - ${new Date(endsAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
