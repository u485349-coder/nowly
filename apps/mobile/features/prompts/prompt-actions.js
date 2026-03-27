export const promptActions = [
    {
        key: "quick-link",
        label: "Quick link",
        detail: "pull up for a bit - 10 min only",
        activity: "pull up for a bit",
        microType: "PULL_UP",
        commitmentLevel: "DROP_IN",
    },
    {
        key: "quick-bite",
        label: "Quick bite",
        detail: "clean yes - easy exit window",
        activity: "grab a quick bite",
        microType: "QUICK_BITE",
        commitmentLevel: "QUICK_WINDOW",
    },
    {
        key: "coffee-run",
        label: "Coffee run",
        detail: "short reset - low lift",
        activity: "coffee run",
        microType: "COFFEE_RUN",
        commitmentLevel: "QUICK_WINDOW",
    },
    {
        key: "walk-nearby",
        label: "Walk nearby",
        detail: "minimal pressure - close by",
        activity: "walk nearby",
        microType: "WALK_NEARBY",
        commitmentLevel: "DROP_IN",
    },
    {
        key: "custom-prompt",
        label: "Custom prompt",
        detail: "write your own casual nudge",
        activity: "hang out",
        microType: "QUICK_CHILL",
        commitmentLevel: "OPEN_ENDED",
    },
];
export const findPromptAction = (promptKey) => {
    const key = Array.isArray(promptKey) ? promptKey[0] : promptKey;
    return promptActions.find((prompt) => prompt.key === key) ?? null;
};
