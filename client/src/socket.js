import { io } from "socket.io-client";

// Same-origin in production; Vite dev server proxies /socket.io to :4000.
export const socket = io({ autoConnect: false, transports: ["websocket", "polling"] });
