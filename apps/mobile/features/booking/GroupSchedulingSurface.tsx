import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  type MobileGroupBookingProfile,
  type MobileGroupSchedulingMessage,
  type MobileGroupSchedulingSession,
  schedulingVoteStates,
} from "@nowly/shared";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { useResponsiveLayout } from "../../components/ui/useResponsiveLayout";
import { nowlyColors } from "../../constants/theme";
import { api } from "../../lib/api";
import { getSocket } from "../../lib/socket";
import { webPressableStyle } from "../../lib/web-pressable";
import { useAppStore } from "../../store/useAppStore";

type Props = {
  inviteCode: string;
  profile: MobileGroupBookingProfile;
};

const voteLabels = {
  AVAILABLE: "Works",
  MAYBE: "Maybe",
  UNAVAILABLE: "Can't",
} as const;

const readErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "Something went sideways. Try again in a second.";
  }

  try {
    const parsed = JSON.parse(error.message) as { error?: string };
    return parsed.error || error.message;
  } catch {
    return error.message;
  }
};

const avatarFallback = (name: string) => (name.trim()[0] ?? "N").toUpperCase();

const formatDuration = (minutes: number) =>
  minutes >= 60 && minutes % 60 === 0 ? `${minutes / 60} hr` : `${minutes} min`;

const buildVoteDraft = (session: MobileGroupSchedulingSession) =>
  Object.fromEntries(
    session.slots.map((slot) => {
      const currentVote = slot.voters.find(
        (vote) => vote.participantId === session.currentUserParticipantId,
      );

      return [slot.id, currentVote?.status ?? "UNAVAILABLE"];
    }),
  ) as Record<string, (typeof schedulingVoteStates)[number]>;

