import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

let socket: Socket | null = null;

// Only create the socket on the client and if a URL is provided.
if (typeof window !== 'undefined' && SOCKET_URL) {
  socket = io(SOCKET_URL, {
    transports: ["websocket"],
    // Do not auto connect; let the app call connect() explicitly
    autoConnect: false,
  });
}

export default socket;
