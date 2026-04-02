import { useEffect } from "react";
import { Platform } from "react-native";
import { useAppStore } from "../../../store/useAppStore";

const readLoggedInState = () => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    if (window.localStorage.getItem("nowly.browser.session") === "1") {
      return true;
    }

    const raw = window.localStorage.getItem("nowly-app-store");
    if (!raw) {
      return false;
    }

    const parsed = JSON.parse(raw);
    const state =
      parsed && typeof parsed === "object" && "state" in parsed ? parsed.state : parsed;

    return Boolean(state && typeof state === "object" && state.token);
  } catch (error) {
    return false;
  }
};

export const SessionProbeScreen = () => {
  const token = useAppStore((state) => state.token);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || window.parent === window) {
      return;
    }

    const postStatus = () => {
      window.parent.postMessage(
        {
          type: "nowly-session-probe",
          loggedIn: readLoggedInState(),
        },
        "*",
      );
    };

    const handleStorage = () => {
      postStatus();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        postStatus();
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (!event.data || event.data.type !== "nowly-session-request") {
        return;
      }

      postStatus();
    };

    postStatus();
    const timeoutId = window.setTimeout(postStatus, 300);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("message", handleMessage);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [token]);

  return null;
};
