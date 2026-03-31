import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassCard } from "../../../components/ui/GlassCard";
import { PillButton } from "../../../components/ui/PillButton";
import { nowlyColors } from "../../../constants/theme";
import { MobileSearchField } from "../components/MobileSearchField";
import { MobileScreen } from "../components/MobileScreen";
import { MobileSectionHeader } from "../components/MobileSectionHeader";
import { MobileStickyActions } from "../components/MobileStickyActions";

type FriendRow = {
  id: string;
  name: string;
  photoUrl?: string | null;
  detail?: string | null;
  selected: boolean;
};

type SelectedFriend = {
  id: string;
  name: string;
};

export const NewGroupChatMobileScreen = ({
  onBack,
  search,
  onChangeSearch,
  title,
  onChangeTitle,
  selectedFriends,
  friends,
  onToggleFriend,
  createLabel,
  createDisabled,
  onCreate,
}: {
  onBack: () => void;
  search: string;
  onChangeSearch: (value: string) => void;
  title: string;
  onChangeTitle: (value: string) => void;
  selectedFriends: SelectedFriend[];
  friends: FriendRow[];
  onToggleFriend: (id: string) => void;
  createLabel: string;
  createDisabled: boolean;
  onCreate: () => void;
}) => (
  <MobileScreen
    label="New group"
    title="Build the thread first"
    subtitle="Search, tap people in, then let the group line live on its own."
    onBack={onBack}
    footer={
      <MobileStickyActions>
        <PillButton label={createLabel} onPress={onCreate} disabled={createDisabled} />
      </MobileStickyActions>
    }
  >
    <MobileSearchField value={search} onChangeText={onChangeSearch} placeholder="Search your crew" />

    <GlassCard className="p-4">
      <View style={{ gap: 12 }}>
        <MobileSectionHeader label="Setup" title="Give it a name if you want" />
        <TextInput
          value={title}
          onChangeText={onChangeTitle}
          placeholder="Friday after class, Uptown crew, Study break..."
          placeholderTextColor="rgba(247,251,255,0.4)"
          style={styles.input}
        />
        {selectedFriends.length ? (
          <View style={styles.selectedRail}>
            {selectedFriends.map((friend) => (
              <Pressable key={friend.id} onPress={() => onToggleFriend(friend.id)} style={styles.selectedChip}>
                <Text style={styles.selectedChipText}>{friend.name}</Text>
                <MaterialCommunityIcons name="close" size={14} color={nowlyColors.cloud} />
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyCopy}>Pick at least two friends to start the private line.</Text>
        )}
      </View>
    </GlassCard>

    <View style={{ gap: 12 }}>
      <MobileSectionHeader label="Friends" title="Tap people in" />
      {friends.map((friend) => (
        <Pressable key={friend.id} onPress={() => onToggleFriend(friend.id)}>
          <GlassCard className="p-4">
            <View style={styles.friendRow}>
              {friend.photoUrl ? (
                <Image source={{ uri: friend.photoUrl }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>{(friend.name[0] ?? "N").toUpperCase()}</Text>
                </View>
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.friendName}>{friend.name}</Text>
                {friend.detail ? <Text style={styles.friendDetail}>{friend.detail}</Text> : null}
              </View>
              <MaterialCommunityIcons
                name={friend.selected ? "check-circle" : "circle-outline"}
                size={24}
                color={friend.selected ? nowlyColors.aqua : "rgba(247,251,255,0.32)"}
              />
            </View>
          </GlassCard>
        </Pressable>
      ))}
    </View>

  </MobileScreen>
);

const styles = StyleSheet.create({
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)" },
  avatarInitial: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_700Bold", fontSize: 18 },
  emptyCopy: { color: "rgba(247,251,255,0.58)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 13, lineHeight: 18 },
  friendDetail: { color: "rgba(247,251,255,0.56)", fontFamily: "SpaceGrotesk_400Regular", fontSize: 13 },
  friendName: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_700Bold", fontSize: 17 },
  friendRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  input: { minHeight: 54, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 15, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_400Regular", fontSize: 15 },
  selectedChip: { height: 38, borderRadius: 19, paddingHorizontal: 12, backgroundColor: "rgba(139,234,255,0.14)", flexDirection: "row", alignItems: "center", gap: 8 },
  selectedChipText: { color: nowlyColors.cloud, fontFamily: "SpaceGrotesk_500Medium", fontSize: 13 },
  selectedRail: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
