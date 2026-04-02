import { BlurView } from "expo-blur";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, layout, radii, spacing } from "../../theme";
import { AppText } from "../primitives/AppText";
import { Badge } from "../primitives/Badge";
import { CenterOrb } from "./CenterOrb";

type Props = BottomTabBarProps & {
  badges?: Partial<Record<string, number>>;
  onFabPress: () => void;
};

export const BottomNav = ({ state, descriptors, navigation, badges, onFabPress }: Props) => {
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <BlurView intensity={28} tint="dark" style={[styles.shell, { bottom: insets.bottom + spacing[16] }]}>
        <View style={styles.inner}>
          {state.routes.map((route, index) => {
            const descriptor = descriptors[route.key];
            const label =
              typeof descriptor.options.title === "string"
                ? descriptor.options.title
                : route.name;
            const isFocused = state.index === index;
            const iconName =
              route.name === "home"
                ? "lightning-bolt"
                : route.name === "friends"
                  ? "account-group"
                  : "star-four-points";
            const badgeValue = badges?.[route.name];

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                onPress={() => {
                  const event = navigation.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });

                  if (!isFocused && !event.defaultPrevented) {
                    navigation.navigate(route.name, route.params);
                  }
                }}
                style={({ pressed }) => [styles.item, pressed ? styles.itemPressed : null]}
              >
                <View style={styles.iconWrap}>
                  <MaterialCommunityIcons
                    name={iconName}
                    size={22}
                    color={isFocused ? colors.cloud : "rgba(247,251,255,0.54)"}
                  />
                  {badgeValue ? <Badge value={badgeValue > 99 ? "99+" : badgeValue} style={styles.badge} /> : null}
                </View>
                <AppText variant="label" color={isFocused ? colors.cloud : "rgba(247,251,255,0.54)"}>
                  {label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <CenterOrb onPress={onFabPress} />
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  shell: {
    position: "absolute",
    left: spacing[16],
    right: spacing[16],
    alignSelf: "center",
    maxWidth: layout.mobileBottomNavWidth,
    borderRadius: radii.xl,
    overflow: "visible",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(9,13,34,0.78)",
  },
  inner: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[20],
    paddingVertical: spacing[12],
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[4],
  },
  itemPressed: {
    opacity: 0.92,
  },
  iconWrap: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -8,
    right: -14,
  },
});
