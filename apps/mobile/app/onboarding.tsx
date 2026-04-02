import { useLocalSearchParams } from "expo-router";
import { OnboardingScreen } from "../src/screens/onboarding/OnboardingScreen";

export default function OnboardingRoute() {
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

  return (
    <OnboardingScreen
      bookingInviteCode={bookingInviteCode}
      referralToken={referralToken}
    />
  );
}