export const GroupSchedulingSurface = ({ inviteCode, profile }: Props) => {
  const token = useAppStore((state) => state.token);
  const layout = useResponsiveLayout();
  const [session, setSession] = useState(profile.session);
  const [selectedSlotId, setSelectedSlotId] = useState(profile.session.slots[0]?.id ?? null);
  const [voteDraft, setVoteDraft] = useState<Record<string, (typeof schedulingVoteStates)[number]>>(
    () => buildVoteDraft(profile.session),
  );
  const [draftDirty, setDraftDirty] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [submittingVotes, setSubmittingVotes] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [locking, setLocking] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const draftDirtyRef = useRef(draftDirty);

  useEffect(() => {
    setSession(profile.session);
    setSelectedSlotId(profile.session.finalSlotId ?? profile.session.slots[0]?.id ?? null);
    setVoteDraft(buildVoteDraft(profile.session));
    setDraftDirty(false);
  }, [profile.session]);

  useEffect(() => {
    draftDirtyRef.current = draftDirty;
  }, [draftDirty]);

  useEffect(() => {
    const socket = getSocket(token);
    if (!socket) {
      return;
    }

    socket.emit("schedule:join", { shareCode: session.shareCode });

    const handleUpdate = (nextSession: MobileGroupSchedulingSession) => {
      if (nextSession.shareCode !== session.shareCode) {
        return;
      }

      setSession(nextSession);
      setSelectedSlotId((current) => current ?? nextSession.finalSlotId ?? nextSession.slots[0]?.id ?? null);
      if (!draftDirtyRef.current) {
        setVoteDraft(buildVoteDraft(nextSession));
      }
    };

    const handleMessage = (message: MobileGroupSchedulingMessage) => {
      setSession((current) => ({
        ...current,
        messages: [...current.messages, message],
      }));
    };

    socket.on("schedule:update", handleUpdate);
    socket.on("schedule:message", handleMessage);

    return () => {
      socket.off("schedule:update", handleUpdate);
      socket.off("schedule:message", handleMessage);
    };
  }, [session.shareCode, token]);

  const selectedSlot =
    session.slots.find((slot) => slot.id === selectedSlotId) ??
    session.slots.find((slot) => slot.isFinal) ??
    session.slots[0] ??
    null;
  const participantCapReached =
    session.participantCount >= session.participantCap && !session.currentUserParticipantId;
  const visibleBestFits = session.bestFits.slice(0, 3);
  const currentVoteState = selectedSlot ? voteDraft[selectedSlot.id] ?? "UNAVAILABLE" : "UNAVAILABLE";
  const finalizeLabel =
    session.decisionMode === "HOST_DECIDES" ? "Finalize this time" : "Confirm this time";
  const footerSummary = session.finalizedAt
    ? selectedSlot
      ? `Final slot locked: ${selectedSlot.label}`
      : "This group scheduling link has been finalized."
    : session.currentUserHasSubmittedAvailability
      ? "Availability submitted. You can still update it until the poll closes."
      : "Mark your slots, then submit availability so the crew can compare live.";
  const shellStyle = layout.isDesktop
    ? { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: layout.splitGap }
    : undefined;

  const goToSignIn = () => {
    router.push({
      pathname: "/onboarding",
      params: {
        bookingInviteCode: inviteCode,
        bookingSessionShareCode: session.shareCode,
      },
    } as never);
  };

  const handleVoteChange = (status: (typeof schedulingVoteStates)[number]) => {
    if (!selectedSlot || !session.currentUserCanEdit) {
      return;
    }

    setDraftDirty(true);
    setVoteDraft((current) => ({
      ...current,
      [selectedSlot.id]: status,
    }));
  };

  const handleSubmitAvailability = async () => {
    if (!token) {
      goToSignIn();
      return;
    }

    setSubmittingVotes(true);

    try {
      const nextSession = await api.submitGroupSchedulingAvailability(
        token,
        session.shareCode,
        session.slots.map((slot) => ({
          slotId: slot.id,
          status: voteDraft[slot.id] ?? "UNAVAILABLE",
        })),
      );

      setSession(nextSession);
      setVoteDraft(buildVoteDraft(nextSession));
      setDraftDirty(false);
    } catch (error) {
      Alert.alert("Couldn't submit availability", readErrorMessage(error));
    } finally {
      setSubmittingVotes(false);
    }
  };

  const handleFinalize = async () => {
    if (!selectedSlot) {
      return;
    }

    if (!token) {
      goToSignIn();
      return;
    }

    setFinalizing(true);

    try {
      const nextSession = await api.finalizeGroupSchedulingSession(
        token,
        session.shareCode,
        selectedSlot.id,
      );

      setSession(nextSession);
      setDraftDirty(false);
    } catch (error) {
      Alert.alert("Couldn't lock that time", readErrorMessage(error));
    } finally {
      setFinalizing(false);
    }
  };

  const handleLock = async () => {
    if (!token) {
      goToSignIn();
      return;
    }

    setLocking(true);

    try {
      const nextSession = await api.lockGroupSchedulingSession(token, session.shareCode);
      setSession(nextSession);
    } catch (error) {
      Alert.alert("Couldn't lock the poll", readErrorMessage(error));
    } finally {
      setLocking(false);
    }
  };

  const handleSendMessage = async () => {
    const trimmed = messageText.trim();
    if (!trimmed) {
      return;
    }

    if (!token) {
      goToSignIn();
      return;
    }

    setSendingMessage(true);

    try {
      const socket = getSocket(token);
      if (socket) {
        socket.emit("schedule:message", { shareCode: session.shareCode, text: trimmed });
      } else {
        const message = await api.sendGroupSchedulingMessage(token, session.shareCode, trimmed);
        setSession((current) => ({
          ...current,
          messages: [...current.messages, message],
        }));
      }
      setMessageText("");
    } catch (error) {
      Alert.alert("Couldn't send that note", readErrorMessage(error));
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <GradientMesh>
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            alignItems: "center",
            paddingHorizontal: layout.screenPadding,
            paddingTop: layout.isDesktop ? 28 : 16,
            paddingBottom: 210,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[{ width: layout.shellWidth, gap: layout.sectionGap }, shellStyle]}>
            <View style={{ width: layout.leftColumnWidth, gap: layout.sectionGap }}>
              <View className="min-h-[52px] flex-row items-center gap-3">
                <Pressable
                  onPress={() => router.back()}
                  style={({ pressed }) => [
                    styles.iconButton,
                    webPressableStyle(pressed, { pressedOpacity: 0.9, pressedScale: 0.97 }),
                  ]}
                >
                  <MaterialCommunityIcons name="chevron-left" size={24} color="#F7FBFF" />
                </Pressable>

                <View className="flex-1 items-center">
                  <Text className="font-display text-2xl text-cloud">Coordinate the group</Text>
                  <Text className="mt-1 font-body text-[13px] text-white/60">
                    Collaborative scheduling stays separate from normal 1:1 booking.
                  </Text>
                </View>

                <View style={styles.iconButton} />
              </View>

              <GlassCard className="p-5">
                <View className="gap-4">
                  <View className="flex-row items-start gap-4">
                    <View style={styles.heroAvatar}>
                      {profile.host.photoUrl ? (
                        <Image source={{ uri: profile.host.photoUrl }} style={styles.heroAvatarImage} />
                      ) : (
                        <View style={styles.heroAvatarFallback}>
                          <Text style={styles.heroAvatarText}>{avatarFallback(profile.host.name)}</Text>
                        </View>
                      )}
                    </View>

                    <View style={{ flex: 1, gap: 4 }}>
                      <Text className="font-body text-xs tracking-[2px] text-violet/82">
                        GROUP SCHEDULING
                      </Text>
                      <Text className="font-display text-[30px] leading-[34px] text-cloud">
                        {session.title}
                      </Text>
                      <Text className="font-body text-sm text-white/64">
                        {profile.host.name} opened this for collaborative timing.
                      </Text>
                    </View>
                  </View>

                  <Text className="font-body text-sm leading-6 text-white/72">
                    {session.description || "Mark what works, compare the live read, then lock the cleanest time."}
                  </Text>

                  <View className="flex-row flex-wrap gap-2">
                    <View style={styles.metaPill}>
                      <Text style={styles.metaPillText}>{formatDuration(session.durationMinutes)}</Text>
                    </View>
                    <View style={styles.metaPill}>
                      <Text style={styles.metaPillText}>{session.timezone}</Text>
                    </View>
                    <View style={styles.metaPill}>
                      <Text style={styles.metaPillText}>{session.locationName}</Text>
                    </View>
                    <View style={styles.metaPill}>
                      <Text style={styles.metaPillText}>
                        {session.visibilityMode === "PUBLIC" ? "Public votes" : "Anonymous votes"}
                      </Text>
                    </View>
                  </View>

                  <View className="rounded-[24px] bg-white/6 p-4">
                    <Text className="font-display text-lg text-cloud">{session.progress.summary}</Text>
                    <Text className="mt-2 font-body text-sm leading-6 text-white/64">
                      {session.progress.decisionHint}
                    </Text>
                    {session.progress.responseDeadline ? (
                      <Text className="mt-2 font-body text-xs text-aqua/78">
                        Deadline: {new Date(session.progress.responseDeadline).toLocaleString()}
                      </Text>
                    ) : null}
                  </View>

                  {participantCapReached ? (
                    <Text className="font-body text-sm leading-6 text-amber-200/82">
                      This group session has hit its participant cap. You can still follow the live
                      read, but new responses are closed.
                    </Text>
                  ) : null}
                </View>
              </GlassCard>

              {visibleBestFits.length ? (
                <GlassCard className="p-5">
                  <Text className="font-display text-xl text-cloud">Best fits</Text>
                  <View className="mt-4 gap-3">
                    {visibleBestFits.map((slot) => (
                      <Pressable
                        key={slot.id}
                        onPress={() => setSelectedSlotId(slot.id)}
                        style={({ pressed }) => [
                          styles.listCard,
                          slot.id === selectedSlotId ? styles.listCardActive : null,
                          webPressableStyle(pressed, { pressedOpacity: 0.94, pressedScale: 0.99 }),
                        ]}
                      >
                        <View style={{ flex: 1, gap: 4 }}>
                          <Text style={styles.bestFitTitle}>{slot.highlightLabel ?? "Best overall"}</Text>
                          <Text style={styles.cardTitle}>{slot.label}</Text>
                          <Text style={styles.cardMeta}>
                            {slot.yesCount} yes · {slot.maybeCount} maybe · {slot.noCount} no
                          </Text>
                        </View>
                        <View style={styles.rankBadge}>
                          <Text style={styles.rankBadgeText}>#{slot.rank}</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </GlassCard>
              ) : null}

              <GlassCard className="p-5">
                <View className="flex-row items-center justify-between gap-4">
                  <View className="max-w-[76%] gap-1">
                    <Text className="font-display text-xl text-cloud">Scheduling thread</Text>
                    <Text className="font-body text-sm leading-6 text-white/60">
                      Keep it contextual. This thread only lives around the scheduling session.
                    </Text>
                  </View>
                  {session.currentUserIsHost && !session.hostLocked && !session.finalizedAt ? (
                    <PillButton
                      label={locking ? "Locking..." : "Lock poll"}
                      variant="secondary"
                      onPress={() => void handleLock()}
                      disabled={locking}
                    />
                  ) : null}
                </View>

                <View className="mt-4 gap-3">
                  {session.messages.map((message) => (
                    <View
                      key={message.id}
                      style={[
                        styles.messageRow,
                        message.type === "SYSTEM" ? styles.systemMessageRow : null,
                      ]}
                    >
                      {message.sender ? (
                        <View style={styles.messageAvatar}>
                          {message.sender.photoUrl ? (
                            <Image source={{ uri: message.sender.photoUrl }} style={styles.messageAvatarImage} />
                          ) : (
                            <View style={styles.messageAvatarFallback}>
                              <Text style={styles.messageAvatarText}>
                                {avatarFallback(message.sender.name)}
                              </Text>
                            </View>
                          )}
                        </View>
                      ) : (
                        <View style={styles.systemIconShell}>
                          <MaterialCommunityIcons name="star-four-points" size={14} color="#C4B5FD" />
                        </View>
                      )}

                      <View style={{ flex: 1, gap: 4 }}>
                        <Text
                          style={[
                            styles.messageSender,
                            message.collaborationColor ? { color: message.collaborationColor } : null,
                          ]}
                        >
                          {message.sender?.name ?? "Nowly"}
                        </Text>
                        <Text style={styles.messageCopy}>{message.text}</Text>
                      </View>

                      <Text style={styles.messageTime}>
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  ))}
                </View>

                <View className="mt-4 flex-row items-center gap-3">
                  <TextInput
                    value={messageText}
                    onChangeText={setMessageText}
                    placeholder="I can do after 6, prefer Saturday, driving from campus..."
                    placeholderTextColor="rgba(248,250,252,0.38)"
                    className="flex-1 rounded-[24px] border border-white/10 bg-white/6 px-4 py-4 font-body text-base text-cloud"
                  />
                  <PillButton
                    label={sendingMessage ? "Sending..." : "Send"}
                    onPress={() => void handleSendMessage()}
                    disabled={sendingMessage}
                  />
                </View>
              </GlassCard>
            </View>
            <View style={{ width: layout.rightColumnWidth, gap: layout.sectionGap }}>
              <GlassCard className="p-5">
                <Text className="font-display text-xl text-cloud">Slots</Text>
                <Text className="mt-2 font-body text-sm leading-6 text-white/60">
                  Counts first, avatars second, details on tap.
                </Text>

                <View className="mt-4 gap-3">
                  {session.slots.map((slot) => {
                    const visibleAvatars =
                      session.visibilityMode === "PUBLIC"
                        ? slot.voters.filter((vote) => vote.status !== "UNAVAILABLE").slice(0, 4)
                        : [];

                    return (
                      <Pressable
                        key={slot.id}
                        onPress={() => setSelectedSlotId(slot.id)}
                        style={({ pressed }) => [
                          styles.listCard,
                          slot.id === selectedSlotId ? styles.listCardActive : null,
                          slot.isFinal ? styles.listCardFinal : null,
                          webPressableStyle(pressed, { pressedOpacity: 0.94, pressedScale: 0.99 }),
                        ]}
                      >
                        <View className="flex-row items-start justify-between gap-4">
                          <View style={{ flex: 1, gap: 6 }}>
                            <Text style={styles.cardTitle}>{slot.label}</Text>
                            <Text style={styles.cardMeta}>
                              {slot.yesCount} yes · {slot.maybeCount} maybe · {slot.noCount} no
                            </Text>
                            {slot.highlightLabel ? (
                              <Text style={styles.bestFitTitle}>{slot.highlightLabel}</Text>
                            ) : null}
                          </View>

                          {slot.isFinal ? (
                            <View style={styles.lockedBadge}>
                              <Text style={styles.lockedBadgeText}>Locked</Text>
                            </View>
                          ) : (
                            <View style={styles.rankBadge}>
                              <Text style={styles.rankBadgeText}>#{slot.rank}</Text>
                            </View>
                          )}
                        </View>

                        {visibleAvatars.length ? (
                          <View className="mt-4 flex-row items-center">
                            {visibleAvatars.map((vote, index) => (
                              <View
                                key={`${slot.id}-${vote.participantId}`}
                                style={[
                                  styles.stackAvatar,
                                  index > 0 ? { marginLeft: -12 } : null,
                                  { borderColor: vote.collaborationColor },
                                ]}
                              >
                                {vote.photoUrl ? (
                                  <Image source={{ uri: vote.photoUrl }} style={styles.stackAvatarImage} />
                                ) : (
                                  <View style={styles.stackAvatarFallback}>
                                    <Text style={styles.stackAvatarText}>
                                      {avatarFallback(vote.name)}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </GlassCard>

              {selectedSlot ? (
                <GlassCard className="p-5">
                  <Text className="font-display text-xl text-cloud">{selectedSlot.label}</Text>
                  <Text className="mt-2 font-body text-sm text-white/62">
                    {selectedSlot.yesCount} yes · {selectedSlot.maybeCount} maybe · {selectedSlot.noCount} no
                  </Text>

                  {session.finalizedAt ? (
                    <View className="mt-5 gap-3">
                      <Text className="font-body text-sm leading-6 text-aqua/82">
                        This time is finalized. Availability edits are closed and reminders now follow
                        the confirmed hangout.
                      </Text>
                      {session.finalHangoutId ? (
                        <PillButton
                          label="Open confirmed hangout"
                          onPress={() => router.push(`/proposal/${session.finalHangoutId}`)}
                        />
                      ) : null}
                    </View>
                  ) : (
                    <>
                      {session.currentUserCanEdit ? (
                        <View className="mt-5 gap-3">
                          <Text className="font-display text-base text-cloud">Your read</Text>
                          <View className="flex-row flex-wrap gap-2">
                            {schedulingVoteStates.map((status) => (
                              <Pressable
                                key={status}
                                onPress={() => handleVoteChange(status)}
                                style={({ pressed }) => [
                                  styles.voteChip,
                                  currentVoteState === status ? styles.voteChipActive : null,
                                  webPressableStyle(pressed, {
                                    pressedOpacity: 0.92,
                                    pressedScale: 0.985,
                                  }),
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.voteChipText,
                                    currentVoteState === status ? styles.voteChipTextActive : null,
                                  ]}
                                >
                                  {voteLabels[status]}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      ) : (
                        <Text className="mt-5 font-body text-sm leading-6 text-white/62">
                          {token ? "This poll is locked for edits now." : "Sign in to mark what works for you."}
                        </Text>
                      )}

                      <View className="mt-5 gap-3">
                        <Text className="font-display text-base text-cloud">Slot detail</Text>
                        {session.visibilityMode === "PUBLIC" ? (
                          selectedSlot.voters.length ? (
                            selectedSlot.voters.map((vote) => (
                              <View
                                key={`${selectedSlot.id}-${vote.participantId}`}
                                className="flex-row items-center justify-between gap-4"
                              >
                                <View className="max-w-[68%] flex-row items-center gap-3">
                                  <View style={[styles.detailAvatar, { borderColor: vote.collaborationColor }]}>
                                    {vote.photoUrl ? (
                                      <Image source={{ uri: vote.photoUrl }} style={styles.detailAvatarImage} />
                                    ) : (
                                      <View style={styles.detailAvatarFallback}>
                                        <Text style={styles.detailAvatarText}>
                                          {avatarFallback(vote.name)}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                  <Text style={[styles.detailName, { color: vote.collaborationColor }]}>
                                    {vote.name}
                                  </Text>
                                </View>
                                <Text style={styles.detailStatus}>{voteLabels[vote.status]}</Text>
                              </View>
                            ))
                          ) : (
                            <Text className="font-body text-sm leading-6 text-white/58">
                              Nobody has weighed in on this slot yet.
                            </Text>
                          )
                        ) : (
                          <Text className="font-body text-sm leading-6 text-white/58">
                            Anonymous mode is on. Invitees only see aggregate counts here.
                          </Text>
                        )}
                      </View>

                      {selectedSlot.eligible && session.currentUserCanFinalize ? (
                        <View className="mt-5 gap-3">
                          <Text className="font-body text-sm leading-6 text-aqua/82">
                            This slot is eligible under the current decision rule.
                          </Text>
                          <PillButton
                            label={finalizing ? "Locking..." : finalizeLabel}
                            onPress={() => void handleFinalize()}
                            disabled={finalizing}
                          />
                        </View>
                      ) : null}
                    </>
                  )}
                </GlassCard>
              ) : null}
            </View>
          </View>
        </ScrollView>

        <View pointerEvents="box-none" style={[styles.footerDockWrap, { paddingHorizontal: layout.screenPadding }]}>
          <View style={{ width: layout.shellWidth, alignSelf: "center" }}>
            <LinearGradient
              colors={["rgba(4,8,20,0.00)", "rgba(4,8,20,0.74)", "rgba(4,8,20,0.94)"]}
              style={styles.footerFade}
            >
              <View style={styles.footerCard}>
                <Text className="pb-[10px] text-center font-body text-[13px] text-white/72">
                  {footerSummary}
                </Text>
                <PillButton
                  label={
                    !token
                      ? "Sign in to respond"
                      : submittingVotes
                        ? "Submitting..."
                        : "Submit availability"
                  }
                  onPress={() => void handleSubmitAvailability()}
                  disabled={
                    Boolean(session.finalizedAt) ||
                    submittingVotes ||
                    participantCapReached ||
                    (!session.currentUserCanEdit && Boolean(token))
                  }
                />
              </View>
            </LinearGradient>
          </View>
        </View>
      </View>
    </GradientMesh>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  heroAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroAvatarImage: { width: "100%", height: "100%" },
  heroAvatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroAvatarText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 22,
  },
  metaPill: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaPillText: {
    color: "rgba(247,251,255,0.86)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
  },
  listCard: {
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  listCardActive: {
    shadowColor: nowlyColors.glow,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  listCardFinal: {
    backgroundColor: "rgba(125,211,252,0.1)",
  },
  bestFitTitle: {
    color: "rgba(196,181,253,0.92)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  cardTitle: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 17,
    lineHeight: 22,
  },
  cardMeta: {
    color: "rgba(247,251,255,0.58)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
  },
  rankBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  rankBadgeText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 12,
  },
  lockedBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  lockedBadgeText: {
    color: "#081120",
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 12,
  },
  stackAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  stackAvatarImage: { width: "100%", height: "100%" },
  stackAvatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  stackAvatarText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 12,
  },
  voteChip: {
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  voteChipActive: {
    backgroundColor: "rgba(196,181,253,0.22)",
  },
  voteChipText: {
    color: "rgba(247,251,255,0.76)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 13,
  },
  voteChipTextActive: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  detailAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: "hidden",
    borderWidth: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  detailAvatarImage: { width: "100%", height: "100%" },
  detailAvatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  detailAvatarText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 12,
  },
  detailName: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 15,
  },
  detailStatus: {
    color: "rgba(247,251,255,0.7)",
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 13,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  systemMessageRow: {
    backgroundColor: "rgba(196,181,253,0.08)",
  },
  messageAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: "hidden",
  },
  messageAvatarImage: { width: "100%", height: "100%" },
  messageAvatarFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  messageAvatarText: {
    color: nowlyColors.cloud,
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 12,
  },
  systemIconShell: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  messageSender: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 14,
  },
  messageCopy: {
    color: "rgba(247,251,255,0.74)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  messageTime: {
    color: "rgba(247,251,255,0.44)",
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 11,
  },
  footerDockWrap: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
  },
  footerFade: {
    paddingTop: 24,
    paddingBottom: 18,
  },
  footerCard: {
    borderRadius: 30,
    backgroundColor: "rgba(8,14,28,0.76)",
    padding: 8,
  },
});
