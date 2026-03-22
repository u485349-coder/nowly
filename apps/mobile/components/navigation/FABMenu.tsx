import type { ComponentProps } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { nowlyColors } from "../../constants/theme";
import { webPressableStyle } from "../../lib/web-pressable";
const isWeb = Platform.OS === "web";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export type FloatingFabAction = {
  id: string;
  icon: IconName;
  label?: string;
  accessibilityLabel?: string;
  accentColor?: string;
  onPress: () => void;
};

type FABMenuProps = {
  bottom: number;
  progress: SharedValue<number>;
  open: boolean;
  actions: FloatingFabAction[];
  onActionPress: (action: FloatingFabAction) => void;
  accentColor?: string;
  labelPosition?: "left" | "right";
};

const MenuItem = ({
  action,
  accentColor,
  index,
  labelPosition,
  onActionPress,
  progress,
}: {
  action: FloatingFabAction;
  accentColor: string;
  index: number;
  labelPosition: "left" | "right";
  onActionPress: (action: FloatingFabAction) => void;
  progress: SharedValue<number>;
}) => {
  const itemStyle = useAnimatedStyle(() => {
    const start = index * 0.12;
    const itemProgress = Math.max(
      0,
      Math.min(1, (progress.value - start) / Math.max(0.01, 1 - start)),
    );

    return {
      opacity: itemProgress,
      transform: [
        {
          translateY: interpolate(
            itemProgress,
            [0, 1],
            [14, -((index + 1) * 72)],
            Extrapolation.CLAMP,
          ),
        },
        {
          translateX: interpolate(itemProgress, [0, 1], [6, 0], Extrapolation.CLAMP),
        },
        {
          scale: interpolate(itemProgress, [0, 1], [0.9, 1], Extrapolation.CLAMP),
        },
      ],
    };
  });

  return (
    <Animated.View style={[styles.itemWrap, itemStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action.accessibilityLabel ?? action.label}
        onPress={() => onActionPress(action)}
        style={({ pressed }) => [
          styles.actionPressable,
          labelPosition === "right" ? styles.actionPressableRight : null,
          isWeb ? webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.99 }) : null,
        ]}
      >
        {action.label && labelPosition === "left" ? (
          <View style={styles.labelPill}>
            <Text style={styles.labelText}>{action.label}</Text>
          </View>
        ) : null}
        <View
          style={[
            styles.miniFab,
            {
              borderColor: `${action.accentColor ?? accentColor}26`,
              shadowColor: action.accentColor ?? accentColor,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={action.icon}
            size={20}
            color={nowlyColors.cloud}
          />
        </View>
        {action.label && labelPosition === "right" ? (
          <View style={styles.labelPill}>
            <Text style={styles.labelText}>{action.label}</Text>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
};

export const FABMenu = ({
  bottom,
  progress,
  open,
  actions,
  onActionPress,
  accentColor = nowlyColors.violet,
  labelPosition = "left",
}: FABMenuProps) => {
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(progress.value, [0, 1], [0.86, 1.02], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <View
      pointerEvents={open ? "box-none" : "none"}
      style={[
        styles.menuRoot,
        {
          bottom,
          marginLeft: -120,
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.backdropGlow,
          backdropStyle,
          {
            backgroundColor: accentColor,
          },
        ]}
      />
      {actions.map((action, index) => (
        <MenuItem
          key={action.id}
          action={action}
          accentColor={accentColor}
          index={index}
          labelPosition={labelPosition}
          onActionPress={onActionPress}
          progress={progress}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  menuRoot: {
    position: "absolute",
    left: "50%",
    width: 280,
    height: 320,
    zIndex: 24,
    alignItems: "center",
  },
  backdropGlow: {
    position: "absolute",
    bottom: 0,
    width: 156,
    height: 156,
    borderRadius: 999,
    opacity: 0.16,
  },
  itemWrap: {
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
  },
  actionPressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionPressableRight: {
    flexDirection: "row-reverse",
  },
  labelPill: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: "rgba(8,15,28,0.82)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  labelText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 13,
  },
  miniFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,15,28,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 0,
  },
});
