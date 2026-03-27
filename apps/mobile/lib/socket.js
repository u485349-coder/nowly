import { io } from "socket.io-client";
const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
let socket = null;
export const getSocket = (token) => {
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
