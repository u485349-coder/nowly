import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { useResponsiveLayout } from "../../components/ui/useResponsiveLayout";
import { nowlyColors } from "../../constants/theme";
import { api } from "../../lib/api";
import { track } from "../../lib/analytics";
import { createSmartOpenUrl } from "../../lib/smart-links";
import { webPressableStyle } from "../../lib/web-pressable";
import { useAppStore } from "../../store/useAppStore";
import { AppFriend, DirectChat } from "../../types";

const Avatar = ({ name, photoUrl }: { name: string; photoUrl?: string | null }) => (
  <View className="h-14 w-14 overflow-hidden rounded-full border border-white/12 bg-white/8">
    {photoUrl ? (
      <Image source={{ uri: photoUrl }} className="h-full w-full" resizeMode="cover" />
    ) : (
      <View className="h-full w-full items-center justify-center">
        <Text className="font-display text-xl text-white/70">
          {(name[0] ?? "N").toUpperCase()}
        </Text>
      </View>
    )}
  </View>
);

const chatDisplayName = (chat: DirectChat) =>
  chat.title ||
  chat.participants.map((participant) => participant.name).join(", ") ||
  "Private chat";

const chatSubline = (chat: DirectChat) =>
  chat.lastMessageText ||
  (chat.isGroup
    ? `${chat.memberCount} people in this private thread`
    : chat.participants[0]?.communityTag || chat.participants[0]?.city || "Private line");

const clusterPositions = [
  { left: 12, top: 18 },
  { right: 18, top: 14 },
  { left: 70, top: 86 },
  { right: 72, top: 96 },
  { left: 144, top: 30 },
];

