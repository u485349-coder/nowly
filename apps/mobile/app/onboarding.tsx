import { startTransition, useEffect, useMemo, useState } from "react";
import { Alert, Image, Platform, ScrollView, Share, Text, TextInput, View } from "react-native";
import { GradientMesh } from "../components/ui/GradientMesh";
import { GlassCard } from "../components/ui/GlassCard";
import { PillButton } from "../components/ui/PillButton";
import { SignalChip } from "../components/ui/SignalChip";
import { NowlyMark } from "../components/branding/NowlyMark";
import * as Contacts from "expo-contacts";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "../lib/api";
import { track } from "../lib/analytics";
import { NOWLY_DESCRIPTION, NOWLY_SLOGAN } from "../lib/branding";
import { useAppStore } from "../store/useAppStore";

type Stage = "phone" | "otp" | "profile";

export default function OnboardingScreen() {
  const params = useLocalSearchParams<{
    bookingInviteCode?: string | string[];
    referralToken?: string | string[];
  }>();
  const bookingInviteCode = Array.isArray(params.bookingInviteCode)
    ? params.bookingInviteCode[0]
    : params.bookingInviteCode;
  const referralToken = Array.isArray(params.referralToken)
    ? params.referralToken[0]
    : params.referralToken;
  const setSession = useAppStore((state) => state.setSession);
  const finishOnboarding = useAppStore((state) => state.finishOnboarding);
  const token = useAppStore((state) => state.token);

  const [stage, setStage] = useState<Stage>("phone");
  const [phone, setPhone] = useState("+1");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("Avery");
  const [city, setCity] = useState("New York");
  const [communityTag, setCommunityTag] = useState("NYU");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFileName, setPhotoFileName] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Array<{ id: string; name: string; phone: string }>>([]);
  const [inviteStatus, setInviteStatus] = useState("Build your crew immediately.");
  const [isFinishing, setIsFinishing] = useState(false);

  const stageIndex = useMemo(
    () => ({
      phone: 1,
      otp: 2,
      profile: 3,
    })[stage],
    [stage],
  );

  useEffect(() => {
    if (!token || !referralToken) {
      return;
    }

    api.redeemInvite(token, referralToken).catch(() => undefined);
  }, [referralToken, token]);

  const loadContacts = async () => {
    if (Platform.OS === "web") {
      setInviteStatus("Contact import stays in the app for now. Use invite cards below in browser.");
      return;
    }

    const permission = await Contacts.requestPermissionsAsync();
    if (permission.status !== "granted") {
      return;
    }

    const response = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers],
    });

    setContacts(
      response.data
        .filter((contact) => contact.phoneNumbers?.[0]?.number)
        .slice(0, 6)
        .map((contact) => ({
          id: contact.id ?? contact.name,
          name: contact.name,
          phone: contact.phoneNumbers?.[0]?.number ?? "",
        })),
    );
  };

  const handleRequestOtp = async () => {
    const response = await api.requestOtp(phone);
    setDevCode(response.devCode ?? null);
    setStage("otp");
  };

  const handleVerifyOtp = async () => {
    const session = await api.verifyOtp(phone, otp || devCode || "111111");
    setSession(session.token, session.user);

    if (referralToken) {
      await api.redeemInvite(session.token, referralToken).catch(() => undefined);
    }

    if ((session.user as { onboardingCompleted?: boolean }).onboardingCompleted) {
      if (bookingInviteCode) {
        router.replace({
          pathname: "/booking/[inviteCode]",
          params: { inviteCode: bookingInviteCode },
        });
        return;
      }

      router.replace("/(app)/home");
      return;
    }

    setStage("profile");
  };

  const handleInvite = async (invitePhone: string) => {
    const invites = await api.sendInvite(token, [invitePhone]);
    const invite = invites[0];

    if (invite) {
      if (Platform.OS === "web" && typeof navigator !== "undefined") {
        if (navigator.share) {
          await navigator.share({
            text: invite.smsTemplate,
          });
        } else if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(invite.smsTemplate);
        }
      } else {
        await Share.share({
          message: invite.smsTemplate,
        });
      }
      setInviteStatus(`Invite ready for ${invitePhone}`);
    }
  };

  const handleDiscordLink = async () => {
    const url = await api.getDiscordOauthUrl(token);
    Linking.openURL(url);
  };

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Photos permission needed", "Allow photo access so you can add a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.45,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset?.base64) {
      Alert.alert("Photo couldn't be added", "Try another image and we'll pull it in.");
      return;
    }

    const mimeType = asset.mimeType && asset.mimeType.startsWith("image/")
      ? asset.mimeType
      : "image/jpeg";

    setPhotoUrl(`data:${mimeType};base64,${asset.base64}`);
    setPhotoFileName(asset.fileName ?? "Profile photo");
  };

  const handleRemovePhoto = () => {
    setPhotoUrl("");
    setPhotoFileName(null);
  };

  const handleFinish = async () => {
    if (isFinishing) {
      return;
    }

    const trimmedName = name.trim();
    const trimmedCity = city.trim();
    const trimmedCommunityTag = communityTag.trim();

    if (trimmedName.length < 2) {
      Alert.alert("Add your name", "Use at least 2 characters so your friends know it's you.");
      return;
    }

    if (trimmedCity.length < 2) {
      Alert.alert("Add your city", "Pick the city or area where you usually link up.");
      return;
    }

    if (trimmedCommunityTag.length === 1) {
      Alert.alert("Community tag is too short", "Use at least 2 characters, or leave it blank.");
      return;
    }

    if (photoUrl.length > 900_000) {
      Alert.alert("Photo is too large", "Pick a slightly smaller photo and we'll keep setup moving.");
      return;
    }

    setIsFinishing(true);

    try {
      const user = await api.completeOnboarding(token, {
        name: trimmedName,
        city: trimmedCity,
        communityTag: trimmedCommunityTag || null,
        photoUrl: photoUrl || null,
        referralToken,
      });

      finishOnboarding(user);
      if (bookingInviteCode) {
        router.replace({
          pathname: "/booking/[inviteCode]",
          params: { inviteCode: bookingInviteCode },
        });
      } else {
        router.replace("/(app)/home");
      }
      void track(token, "onboarding_completed", { city: trimmedCity });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "We couldn't finish setup right now. Try again in a moment.";

      Alert.alert("Couldn't finish setup", message);
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <GradientMesh>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 72,
          paddingBottom: 40,
          gap: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        <NowlyMark />

        <View>
          <Text className="font-display text-[38px] leading-[42px] text-cloud">
            {NOWLY_SLOGAN}
          </Text>
          <Text className="mt-3 font-body text-base leading-6 text-white">
            {NOWLY_DESCRIPTION}
          </Text>
        </View>

        <View className="flex-row gap-2">
          {[1, 2, 3].map((step) => (
            <View
              key={step}
              className={`h-1.5 flex-1 rounded-full ${
                step <= stageIndex ? "bg-aqua" : "bg-white/12"
              }`}
            />
          ))}
        </View>

        <GlassCard className="p-5">
          {stage === "phone" ? (
            <View className="gap-4">
              <Text className="font-display text-2xl text-cloud">Sign in with your phone</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                className="rounded-3xl border border-white/12 bg-white/8 px-4 py-4 font-body text-base text-cloud"
                placeholder="+1 555 555 5555"
                placeholderTextColor="rgba(248,250,252,0.4)"
                keyboardType="phone-pad"
              />
              <PillButton label="Send OTP" onPress={handleRequestOtp} />
            </View>
          ) : null}

          {stage === "otp" ? (
            <View className="gap-4">
              <Text className="font-display text-2xl text-cloud">Drop in the code</Text>
              <Text className="font-body text-sm text-white/60">
                Dev shortcut: {devCode ?? "check your SMS"}
              </Text>
              <TextInput
                value={otp}
                onChangeText={setOtp}
                className="rounded-3xl border border-white/12 bg-white/8 px-4 py-4 font-body text-base tracking-[8px] text-cloud"
                placeholder="111111"
                placeholderTextColor="rgba(248,250,252,0.4)"
                keyboardType="number-pad"
                maxLength={6}
              />
              <PillButton label="Verify phone" onPress={handleVerifyOtp} />
            </View>
          ) : null}

          {stage === "profile" ? (
            <View className="gap-4">
              <View className="gap-2">
                <Text className="font-display text-2xl text-cloud">Build your account</Text>
                <Text className="font-body text-sm leading-6 text-white">
                  Start with your profile, then tell Nowly who you hang with so your crew is ready when you are.
                </Text>
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                className="rounded-3xl border border-white/12 bg-white/8 px-4 py-4 font-body text-base text-cloud"
                placeholder="Your name"
                placeholderTextColor="rgba(248,250,252,0.4)"
              />
              <TextInput
                value={city}
                onChangeText={setCity}
                className="rounded-3xl border border-white/12 bg-white/8 px-4 py-4 font-body text-base text-cloud"
                placeholder="City"
                placeholderTextColor="rgba(248,250,252,0.4)"
              />
              <TextInput
                value={communityTag}
                onChangeText={setCommunityTag}
                className="rounded-3xl border border-white/12 bg-white/8 px-4 py-4 font-body text-base text-cloud"
                placeholder="Campus / neighborhood (optional)"
                placeholderTextColor="rgba(248,250,252,0.4)"
              />
              <View className="gap-3 rounded-[28px] border border-white/12 bg-white/8 p-4">
                <View className="flex-row items-center gap-4">
                  <View className="h-16 w-16 overflow-hidden rounded-full border border-white/14 bg-white/8">
                    {photoUrl ? (
                      <Image source={{ uri: photoUrl }} className="h-full w-full" resizeMode="cover" />
                    ) : (
                      <View className="h-full w-full items-center justify-center">
                        <Text className="font-display text-xl text-white/70">
                          {(name.trim()[0] ?? "N").toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="font-display text-lg text-cloud">Add a profile photo</Text>
                    <Text className="mt-1 font-body text-sm leading-5 text-white/60">
                      Optional, but it helps your friends recognize you fast.
                    </Text>
                    {photoFileName ? (
                      <Text className="mt-2 font-body text-xs text-aqua">{photoFileName}</Text>
                    ) : null}
                  </View>
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <PillButton
                      label={photoUrl ? "Change photo" : "Upload photo"}
                      variant="secondary"
                      onPress={handlePickPhoto}
                    />
                  </View>
                  {photoUrl ? (
                    <View className="flex-1">
                      <PillButton label="Remove" variant="ghost" onPress={handleRemovePhoto} />
                    </View>
                  ) : null}
                </View>
              </View>
              <View className="gap-3 rounded-[24px] bg-white/5 p-4">
                <View className="flex-row items-center justify-between">
                  <View className="max-w-[72%]">
                    <Text className="font-display text-lg text-cloud">Add friends faster with Discord</Text>
                    <Text className="mt-1 font-body text-sm text-white/60">
                      Optional, permission-based, and only used to tighten up your real friend graph.
                    </Text>
                  </View>
                  <SignalChip label="Optional" active onPress={() => undefined} />
                </View>
                <PillButton label="Link Discord" variant="secondary" onPress={handleDiscordLink} />
              </View>
              <PillButton label={isFinishing ? "Finishing..." : "Finish setup"} onPress={handleFinish} />
            </View>
          ) : null}
        </GlassCard>

        {stage === "profile" ? (
          <GlassCard className="p-5">
            <View className="gap-4">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="font-display text-xl text-cloud">Invite your people</Text>
                    <Text className="mt-1 font-body text-sm text-white/60">{inviteStatus}</Text>
                  </View>
                <PillButton
                  label={Platform.OS === "web" ? "Invite links" : "Load contacts"}
                  variant="secondary"
                  onPress={loadContacts}
                />
              </View>

              <View className="flex-row flex-wrap gap-2">
                {(contacts.length
                  ? contacts
                  : [
                      { id: "1", name: "Maya", phone: "+15550001000" },
                      { id: "2", name: "Theo", phone: "+15550001001" },
                      { id: "3", name: "Syd", phone: "+15550001002" },
                    ]
                ).map((contact) => (
                  <View
                    key={contact.id}
                    className="w-[48%] rounded-[24px] border border-white/10 bg-white/6 p-4"
                  >
                    <Text className="font-display text-base text-cloud">{contact.name}</Text>
                    <Text className="mt-1 font-body text-xs text-white/50">{contact.phone}</Text>
                    <View className="mt-3">
                      <PillButton label="Invite" variant="secondary" onPress={() => handleInvite(contact.phone)} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </GlassCard>
        ) : null}
      </ScrollView>
    </GradientMesh>
  );
}
