import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Tabs, usePathname } from "expo-router";
import { useEffect } from "react";
import { FloatingNavBar } from "../../components/navigation/FloatingNavBar";
import { nowlyColors } from "../../constants/theme";
import { useAppStore } from "../../store/useAppStore";
const tabIcons = {
    home: "lightning-bolt",
    friends: "account-group",
    profile: "star-four-points",
};
export default function AppLayout() {
    const pathname = usePathname();
    const crewUnreadCount = useAppStore((state) => state.crewUnreadCount);
    const consumeCrewUnread = useAppStore((state) => state.consumeCrewUnread);
    useEffect(() => {
        if (pathname.startsWith("/friends") ||
            pathname.startsWith("/chat") ||
            pathname.startsWith("/proposal") ||
            pathname.startsWith("/thread")) {
            consumeCrewUnread();
        }
    }, [consumeCrewUnread, pathname]);
    return (_jsxs(Tabs, { screenOptions: {
            headerShown: false,
        }, tabBar: (props) => (_jsx(FloatingNavBar, { ...props, badges: { friends: crewUnreadCount }, fabAccentColor: nowlyColors.violet, fabIcon: "lightning-bolt", icons: tabIcons })), children: [_jsx(Tabs.Screen, { name: "home", options: {
                    title: "Now",
                } }), _jsx(Tabs.Screen, { name: "friends", options: {
                    title: "Crew",
                } }), _jsx(Tabs.Screen, { name: "profile", options: {
                    title: "You",
                } })] }));
}
