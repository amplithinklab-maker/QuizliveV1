import { io, Socket } from "socket.io-client";

// Auto-detect: use env variable in production, fallback to localhost in dev
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

let _socket: Socket | null = null;

export function getSocket(): Socket {
    if (!_socket) {
        _socket = io(SERVER_URL, {
            autoConnect: true,
            transports: ["websocket", "polling"],
        });
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
