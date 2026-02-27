import { io, Socket } from "socket.io-client";

// Auto-detect: use env variable in production, fallback to localhost in dev
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

let _socket: Socket | null = null;

export function getSocket(): Socket {
    if (!_socket) {
        console.log("Socket init: connecting to", SERVER_URL);
        _socket = io(SERVER_URL, {
            autoConnect: true,
            transports: ["websocket", "polling"],
            reconnectionAttempts: 5
        });

        _socket.on("connect", () => console.log("Socket connected to:", SERVER_URL));
        _socket.on("connect_error", (err) => console.error("Socket connect error:", err));
        _socket.on("disconnect", (reason) => console.warn("Socket disconnected:", reason));
    }
    return _socket;
}

export const socket = new Proxy({} as Socket, {
    get(_target, prop) {
        const s = getSocket();
        const val = (s as any)[prop];
        if (typeof val === "function") {
            return val.bind(s);
        }
        return val;
    },
});
