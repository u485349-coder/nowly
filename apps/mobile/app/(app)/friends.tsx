import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { api } from "../../lib/api";
import { track } from "../../lib/analytics";
import { availabilityLabel } from "../../lib/labels";
import { useAppStore } from "../../store/useAppStore";

export default function FriendsScreen() {
  const token = useAppStore((state) => state.token);
  const friends = useAppStore((state) => state.friends);
  const suggestions = useAppStore((state) => state.suggestions);
  const radar = useAppStore((state) => state.radar);
  const setSuggestions = useAppStore((state) => state.setSuggestions);
  const moveSuggestionToFriends = useAppStore((state) => state.moveSuggestionToFriends);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let active = true;

    api.fetchFriendSuggestions(token).then((results) => {
      if (!active) {
        return;
      }

      startTransition(() => {
        setSuggestions(results);
      });
    });

    return () => {
      active = false;
    };
  }, [setSuggestions, token]);

  const filteredFriends = friends.filter((friend) =>
    friend.name.toLowerCase().includes(deferredSearch.toLowerCase()),
  );

  const filteredSuggestions = suggestions.filter((friend) =>
    friend.name.toLowerCase().includes(deferredSearch.toLowerCase()),
  );

  const handleDiscordPing = async (name: string) => {
    await track(token, "user_reactivated", { via: "discord_ping", friendName: name });
    await Share.share({
      message: `Anyone free tonight? Let's link on Nowly -> nowly://invite/${name.toLowerCase()}`,
    });
  };

  const handleQuickAdd = async (friendId: string) => {
    const friend = suggestions.find((item) => item.id === friendId);
    if (!friend) {
      return;
    }

    await api.requestFriend(token, friendId);
    moveSuggestionToFriends(friend);
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
        <View>
          <Text className="font-display text-[34px] leading-[38px] text-cloud">
            Build local density, not a giant empty graph
          </Text>
          <Text className="mt-3 font-body text-base text-white/60">
            Nowly gets stronger when your real nearby people join the same pocket.
          </Text>
        </View>

        <GlassCard className="p-5">
          <View className="gap-3">
            <Text className="font-display text-xl text-cloud">
              {radar?.rhythm.communityLabel ?? "Your local pocket"}
            </Text>
            <Text className="font-body text-sm text-white/60">
              {radar?.localDensity.activeNowCount ?? 0} active now ·{" "}
              {radar?.localDensity.nearbyFriendsCount ?? 0} nearby in your graph
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
            placeholder="Search friends, shared servers, or neighborhoods"
            placeholderTextColor="rgba(248,250,252,0.4)"
            className="rounded-3xl border border-white/12 bg-white/8 px-4 py-4 font-body text-base text-cloud"
          />
        </GlassCard>

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-display text-2xl text-cloud">Crew</Text>
            <PillButton
              label="Invite locals"
              variant="secondary"
              onPress={() =>
                Share.share({
                  message: "Anyone free tonight? Let's link on Nowly -> nowly://invite/crew",
                })
              }
            />
          </View>
          {filteredFriends.map((friend) => (
            <GlassCard key={friend.id} className="p-5">
              <View className="flex-row items-start justify-between">
                <View className="max-w-[70%]">
                  <Text className="font-display text-xl text-cloud">{friend.name}</Text>
                  <Text className="mt-1 font-body text-sm text-white/60">
                    {friend.communityTag || friend.city} · response{" "}
                    {Math.round(friend.responsivenessScore * 100)}%
                  </Text>
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    <View className="rounded-full bg-white/10 px-3 py-2">
                      <Text className="font-body text-xs text-cloud">{friend.status}</Text>
                    </View>
                    {friend.lastSignal ? (
                      <View className="rounded-full bg-aqua/20 px-3 py-2">
                        <Text className="font-body text-xs text-cloud">
                          {availabilityLabel(friend.lastSignal)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {friend.insight ? (
                    <View className="mt-3 gap-1">
                      <Text className="font-body text-sm text-aqua/80">
                        {friend.insight.reliabilityLabel}
                      </Text>
                      <Text className="font-body text-sm text-white/60">
                        {friend.insight.cadenceNote}
                      </Text>
                      {friend.insight.clusterLabel ? (
                        <Text className="font-body text-xs uppercase tracking-[1px] text-white/45">
                          {friend.insight.clusterLabel}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                  {friend.sharedLabel ? (
                    <Text className="mt-2 font-body text-sm text-aqua/80">{friend.sharedLabel}</Text>
                  ) : null}
                </View>
                <View className="gap-2">
                  <PillButton
                    label="Ping on Discord"
                    variant="secondary"
                    onPress={() => handleDiscordPing(friend.name)}
                  />
                </View>
              </View>
            </GlassCard>
          ))}
        </View>

        <View className="gap-3">
          <Text className="font-display text-2xl text-cloud">Suggested for your pocket</Text>
          {filteredSuggestions.map((friend) => (
            <GlassCard key={friend.id} className="p-5">
              <View className="flex-row items-center justify-between">
                <View className="max-w-[60%]">
                  <Text className="font-display text-lg text-cloud">{friend.name}</Text>
                  <Text className="mt-1 font-body text-sm text-white/60">
                    {friend.sharedLabel ?? `${friend.sharedServerCount ?? 1} shared servers`}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleQuickAdd(friend.id)}
                  className="rounded-full bg-aqua/20 px-4 py-3"
                >
                  <Text className="font-display text-sm text-cloud">Quick add</Text>
                </Pressable>
              </View>
            </GlassCard>
          ))}
        </View>
      </ScrollView>
    </GradientMesh>
  );
}
