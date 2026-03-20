import { io, Socket } from "socket.io-client";

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");

let socket: Socket | null = null;

export const getSocket = (token: string | null) => {
  if (!API_URL || !token) {
    return null;
  }

  if (!socket) {
    socket = io(API_URL, {
      transports: ["websocket"],
      autoConnect: false,
      auth: {
        token,
      },
    });
  }

  if (!socket.connected) {
    socket.auth = { token };
    socket.connect();
  }

  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
