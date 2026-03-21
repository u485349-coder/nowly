import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import type { MobileBookableSlot, MobileBookingProfile } from "@nowly/shared";
import { GradientMesh } from "../../components/ui/GradientMesh";
import { GlassCard } from "../../components/ui/GlassCard";
import { PillButton } from "../../components/ui/PillButton";
import { formatTimeRange } from "../../lib/format";
import { hangoutIntentLabel, vibeLabel } from "../../lib/labels";
import { createSmartOpenUrl } from "../../lib/smart-links";
import { useAppStore } from "../../store/useAppStore";
import { api } from "../../lib/api";

const readErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "Something went sideways. Try again in a second.";
  }

  try {
    const parsed = JSON.parse(error.message) as { error?: string };
    if (parsed.error) {
      return parsed.error;
    }
  } catch {
    return error.message;
  }

  return error.message;
};

export default function BookingInviteScreen() {
  const params = useLocalSearchParams<{ inviteCode?: string | string[] }>();
  const inviteCode = useMemo(
    () => (Array.isArray(params.inviteCode) ? params.inviteCode[0] : params.inviteCode),
    [params.inviteCode],
  );

  const token = useAppStore((state) => state.token);
  const user = useAppStore((state) => state.user);
  const upsertHangout = useAppStore((state) => state.upsertHangout);

  const [bookingProfile, setBookingProfile] = useState<MobileBookingProfile | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isHostViewingOwnLink = Boolean(
    user?.id && bookingProfile?.host.id && user.id === bookingProfile.host.id,
  );

  const selectedSlot =
    bookingProfile?.slots.find((slot) => slot.id === selectedSlotId) ?? bookingProfile?.slots[0] ?? null;

  useEffect(() => {
    if (!inviteCode) {
      setLoading(false);
      setErrorMessage("This availability link is missing a code.");
      return;
    }

    let active = true;
    setLoading(true);
    setErrorMessage(null);

    api
      .fetchBookingProfile(token, inviteCode)
      .then((profile) => {
        if (!active) {
          return;
        }

        setBookingProfile(profile);
        setSelectedSlotId(profile.slots[0]?.id ?? null);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setErrorMessage(readErrorMessage(error));
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [inviteCode, token]);

  const handleShareOwnLink = async () => {
    if (!inviteCode) {
      return;
    }

    const link = createSmartOpenUrl(`/booking/${inviteCode}`);
    await Share.share({
      message: `Pick a time on Nowly that fits what I already opened up: ${link}`,
    });
  };

  const handleSignIn = () => {
    if (!inviteCode) {
      return;
    }

    router.push({
      pathname: "/onboarding",
      params: { bookingInviteCode: inviteCode },
    });
  };

  const handleBookSlot = async () => {
    if (!inviteCode || !selectedSlot) {
      Alert.alert("Pick a time first", "Choose one of the shared windows before booking.");
      return;
    }

    if (!token) {
      handleSignIn();
      return;
    }

    setSubmitting(true);

    try {
      const hangout = await api.bookSharedAvailability(token, inviteCode, {
        startsAt: selectedSlot.startsAt,
        endsAt: selectedSlot.endsAt,
        note: note.trim() || undefined,
      });

      upsertHangout(hangout);
      router.replace(`/proposal/${hangout.id}`);
    } catch (error) {
      Alert.alert("Couldn't lock that slot", readErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const renderSlot = (slot: MobileBookableSlot) => {
    const active = slot.id === selectedSlotId;

    return (
      <Pressable
        key={slot.id}
        onPress={() => setSelectedSlotId(slot.id)}
        className={`rounded-[24px] border p-4 ${
          active ? "border-aqua/80 bg-aqua/10" : "border-white/10 bg-white/5"
        }`}
      >
        <View className="gap-3">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-1">
              <Text className="font-display text-lg text-cloud">{slot.label}</Text>
              <Text className="font-body text-sm leading-6 text-white/60">{slot.summary}</Text>
            </View>
            {slot.mutualFit ? (
              <View className="rounded-full bg-aqua/20 px-3 py-1.5">
                <Text className="font-body text-[11px] uppercase tracking-[1px] text-aqua">
                  Mutual fit
                </Text>
              </View>
            ) : null}
          </View>

          <View className="flex-row flex-wrap gap-2">
            <View className="rounded-full bg-white/8 px-3 py-2">
              <Text className="font-body text-xs text-cloud">
                {formatTimeRange(slot.startsAt, slot.endsAt)}
              </Text>
            </View>
            {slot.sourceLabel ? (
              <View className="rounded-full bg-white/8 px-3 py-2">
                <Text className="font-body text-xs text-cloud">{slot.sourceLabel}</Text>
              </View>
            ) : null}
            {slot.hangoutIntent ? (
              <View className="rounded-full bg-white/8 px-3 py-2">
                <Text className="font-body text-xs text-cloud">
                  {hangoutIntentLabel(slot.hangoutIntent)}
                </Text>
              </View>
            ) : null}
            {slot.vibe ? (
              <View className="rounded-full bg-white/8 px-3 py-2">
                <Text className="font-body text-xs text-cloud">{vibeLabel(slot.vibe)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <GradientMesh>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 62,
          paddingBottom: 56,
          gap: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-start justify-between gap-4">
          <View className="max-w-[80%] gap-2">
            <Text className="font-body text-sm uppercase tracking-[2px] text-aqua/80">
              Shared availability
            </Text>
            <Text className="font-display text-[34px] leading-[38px] text-cloud">
              Pick from the specific windows they already opened up.
            </Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/6"
          >
            <MaterialCommunityIcons name="close" size={20} color="#F8FAFC" />
          </Pressable>
        </View>

        {loading ? (
          <GlassCard className="p-5">
            <Text className="font-body text-sm text-white/60">Loading shared windows...</Text>
          </GlassCard>
        ) : errorMessage ? (
          <GlassCard className="p-5">
            <View className="gap-3">
              <Text className="font-display text-xl text-cloud">This link is not ready</Text>
              <Text className="font-body text-sm leading-6 text-white/60">{errorMessage}</Text>
            </View>
          </GlassCard>
        ) : bookingProfile ? (
          <>
            <GlassCard className="p-5">
              <View className="gap-3">
                <Text className="font-display text-2xl text-cloud">
                  {bookingProfile.host.name || "A friend"}'s open windows
                </Text>
                <Text className="font-body text-sm leading-6 text-white/60">
                  {bookingProfile.host.communityTag || bookingProfile.host.city || "Nearby"} is the
                  base zone for these slots. Pick one and Nowly will turn it into a real hangout.
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {bookingProfile.viewerHasRecurringSchedule ? (
                    <View className="rounded-full bg-aqua/20 px-3 py-2">
                      <Text className="font-body text-xs text-aqua">
                        ranked against your saved windows
                      </Text>
                    </View>
                  ) : (
                    <View className="rounded-full bg-white/8 px-3 py-2">
                      <Text className="font-body text-xs text-cloud">
                        save your own windows later for smarter matches
                      </Text>
                    </View>
                  )}
                  {isHostViewingOwnLink ? (
                    <View className="rounded-full bg-white/8 px-3 py-2">
                      <Text className="font-body text-xs text-cloud">this is your share link</Text>
                    </View>
                  ) : null}
                </View>
                {isHostViewingOwnLink ? (
                  <View className="self-start">
                    <PillButton label="Share this link" variant="secondary" onPress={handleShareOwnLink} />
                  </View>
                ) : null}
              </View>
            </GlassCard>

            {bookingProfile.slots.length ? (
              <View className="gap-3">
                <Text className="font-display text-2xl text-cloud">Available slots</Text>
                {bookingProfile.slots.map(renderSlot)}
              </View>
            ) : (
              <GlassCard className="p-5">
                <Text className="font-body text-sm leading-6 text-white/60">
                  They have not saved any shareable recurring windows yet. Check back once they add
                  one.
                </Text>
              </GlassCard>
            )}

            {!isHostViewingOwnLink && bookingProfile.slots.length ? (
              <GlassCard className="p-5">
                <View className="gap-4">
                  <View className="gap-2">
                    <Text className="font-display text-xl text-cloud">Lock it in</Text>
                    <Text className="font-body text-sm leading-6 text-white/60">
                      Add an optional note, then Nowly will create the hangout and remind both of
                      you on the day.
                    </Text>
                  </View>

                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    className="rounded-3xl border border-white/12 bg-white/8 px-4 py-4 font-body text-base text-cloud"
                    placeholder="Optional note: coffee after class, quick bite, walk nearby..."
                    placeholderTextColor="rgba(248,250,252,0.4)"
                  />

                  {!token ? (
                    <PillButton label="Sign in to pick this time" onPress={handleSignIn} />
                  ) : (
                    <PillButton
                      label={submitting ? "Booking..." : "Book this time"}
                      onPress={() => void handleBookSlot()}
                      disabled={submitting || !selectedSlot}
                    />
                  )}
                </View>
              </GlassCard>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </GradientMesh>
  );
}
