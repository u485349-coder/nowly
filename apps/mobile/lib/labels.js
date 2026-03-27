const titleize = (value) => value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
export const availabilityLabel = (value) => value ? titleize(value) : "No live signal";
export const vibeLabel = (value) => value ? titleize(value) : "Any vibe";
export const energyLabel = (value) => ({
    LOW: "low energy",
    MEDIUM: "open energy",
    HIGH: "high energy",
})[value ?? "MEDIUM"];
export const budgetLabel = (value) => ({
    LOW_SPEND: "cheap and easy",
    FLEXIBLE: "flexible spend",
    TREAT_MYSELF: "down to spend",
})[value ?? "FLEXIBLE"];
export const socialBatteryLabel = (value) => ({
    LOW_KEY: "low-key",
    OPEN: "open",
    SOCIAL: "social",
})[value ?? "OPEN"];
export const hangoutIntentLabel = (value) => ({
    QUICK_BITE: "quick bite",
    COFFEE_RUN: "coffee run",
    WALK_NEARBY: "walking nearby",
    STUDY_SPRINT: "study sprint",
    PULL_UP: "pull up",
    WORKOUT: "workout",
    QUICK_CHILL: "quick chill",
})[value ?? "PULL_UP"];
export const microCommitmentLabel = (value) => ({
    DROP_IN: "drop-in",
    QUICK_WINDOW: "quick window",
    OPEN_ENDED: "open-ended",
})[value ?? "DROP_IN"];
export const microResponseLabel = (value) => ({
    PULLING_UP: "pulling up",
    TEN_MIN_ONLY: "10 min only",
    MAYBE_LATER: "maybe later",
    PASS: "pass",
})[value ?? "PULLING_UP"];
export const notificationIntensityLabel = (value) => ({
    QUIET: "quiet",
    BALANCED: "balanced",
    LIVE: "live",
})[value ?? "BALANCED"];
