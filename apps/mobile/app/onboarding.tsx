import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { GradientMesh } from "../components/ui/GradientMesh";
import { GlassCard } from "../components/ui/GlassCard";
import { PillButton } from "../components/ui/PillButton";
import { SignalChip } from "../components/ui/SignalChip";
import { NowlyMark } from "../components/branding/NowlyMark";
import { api } from "../lib/api";
import { track } from "../lib/analytics";
import { pickAvatarImage } from "../lib/avatar";
import { NOWLY_DESCRIPTION, NOWLY_SLOGAN } from "../lib/branding";
import { useAppStore } from "../store/useAppStore";

type Stage = "phone" | "otp" | "profile";

const HOME_ROUTE = "/home";
const QR_GRID_SIZE = 23;
const DESKTOP_CARD_WIDTH = 820;

const qrCells = Array.from({ length: QR_GRID_SIZE * QR_GRID_SIZE }, (_, index) => {
  const x = index % QR_GRID_SIZE;
  const y = Math.floor(index / QR_GRID_SIZE);

  const inTopLeftFinder = x < 7 && y < 7;
  const inTopRightFinder = x >= QR_GRID_SIZE - 7 && y < 7;
  const inBottomLeftFinder = x < 7 && y >= QR_GRID_SIZE - 7;
  const inFinder = inTopLeftFinder || inTopRightFinder || inBottomLeftFinder;

  if (inFinder) {
    const localX = inTopRightFinder ? x - (QR_GRID_SIZE - 7) : x;
    const localY = inBottomLeftFinder ? y - (QR_GRID_SIZE - 7) : y;
    const onOuterRing = localX === 0 || localX === 6 || localY === 0 || localY === 6;
    const onInnerRing = localX === 2 || localX === 4 || localY === 2 || localY === 4;
    const inCore = localX >= 2 && localX <= 4 && localY >= 2 && localY <= 4;
    return onOuterRing || inCore || (onInnerRing && !(localX === 3 && localY === 3));
  }

  const onTimingRow = y === 6 && x > 7 && x < QR_GRID_SIZE - 8 && x % 2 === 0;
  const onTimingColumn = x === 6 && y > 7 && y < QR_GRID_SIZE - 8 && y % 2 === 0;
  if (onTimingRow || onTimingColumn) {
    return true;
  }

  return ((x * 17 + y * 11) % 7 === 0) || ((x + y * 3) % 13 === 0);
});

