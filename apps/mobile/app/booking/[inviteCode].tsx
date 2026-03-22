import { useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import { BookingSurface } from "../../features/booking/BookingSurface";

export default function BookingInviteScreen() {
  const params = useLocalSearchParams<{
    inviteCode?: string | string[];
    session?: string | string[];
    format?: string | string[];
    title?: string | string[];
    description?: string | string[];
    location?: string | string[];
  }>();
  const inviteCode = useMemo(
    () => (Array.isArray(params.inviteCode) ? params.inviteCode[0] : params.inviteCode),
    [params.inviteCode],
  );
  const sharedSetup = useMemo(
    () => ({
      sessionShareCode: Array.isArray(params.session) ? params.session[0] : params.session,
      format: Array.isArray(params.format) ? params.format[0] : params.format,
      title: Array.isArray(params.title) ? params.title[0] : params.title,
      description: Array.isArray(params.description) ? params.description[0] : params.description,
      locationName: Array.isArray(params.location) ? params.location[0] : params.location,
    }),
    [params.description, params.format, params.location, params.session, params.title],
  );

  return <BookingSurface inviteCode={inviteCode ?? null} mode="booking" sharedSetup={sharedSetup} />;
}
