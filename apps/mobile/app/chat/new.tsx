import { useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { api } from "../../lib/api";
import { webPressableStyle } from "../../lib/web-pressable";
import { useAppStore } from "../../store/useAppStore";

export default function NewGroupChatScreen() {
  const token = useAppStore((state) => state.token);
  const friends = useAppStore((state) => state.friends);
  const upsertDirectChat = useAppStore((state) => state.upsertDirectChat);
  const acceptedFriends = useMemo(
    () => friends.filter((friend) => friend.status === "ACCEPTED"),
    [friends],
  );
  const [title, setTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleFriend = (friendId: string) => {
    setSelectedIds((current) =>
      current.includes(friendId)
        ? current.filter((id) => id !== friendId)
        : [...current, friendId],
    );
  };

  const handleCreate = async () => {
    if (selectedIds.length < 2) {
      return;
    }

    try {
      const chat = await api.createGroupChat(token, {
        title: title.trim() || null,
        participantIds: selectedIds,
      });

      upsertDirectChat(chat);
      router.replace({
        pathname: "/chat/[chatId]",
        params: { chatId: chat.id },
      });
    } catch (error) {
      Alert.alert(
        "Could not create that chat",
        error instanceof Error ? error.message : "Try that again.",
      );
    }
  };

  return (
    <GradientMesh>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 62,
          paddingBottom: 48,
          gap: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-start justify-between gap-4">
          <View className="max-w-[82%] gap-2">
            <Text className="font-body text-sm uppercase tracking-[2px] text-aqua/80">
              New group chat
            </Text>
            <Text className="font-display text-[34px] leading-[38px] text-cloud">
              Start a private thread with a few friends.
            </Text>
            <Text className="font-body text-sm leading-6 text-white/60">
              These chats stay separate from hangout threads and you can come back to them anytime.
            </Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/6"
            style={({ pressed }) =>
              webPressableStyle(pressed, { pressedOpacity: 0.88, pressedScale: 0.97 })
            }
          >
            <MaterialCommunityIcons name="close" size={20} color="#F8FAFC" />
          </Pressable>
        </View>

        <GlassCard className="p-5">
          <View className="gap-3">
            <Text className="font-display text-xl text-cloud">Group name</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Friday after class, Uptown crew, Study break..."
              placeholderTextColor="rgba(248,250,252,0.4)"
              className="rounded-[24px] border border-white/12 bg-white/8 px-4 py-4 font-body text-base text-cloud"
            />
            <Text className="font-body text-sm text-white/60">
              Optional. If you skip it, Nowly will use the people in the thread.
            </Text>
          </View>
        </GlassCard>

        <View className="gap-3">
          <Text className="font-display text-2xl text-cloud">Pick at least 2 friends</Text>
          {acceptedFriends.map((friend) => {
            const selected = selectedIds.includes(friend.id);

            return (
              <Pressable
                key={friend.id}
                onPress={() => toggleFriend(friend.id)}
                className={`rounded-[28px] border p-4 ${selected ? "border-aqua/55 bg-aqua/10" : "border-white/10 bg-white/[0.04]"}`}
                style={({ pressed }) => webPressableStyle(pressed)}
              >
                <View className="flex-row items-center gap-4">
                  <View className="h-14 w-14 overflow-hidden rounded-full border border-white/12 bg-white/8">
                    {friend.photoUrl ? (
                      <Image source={{ uri: friend.photoUrl }} className="h-full w-full" resizeMode="cover" />
                    ) : (
                      <View className="h-full w-full items-center justify-center">
                        <Text className="font-display text-xl text-white/70">
                          {(friend.name[0] ?? "N").toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View className="flex-1">
                    <Text className="font-display text-lg text-cloud">{friend.name}</Text>
                    <Text className="mt-1 font-body text-sm text-white/60">
                      {friend.communityTag || friend.city}
                    </Text>
                  </View>

                  <MaterialCommunityIcons
                    name={selected ? "check-circle" : "circle-outline"}
                    size={24}
                    color={selected ? "#22D3EE" : "rgba(248,250,252,0.38)"}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>

        <PillButton
          label={selectedIds.length >= 2 ? `Create chat with ${selectedIds.length} friends` : "Pick 2 friends"}
          onPress={() => void handleCreate()}
          disabled={selectedIds.length < 2}
        />
      </ScrollView>
    </GradientMesh>
  );
}
