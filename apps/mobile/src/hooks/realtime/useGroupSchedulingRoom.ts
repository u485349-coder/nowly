import { useEffect } from "react";
import type {
  MobileGroupSchedulingMessage,
  MobileGroupSchedulingSession,
} from "@nowly/shared";
import { getSocket } from "../../../lib/socket";

type Props = {
  shareCode: string;
  token: string | null;
  onSessionUpdate: (session: MobileGroupSchedulingSession) => void;
  onMessage: (message: MobileGroupSchedulingMessage) => void;
};

export const useGroupSchedulingRoom = ({
  shareCode,
  token,
  onSessionUpdate,
  onMessage,
}: Props) => {
  useEffect(() => {
    const socket = getSocket(token);
    if (!socket || !shareCode) {
      return;
    }

    socket.emit("schedule:join", { shareCode });

    const handleUpdate = (nextSession: MobileGroupSchedulingSession) => {
      if (nextSession.shareCode !== shareCode) {
        return;
      }
      onSessionUpdate(nextSession);
    };

    const handleMessage = (message: MobileGroupSchedulingMessage) => {
      onMessage(message);
    };

    socket.on("schedule:update", handleUpdate);
    socket.on("schedule:message", handleMessage);

    return () => {
      socket.off("schedule:update", handleUpdate);
      socket.off("schedule:message", handleMessage);
    };
  }, [onMessage, onSessionUpdate, shareCode, token]);
};
