import { useEffect } from "react";
import { getSocket } from "../../../lib/socket";

type Props = {
  token: string | null;
  onInboxUpdate: () => void;
};

export const useInboxActivity = ({ token, onInboxUpdate }: Props) => {
  useEffect(() => {
    const socket = getSocket(token);
    if (!socket) {
      return;
    }

    socket.on("chat:inbox-update", onInboxUpdate);
    socket.on("chat:message", onInboxUpdate);

    return () => {
      socket.off("chat:inbox-update", onInboxUpdate);
      socket.off("chat:message", onInboxUpdate);
    };
  }, [onInboxUpdate, token]);
};
