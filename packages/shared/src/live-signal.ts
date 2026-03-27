export const signalMeetModes = ["IN_PERSON", "ONLINE", "EITHER"] as const;
export type SignalMeetMode = (typeof signalMeetModes)[number];

export const signalCrowdModes = ["ONE_ON_ONE", "GROUP", "EITHER"] as const;
export type SignalCrowdMode = (typeof signalCrowdModes)[number];

const METADATA_PREFIX = "[[nowly:";
const METADATA_SUFFIX = "]]";

const DEFAULT_MEET_MODE: SignalMeetMode = "IN_PERSON";
const DEFAULT_CROWD_MODE: SignalCrowdMode = "EITHER";

export const onlineVenueSuggestions = [
  "Discord",
  "Reddit",
  "Roblox",
  "Instagram",
  "FaceTime",
] as const;

const isSignalMeetMode = (value: string): value is SignalMeetMode =>
  signalMeetModes.includes(value as SignalMeetMode);

const isSignalCrowdMode = (value: string): value is SignalCrowdMode =>
  signalCrowdModes.includes(value as SignalCrowdMode);

export const normalizeOnlineVenue = (value?: string | null) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, 32);
};

export const encodeSignalLabelMetadata = (
  displayLabel: string | null | undefined,
  metadata?: {
    meetMode?: SignalMeetMode;
    crowdMode?: SignalCrowdMode;
    onlineVenue?: string | null;
  },
) => {
  const trimmedDisplay = displayLabel?.trim() || "";
  const meetMode = metadata?.meetMode ?? DEFAULT_MEET_MODE;
  const crowdMode = metadata?.crowdMode ?? DEFAULT_CROWD_MODE;
  const onlineVenue = normalizeOnlineVenue(metadata?.onlineVenue);
  const needsMetadata =
    meetMode !== DEFAULT_MEET_MODE ||
    crowdMode !== DEFAULT_CROWD_MODE ||
    Boolean(onlineVenue);

  if (!needsMetadata) {
    return trimmedDisplay || null;
  }

  const payload = [meetMode, crowdMode, encodeURIComponent(onlineVenue ?? "")].join("|");
  return `${trimmedDisplay}${trimmedDisplay ? " " : ""}${METADATA_PREFIX}${payload}${METADATA_SUFFIX}`;
};

export const parseSignalLabelMetadata = (rawLabel?: string | null) => {
  const trimmedRaw = rawLabel?.trim() || "";

  if (!trimmedRaw) {
    return {
      rawLabel: rawLabel ?? null,
      label: null,
      meetMode: DEFAULT_MEET_MODE,
      crowdMode: DEFAULT_CROWD_MODE,
      onlineVenue: null,
    };
  }

  const metadataStart = trimmedRaw.lastIndexOf(METADATA_PREFIX);
  const hasMetadata =
    metadataStart >= 0 &&
    trimmedRaw.endsWith(METADATA_SUFFIX) &&
    metadataStart < trimmedRaw.length;

  if (!hasMetadata) {
    return {
      rawLabel,
      label: trimmedRaw,
      meetMode: DEFAULT_MEET_MODE,
      crowdMode: DEFAULT_CROWD_MODE,
      onlineVenue: null,
    };
  }

  const displayLabel = trimmedRaw.slice(0, metadataStart).trim() || null;
  const metadataPayload = trimmedRaw.slice(
    metadataStart + METADATA_PREFIX.length,
    trimmedRaw.length - METADATA_SUFFIX.length,
  );
  const [meetModeRaw, crowdModeRaw, onlineVenueRaw] = metadataPayload.split("|");

  return {
    rawLabel,
    label: displayLabel,
    meetMode: isSignalMeetMode(meetModeRaw) ? meetModeRaw : DEFAULT_MEET_MODE,
    crowdMode: isSignalCrowdMode(crowdModeRaw) ? crowdModeRaw : DEFAULT_CROWD_MODE,
    onlineVenue: normalizeOnlineVenue(
      onlineVenueRaw ? decodeURIComponent(onlineVenueRaw) : null,
    ),
  };
};

export const signalSupportsInPerson = (meetMode?: SignalMeetMode | null) =>
  (meetMode ?? DEFAULT_MEET_MODE) !== "ONLINE";

export const signalSupportsOnline = (meetMode?: SignalMeetMode | null) =>
  (meetMode ?? DEFAULT_MEET_MODE) !== "IN_PERSON";

export const crowdModesAreCompatible = (
  left?: SignalCrowdMode | null,
  right?: SignalCrowdMode | null,
) => {
  const resolvedLeft = left ?? DEFAULT_CROWD_MODE;
  const resolvedRight = right ?? DEFAULT_CROWD_MODE;

  if (resolvedLeft === "EITHER" || resolvedRight === "EITHER") {
    return true;
  }

  return resolvedLeft === resolvedRight;
};

export const isOnlineLocationName = (value?: string | null) => {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized) {
    return false;
  }

  return [
    "online",
    "discord",
    "reddit",
    "roblox",
    "instagram",
    "facetime",
    "zoom",
    "google meet",
    "call",
    "vc",
  ].some((token) => normalized.includes(token));
};
