import { useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import { BookingSurface } from "../../features/booking/BookingSurface";

export default function BookingInviteScreen() {
  const params = useLocalSearchParams<{ inviteCode?: string | string[] }>();
  const inviteCode = useMemo(
    () => (Array.isArray(params.inviteCode) ? params.inviteCode[0] : params.inviteCode),
    [params.inviteCode],
  );

  return <BookingSurface inviteCode={inviteCode ?? null} mode="booking" />;
}
