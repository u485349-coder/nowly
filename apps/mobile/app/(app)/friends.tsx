import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { api } from "../../lib/api";
import { track } from "../../lib/analytics";
import { availabilityLabel } from "../../lib/labels";
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
          paddingHorizontal: 20,
          paddingTop: 62,
          paddingBottom: 120,
          gap: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard className="p-6">
          <View className="gap-4">
            <View className="self-start rounded-full border border-white/8 bg-white/[0.045] px-4 py-2.5">
              <Text className="font-body text-xs text-cloud/90">Private graph for real-life hangs</Text>
            </View>
            <Text className="font-display text-[31px] leading-[35px] text-cloud">
              Your people on Nowly
            </Text>
            <Text className="font-body text-sm leading-6 text-white/72">
              Manage requests, keep private chats going, and build a real local graph.
            </Text>
            <Text className="font-display text-xl text-cloud">
              {radar?.rhythm.communityLabel ?? "Your local pocket"}
            </Text>
            <Text className="font-body text-sm text-white/66">
              {(radar?.localDensity.activeNowCount ?? 0).toString()} active now -{" "}
              {(radar?.localDensity.nearbyFriendsCount ?? 0).toString()} nearby in your graph
            </Text>
            <Text className="font-body text-sm text-aqua/80">
              {radar?.suggestionLine ?? "Keep your real-world graph concentrated."}
            </Text>
          </View>
        </GlassCard>

        <GlassCard className="p-5">
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search people, requests, or chats"
            placeholderTextColor="rgba(248,250,252,0.4)"
            className="rounded-3xl border border-white/12 bg-white/8 px-4 py-4 font-body text-base text-cloud"
          />
        </GlassCard>

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-display text-2xl text-cloud">Private chats</Text>
            <PillButton label="New group chat" variant="secondary" onPress={handleOpenGroupBuilder} />
          </View>

          {filteredChats.length ? (
            filteredChats.map((chat) => (
              <GlassCard key={chat.id} className="p-5">
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/chat/[chatId]",
                      params: { chatId: chat.id },
                    })
                  }
                  style={({ pressed }) => webPressableStyle(pressed)}
                >
                  <View className="flex-row items-center gap-4">
                    <View className="flex-row">
                      {chat.participants.slice(0, 2).map((participant, index) => (
                        <View
                          key={participant.id}
                          className={`${index === 0 ? "" : "-ml-4"} h-14 w-14 overflow-hidden rounded-full border border-white/12 bg-white/8`}
                        >
                          {participant.photoUrl ? (
                            <Image
                              source={{ uri: participant.photoUrl }}
                              className="h-full w-full"
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="h-full w-full items-center justify-center">
                              <Text className="font-display text-xl text-white/70">
                                {(participant.name[0] ?? "N").toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>

                    <View className="flex-1">
                      <View className="flex-row items-center justify-between gap-3">
                        <Text className="font-display text-lg text-cloud">{chatDisplayName(chat)}</Text>
                        <Text className="font-body text-xs text-white/40">
                          {chat.lastMessageAt
                            ? new Date(chat.lastMessageAt).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              })
                            : ""}
                        </Text>
                      </View>
                      <Text className="mt-1 font-body text-sm text-white/60">{chatSubline(chat)}</Text>
                      <Text className="mt-1 font-body text-sm text-aqua/80">
                        {chat.isGroup ? `${chat.memberCount} people - private group thread` : "1:1 private line"}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </GlassCard>
            ))
          ) : (
            <GlassCard className="p-5">
              <Text className="font-display text-xl text-cloud">Start your first private chat</Text>
              <Text className="mt-2 font-body text-sm leading-6 text-white/60">
                Tap a chat bubble on a friend card or spin up a group thread with a few people.
              </Text>
            </GlassCard>
          )}
        </View>

        {incomingRequests.length ? (
          <View className="gap-3">
            <Text className="font-display text-2xl text-cloud">Friend requests</Text>
            {incomingRequests.map((friend) => (
              <GlassCard key={friend.id} className="p-5">
                <View className="flex-row items-center gap-4">
                  <Avatar name={friend.name} photoUrl={friend.photoUrl} />
                  <View className="flex-1">
                    <Text className="font-display text-xl text-cloud">{friend.name}</Text>
                    <Text className="mt-1 font-body text-sm text-white/60">
                      {friend.communityTag || friend.city}
                    </Text>
                    {friend.sharedLabel ? (
                      <Text className="mt-2 font-body text-sm text-aqua/80">{friend.sharedLabel}</Text>
                    ) : null}
                  </View>
                </View>
                <View className="mt-4 flex-row gap-3">
                  <PillButton label="Accept" onPress={() => void handleRespond(friend, "ACCEPT")} />
                  <PillButton
                    label="Ignore"
                    variant="secondary"
                    onPress={() => void handleRespond(friend, "DECLINE")}
                  />
                </View>
              </GlassCard>
            ))}
          </View>
        ) : null}

        {outgoingRequests.length ? (
          <View className="gap-3">
            <Text className="font-display text-2xl text-cloud">Pending requests</Text>
            {outgoingRequests.map((friend) => (
              <GlassCard key={friend.id} className="p-5">
                <View className="flex-row items-center justify-between gap-4">
                  <View className="flex-row items-center gap-4">
                    <Avatar name={friend.name} photoUrl={friend.photoUrl} />
                    <View>
                      <Text className="font-display text-lg text-cloud">{friend.name}</Text>
                      <Text className="mt-1 font-body text-sm text-white/60">
                        Request sent - waiting on them
                      </Text>
                    </View>
                  </View>
                  <View className="rounded-full bg-white/10 px-3 py-2">
                    <Text className="font-body text-xs text-cloud">Pending</Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>
        ) : null}

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-display text-2xl text-cloud">Friends on Nowly</Text>
            <PillButton
              label="Invite locals"
              variant="secondary"
              onPress={() =>
                Share.share({
                  message: `Anyone free tonight? Let's link on Nowly -> ${createSmartOpenUrl("/onboarding")}`,
                })
              }
            />
          </View>

          {acceptedFriends.map((friend) => (
            <GlassCard key={friend.id} className="p-5">
              <View className="flex-row items-start justify-between gap-4">
                <View className="max-w-[72%] flex-1 flex-row gap-4">
                  <Avatar name={friend.name} photoUrl={friend.photoUrl} />
                  <View className="flex-1">
                    <Text className="font-display text-xl text-cloud">{friend.name}</Text>
                    <Text className="mt-1 font-body text-sm text-white/60">
                      {friend.communityTag || friend.city} - response {Math.round(friend.responsivenessScore * 100)}%
                    </Text>
                    <View className="mt-2 flex-row flex-wrap gap-2">
                      {friend.lastSignal ? (
                        <View className="rounded-full bg-aqua/20 px-3 py-2">
                          <Text className="font-body text-xs text-cloud">
                            {availabilityLabel(friend.lastSignal)}
                          </Text>
                        </View>
                      ) : null}
                      <View className="rounded-full bg-white/10 px-3 py-2">
                        <Text className="font-body text-xs text-cloud">Friend</Text>
                      </View>
                    </View>
                    {friend.insight ? (
                      <View className="mt-3 gap-1">
                        <Text className="font-body text-sm text-aqua/80">
                          {friend.insight.reliabilityLabel}
                        </Text>
                        <Text className="font-body text-sm text-white/60">
                          {friend.insight.cadenceNote}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View className="items-end gap-2">
                  <Pressable
                    onPress={() => void handleOpenChat(friend.id)}
                    className="h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/8"
                    style={({ pressed }) =>
                      webPressableStyle(pressed, { pressedOpacity: 0.86, pressedScale: 0.97 })
                    }
                  >
                    <MaterialCommunityIcons name="chat-processing-outline" size={22} color="#F8FAFC" />
                  </Pressable>
                  <Pressable
                    onPress={() => void handleDiscordPing(friend.name)}
                    className="h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/8"
                    style={({ pressed }) =>
                      webPressableStyle(pressed, { pressedOpacity: 0.86, pressedScale: 0.97 })
                    }
                  >
                    <MaterialCommunityIcons name="send-outline" size={20} color="#22D3EE" />
                  </Pressable>
                </View>
              </View>
            </GlassCard>
          ))}
        </View>

        <View className="gap-3">
          <Text className="font-display text-2xl text-cloud">People on Nowly</Text>
          {filteredSuggestions.map((friend) => (
            <GlassCard key={friend.id} className="p-5">
              <View className="flex-row items-center justify-between gap-4">
                <View className="flex-row items-center gap-4">
                  <Avatar name={friend.name} photoUrl={friend.photoUrl} />
                  <View className="max-w-[70%]">
                    <Text className="font-display text-lg text-cloud">{friend.name}</Text>
                    <Text className="mt-1 font-body text-sm text-white/60">
                      {friend.sharedLabel || friend.communityTag || friend.city}
                    </Text>
                  </View>
                </View>
                <PillButton
                  label="Add friend"
                  variant="secondary"
                  onPress={() => void handleQuickAdd(friend.id)}
                />
              </View>
            </GlassCard>
          ))}
        </View>
      </ScrollView>
    </GradientMesh>
  );
}