export default function FriendsScreen() {
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const friends = useAppStore((state) => state.friends);
  const suggestions = useAppStore((state) => state.suggestions);
  const radar = useAppStore((state) => state.radar);
  const directChats = useAppStore((state) => state.directChats);
  const setFriends = useAppStore((state) => state.setFriends);
  const setSuggestions = useAppStore((state) => state.setSuggestions);
  const setDirectChats = useAppStore((state) => state.setDirectChats);
  const upsertFriend = useAppStore((state) => state.upsertFriend);
  const removeFriend = useAppStore((state) => state.removeFriend);
  const removeSuggestion = useAppStore((state) => state.removeSuggestion);
  const upsertDirectChat = useAppStore((state) => state.upsertDirectChat);
  const layout = useResponsiveLayout();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    Promise.all([
      api.fetchFriends(token, user.id),
      api.fetchFriendSuggestions(token),
      api.fetchDirectChats(token),
    ]).then(([nextFriends, nextSuggestions, nextChats]) => {
      if (!active) {
        return;
      }

      startTransition(() => {
        setFriends(nextFriends);
        setSuggestions(nextSuggestions);
        setDirectChats(nextChats);
      });
    });

    return () => {
      active = false;
    };
  }, [setDirectChats, setFriends, setSuggestions, token, user]);

  const normalizedSearch = deferredSearch.trim().toLowerCase();

  const filteredFriends = useMemo(
    () =>
      friends.filter((friend) =>
        [friend.name, friend.communityTag, friend.city, friend.sharedLabel]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch),
      ),
    [friends, normalizedSearch],
  );

  const filteredSuggestions = useMemo(
    () =>
      suggestions.filter((friend) =>
        [friend.name, friend.communityTag, friend.city, friend.sharedLabel]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch),
      ),
    [normalizedSearch, suggestions],
  );

  const filteredChats = useMemo(
    () =>
      directChats.filter((chat) =>
        [chatDisplayName(chat), chatSubline(chat)]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch),
      ),
    [directChats, normalizedSearch],
  );

  const acceptedFriends = filteredFriends.filter((friend) => friend.status === "ACCEPTED");
  const incomingRequests = filteredFriends.filter(
    (friend) => friend.status === "PENDING" && friend.requestDirection === "INCOMING",
  );
  const outgoingRequests = filteredFriends.filter(
    (friend) => friend.status === "PENDING" && friend.requestDirection === "OUTGOING",
  );
  const pendingRequests = [...incomingRequests, ...outgoingRequests];
  const liveClusterPeople = acceptedFriends.slice(0, 5);

  const handleDiscordPing = async (name: string) => {
    await track(token, "user_reactivated", { via: "discord_ping", friendName: name });
    await Share.share({
      message: `Anyone free tonight? Let's link on Nowly -> ${createSmartOpenUrl("/onboarding")}`,
    });
  };

  const handleQuickAdd = async (friendId: string) => {
    if (!user) {
      return;
    }

    const friend = await api.requestFriend(token, user.id, friendId);
    upsertFriend(friend);
    removeSuggestion(friendId);
  };

  const handleRespond = async (friend: AppFriend, action: "ACCEPT" | "DECLINE") => {
    if (!user) {
      return;
    }

    const updated = await api.respondToFriendRequest(token, user.id, friend.friendshipId, action);

    if (updated) {
      upsertFriend(updated);
    } else {
      removeFriend(friend.id);
    }
  };

  const handleOpenChat = async (friendId: string) => {
    const chat = await api.openDirectChat(token, friendId);
    upsertDirectChat(chat);
    router.push({
      pathname: "/chat/[chatId]",
      params: { chatId: chat.id },
    });
  };

  const handleOpenGroupBuilder = () => {
    router.push("/chat/new");
  };

  return (
    <GradientMesh>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          alignItems: "center",
          paddingHorizontal: layout.screenPadding,
          paddingTop: layout.isDesktop ? 40 : 58,
          paddingBottom: 160,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.contentShell,
            { width: layout.shellWidth },
            layout.isDesktop ? styles.desktopShell : null,
          ]}
        >
          <View style={{ width: layout.leftColumnWidth, gap: layout.sectionGap }}>
            <View style={styles.heroHeader}>
              <View style={{ gap: 10, flex: 1 }}>
                <Text style={styles.eyebrow}>YOUR PEOPLE</Text>
                <Text style={styles.heroTitle}>Signals feel stronger together.</Text>
                <Text style={styles.heroHint}>
                  {(radar?.localDensity.activeNowCount ?? 0).toString()} active now ·{" "}
                  {(radar?.localDensity.nearbyFriendsCount ?? acceptedFriends.length).toString()} nearby in
                  your graph
                </Text>
              </View>
            </View>

            <View style={styles.clusterShell}>
              <View style={styles.clusterGlow} pointerEvents="none" />
              <Text style={styles.sectionLabel}>LIVE CLUSTER</Text>
              <Text style={styles.clusterHeadline}>
                {liveClusterPeople.length
                  ? `${liveClusterPeople.length} friends feel warm enough to nudge.`
                  : "Start adding people and the cluster will wake up here."}
              </Text>

              <View style={styles.clusterField}>
                {liveClusterPeople.length ? (
                  liveClusterPeople.map((friend, index) => (
                    <Pressable
                      key={friend.id}
                      onPress={() => void handleOpenChat(friend.id)}
                      style={({ pressed }) => [
                        styles.clusterAvatarWrap,
                        clusterPositions[index % clusterPositions.length],
                        webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.97 }),
                      ]}
                    >
                      <View style={styles.clusterRing} />
                      <Avatar name={friend.name} photoUrl={friend.photoUrl} />
                    </Pressable>
                  ))
                ) : (
                  <View style={styles.clusterEmpty}>
                    <Text style={styles.clusterEmptyText}>Your closest people will float here.</Text>
                  </View>
                )}
              </View>
            </View>

            <Pressable
              onPress={handleOpenGroupBuilder}
              style={({ pressed }) => [
                styles.threadCta,
                webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.99 }),
              ]}
            >
              <View style={{ gap: 6, flex: 1 }}>
                <Text style={styles.sectionLabel}>PRIVATE CHATS</Text>
                <Text style={styles.threadTitle}>Start a quick thread</Text>
                <Text style={styles.threadHint}>
                  Spin up a 1:1 or group line without turning this into a scheduling form.
                </Text>
              </View>
              <View style={styles.threadArrow}>
                <MaterialCommunityIcons name="arrow-top-right" size={18} color="#E2E8F0" />
              </View>
            </Pressable>

            <Pressable
              onPress={() =>
                Share.share({
                  message: `Anyone free tonight? Let's link on Nowly -> ${createSmartOpenUrl("/onboarding")}`,
                })
              }
              style={({ pressed }) => [
                styles.ghostInvite,
                webPressableStyle(pressed, { pressedOpacity: 0.94, pressedScale: 0.985 }),
              ]}
            >
              <MaterialCommunityIcons name="account-plus-outline" size={16} color="#E2E8F0" />
              <Text style={styles.ghostInviteText}>Invite locals</Text>
            </Pressable>
          </View>

          <View style={{ width: layout.rightColumnWidth, gap: layout.sectionGap }}>
            <View style={{ gap: 12 }}>
              <Text style={styles.sectionLabel}>PENDING REQUESTS</Text>
              {pendingRequests.length ? (
                pendingRequests.map((friend) => {
                  const incoming =
                    friend.requestDirection === "INCOMING" && friend.status === "PENDING";

                  return (
                    <View key={friend.id} style={styles.requestRow}>
                      <Avatar name={friend.name} photoUrl={friend.photoUrl} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={styles.rowName}>{friend.name}</Text>
                        <Text style={styles.rowMeta}>
                          {incoming ? "Wants in on your circle." : "Waiting on their reply."}
                        </Text>
                      </View>
                      {incoming ? (
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <Pressable
                            onPress={() => void handleRespond(friend, "ACCEPT")}
                            style={({ pressed }) => [
                              styles.rowAction,
                              webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.98 }),
                            ]}
                          >
                            <Text style={styles.rowActionText}>Accept</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => void handleRespond(friend, "DECLINE")}
                            style={({ pressed }) => [
                              styles.rowGhostAction,
                              webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.98 }),
                            ]}
                          >
                            <Text style={styles.rowGhostText}>Ignore</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <View style={styles.pendingPill}>
                          <Text style={styles.pendingPillText}>Pending</Text>
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>No pending requests right now.</Text>
              )}
            </View>

            <View style={{ gap: 12 }}>
              <Text style={styles.sectionLabel}>CREW</Text>
              {acceptedFriends.length ? (
                acceptedFriends.map((friend) => (
                  <View key={friend.id} style={styles.friendRow}>
                    <Avatar name={friend.name} photoUrl={friend.photoUrl} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.rowName}>{friend.name}</Text>
                      <Text style={styles.rowMeta}>
                        {friend.communityTag || friend.city} · {Math.round(friend.responsivenessScore * 100)}%
                        response
                      </Text>
                      <Text style={styles.rowInsight}>
                        {friend.insight?.cadenceNote ||
                          friend.insight?.reliabilityLabel ||
                          friend.sharedLabel ||
                          "Easy person to catch on short notice."}
                      </Text>
                    </View>

                    <View style={styles.friendActions}>
                      <Pressable
                        accessibilityLabel={`Open private chat with ${friend.name}`}
                        accessibilityRole="button"
                        onPress={() => void handleOpenChat(friend.id)}
                        style={({ pressed }) => [
                          styles.iconButton,
                          webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                        ]}
                      >
                        <MaterialCommunityIcons name="chat-processing-outline" size={20} color="#F8FAFC" />
                      </Pressable>
                      <Pressable
                        accessibilityLabel={`Share quick invite link with ${friend.name}`}
                        accessibilityRole="button"
                        onPress={() => void handleDiscordPing(friend.name)}
                        style={({ pressed }) => [
                          styles.iconButton,
                          webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                        ]}
                      >
                        <MaterialCommunityIcons name="share-variant-outline" size={18} color="#8BEAFF" />
                      </Pressable>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Add a few people and this feed will start to move.</Text>
              )}
            </View>

            <View style={{ gap: 12 }}>
              <Text style={styles.sectionLabel}>PRIVATE THREADS</Text>
              {filteredChats.length ? (
                filteredChats.slice(0, 3).map((chat) => (
                  <Pressable
                    key={chat.id}
                    onPress={() =>
                      router.push({
                        pathname: "/chat/[chatId]",
                        params: { chatId: chat.id },
                      })
                    }
                    style={({ pressed }) => [
                      styles.chatRow,
                      webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.99 }),
                    ]}
                  >
                    <Text style={styles.rowName}>{chatDisplayName(chat)}</Text>
                    <Text style={styles.rowInsight}>{chatSubline(chat)}</Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.emptyText}>Start your first thread and it will land here.</Text>
              )}
            </View>

            <View style={{ gap: 12 }}>
              <Text style={styles.sectionLabel}>PEOPLE NEARBY</Text>
              {filteredSuggestions.length ? (
                filteredSuggestions.map((friend) => (
                  <View key={friend.id} style={styles.suggestionRow}>
                    <Avatar name={friend.name} photoUrl={friend.photoUrl} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.rowName}>{friend.name}</Text>
                      <Text style={styles.rowMeta}>
                        {friend.sharedLabel || friend.communityTag || friend.city}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => void handleQuickAdd(friend.id)}
                      style={({ pressed }) => [
                        styles.rowGhostAction,
                        webPressableStyle(pressed, { pressedOpacity: 0.92, pressedScale: 0.98 }),
                      ]}
                    >
                      <Text style={styles.rowGhostText}>Add</Text>
                    </Pressable>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No nearby suggestions to surface yet.</Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </GradientMesh>
  );
}