const showMessage = (title: string, message: string) => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
};

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
  const { width } = useWindowDimensions();

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
    () =>
      ({
        phone: 1,
        otp: 2,
        profile: 3,
      })[stage],
    [stage],
  );
  const isDesktopWeb = Platform.OS === "web" && width >= 1080;

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

    const Contacts = await import("expo-contacts");
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

      router.replace(HOME_ROUTE);
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
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.assign(url);
      return;
    }

    Linking.openURL(url);
  };

  const handlePickPhoto = async () => {
    try {
      const avatar = await pickAvatarImage();

      if (!avatar) {
        return;
      }

      setPhotoUrl(avatar.dataUrl);
      setPhotoFileName(avatar.fileName);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "We couldn't prep that photo right now. Try again in a moment.";

      showMessage("Photo couldn't be added", message);
    }
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
    const latestToken = useAppStore.getState().token;

    if (trimmedName.length < 2) {
      showMessage("Add your name", "Use at least 2 characters so your friends know it's you.");
      return;
    }

    if (trimmedCity.length < 2) {
      showMessage("Add your city", "Pick the city or area where you usually link up.");
      return;
    }

    if (trimmedCommunityTag.length === 1) {
      showMessage("Community tag is too short", "Use at least 2 characters, or leave it blank.");
      return;
    }

    if (!latestToken) {
      showMessage(
        "Session expired",
        "Your sign-in session dropped before setup finished. Verify your phone again and we'll keep moving.",
      );
      return;
    }

    setIsFinishing(true);

    try {
      const user = await api.completeOnboarding(latestToken, {
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
        router.replace(HOME_ROUTE);
      }
      void track(latestToken, "onboarding_completed", { city: trimmedCity });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "We couldn't finish setup right now. Try again in a moment.";

      console.error("[onboarding:finish]", error);
      showMessage("Couldn't finish setup", message);
    } finally {
      setIsFinishing(false);
    }
  };

  const renderPhoneStage = () => (
    <View className="gap-5">
      {isDesktopWeb ? (
        <View className="items-center gap-2">
          <Text className="text-center font-display text-[34px] leading-[38px] text-cloud">
            Welcome back.
          </Text>
          <Text className="max-w-[360px] text-center font-body text-base leading-7 text-white/70">
            Sign in with your phone and jump right back into your crew&apos;s live availability.
          </Text>
        </View>
      ) : (
        <Text className="font-display text-2xl text-cloud">Sign in with your phone</Text>
      )}
      <View className="gap-2">
        {isDesktopWeb ? (
          <Text className="font-body text-sm text-white/82">Phone number *</Text>
        ) : null}
        <TextInput
          value={phone}
          onChangeText={setPhone}
          className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4 font-body text-base text-cloud"
          placeholder="+1 555 555 5555"
          placeholderTextColor="rgba(248,250,252,0.4)"
          keyboardType="phone-pad"
        />
      </View>
      <PillButton label="Send OTP" onPress={handleRequestOtp} />
      {isDesktopWeb ? (
        <Text className="font-body text-sm leading-6 text-white/52">
          We text you a one-time code so private chats, booking links, and live signals stay tied
          to real people.
        </Text>
      ) : null}
    </View>
  );

  const renderOtpStage = () => (
    <View className="gap-5">
      {isDesktopWeb ? (
        <View className="items-center gap-2">
          <Text className="text-center font-display text-[34px] leading-[38px] text-cloud">
            Check your code.
          </Text>
          <Text className="max-w-[360px] text-center font-body text-base leading-7 text-white/70">
            Drop in the OTP and we&apos;ll bring you straight into your live graph.
          </Text>
        </View>
      ) : (
        <Text className="font-display text-2xl text-cloud">Drop in the code</Text>
      )}
      <View className="gap-2">
        {isDesktopWeb ? (
          <Text className="font-body text-sm text-white/82">One-time code *</Text>
        ) : null}
        <TextInput
          value={otp}
          onChangeText={setOtp}
          className="rounded-2xl border border-white/12 bg-white/8 px-4 py-4 font-body text-base tracking-[8px] text-cloud"
          placeholder="111111"
          placeholderTextColor="rgba(248,250,252,0.4)"
          keyboardType="number-pad"
          maxLength={6}
        />
      </View>
      <Text className="font-body text-sm text-white/58">Dev shortcut: {devCode ?? "check your SMS"}</Text>
      <PillButton label="Verify phone" onPress={handleVerifyOtp} />
      {isDesktopWeb ? (
        <Text className="font-body text-sm leading-6 text-white/52">
          Once you&apos;re in, your browser and phone stay synced around the same account.
        </Text>
      ) : null}
    </View>
  );

  const renderProfileStage = () => (
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
              Optional, but it helps your friends recognize you fast. We square-crop and downsize it automatically.
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
  );

  const renderInvitePeople = () => (
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
  );

  const renderDesktopAside = () => (
    <View className="flex-1 items-center justify-center gap-6 px-8 py-10">
      <View className="rounded-[26px] border border-white/8 bg-white/[0.035] p-3">
        <View className="h-44 w-44 overflow-hidden rounded-[18px] bg-cloud p-3">
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              width: "100%",
              height: "100%",
            }}
          >
            {qrCells.map((filled, index) => (
              <View
                key={index}
                style={{
                  width: `${100 / QR_GRID_SIZE}%`,
                  height: `${100 / QR_GRID_SIZE}%`,
                  backgroundColor: filled ? "#060B16" : "transparent",
                }}
              />
            ))}
          </View>
          <View className="absolute inset-0 items-center justify-center">
            <View className="rounded-full border border-[#060B16]/10 bg-cloud p-2">
              <NowlyMark variant="icon" size={34} />
            </View>
          </View>
        </View>
      </View>

      <View className="items-center gap-2">
        <Text className="text-center font-display text-[30px] leading-[34px] text-cloud">
          Keep Nowly in your pocket
        </Text>
        <Text className="max-w-[250px] text-center font-body text-sm leading-6 text-white/68">
          Sign in with your phone here, then pick back up instantly on mobile when the moment goes
          live.
        </Text>
      </View>

      <View className="w-full gap-3">
        <View className="flex-row items-center gap-3 rounded-[20px] border border-white/6 bg-white/[0.03] px-4 py-3.5">
          <MaterialCommunityIcons name="calendar-clock-outline" size={20} color="#7DD3FC" />
          <Text className="font-body text-sm text-white/80">Book windows and recurring slots</Text>
        </View>
        <View className="flex-row items-center gap-3 rounded-[20px] border border-white/6 bg-white/[0.03] px-4 py-3.5">
          <MaterialCommunityIcons name="chat-processing-outline" size={20} color="#7DD3FC" />
          <Text className="font-body text-sm text-white/80">Keep private chats and group threads warm</Text>
        </View>
        <View className="flex-row items-center gap-3 rounded-[20px] border border-white/6 bg-white/[0.03] px-4 py-3.5">
          <MaterialCommunityIcons name="lightning-bolt-circle" size={20} color="#7DD3FC" />
          <Text className="font-body text-sm text-white/80">Turn overlap into a real hangout fast</Text>
        </View>
      </View>
    </View>
  );

  return (
    <GradientMesh>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: isDesktopWeb ? 32 : 20,
          paddingTop: isDesktopWeb ? 28 : 72,
          paddingBottom: isDesktopWeb ? 56 : 40,
          flexGrow: 1,
          gap: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            width: "100%",
            maxWidth: isDesktopWeb ? 1160 : undefined,
            alignSelf: "center",
            gap: 18,
            flex: isDesktopWeb ? 1 : undefined,
            justifyContent: isDesktopWeb ? "center" : undefined,
          }}
        >
          {isDesktopWeb ? (
            <>
              <View
                style={{
                  width: "100%",
                  maxWidth: DESKTOP_CARD_WIDTH,
                  alignSelf: "center",
                  paddingBottom: 18,
                }}
              >
                <NowlyMark variant="lockup" size={54} />
              </View>

              {stage === "profile" ? (
                <>
                  <GlassCard className="p-6" >
                    {renderProfileStage()}
                  </GlassCard>
                  {renderInvitePeople()}
                </>
              ) : (
                <GlassCard className="self-center overflow-hidden border-white/7 bg-[#1A1F2B]/88 p-0">
                  <View
                    style={{
                      flexDirection: "row",
                      width: DESKTOP_CARD_WIDTH,
                      minHeight: 468,
                    }}
                  >
                    <View
                      style={{
                        width: "54%",
                        paddingHorizontal: 32,
                        paddingVertical: 34,
                        justifyContent: "center",
                      }}
                    >
                      <View className="gap-5">
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

                        {stage === "phone" ? renderPhoneStage() : renderOtpStage()}
                      </View>
                    </View>

                    <View
                      style={{
                        width: "46%",
                        borderLeftWidth: 1,
                        borderLeftColor: "rgba(255,255,255,0.06)",
                      }}
                    >
                      {renderDesktopAside()}
                    </View>
                  </View>
                </GlassCard>
              )}
            </>
          ) : (
            <>
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
                {stage === "phone" ? renderPhoneStage() : null}
                {stage === "otp" ? renderOtpStage() : null}
                {stage === "profile" ? renderProfileStage() : null}
              </GlassCard>

              {stage === "profile" ? renderInvitePeople() : null}
            </>
          )}
        </View>
      </ScrollView>
    </GradientMesh>
  );
}
