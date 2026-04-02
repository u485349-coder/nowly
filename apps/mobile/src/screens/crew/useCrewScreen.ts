import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Share } from "react-native";
import { useRouter } from "expo-router";
import { track } from "../../../lib/analytics";
import { createSmartOpenUrl } from "../../../lib/smart-links";
import { useAppStore } from "../../../store/useAppStore";
import type { AppFriend, DirectChat } from "../../../types";
import { crewApi } from "../../lib/api/crew";
import { useInboxActivity } from "../../hooks/realtime/useInboxActivity";

const chatDisplayName = (chat: DirectChat) =>
  chat.title || chat.participants.map((participant) => participant.name).join(", ") || "Private chat";

const chatSubline = (chat: DirectChat) =>
  chat.lastMessageText ||
  (chat.isGroup
    ? `${chat.memberCount} people in this private thread`
    : chat.participants[0]?.communityTag || chat.participants[0]?.city || "Private line");

export const useCrewScreen = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const unreadByEntity = useAppStore((state) => state.unreadByEntity);
  const setFriends = useAppStore((state) => state.setFriends);
  const setSuggestions = useAppStore((state) => state.setSuggestions);
  const setDirectChats = useAppStore((state) => state.setDirectChats);
  const upsertFriend = useAppStore((state) => state.upsertFriend);
  const removeFriend = useAppStore((state) => state.removeFriend);
  const removeSuggestion = useAppStore((state) => state.removeSuggestion);
  const upsertDirectChat = useAppStore((state) => state.upsertDirectChat);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const openChatPromisesRef = useRef<Record<string, Promise<DirectChat>>>({});

  const friendsQuery = useQuery({
    queryKey: ["crew", "friends", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => crewApi.fetchFriends(token, user!.id),
  });

  const suggestionsQuery = useQuery({
    queryKey: ["crew", "suggestions", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => crewApi.fetchFriendSuggestions(token),
  });

  const chatsQuery = useQuery({
    queryKey: ["crew", "chats", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => crewApi.fetchDirectChats(token),
  });

  useEffect(() => {
    if (friendsQuery.data) {
      setFriends(friendsQuery.data);
    }
  }, [friendsQuery.data, setFriends]);

  useEffect(() => {
    if (suggestionsQuery.data) {
      setSuggestions(suggestionsQuery.data);
    }
  }, [setSuggestions, suggestionsQuery.data]);

  useEffect(() => {
    if (chatsQuery.data) {
      setDirectChats(chatsQuery.data);
    }
  }, [chatsQuery.data, setDirectChats]);

  const refreshInbox = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["crew", "chats", user?.id] });
  }, [queryClient, user?.id]);

  useInboxActivity({ token, onInboxUpdate: refreshInbox });

  const requestFriendMutation = useMutation({
    mutationFn: (friendId: string) => crewApi.requestFriend(token, user!.id, friendId),
    onSuccess: (friend) => {
      upsertFriend(friend);
      removeSuggestion(friend.id);
      void queryClient.invalidateQueries({ queryKey: ["crew", "friends", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["crew", "suggestions", user?.id] });
    },
    onError: (error) => {
      Alert.alert("Could not send request", error instanceof Error ? error.message : "Try again in a moment.");
    },
  });

  const respondMutation = useMutation({
    mutationFn: ({ friend, action }: { friend: AppFriend; action: "ACCEPT" | "DECLINE" }) =>
      crewApi.respondToFriendRequest(token, user!.id, friend.friendshipId, action),
    onSuccess: (updated, payload) => {
      if (updated) {
        upsertFriend(updated);
      } else {
        removeFriend(payload.friend.id);
      }
      void queryClient.invalidateQueries({ queryKey: ["crew", "friends", user?.id] });
    },
    onError: (error) => {
      Alert.alert("Request update failed", error instanceof Error ? error.message : "Try again in a moment.");
    },
  });

  const unfriendMutation = useMutation({
    mutationFn: ({ friendId, friendshipId }: { friendId: string; friendshipId: string }) =>
      crewApi.unfriend(token, friendshipId).then(() => ({ friendId })),
    onSuccess: ({ friendId }) => {
      removeFriend(friendId);
      setDirectChats(
        useAppStore
          .getState()
          .directChats.filter((chat) => !chat.participants.some((participant) => participant.id === friendId)),
      );
      void queryClient.invalidateQueries({ queryKey: ["crew", "friends", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["crew", "chats", user?.id] });
    },
    onError: (error) => {
      Alert.alert("Could not remove friend", error instanceof Error ? error.message : "Try again in a moment.");
    },
  });

  const friends = friendsQuery.data ?? [];
  const suggestions = suggestionsQuery.data ?? [];
  const directChats = chatsQuery.data ?? [];

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
        [chatDisplayName(chat), chatSubline(chat)].join(" ").toLowerCase().includes(normalizedSearch),
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

  const handleOpenChat = async (friendId: string) => {
    const existingDirectChat = directChats.find(
      (chat) => !chat.isGroup && chat.participants.some((participant) => participant.id === friendId),
    );

    if (existingDirectChat) {
      router.push({ pathname: "/chat/[chatId]", params: { chatId: existingDirectChat.id } });
      return;
    }

    const inFlight = openChatPromisesRef.current[friendId];
    if (inFlight) {
      return;
    }

    try {
      const pendingChat = crewApi.openDirectChat(token, friendId);
      openChatPromisesRef.current[friendId] = pendingChat;
      const chat = await pendingChat;
      delete openChatPromisesRef.current[friendId];
      upsertDirectChat(chat);
      router.push({ pathname: "/chat/[chatId]", params: { chatId: chat.id } });
    } catch (error) {
      delete openChatPromisesRef.current[friendId];
      Alert.alert(
        "Private DM failed",
        error instanceof Error ? error.message : "We couldn't open that private thread right now.",
      );
    }
  };

  const handleShareInvite = async (name?: string) => {
    await track(token, "user_reactivated", { via: "discord_ping", friendName: name });
    await Share.share({
      message: `Anyone free tonight? Let's link on Nowly -> ${createSmartOpenUrl("/onboarding")}`,
    });
  };

  const conversationItems = filteredChats.map((chat) => ({
    id: chat.id,
    title: chatDisplayName(chat),
    subtitle: chatSubline(chat),
    timestamp: chat.lastMessageAt
      ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : undefined,
    unreadCount: chat.unreadCount,
    photoUrl: chat.participants[0]?.photoUrl ?? null,
    onPress: () => router.push({ pathname: "/chat/[chatId]", params: { chatId: chat.id } }),
  }));

  const livePeopleItems = acceptedFriends.slice(0, 6).map((friend) => ({
    id: friend.id,
    name: friend.name,
    subtitle: `${friend.communityTag || friend.city || "Crew friend"} - ${Math.round(friend.responsivenessScore * 100)}% response`,
    detail:
      friend.insight?.cadenceNote || friend.insight?.reliabilityLabel || friend.sharedLabel || "Easy person to catch on short notice.",
    photoUrl: friend.photoUrl,
    onMessage: () => void handleOpenChat(friend.id),
    onNudge: () => void handleShareInvite(friend.name),
  }));

  const crewItems = acceptedFriends.map((friend) => ({
    id: friend.id,
    name: friend.name,
    subtitle: `${friend.communityTag || friend.city || "Crew friend"} - ${Math.round(friend.responsivenessScore * 100)}% response`,
    detail:
      friend.insight?.cadenceNote || friend.insight?.reliabilityLabel || friend.sharedLabel || "Easy person to catch on short notice.",
    photoUrl: friend.photoUrl,
    onMessage: () => void handleOpenChat(friend.id),
    onShare: () => void handleShareInvite(friend.name),
    onRemove: () =>
      Alert.alert(`Remove ${friend.name}?`, "This removes them from your crew. You can always add them again later.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => unfriendMutation.mutate({ friendId: friend.id, friendshipId: friend.friendshipId }),
        },
      ]),
  }));

  const pendingRequestItems = [
    ...incomingRequests.map((friend) => ({
      id: `request-${friend.id}`,
      name: friend.name,
      subtitle: "Wants in on your circle.",
      actionLabel: "Accept",
      onAction: () => respondMutation.mutate({ friend, action: "ACCEPT" }),
      secondaryActionLabel: "Ignore",
      onSecondaryAction: () => respondMutation.mutate({ friend, action: "DECLINE" }),
    })),
    ...outgoingRequests.map((friend) => ({
      id: `request-${friend.id}`,
      name: friend.name,
      subtitle: "Waiting on their reply.",
      actionLabel: "Pending",
      disabled: true,
    })),
  ];

  const suggestionItems = filteredSuggestions.slice(0, 5).map((friend) => ({
    id: `suggestion-${friend.id}`,
    name: friend.name,
    subtitle: friend.sharedLabel || friend.communityTag || friend.city || "Nearby on the graph",
    actionLabel: "Add",
    onAction: () => requestFriendMutation.mutate(friend.id),
  }));

  const conversationUnreadCount = conversationItems.reduce((total, item) => total + (item.unreadCount ?? 0), 0);

  const refetchAll = useCallback(() => {
    void friendsQuery.refetch();
    void suggestionsQuery.refetch();
    void chatsQuery.refetch();
  }, [chatsQuery, friendsQuery, suggestionsQuery]);

  return {
    search,
    setSearch,
    isLoading: friendsQuery.isLoading || suggestionsQuery.isLoading || chatsQuery.isLoading,
    isError: Boolean(friendsQuery.error || suggestionsQuery.error || chatsQuery.error),
    friendRequestUnreadCount: unreadByEntity.friend_requests ?? 0,
    conversationUnreadCount,
    conversationItems,
    livePeopleItems,
    crewItems,
    pendingRequestItems,
    suggestionItems,
    onRetry: refetchAll,
    onCreateGroup: () => router.push("/chat/new"),
    onInvite: () => void handleShareInvite(),
  };
};
