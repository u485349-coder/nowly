import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { colors, radii, spacing } from "../../../theme";
import { AppText } from "../../../components/primitives/AppText";

type EnergyOption = {
  key: string;
  label: string;
  description: string;
};

type Props = {
  options: EnergyOption[];
  selectedKey: string;
  onChange: (key: string) => void;
};

const THUMB_SIZE = 28;

export const EnergySlider = ({ options, selectedKey, onChange }: Props) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const selectedIndex = useMemo(() => {
    const index = options.findIndex((option) => option.key === selectedKey);
    return index >= 0 ? index : 0;
  }, [options, selectedKey]);

  const activeIndex = previewIndex ?? selectedIndex;
  const activeOption = options[activeIndex] ?? options[0];
  const progress = options.length > 1 ? activeIndex / (options.length - 1) : 0;
  const thumbTravel = Math.max(trackWidth - THUMB_SIZE, 0);
  const thumbLeft = progress * thumbTravel;

  const movePreview = (locationX: number) => {
    if (!trackWidth || !options.length) {
      return;
    }

    const clamped = Math.max(0, Math.min(locationX, trackWidth));
    const nextIndex = Math.round((clamped / trackWidth) * (options.length - 1));
    setPreviewIndex(nextIndex);
  };

  const commit = (locationX?: number) => {
    if (typeof locationX === "number") {
      movePreview(locationX);
    }

    const nextIndex = previewIndex ?? selectedIndex;
    setPreviewIndex(null);
    onChange(options[nextIndex]?.key ?? options[0]?.key ?? "");
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <AppText variant="h3">{activeOption.label} energy</AppText>
        <AppText variant="bodySmall" color={colors.muted}>
          {activeOption.description}
        </AppText>
      </View>

      <View
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(event) => movePreview(event.nativeEvent.locationX)}
        onResponderMove={(event) => movePreview(event.nativeEvent.locationX)}
        onResponderRelease={(event) => commit(event.nativeEvent.locationX)}
        onResponderTerminate={() => commit()}
        onStartShouldSetResponder={() => true}
        style={styles.slider}
      >
        <View style={styles.track} />
        <View style={[styles.fill, { width: THUMB_SIZE + thumbLeft }]} />
        <View style={[styles.thumb, { left: thumbLeft }]}>
          <View style={styles.thumbCore} />
        </View>
      </View>

      <View style={styles.optionRow}>
        {options.map((option) => {
          const selected = option.key === selectedKey;
          return (
            <Pressable
              key={option.key}
              accessibilityRole="button"
              onPress={() => onChange(option.key)}
              style={({ pressed }) => [
                styles.optionChip,
                selected ? styles.optionChipSelected : null,
                pressed ? styles.optionChipPressed : null,
              ]}
            >
              <AppText variant="label" color={selected ? colors.ink : colors.cloud}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    gap: spacing[16],
  },
  header: {
    gap: spacing[8],
  },
  slider: {
    minHeight: 42,
    justifyContent: "center",
  },
  track: {
    height: 12,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  fill: {
    position: "absolute",
    left: 0,
    height: 12,
    borderRadius: radii.pill,
    backgroundColor: "rgba(139,234,255,0.52)",
  },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cloud,
    shadowColor: colors.aqua,
    shadowOpacity: 0.26,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  thumbCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.ink,
  },
  optionRow: {
    flexDirection: "row",
    gap: spacing[8],
  },
  optionChip: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: spacing[12],
  },
  optionChipSelected: {
    backgroundColor: colors.aqua,
    borderColor: "rgba(255,255,255,0.18)",
  },
  optionChipPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
});
