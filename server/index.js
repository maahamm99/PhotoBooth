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
  claimSpot,
  releaseSpot,
  renameSpot,
  setTotalSpots,
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

// Photos are never written to disk or a database. A captured frame's dataUrl
// passes through this process only inside room.round.submissions -- a plain
// in-memory Map that exists only for the few seconds a capture round takes --
// and is discarded (room.round = null) the moment the round finishes or is
// reset. Nothing here is logged, persisted, or kept once the strip is built.
const STEP_SECONDS = 3;
const STEP_GRACE_MS = 4000;
const COUNTDOWN_LEAD_MS = 400;

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
    const { totalSpots, ...rest } = partial;
    room.settings = { ...room.settings, ...rest };
    if (totalSpots !== undefined) {
      setTotalSpots(room, totalSpots);
      // totalSpots changes the spots array too, so send the whole room.
      broadcastRoom(room);
    } else {
      io.to(room.code).emit("settings:update", room.settings);
    }
  });

  // Claim an open spot for yourself -- lets people sharing one device/camera
  // each get their own numbered spot in the strip.
  socket.on("spot:claim", ({ index, name }) => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;
    const fallbackName = room.participants.get(socket.id)?.name || "Guest";
    if (claimSpot(room, index, socket.id, name || fallbackName)) {
      broadcastRoom(room);
    }
  });

  socket.on("spot:release", ({ index }) => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;
    if (releaseSpot(room, index, socket.id)) {
      broadcastRoom(room);
    }
  });

  socket.on("spot:rename", ({ index, name }) => {
    const room = findRoomBySocket(socket.id);
    if (!room) return;
    if (renameSpot(room, index, socket.id, name)) {
      broadcastRoom(room);
    }
  });

  socket.on("webrtc:signal", ({ to, data }) => {
    io.to(to).emit("webrtc:signal", { from: socket.id, data });
  });

  // Start a round: every filled spot gets its own turn, one after another,
  // each with its own countdown. Only that spot's owner captures on their turn.
  socket.on("countdown:start", () => {
    const room = findRoomBySocket(socket.id);
    if (!room || room.hostId !== socket.id) return;
    if (room.round) return;
    startRound(room);
  });

  socket.on("photo:submit", ({ spotIndex, dataUrl }) => {
    const room = findRoomBySocket(socket.id);
    if (!room || !room.round) return;
    const activeIndex = room.round.sequence[room.round.pointer];
    if (spotIndex !== activeIndex) return;
    const slot = room.spots[spotIndex];
    if (!slot || slot.ownerId !== socket.id) return;

    room.round.submissions.set(spotIndex, dataUrl);
    // Show the shot in its cell right away, everywhere, instead of making
    // everyone wait for the whole round to finish.
    io.to(room.code).emit("spot:captured", { spotIndex, dataUrl });
    clearTimeout(room.round.timeout);
    advanceStep(room);
  });

  socket.on("round:reset", () => {
    const room = findRoomBySocket(socket.id);
    if (!room || room.hostId !== socket.id) return;
    clearTimeout(room.round?.timeout);
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

function startRound(room) {
  const sequence = room.spots.map((slot, i) => (slot.ownerId ? i : null)).filter((i) => i !== null);
  room.round = { sequence, pointer: 0, submissions: new Map() };
  runStep(room);
}

function runStep(room) {
  if (!room.round) return;
  if (room.round.pointer >= room.round.sequence.length) {
    finishRound(room);
    return;
  }
  const spotIndex = room.round.sequence[room.round.pointer];
  // startAt is the moment the count reaches zero and the capture happens --
  // the client counts backwards from it (tick "3" at startAt-3000ms, etc.) --
  // so it has to be the full lead time *plus* the countdown length, not just
  // the lead time, or the whole "3-2-1" would be skipped and capture would
  // fire almost immediately.
  const startAt = Date.now() + COUNTDOWN_LEAD_MS + STEP_SECONDS * 1000;
  io.to(room.code).emit("countdown:started", {
    startAt,
    seconds: STEP_SECONDS,
    spotIndex,
    step: room.round.pointer,
    totalSteps: room.round.sequence.length,
  });

  clearTimeout(room.round.timeout);
  room.round.timeout = setTimeout(() => advanceStep(room), startAt - Date.now() + STEP_GRACE_MS);
}

function advanceStep(room) {
  if (!room.round) return;
  room.round.pointer += 1;
  runStep(room);
}

function finishRound(room) {
  if (!room.round) return;
  const photos = room.round.sequence
    .filter((i) => room.round.submissions.has(i))
    .map((i) => {
      const slot = room.spots[i];
      return {
        id: `spot-${i}`,
        name: slot.name || room.participants.get(slot.ownerId)?.name || "Guest",
        dataUrl: room.round.submissions.get(i),
      };
    });
  io.to(room.code).emit("round:complete", { photos, settings: room.settings });
  room.round = null;
}

server.listen(PORT, () => {
  console.log(`PhotoBooth server listening on :${PORT}`);
});
