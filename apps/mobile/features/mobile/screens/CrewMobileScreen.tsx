import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassCard } from "../../../components/ui/GlassCard";
import { nowlyColors } from "../../../constants/theme";
import { MobileHeroCard } from "../components/MobileHeroCard";
import { MobileScreen } from "../components/MobileScreen";
import { MobileSearchField } from "../components/MobileSearchField";
import { MobileSectionHeader } from "../components/MobileSectionHeader";

type ConversationRow = {
  id: string;
  title: string;
  subtitle: string;
  timestamp?: string;
  unreadCount?: number;
  photoUrl?: string | null;
  onPress: () => void;
};

type CrewPerson = {
  id: string;
  name: string;
  subtitle: string;
  detail?: string;
  photoUrl?: string | null;
  onMessage: () => void;
  onNudge: () => void;
};

type SocialEdge = {
  id: string;
  name: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
};

export const CrewMobileScreen = ({
  search,
  onChangeSearch,
  onCreateGroup,
  conversations,
  livePeople,
  socialEdges,
}: {
  search: string;
  onChangeSearch: (value: string) => void;
  onCreateGroup: () => void;
  conversations: ConversationRow[];
  livePeople: CrewPerson[];
  socialEdges: SocialEdge[];
}) => (
  <MobileScreen
    label="Crew"
    title="Conversations first"
    subtitle="See who is active, what feels warm, and where to start something."
    right={
      <Pressable onPress={onCreateGroup} hitSlop={8} style={styles.addButton}>
        <MaterialCommunityIcons name="plus" size={20} color={nowlyColors.cloud} />
      </Pressable>
    }
  >
    <MobileSearchField value={search} onChangeText={onChangeSearch} placeholder="Search crew, threads, or names" />

    <MobileHeroCard
      eyebrow="Active now"
      title={
        livePeople.length
          ? `${livePeople.length} people look reachable right now`
          : "Your warmest people will stack here"
      }
      copy="Private conversations stay first. Live people and social edges sit underneath so the next move stays obvious."
    >
      <Pressable onPress={onCreateGroup} style={styles.heroInlineAction}>
        <Text style={styles.heroInlineText}>Start a thread</Text>
      </Pressable>
    </MobileHeroCard>

    <View style={styles.sectionGap}>
      <MobileSectionHeader label="Messages" title="Active conversations" />
      <GlassCard className="p-4">
        <View style={styles.stack}>
          {conversations.map((item) => (
            <Pressable key={item.id} onPress={item.onPress} style={styles.conversationRow}>
              <Avatar name={item.title} photoUrl={item.photoUrl} />
              <View style={styles.conversationCopy}>
                <Text numberOfLines={1} style={styles.conversationTitle}>{item.title}</Text>
                <Text numberOfLines={1} style={styles.conversationSubtitle}>{item.subtitle}</Text>
              </View>
              <View style={styles.conversationMeta}>
                {item.timestamp ? <Text style={styles.conversationTime}>{item.timestamp}</Text> : null}
                {item.unreadCount ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{item.unreadCount > 99 ? "99+" : item.unreadCount}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      </GlassCard>
    </View>

    <View style={styles.sectionGap}>
      <MobileSectionHeader label="Live people" title="Who feels open" />
      <View style={styles.stack}>
        {livePeople.map((person) => (
          <GlassCard key={person.id} className="p-4">
            <View style={styles.liveRow}>
              <Avatar name={person.name} photoUrl={person.photoUrl} />
              <View style={styles.liveCopy}>
                <Text style={styles.liveName}>{person.name}</Text>
                <Text style={styles.liveSubtitle}>{person.subtitle}</Text>
                {person.detail ? <Text style={styles.liveDetail}>{person.detail}</Text> : null}
              </View>
            </View>
            <View style={styles.liveActions}>
              <Pressable onPress={person.onMessage} style={styles.inlineActionPrimary}>
                <Text style={styles.inlineActionPrimaryText}>Message</Text>
              </Pressable>
              <Pressable onPress={person.onNudge} style={styles.inlineActionSecondary}>
                <Text style={styles.inlineActionSecondaryText}>Start something</Text>
              </Pressable>
            </View>
          </GlassCard>
        ))}
      </View>
    </View>

    {socialEdges.length ? (
      <View style={styles.sectionGap}>
        <MobileSectionHeader label="Social edges" title="Requests and nearby people" />
        <View style={styles.stack}>
          {socialEdges.map((edge) => (
            <GlassCard key={edge.id} className="p-4">
              <View style={styles.edgeRow}>
                <View style={styles.edgeCopy}>
                  <Text style={styles.edgeTitle}>{edge.name}</Text>
                  <Text style={styles.edgeSubtitle}>{edge.subtitle}</Text>
                </View>
                <View style={styles.edgeActions}>
                  {edge.secondaryActionLabel && edge.onSecondaryAction ? (
                    <Pressable onPress={edge.onSecondaryAction} style={styles.edgeSecondaryAction}>
                      <Text style={styles.edgeSecondaryActionText}>{edge.secondaryActionLabel}</Text>
                    </Pressable>
                  ) : null}
                  <Pressable onPress={edge.onAction} style={styles.edgeAction}>
                    <Text style={styles.edgeActionText}>{edge.actionLabel}</Text>
                  </Pressable>
                </View>
              </View>
            </GlassCard>
          ))}
        </View>
      </View>
    ) : null}
  </MobileScreen>
);

const Avatar = ({ name, photoUrl }: { name: string; photoUrl?: string | null }) => (
  <View style={styles.avatarShell}>
    {photoUrl ? (
      <Image source={{ uri: photoUrl }} style={styles.avatarImage} resizeMode="cover" />
    ) : (
      <View style={styles.avatarFallback}>
        <Text style={styles.avatarInitial}>{(name[0] ?? "N").toUpperCase()}</Text>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  avatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitial: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
  },
  avatarShell: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  conversationCopy: {
    flex: 1,
    gap: 2,
  },
  conversationMeta: {
    alignItems: "flex-end",
    gap: 8,
    minWidth: 42,
  },
  conversationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  conversationSubtitle: {
    color: "rgba(247,251,255,0.56)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  conversationTime: {
    color: "rgba(247,251,255,0.46)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 11,
  },
  conversationTitle: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
  },
  edgeAction: {
    minWidth: 78,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,234,255,0.14)",
  },
  edgeActionText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 13,
  },
  edgeActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  edgeCopy: {
    flex: 1,
    gap: 3,
  },
  edgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  edgeSubtitle: {
    color: "rgba(247,251,255,0.58)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  edgeTitle: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
  },
  edgeSecondaryAction: {
    minWidth: 78,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  edgeSecondaryActionText: {
    color: "rgba(247,251,255,0.84)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 13,
  },
  heroInlineAction: {
    alignSelf: "flex-start",
    marginTop: 2,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  heroInlineText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 13,
  },
  inlineActionPrimary: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(139,234,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  inlineActionPrimaryText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 13,
  },
  inlineActionSecondary: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  inlineActionSecondaryText: {
    color: "rgba(247,251,255,0.88)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 13,
  },
  liveActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  liveCopy: {
    flex: 1,
    gap: 2,
  },
  liveDetail: {
    color: "rgba(139,234,255,0.82)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  liveName: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 17,
  },
  liveRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  liveSubtitle: {
    color: "rgba(247,251,255,0.64)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  sectionGap: {
    gap: 12,
  },
  stack: {
    gap: 12,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: nowlyColors.aqua,
  },
  unreadBadgeText: {
    color: "#081120",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 11,
  },
});
