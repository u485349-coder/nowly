import { useEffect, useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import {
  AvailabilityState,
  BudgetMood,
  encodeSignalLabelMetadata,
  EnergyLevel,
  hangoutIntentOptions,
  HangoutIntent,
  MobileAvailabilitySignal,
  onlineVenueSuggestions,
  SignalCrowdMode,
  signalCrowdModes,
  SignalMeetMode,
  signalMeetModes,
  SocialBattery,
  Vibe,
} from "@nowly/shared";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { SignalChip } from "../../components/ui/SignalChip";
import {
  budgetLabel,
  energyLabel,
  hangoutIntentLabel,
  socialBatteryLabel,
  vibeLabel,
} from "../../lib/labels";

const stateOptions: Array<{
  state: AvailabilityState;
  label: string;
  hint: string;
  duration: number;
}> = [
  { state: "FREE_NOW", label: "Free now", hint: "Quick plan, low friction", duration: 3 },
  { state: "FREE_LATER", label: "Free later", hint: "Later today works", duration: 6 },
  { state: "BUSY", label: "Busy", hint: "Quiet the pings", duration: 4 },
  { state: "DOWN_THIS_WEEKEND", label: "Weekend", hint: "Open to a bigger plan", duration: 48 },
];

const vibeOptions: Vibe[] = ["FOOD", "GYM", "CHILL", "PARTY", "COFFEE", "OUTDOORS"];
const radiusOptions = [3, 8, 15];
const energyOptions: EnergyLevel[] = ["LOW", "MEDIUM", "HIGH"];
const batteryOptions: SocialBattery[] = ["LOW_KEY", "OPEN", "SOCIAL"];
const budgetOptions: BudgetMood[] = ["LOW_SPEND", "FLEXIBLE", "TREAT_MYSELF"];
const durationOptions = [0.5, 1, 2, 3, 6, 12, 24, 48];

const meetModeLabels: Record<SignalMeetMode, string> = {
  IN_PERSON: "In person",
  ONLINE: "Online",
  EITHER: "Either",
};

const crowdModeLabels: Record<SignalCrowdMode, string> = {
  ONE_ON_ONE: "1:1",
  GROUP: "Group",
  EITHER: "Either",
};

const clampDurationHours = (value: number) => Math.max(0.25, Math.min(72, value));

const parseDurationInput = (value: string) => {
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

const formatDurationInput = (value: number) => {
  if (value < 1) {
    return `${Math.round(value * 60)}m`;
  }

  if (Number.isInteger(value)) {
    return `${value}h`;
  }

  return `${value.toFixed(2).replace(/\.?0+$/, "")}h`;
};

export const AvailabilityComposer = ({
  activeSignal,
  defaultLocationLabel,
  onSave,
  signalPreferences,
  onSignalPreferencesChange,
}: {
  activeSignal: MobileAvailabilitySignal | null;
  defaultLocationLabel?: string | null;
  onSave: (payload: {
    state: AvailabilityState;
    radiusKm: number;
    showLocation?: boolean;
    locationLabel?: string | null;
    vibe?: Vibe | null;
    energyLevel?: EnergyLevel | null;
    budgetMood?: BudgetMood | null;
    socialBattery?: SocialBattery | null;
    hangoutIntent?: HangoutIntent | null;
    label?: string | null;
    durationHours?: number;
  }) => void;
  signalPreferences: {
    showLocation: boolean;
    locationLabel: string;
  };
  onSignalPreferencesChange: (payload: {
    showLocation?: boolean;
    locationLabel?: string;
  }) => void;
}) => {
  const estimateDuration = (signal: MobileAvailabilitySignal | null, fallback: number) => {
    if (!signal) {
      return fallback;
    }

    const diffHours =
      (new Date(signal.expiresAt).getTime() - Date.now()) / (60 * 60 * 1000);

    return clampDurationHours(Math.max(0.25, Math.round(diffHours * 4) / 4));
  };

  const initialState =
    stateOptions.find((item) => item.state === activeSignal?.state) ?? stateOptions[0];
  const [state, setState] = useState<AvailabilityState>(initialState.state);
  const [radiusKm, setRadiusKm] = useState(activeSignal?.radiusKm ?? 8);
  const [vibe, setVibe] = useState<Vibe | null>(activeSignal?.vibe ?? "COFFEE");
  const [hangoutIntent, setHangoutIntent] = useState<HangoutIntent | null>(
    activeSignal?.hangoutIntent ?? "PULL_UP",
  );
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | null>(
    activeSignal?.energyLevel ?? "MEDIUM",
  );
  const [socialBattery, setSocialBattery] = useState<SocialBattery | null>(
    activeSignal?.socialBattery ?? "OPEN",
  );
  const [budgetMood, setBudgetMood] = useState<BudgetMood | null>(
    activeSignal?.budgetMood ?? "LOW_SPEND",
  );
  const [label, setLabel] = useState(activeSignal?.label ?? "");
  const [showLocation, setShowLocation] = useState(signalPreferences.showLocation);
  const [locationLabel, setLocationLabel] = useState(signalPreferences.locationLabel);
  const [durationHours, setDurationHours] = useState(
    estimateDuration(activeSignal, initialState.duration),
  );
  const [durationInput, setDurationInput] = useState(
    formatDurationInput(estimateDuration(activeSignal, initialState.duration)),
  );
  const [meetMode, setMeetMode] = useState<SignalMeetMode>(
    activeSignal?.meetMode ?? "IN_PERSON",
  );
  const [crowdMode, setCrowdMode] = useState<SignalCrowdMode>(
    activeSignal?.crowdMode ?? "EITHER",
  );
  const [onlineVenue, setOnlineVenue] = useState(activeSignal?.onlineVenue ?? "");

  useEffect(() => {
    const nextState =
      stateOptions.find((item) => item.state === activeSignal?.state) ?? stateOptions[0];
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

  const selectedState = useMemo(
    () => stateOptions.find((item) => item.state === state) ?? stateOptions[0],
    [state],
  );
  const durationSummary = useMemo(
    () => formatDurationInput(durationHours),
    [durationHours],
  );

  return (
    <GlassCard className="p-5">
      <View className="gap-4">
        <View>
          <Text className="font-display text-xl text-cloud">Now mode setup</Text>
          <Text className="mt-1 font-body text-sm text-white/60">
            Tune the live signal, then let Nowly line up the right kind of overlap.
          </Text>
        </View>

        <View className="gap-3">
          {stateOptions.map((option) => (
            <SignalChip
              key={option.state}
              label={`${option.label} - ${option.hint}`}
              active={option.state === state}
              onPress={() => setState(option.state)}
            />
          ))}
        </View>

        <View className="gap-2">
          <Text className="font-display text-base text-cloud">Signal line</Text>
          <Text className="font-body text-sm leading-6 text-white/60">
            Give the moment a simple line your friends can instantly understand.
          </Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            className="rounded-[22px] border border-white/12 bg-white/6 px-4 py-3 font-body text-cloud"
            placeholder="After class coffee, late-night VC, study break..."
            placeholderTextColor="rgba(248,250,252,0.35)"
          />
        </View>

        <View className="gap-2">
          <Text className="font-display text-base text-cloud">Meet style</Text>
          <View className="flex-row flex-wrap gap-2">
            {signalMeetModes.map((option) => (
              <SignalChip
                key={option}
                label={meetModeLabels[option]}
                active={meetMode === option}
                onPress={() => setMeetMode(option)}
              />
            ))}
          </View>
          <Text className="font-body text-sm text-aqua/80">
            In-person prefers nearby hangs. Online skips distance and works for Discord, Reddit,
            Roblox, and other digital spots.
          </Text>
        </View>

        <View className="gap-2">
          <Text className="font-display text-base text-cloud">Crowd style</Text>
          <View className="flex-row flex-wrap gap-2">
            {signalCrowdModes.map((option) => (
              <SignalChip
                key={option}
                label={crowdModeLabels[option]}
                active={crowdMode === option}
                onPress={() => setCrowdMode(option)}
              />
            ))}
          </View>
        </View>

        {meetMode !== "IN_PERSON" ? (
          <View className="gap-2">
            <Text className="font-display text-base text-cloud">Online spot</Text>
            <Text className="font-body text-sm leading-6 text-white/60">
              Add the platform if this hang could happen online.
            </Text>
            <TextInput
              value={onlineVenue}
              onChangeText={setOnlineVenue}
              className="rounded-[22px] border border-white/12 bg-white/6 px-4 py-3 font-body text-cloud"
              placeholder="Discord, Reddit, Roblox..."
              placeholderTextColor="rgba(248,250,252,0.35)"
            />
            <View className="flex-row flex-wrap gap-2">
              {onlineVenueSuggestions.map((option) => (
                <SignalChip
                  key={option}
                  label={option}
                  active={onlineVenue.trim().toLowerCase() === option.toLowerCase()}
                  onPress={() => setOnlineVenue(option)}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View className="gap-2">
          <Text className="font-display text-base text-cloud">Go live for</Text>
          <View className="flex-row flex-wrap gap-2">
            {durationOptions.map((hours) => (
              <SignalChip
                key={hours}
                label={formatDurationInput(hours)}
                active={durationHours === hours}
                onPress={() => {
                  setDurationHours(hours);
                  setDurationInput(formatDurationInput(hours));
                }}
              />
            ))}
          </View>
          <TextInput
            value={durationInput}
            onChangeText={(value) => {
              setDurationInput(value);
              const nextDuration = parseDurationInput(value);
              if (nextDuration !== null) {
                setDurationHours(nextDuration);
              }
            }}
            className="rounded-[22px] border border-white/12 bg-white/6 px-4 py-3 font-body text-cloud"
            placeholder="Custom duration: 45m, 1.5h, 4h..."
            placeholderTextColor="rgba(248,250,252,0.35)"
          />
          <Text className="font-body text-sm text-aqua/80">
            {selectedState.label} is just the preset mood. The live timer is fully yours.
          </Text>
        </View>

        {meetMode !== "ONLINE" ? (
          <View className="gap-2">
            <Text className="font-display text-base text-cloud">Location sharing</Text>
            <Text className="font-body text-sm leading-6 text-white/60">
              Let friends know where to catch you when your signal goes live.
            </Text>
            <View className="flex-row gap-2">
              <SignalChip
                label="Hide spot"
                active={!showLocation}
                onPress={() => {
                  setShowLocation(false);
                  onSignalPreferencesChange({ showLocation: false });
                }}
              />
              <SignalChip
                label="Show area"
                active={showLocation}
                onPress={() => {
                  setShowLocation(true);
                  onSignalPreferencesChange({ showLocation: true });
                }}
              />
            </View>
            {showLocation ? (
              <>
                <TextInput
                  value={locationLabel}
                  onChangeText={(nextValue) => {
                    setLocationLabel(nextValue);
                    onSignalPreferencesChange({ locationLabel: nextValue });
                  }}
                  className="rounded-[22px] border border-white/12 bg-white/6 px-4 py-3 font-body text-cloud"
                  placeholder={defaultLocationLabel ?? "Near campus, downtown, west side..."}
                  placeholderTextColor="rgba(248,250,252,0.35)"
                />
                <Text className="font-body text-sm text-aqua/80">
                  This area label can ride with the live alert and overlap copy.
                </Text>
              </>
            ) : null}
          </View>
        ) : (
          <Text className="font-body text-sm text-aqua/80">
            Online mode skips physical distance, so your platform matters more than your radius.
          </Text>
        )}

        {meetMode !== "ONLINE" ? (
          <View className="gap-2">
            <Text className="font-display text-base text-cloud">Radius</Text>
            <View className="flex-row gap-2">
              {radiusOptions.map((radius) => (
                <SignalChip
                  key={radius}
                  label={`${radius} km`}
                  active={radiusKm === radius}
                  onPress={() => setRadiusKm(radius)}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View className="gap-2">
          <Text className="font-display text-base text-cloud">Intent</Text>
          <View className="flex-row flex-wrap gap-2">
            {hangoutIntentOptions.map((option) => (
              <SignalChip
                key={option}
                label={hangoutIntentLabel(option)}
                active={hangoutIntent === option}
                onPress={() => setHangoutIntent(option)}
              />
            ))}
          </View>
        </View>

        <View className="gap-2">
          <Text className="font-display text-base text-cloud">Vibe</Text>
          <View className="flex-row flex-wrap gap-2">
            {vibeOptions.map((option) => (
              <SignalChip
                key={option}
                label={vibeLabel(option)}
                active={vibe === option}
                onPress={() => setVibe(option)}
              />
            ))}
          </View>
        </View>

        <View className="gap-2">
          <Text className="font-display text-base text-cloud">Energy</Text>
          <View className="flex-row gap-2">
            {energyOptions.map((option) => (
              <SignalChip
                key={option}
                label={energyLabel(option)}
                active={energyLevel === option}
                onPress={() => setEnergyLevel(option)}
              />
            ))}
          </View>
        </View>

        <View className="gap-2">
          <Text className="font-display text-base text-cloud">Social battery</Text>
          <View className="flex-row gap-2">
            {batteryOptions.map((option) => (
              <SignalChip
                key={option}
                label={socialBatteryLabel(option)}
                active={socialBattery === option}
                onPress={() => setSocialBattery(option)}
              />
            ))}
          </View>
        </View>

        <View className="gap-2">
          <Text className="font-display text-base text-cloud">Spend mood</Text>
          <View className="flex-row flex-wrap gap-2">
            {budgetOptions.map((option) => (
              <SignalChip
                key={option}
                label={budgetLabel(option)}
                active={budgetMood === option}
                onPress={() => setBudgetMood(option)}
              />
            ))}
          </View>
        </View>

        <PillButton
          label={`Go live for ${durationSummary}`}
          onPress={() =>
            onSave({
              state,
              label: encodeSignalLabelMetadata(label.trim() || null, {
                meetMode,
                crowdMode,
                onlineVenue,
              }),
              radiusKm,
              showLocation: meetMode === "ONLINE" ? false : showLocation,
              locationLabel:
                meetMode === "ONLINE"
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
            })
          }
        />
      </View>
    </GlassCard>
  );
};