const styles = StyleSheet.create({
  chatRow: {
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 4,
  },
  clusterAvatarWrap: {
    position: "absolute",
  },
  clusterEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  clusterEmptyText: {
    color: "rgba(247,251,255,0.56)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
  },
  clusterField: {
    position: "relative",
    height: 176,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.03)",
    overflow: "hidden",
  },
  clusterGlow: {
    position: "absolute",
    right: -44,
    top: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(139,234,255,0.16)",
  },
  clusterHeadline: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 22,
    lineHeight: 28,
    maxWidth: 360,
  },
  clusterRing: {
    position: "absolute",
    top: -4,
    right: -4,
    bottom: -4,
    left: -4,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: "rgba(139,234,255,0.34)",
  },
  clusterShell: {
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
    overflow: "hidden",
  },
  contentShell: {
    gap: 24,
  },
  desktopShell: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 28,
  },
  emptyText: {
    color: "rgba(247,251,255,0.58)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  eyebrow: {
    color: "rgba(139,234,255,0.8)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
    letterSpacing: 2.2,
  },
  friendActions: {
    flexDirection: "row",
    gap: 10,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  ghostInvite: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ghostInviteText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 14,
  },
  heroHeader: {
    gap: 6,
  },
  heroHint: {
    color: "rgba(247,251,255,0.68)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  heroTitle: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 34,
    lineHeight: 38,
    maxWidth: 400,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  pendingPill: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  pendingPillText: {
    color: "rgba(247,251,255,0.8)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
  },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rowAction: {
    borderRadius: 999,
    backgroundColor: "#E9F7FF",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowActionText: {
    color: "#081120",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 13,
  },
  rowGhostAction: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowGhostText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 13,
  },
  rowInsight: {
    color: "rgba(139,234,255,0.82)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  rowMeta: {
    color: "rgba(247,251,255,0.58)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
  },
  rowName: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 18,
    lineHeight: 22,
  },
  sectionLabel: {
    color: "rgba(247,251,255,0.52)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
    letterSpacing: 2,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  threadArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  threadCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  threadHint: {
    color: "rgba(247,251,255,0.62)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  threadTitle: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 22,
    lineHeight: 26,
  },
});
