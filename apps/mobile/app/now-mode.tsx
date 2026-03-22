import { BookingSurface } from "../features/booking/BookingSurface";
import { useAppStore } from "../store/useAppStore";

export default function NowModeScreen() {
  const user = useAppStore((state) => state.user);

  return <BookingSurface inviteCode={user?.inviteCode ?? null} mode="preview" />;
}
