import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Tabs, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import { FloatingNavBar } from "../../components/navigation/FloatingNavBar";
import { nowlyColors } from "../../constants/theme";
import { useAppStore } from "../../store/useAppStore";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const tabIcons: Record<"home" | "friends" | "profile", IconName> = {
  home: "lightning-bolt",
  friends: "account-group",
  profile: "star-four-points",
};

export default function AppLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const crewUnreadCount = useAppStore((state) => state.crewUnreadCount);
  const consumeCrewUnread = useAppStore((state) => state.consumeCrewUnread);

  useEffect(() => {
    if (
      crewUnreadCount > 0 &&
      (
        pathname.startsWith("/friends") ||
        pathname.startsWith("/chat") ||
        pathname.startsWith("/proposal") ||
        pathname.startsWith("/thread")
      )
    ) {
      consumeCrewUnread();
    }
  }, [consumeCrewUnread, crewUnreadCount, pathname]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => (
        <FloatingNavBar
          {...props}
          badges={{ friends: crewUnreadCount }}
          fabAccentColor={nowlyColors.violet}
          fabIcon="lightning-bolt"
          icons={tabIcons}
          onFabPress={() => {
            if (!pathname.startsWith("/now-mode")) {
              router.push("/now-mode");
            }
          }}
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
