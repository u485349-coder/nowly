import { Tabs, usePathname, useRouter } from "expo-router";
import { BottomNav } from "../../src/components/navigation/BottomNav";
import { useAppStore } from "../../store/useAppStore";

export default function AppLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const crewUnreadCount = useAppStore((state) => state.globalUnreadCount || state.crewUnreadCount);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => (
        <BottomNav
          {...props}
          badges={{ friends: crewUnreadCount }}
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
