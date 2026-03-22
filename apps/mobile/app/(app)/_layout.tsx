import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useMemo } from "react";
import { Tabs, useRouter } from "expo-router";
import { FloatingNavBar } from "../../components/navigation/FloatingNavBar";
import type { FloatingFabAction } from "../../components/navigation/FABMenu";
import { nowlyColors } from "../../constants/theme";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const tabIcons: Record<"home" | "friends" | "profile", IconName> = {
  home: "lightning-bolt-circle",
  friends: "account-group",
  profile: "star-four-points",
};

export default function AppLayout() {
  const router = useRouter();
  const fabActions = useMemo<FloatingFabAction[]>(
    () => [
      {
        id: "new-hangout",
        icon: "lightning-bolt",
        label: "Start a signal",
        onPress: () => router.push("/prompt/quick-link"),
      },
      {
        id: "now-mode",
        icon: "calendar-clock-outline",
        label: "Find a time",
        onPress: () => router.push("/now-mode"),
      },
      {
        id: "invite-crew",
        icon: "account-plus-outline",
        label: "Invite crew",
        onPress: () => router.push("/friends"),
      },
    ],
    [router],
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => (
        <FloatingNavBar
          {...props}
          actions={fabActions}
          fabAccentColor={nowlyColors.aqua}
          fabIcon="lightning-bolt"
          icons={tabIcons}
        />
      )}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Now",
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Crew",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "You",
        }}
      />
    </Tabs>
  );
}
