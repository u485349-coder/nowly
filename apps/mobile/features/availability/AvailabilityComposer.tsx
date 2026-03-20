import { useState } from "react";
import { Text, View } from "react-native";
import {
  AvailabilityState,
  BudgetMood,
  EnergyLevel,
  hangoutIntentOptions,
  HangoutIntent,
  MobileAvailabilitySignal,
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

export const AvailabilityComposer = ({
  activeSignal,
  onSave,
}: {
  activeSignal: MobileAvailabilitySignal | null;
  onSave: (payload: {
    state: AvailabilityState;
    radiusKm: number;
    vibe?: Vibe | null;
    energyLevel?: EnergyLevel | null;
    budgetMood?: BudgetMood | null;
    socialBattery?: SocialBattery | null;
    hangoutIntent?: HangoutIntent | null;
    durationHours?: number;
  }) => void;
}) => {
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

  const selectedState = stateOptions.find((item) => item.state === state) ?? stateOptions[0];

  return (
    <GlassCard className="p-5">
      <View className="gap-4">
        <View>
          <Text className="font-display text-xl text-cloud">Set your now mode</Text>
          <Text className="mt-1 font-body text-sm text-white/60">
            The goal is not planning better. It is making it obvious when a casual link can
            happen.
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
          label={`Go live for ${selectedState.duration}h`}
          onPress={() =>
            onSave({
              state,
              radiusKm,
              vibe,
              energyLevel,
              budgetMood,
              socialBattery,
              hangoutIntent,
              durationHours: selectedState.duration,
            })
          }
        />
      </View>
    </GlassCard>
  );
};
