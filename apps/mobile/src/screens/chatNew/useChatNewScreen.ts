import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useDeferredValue, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useAppStore } from "../../../store/useAppStore";
import { chatApi } from "../../lib/api/chat";

const friendSearchText = (friend: {
  name: string;
  communityTag?: string | null;
  city?: string | null;
}) => [friend.name, friend.communityTag, friend.city].filter(Boolean).join(" ").toLowerCase();

export const useChatNewScreen = () => {
  const router = useRouter();
  const token = useAppStore((state) => state.token);
  const friends = useAppStore((state) => state.friends);
  const upsertDirectChat = useAppStore((state) => state.upsertDirectChat);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const deferredSearch = useDeferredValue(search);

  const acceptedFriends = useMemo(
    () => friends.filter((friend) => friend.status === "ACCEPTED"),
    [friends],
  );

  const filteredFriends = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return acceptedFriends.filter((friend) => {
      if (!query) {
        return true;
      }

      return friendSearchText(friend).includes(query);
    });
  }, [acceptedFriends, deferredSearch]);

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      if (selectedIds.length < 2) {
        throw new Error("Pick at least two friends.");
      }

      const trimmedTitle = title.trim();
      const idempotencyKey = `group-chat:${token ?? "anon"}:${[...selectedIds]
        .sort()
        .join(",")}:${trimmedTitle.toLowerCase()}`;

      return chatApi.createGroupChat(token, {
        title: trimmedTitle || null,
        participantIds: selectedIds,
        idempotencyKey,
      });
    },
    onSuccess: (chat) => {
      upsertDirectChat(chat);
      router.replace({
        pathname: "/chat/[chatId]",
        params: { chatId: chat.id },
      });
    },
    onError: (error) => {
      Alert.alert(
        "Could not create that chat",
        error instanceof Error ? error.message : "Try that again in a second.",
      );
    },
  });

  const selectedFriends = useMemo(
    () =>
      acceptedFriends
        .filter((friend) => selectedIds.includes(friend.id))
        .map((friend) => ({
          id: friend.id,
          name: friend.name,
        })),
    [acceptedFriends, selectedIds],
  );

  const toggleFriend = (friendId: string) => {
    setSelectedIds((current) =>
      current.includes(friendId)
        ? current.filter((id) => id !== friendId)
        : [...current, friendId],
    );
  };

  const friendRows = filteredFriends.map((friend) => ({
    id: friend.id,
    name: friend.name,
    photoUrl: friend.photoUrl,
    subtitle: friend.communityTag || friend.city || "Crew friend",
    selected: selectedIds.includes(friend.id),
    onPress: () => toggleFriend(friend.id),
  }));

  const createLabel =
    selectedIds.length >= 2
      ? createGroupMutation.isPending
        ? "Creating..."
        : `Create chat with ${selectedIds.length} ${selectedIds.length === 1 ? "friend" : "friends"}`
      : "Pick 2 friends";

  return {
    title,
    search,
    selectedFriends,
    friendRows,
    hasFriends: acceptedFriends.length > 0,
    hasFilteredResults: friendRows.length > 0,
    isCreating: createGroupMutation.isPending,
    createDisabled: selectedIds.length < 2 || createGroupMutation.isPending,
    createLabel,
    onBack: () => router.back(),
    onChangeSearch: setSearch,
    onChangeTitle: setTitle,
    onToggleFriend: toggleFriend,
    onCreate: () => {
      void createGroupMutation.mutateAsync();
    },
  };
};
