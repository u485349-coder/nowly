import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "../../../components/primitives/AppText";
import { colors, radii, spacing } from "../../../theme";

type CalendarCell = {
  key: string;
  dayNumber: number | null;
  available: boolean;
  active: boolean;
  recommended?: boolean;
  onPress?: () => void;
};

type Props = {
  monthLabel: string;
  weekdayLabels: readonly string[];
  cells: CalendarCell[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  disablePrev?: boolean;
  disableNext?: boolean;
};

export const MonthCalendar = ({
  monthLabel,
  weekdayLabels,
  cells,
  onPrevMonth,
  onNextMonth,
  disablePrev = false,
  disableNext = false,
}: Props) => {
  return (
    <View style={styles.root}>
      <View style={styles.monthRow}>
        <Pressable disabled={disablePrev} accessibilityRole="button" onPress={onPrevMonth} style={({ pressed }) => [styles.monthAction, disablePrev ? styles.disabled : null, pressed && !disablePrev ? styles.pressed : null]}>
          <MaterialCommunityIcons name="chevron-left" size={18} color={colors.cloud} />
        </Pressable>
        <AppText variant="h3">{monthLabel}</AppText>
        <Pressable disabled={disableNext} accessibilityRole="button" onPress={onNextMonth} style={({ pressed }) => [styles.monthAction, disableNext ? styles.disabled : null, pressed && !disableNext ? styles.pressed : null]}>
          <MaterialCommunityIcons name="chevron-right" size={18} color={colors.cloud} />
        </Pressable>
      </View>

      <View style={styles.weekHeader}>
        {weekdayLabels.map((label) => (
          <AppText key={label} variant="bodySmall" color={colors.muted} style={styles.weekdayText}>
            {label}
          </AppText>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell) => (
          <Pressable
            key={cell.key}
            disabled={!cell.available}
            accessibilityRole={cell.available ? "button" : undefined}
            onPress={cell.onPress}
            style={({ pressed }) => [
              styles.cell,
              cell.active ? styles.cellActive : null,
              !cell.available ? styles.cellUnavailable : null,
              pressed && cell.available ? styles.pressed : null,
            ]}
          >
            <AppText
              variant="bodySmall"
              color={cell.active ? colors.ink : cell.available ? colors.cloud : "rgba(247,251,255,0.36)"}
              style={cell.active ? styles.activeText : undefined}
            >
              {cell.dayNumber ?? ""}
            </AppText>
            {cell.recommended ? <View style={[styles.dot, cell.active ? styles.dotActive : null]} /> : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    gap: spacing[14],
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[12],
  },
  monthAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  weekHeader: {
    flexDirection: "row",
    gap: spacing[8],
  },
  weekdayText: {
    flex: 1,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[8],
  },
  cell: {
    width: "13.2%",
    aspectRatio: 1,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    position: "relative",
  },
  cellActive: {
    backgroundColor: colors.aqua,
  },
  cellUnavailable: {
    backgroundColor: "transparent",
  },
  activeText: {
    fontFamily: "SpaceGrotesk_700Bold",
  },
  dot: {
    position: "absolute",
    bottom: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.violet,
  },
  dotActive: {
    backgroundColor: colors.ink,
  },
  disabled: {
    opacity: 0.38,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
});
