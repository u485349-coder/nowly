import { useMutation } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Share } from "react-native";
import { track } from "../../../lib/analytics";
import { pickAvatarImage } from "../../../lib/avatar";
import { createSmartOpenUrl } from "../../../lib/smart-links";
import { useAppStore } from "../../../store/useAppStore";
import { onboardingApi } from "../../lib/api/onboarding";

export type OnboardingStage = "auth" | "code" | "profile";
export type AuthMethod = "phone" | "email";

const HOME_ROUTE = "/home";
const SAMPLE_CONTACTS = [
  { id: "1", name: "Maya", phone: "+15550001000" },
  { id: "2", name: "Theo", phone: "+15550001001" },
  { id: "3", name: "Syd", phone: "+15550001002" },
];

const showMessage = (title: string, message: string) => {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
};

type Props = {
  bookingInviteCode?: string;
  referralToken?: string;
};

export const useOnboardingScreen = ({ bookingInviteCode, referralToken }: Props) => {
  const router = useRouter();
  const setSession = useAppStore((state) => state.setSession);
  const finishOnboarding = useAppStore((state) => state.finishOnboarding);
  const clearSession = useAppStore((state) => state.clearSession);
  const user = useAppStore((state) => state.user);
  const onboardingComplete = useAppStore((state) => state.onboardingComplete);
  const token = useAppStore((state) => state.token);

  const [stage, setStage] = useState<OnboardingStage>("auth");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("phone");
  const [phone, setPhone] = useState("+1");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState(user?.name ?? "Avery");
  const [city, setCity] = useState(user?.city ?? "New York");
  const [communityTag, setCommunityTag] = useState(user?.communityTag ?? "NYU");
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl ?? "");
  const [photoFileName, setPhotoFileName] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Array<{ id: string; name: string; phone: string }>>(
    [],
  );
  const [inviteStatus, setInviteStatus] = useState("Build your crew immediately.");
  const [checkingSavedSession, setCheckingSavedSession] = useState(false);
  const [invitingPhone, setInvitingPhone] = useState<string | null>(null);
  const hasSavedSession = Boolean(token && user && (onboardingComplete || user.onboardingCompleted));

  const requestCodeMutation = useMutation({
    mutationFn: (payload: { channel: "phone" | "email"; value: string }) =>
      onboardingApi.requestAuthCode(payload),
  });

  const verifyCodeMutation = useMutation({
    mutationFn: (payload: { channel: "phone" | "email"; value: string; code: string }) =>
      onboardingApi.verifyAuthCode(payload),
  });

  const finishMutation = useMutation({
    mutationFn: (payload: {
      token: string;
      body: {
        name: string;
        city: string;
        communityTag?: string | null;
        photoUrl?: string | null;
        referralToken?: string;
      };
    }) => onboardingApi.completeOnboarding(payload.token, payload.body),
  });

  const inviteMutation = useMutation({
    mutationFn: (phoneNumbers: string[]) => onboardingApi.sendInvite(token, phoneNumbers),
  });

  const discordMutation = useMutation({
    mutationFn: () => onboardingApi.getDiscordOauthUrl(token),
  });

  const authValue = authMethod === "email" ? email.trim().toLowerCase() : phone.trim();
  const stageIndex =
    stage === "auth" ? 1 : stage === "code" ? 2 : 3;

  const qrPath = useMemo(() => {
    const searchParams = new URLSearchParams();
    if (bookingInviteCode) {
      searchParams.set("bookingInviteCode", bookingInviteCode);
    }
    if (referralToken) {
      searchParams.set("referralToken", referralToken);
    }

    const query = searchParams.toString();
    return `/onboarding${query ? `?${query}` : ""}`;
  }, [bookingInviteCode, referralToken]);

  const qrTargetUrl = useMemo(() => createSmartOpenUrl(qrPath), [qrPath]);
  const qrImageUrl = useMemo(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=0&data=${encodeURIComponent(
        qrTargetUrl,
      )}`,
    [qrTargetUrl],
  );

  useEffect(() => {
    if (!token || !referralToken) {
      return;
    }

    onboardingApi.redeemInvite(token, referralToken).catch(() => undefined);
  }, [referralToken, token]);

  useEffect(() => {
    if (!hasSavedSession || !token || !user) {
      return;
    }

    let active = true;
    setCheckingSavedSession(true);

    onboardingApi
      .fetchDashboard(token, user.id)
      .then(() => {
        if (!active) {
          return;
        }

        if (bookingInviteCode) {
          router.replace({
            pathname: "/booking/[inviteCode]",
            params: { inviteCode: bookingInviteCode },
          });
          return;
        }

        router.replace(HOME_ROUTE);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        clearSession();
      })
      .finally(() => {
        if (!active) {
          return;
        }

        setCheckingSavedSession(false);
      });

    return () => {
      active = false;
    };
  }, [bookingInviteCode, clearSession, hasSavedSession, router, token, user]);

  const handleRequestCode = async () => {
    if (authMethod === "email") {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        showMessage("Use a valid email", "Enter the email address you want to sign in with.");
        return;
      }
    } else if (phone.trim().length < 8) {
      showMessage("Use a valid phone", "Enter the phone number you want to sign in with.");
      return;
    }

    try {
      const response = await requestCodeMutation.mutateAsync({
        channel: authMethod,
        value: authValue,
      });
      setDevCode(response.devCode ?? null);
      setStage("code");
    } catch (error) {
      showMessage(
        "Couldn't send code",
        error instanceof Error ? error.message : "Try again in a second.",
      );
    }
  };

  const routeToNextDestination = (inviteCode?: string) => {
    if (inviteCode) {
      router.replace({
        pathname: "/booking/[inviteCode]",
        params: { inviteCode },
      });
      return;
    }

    router.replace(HOME_ROUTE);
  };

  const handleVerifyCode = async () => {
    try {
      const session = await verifyCodeMutation.mutateAsync({
        channel: authMethod,
        value: authValue,
        code: otp || devCode || "111111",
      });

      setSession(session.token, session.user);

      if (referralToken) {
        await onboardingApi.redeemInvite(session.token, referralToken).catch(() => undefined);
      }

      if (session.user.onboardingCompleted) {
        routeToNextDestination(bookingInviteCode);
        return;
      }

      setName(session.user.name || "Avery");
      setCity(session.user.city || "New York");
      setCommunityTag(session.user.communityTag || "NYU");
      setPhotoUrl(session.user.photoUrl || "");
      setStage("profile");
    } catch (error) {
      showMessage(
        authMethod === "email" ? "Couldn't verify email" : "Couldn't verify phone",
        error instanceof Error ? error.message : "Try the code again in a second.",
      );
    }
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
      showMessage(
        "Photo couldn't be added",
        error instanceof Error
          ? error.message
          : "We couldn't prep that photo right now. Try again in a moment.",
      );
    }
  };

  const handleFinish = async () => {
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
      showMessage(
        "Community tag is too short",
        "Use at least 2 characters, or leave it blank.",
      );
      return;
    }

    if (!latestToken) {
      showMessage(
        "Session expired",
        "Your sign-in session dropped before setup finished. Verify again and we will keep moving.",
      );
      return;
    }

    try {
      const nextUser = await finishMutation.mutateAsync({
        token: latestToken,
        body: {
          name: trimmedName,
          city: trimmedCity,
          communityTag: trimmedCommunityTag || null,
          photoUrl: photoUrl || null,
          referralToken,
        },
      });

      finishOnboarding(nextUser);
      routeToNextDestination(bookingInviteCode);
      void track(latestToken, "onboarding_completed", { city: trimmedCity });
    } catch (error) {
      showMessage(
        "Couldn't finish setup",
        error instanceof Error
          ? error.message
          : "We couldn't finish setup right now. Try again in a moment.",
      );
    }
  };

  const handleInvite = async (invitePhone: string) => {
    try {
      setInvitingPhone(invitePhone);
      const invites = await inviteMutation.mutateAsync([invitePhone]);
      const invite = invites[0];

      if (!invite) {
        return;
      }

      if (Platform.OS === "web" && typeof navigator !== "undefined") {
        if (navigator.share) {
          await navigator.share({ text: invite.smsTemplate });
        } else if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(invite.smsTemplate);
          showMessage("Invite copied", "The invite message is in your clipboard.");
        }
      } else {
        await Share.share({ message: invite.smsTemplate });
      }

      setInviteStatus(`Invite ready for ${invitePhone}`);
    } catch (error) {
      showMessage(
        "Invite didn't send",
        error instanceof Error ? error.message : "Try that invite again in a second.",
      );
    } finally {
      setInvitingPhone(null);
    }
  };

  const handleLoadContacts = async () => {
    if (Platform.OS === "web") {
      setInviteStatus("Contact import stays in the app for now. Use invite cards below in browser.");
      return;
    }

    const Contacts = await import("expo-contacts");
    const permission = await Contacts.requestPermissionsAsync();

    if (permission.status !== "granted") {
      setInviteStatus("Allow contacts to pull your people in faster.");
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

  const handleDiscordLink = async () => {
    try {
      const url = await discordMutation.mutateAsync();

      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.assign(url);
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      showMessage(
        "Discord link failed",
        error instanceof Error ? error.message : "Try linking Discord again in a second.",
      );
    }
  };

  return {
    stage,
    stageIndex,
    authMethod,
    phone,
    email,
    otp,
    name,
    city,
    communityTag,
    photoUrl,
    photoFileName,
    devCode,
    inviteStatus,
    checkingSavedSession,
    hasSavedSession,
    isRequestingCode: requestCodeMutation.isPending,
    isVerifyingCode: verifyCodeMutation.isPending,
    isFinishing: finishMutation.isPending,
    isLoadingDiscord: discordMutation.isPending,
    invitingPhone,
    currentUserName: user?.name ?? "there",
    authValue,
    contacts: contacts.length ? contacts : SAMPLE_CONTACTS,
    qrTargetUrl,
    qrImageUrl,
    setAuthMethod,
    setPhone,
    setEmail,
    setOtp,
    setName,
    setCity,
    setCommunityTag,
    onRequestCode: () => void handleRequestCode(),
    onVerifyCode: () => void handleVerifyCode(),
    onPickPhoto: () => void handlePickPhoto(),
    onRemovePhoto: () => {
      setPhotoUrl("");
      setPhotoFileName(null);
    },
    onLoadContacts: () => void handleLoadContacts(),
    onInvite: (phoneNumber: string) => void handleInvite(phoneNumber),
    onDiscordLink: () => void handleDiscordLink(),
    onFinish: () => void handleFinish(),
    onContinueSavedSession: () => routeToNextDestination(bookingInviteCode),
    onUseAnotherAccount: clearSession,
    onOpenQrTarget: () => void Linking.openURL(qrTargetUrl),
  };
};
