import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 18,
          height: 72,
          borderRadius: 24,
          backgroundColor: "rgba(11,16,32,0.92)",
          borderTopWidth: 0,
        },
        tabBarActiveTintColor: "#F8FAFC",
        tabBarInactiveTintColor: "rgba(248,250,252,0.42)",
        tabBarLabelStyle: {
          fontFamily: "SpaceGrotesk_500Medium",
          fontSize: 12,
          marginBottom: 8,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Now",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="lightning-bolt-circle" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Crew",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "You",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="star-four-points" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
