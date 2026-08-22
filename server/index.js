import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { Server } from "socket.io";
import {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  roomSummary,
  findRoomBySocket,
} from "./rooms.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;
const CLIENT_DIST = path.join(__dirname, "..", "client", "dist");

const app = express();
app.use(cors());
app.use(express.static(CLIENT_DIST));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) return next();
  res.sendFile(path.join(CLIENT_DIST, "index.html"), (err) => {
    if (err) next();
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const ROUND_TIMEOUT_MS = 10_000;

function broadcastRoom(room) {
  io.to(room.code).emit("room:update", roomSummary(room));
}

io.on("connection", (socket) => {
  socket.on("room:create", ({ name }, ack) => {
    const room = createRoom(socket.id, name?.slice(0, 24) || "Guest");
    socket.join(room.code);
    ack?.({ ok: true, room: roomSummary(room) });
  });

  socket.on("room:join", ({ code, name }, ack) => {
    const result = joinRoom(code, socket.id, name?.slice(0, 24) || "Guest");
    if (result.error) return ack?.({ ok: false, error: result.error });
    socket.join(result.room.code);
    broadcastRoom(result.room);
    ack?.({ ok: true, room: roomSummary(result.room) });
  });

  socket.on("settings:update", (partial) => {
    const room = findRoomBySocket(socket.id);
    if (!room || room.hostId !== socket.id) return;
    room.settings = { ...room.settings, ...partial };
    io.to(room.code).emit("settings:update", room.settings);
  });

  socket.on("webrtc:signal", ({ to, data }) => {
    io.to(to).emit("webrtc:signal", { from: socket.id, data });
  });

  socket.on("countdown:start", ({ seconds = 3 } = {}) => {
    const room = findRoomBySocket(socket.id);
    if (!room || room.hostId !== socket.id) return;

    room.round = { submissions: new Map(), startedAt: Date.now() };
    const startAt = Date.now() + 600;
    io.to(room.code).emit("countdown:started", { startAt, seconds });

    clearTimeout(room.round.timeout);
    room.round.timeout = setTimeout(() => finishRound(room), startAt - Date.now() + seconds * 1000 + ROUND_TIMEOUT_MS);
  });

  socket.on("photo:submit", ({ dataUrl }) => {
    const room = findRoomBySocket(socket.id);
    if (!room || !room.round) return;
    room.round.submissions.set(socket.id, dataUrl);
    io.to(room.code).emit("round:progress", {
      received: room.round.submissions.size,
      total: room.participants.size,
    });

    if (room.round.submissions.size >= room.participants.size) {
      clearTimeout(room.round.timeout);
      finishRound(room);
    }
  });

  socket.on("round:reset", () => {
    const room = findRoomBySocket(socket.id);
    if (!room || room.hostId !== socket.id) return;
    room.round = null;
    io.to(room.code).emit("round:reset");
  });

  socket.on("disconnect", () => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;
    io.to(room.code).emit("webrtc:peer-left", socket.id);
    const updated = leaveRoom(room.code, socket.id);
    if (updated) broadcastRoom(updated);
  });
});

function finishRound(room) {
  if (!room.round) return;
  const photos = Array.from(room.round.submissions.entries()).map(([id, dataUrl]) => ({
    id,
    name: room.participants.get(id)?.name || "Guest",
    dataUrl,
  }));
  io.to(room.code).emit("round:complete", { photos, settings: room.settings });
  room.round = null;
}

server.listen(PORT, () => {
  console.log(`PhotoBooth server listening on :${PORT}`);
});
