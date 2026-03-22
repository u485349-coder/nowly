import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { findPromptAction } from "../../features/prompts/prompt-actions";
import { api } from "../../lib/api";
import { availabilityLabel } from "../../lib/labels";
import { webPressableStyle } from "../../lib/web-pressable";
import { useAppStore } from "../../store/useAppStore";

type PromptRecipient = {
  id: string;
  name: string;
  photoUrl?: string | null;
  eyebrow: string;
  detail: string;
};

export default function PromptPickerScreen() {
  const { promptKey, recipientId } = useLocalSearchParams<{
    promptKey: string;
    recipientId?: string | string[];
  }>();
  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const matches = useAppStore((state) => state.matches);
  const friends = useAppStore((state) => state.friends);
  const upsertHangout = useAppStore((state) => state.upsertHangout);
  const prompt = findPromptAction(promptKey);
  const [customLabel, setCustomLabel] = useState(prompt?.label ?? "");
  const [customDetail, setCustomDetail] = useState(prompt?.detail ?? "");
  const [customActivity, setCustomActivity] = useState(prompt?.activity ?? "");
  const matchByRecipientId = useMemo(
    () => new Map(matches.map((match) => [match.matchedUser.id, match])),
    [matches],
  );

  const recipients = useMemo<PromptRecipient[]>(() => {
    const seen = new Set<string>();
    const next: PromptRecipient[] = [];

    matches.forEach((match) => {
      if (seen.has(match.matchedUser.id)) {
        return;
      }

      seen.add(match.matchedUser.id);
      next.push({
        id: match.matchedUser.id,
        name: match.matchedUser.name,
        photoUrl: match.matchedUser.photoUrl,
        eyebrow:
          match.reason.meetingStyle === "ONLINE"
            ? `${availabilityLabel(match.matchedSignal.state).toLowerCase()} · ${match.reason.onlineVenue ?? "online"}`
            : `${availabilityLabel(match.matchedSignal.state).toLowerCase()} · ${match.reason.travelMinutes ?? 15} min away`,
        detail: match.insightLabel ?? match.reason.momentumLabel ?? "Strong short-notice fit",
      });
    });

    friends.forEach((friend) => {
      if (seen.has(friend.id)) {
        return;
      }

      seen.add(friend.id);
      next.push({
        id: friend.id,
        name: friend.name,
        photoUrl: friend.photoUrl,
        eyebrow: friend.lastSignal
          ? `${availabilityLabel(friend.lastSignal).toLowerCase()} · crew friend`
          : "crew friend",
        detail:
          friend.insight?.cadenceNote ??
          friend.sharedLabel ??
          "Send the prompt now and let timing do the rest.",
      });
    });

    return next;
  }, [friends, matches]);

  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(
    recipients[0]?.id ?? null,
  );
  const preferredRecipientId = Array.isArray(recipientId) ? recipientId[0] : recipientId;

  useEffect(() => {
    if (!recipients.length) {
      setSelectedRecipientId(null);
      return;
    }

    if (preferredRecipientId && recipients.some((recipient) => recipient.id === preferredRecipientId)) {
      setSelectedRecipientId(preferredRecipientId);
      return;
    }

    if (!selectedRecipientId || !recipients.some((recipient) => recipient.id === selectedRecipientId)) {
      setSelectedRecipientId(recipients[0].id);
    }
  }, [preferredRecipientId, recipients, selectedRecipientId]);

  useEffect(() => {
    setCustomLabel(prompt?.label ?? "");
    setCustomDetail(prompt?.detail ?? "");
    setCustomActivity(prompt?.activity ?? "");
  }, [prompt?.activity, prompt?.detail, prompt?.label]);

  const selectedRecipient = recipients.find((recipient) => recipient.id === selectedRecipientId) ?? null;
  const selectedMatch = selectedRecipientId
    ? matchByRecipientId.get(selectedRecipientId) ?? null
    : null;

  const handleSendPrompt = async () => {
    if (!prompt || !selectedRecipientId) {
      return;
    }

    const nextActivity = customActivity.trim() || prompt.activity;

    try {
      const hangout = await api.createHangout(token, {
        activity: nextActivity,
        microType: prompt.microType,
        commitmentLevel: prompt.commitmentLevel,
        locationName:
          selectedMatch?.reason.onlineVenue ||
          user?.communityTag ||
          user?.city ||
          "nearby",
        participantIds: [selectedRecipientId],
        scheduledFor: new Date(Date.now() + 35 * 60 * 1000).toISOString(),
      });

      upsertHangout(hangout);
      router.replace(`/proposal/${hangout.id}`);
    } catch (error) {
      Alert.alert(
        "Could not send that prompt",
        error instanceof Error ? error.message : "Try that again.",
      );
    }
  };

  if (!prompt) {
    return (
      <GradientMesh>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="font-display text-3xl text-cloud">Prompt not found</Text>
          <Text className="mt-3 text-center font-body text-base leading-7 text-white/60">
            That prompt does not exist anymore. Head back and pick another one.
          </Text>
        </View>
      </GradientMesh>
    );
  }

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
              Send prompt
            </Text>
            <Text className="font-display text-[34px] leading-[38px] text-cloud">
              Choose who should get this nudge.
            </Text>
            <Text className="font-body text-sm leading-6 text-white/60">
              Pick a match or friend, then send one clean low-pressure move.
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
            <View className="self-start rounded-full border border-white/10 bg-white/6 px-4 py-2.5">
              <Text className="font-body text-xs text-cloud">
                {customLabel.trim() || prompt.label}
              </Text>
            </View>
            <Text className="font-body text-base leading-7 text-cloud">
              {customDetail.trim() || prompt.detail}
            </Text>
            <Text className="font-body text-sm leading-6 text-white/60">
              This will open a real proposal thread, not just send a vague ping.
            </Text>
          </View>
        </GlassCard>

        <GlassCard className="p-5">
          <View className="gap-3">
            <Text className="font-display text-xl text-cloud">Make it yours</Text>
            <Text className="font-body text-sm leading-6 text-white/60">
              Keep the preset if it already works, or tweak the wording before you send it.
            </Text>

            <TextInput
              value={customLabel}
              onChangeText={setCustomLabel}
              placeholder={prompt.label}
              placeholderTextColor="rgba(248,250,252,0.4)"
              className="rounded-[24px] border border-white/12 bg-white/8 px-4 py-4 font-body text-base text-cloud"
            />

            <TextInput
              value={customDetail}
              onChangeText={setCustomDetail}
              placeholder={prompt.detail}
              placeholderTextColor="rgba(248,250,252,0.4)"
              className="rounded-[24px] border border-white/12 bg-white/8 px-4 py-4 font-body text-base text-cloud"
            />

            <TextInput
              value={customActivity}
              onChangeText={setCustomActivity}
              placeholder={prompt.activity}
              placeholderTextColor="rgba(248,250,252,0.4)"
              className="rounded-[24px] border border-white/12 bg-white/8 px-4 py-4 font-body text-base text-cloud"
            />

            <Text className="font-body text-sm leading-6 text-aqua/80">
              The final plan line becomes: {customActivity.trim() || prompt.activity}
            </Text>
          </View>
        </GlassCard>

        <View className="gap-3">
          <Text className="font-display text-2xl text-cloud">Who should see it?</Text>

          {recipients.length ? (
            recipients.map((recipient) => {
              const selected = recipient.id === selectedRecipientId;

              return (
                <Pressable
                  key={recipient.id}
                  onPress={() => setSelectedRecipientId(recipient.id)}
                  className={`rounded-[28px] border p-4 ${selected ? "border-aqua/55 bg-aqua/10" : "border-white/10 bg-white/[0.04]"}`}
                  style={({ pressed }) => webPressableStyle(pressed)}
                >
                  <View className="flex-row items-center gap-4">
                    {recipient.photoUrl ? (
                      <Image
                        source={{ uri: recipient.photoUrl }}
                        className="h-14 w-14 rounded-full"
                      />
                    ) : (
                      <View className="h-14 w-14 items-center justify-center rounded-full bg-white/10">
                        <Text className="font-display text-lg text-cloud">
                          {recipient.name.slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                    )}

                    <View className="flex-1 gap-1">
                      <Text className="font-display text-lg text-cloud">{recipient.name}</Text>
                      <Text className="font-body text-sm text-white/58">{recipient.eyebrow}</Text>
                      <Text className="font-body text-sm leading-6 text-aqua/82">
                        {recipient.detail}
                      </Text>
                    </View>

                    {selected ? (
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={24}
                        color="#22D3EE"
                      />
                    ) : null}
                  </View>
                </Pressable>
              );
            })
          ) : (
            <GlassCard className="p-5">
              <Text className="font-display text-xl text-cloud">No crew available yet</Text>
              <Text className="mt-2 font-body text-sm leading-6 text-white/60">
                Once matches and friends populate, you will be able to send this prompt from here.
              </Text>
            </GlassCard>
          )}
        </View>

        <PillButton
          label={
            selectedRecipient
              ? `Send to ${selectedRecipient.name}`
              : "Pick someone first"
          }
          onPress={() => void handleSendPrompt()}
          disabled={!selectedRecipient}
        />
      </ScrollView>
    </GradientMesh>
  );
}
