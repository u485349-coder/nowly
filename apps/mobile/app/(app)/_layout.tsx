import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Tabs } from "expo-router";
import { FloatingNavBar } from "../../components/navigation/FloatingNavBar";
import { nowlyColors } from "../../constants/theme";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const tabIcons: Record<"home" | "friends" | "profile", IconName> = {
  home: "lightning-bolt",
  friends: "account-group",
  profile: "star-four-points",
};

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => (
        <FloatingNavBar
          {...props}
          fabAccentColor={nowlyColors.violet}
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
