import { customAlphabet } from "nanoid";

const makeCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 5);

const DEFAULT_SETTINGS = {
  filter: "classic",
  color: "blush",
  shape: "square",
  infoPosition: "below",
  caption: "Together",
  totalSpots: 1,
};

const MAX_SPOTS = 8;

// code -> room
const rooms = new Map();

// Keep room.spots the same length as settings.totalSpots, padding with
// open ("Waiting for a guest...") slots.
function ensureSpotsLength(room) {
  while (room.spots.length < room.settings.totalSpots) {
    room.spots.push({ ownerId: null, name: "" });
  }
  while (room.spots.length > room.settings.totalSpots) {
    room.spots.pop();
  }
}

// Give a newly-connected participant their own spot: the first open one,
// or a brand new one if every existing spot is already claimed.
function assignFirstOpenSpot(room, ownerId, name) {
  ensureSpotsLength(room);
  let slot = room.spots.find((s) => s.ownerId === null);
  if (!slot) {
    room.settings.totalSpots += 1;
    ensureSpotsLength(room);
    slot = room.spots[room.spots.length - 1];
  }
  slot.ownerId = ownerId;
  slot.name = name;
}

function createRoom(hostSocketId, hostName) {
  let code = makeCode();
  while (rooms.has(code)) code = makeCode();

  const room = {
    code,
    hostId: hostSocketId,
    settings: { ...DEFAULT_SETTINGS, totalSpots: 0 },
    participants: new Map([[hostSocketId, { name: hostName, id: hostSocketId }]]),
    spots: [],
    round: null,
  };
  assignFirstOpenSpot(room, hostSocketId, hostName);
  rooms.set(code, room);
  return room;
}

function getRoom(code) {
  return rooms.get((code || "").toUpperCase());
}

function joinRoom(code, socketId, name) {
  const room = getRoom(code);
  if (!room) return { error: "That booth code doesn't exist." };
  if (room.participants.size >= MAX_SPOTS) return { error: "This booth is full (max 8)." };
  room.participants.set(socketId, { name, id: socketId });
  assignFirstOpenSpot(room, socketId, name);
  return { room };
}

function leaveRoom(code, socketId) {
  const room = getRoom(code);
  if (!room) return null;
  room.participants.delete(socketId);
  if (room.round) room.round.submissions.delete(socketId);
  room.spots.forEach((slot) => {
    if (slot.ownerId === socketId) {
      slot.ownerId = null;
      slot.name = "";
    }
  });

  if (room.participants.size === 0) {
    rooms.delete(room.code);
    return null;
  }
  if (room.hostId === socketId) {
    room.hostId = room.participants.keys().next().value;
  }
  return room;
}

// Claim a currently-open spot for `ownerId` (used both for a fresh join and
// for "add yourself" on an existing open spot from an already-connected device).
function claimSpot(room, index, ownerId, name) {
  const slot = room.spots[index];
  if (!slot || slot.ownerId !== null) return false;
  slot.ownerId = ownerId;
  slot.name = (name || "").slice(0, 24) || "Guest";
  return true;
}

function releaseSpot(room, index, ownerId) {
  const slot = room.spots[index];
  if (!slot || slot.ownerId !== ownerId) return false;
  slot.ownerId = null;
  slot.name = "";
  return true;
}

function renameSpot(room, index, ownerId, name) {
  const slot = room.spots[index];
  if (!slot || slot.ownerId !== ownerId) return false;
  slot.name = (name || "").slice(0, 24) || "Guest";
  return true;
}

// The lowest totalSpots a room can shrink to without cutting off a spot
// that's currently owned by someone.
function minSpotsFloor(room) {
  let lastOwned = -1;
  room.spots.forEach((slot, i) => {
    if (slot.ownerId) lastOwned = i;
  });
  return Math.max(room.participants.size, lastOwned + 1);
}

function setTotalSpots(room, requested) {
  const floor = minSpotsFloor(room);
  room.settings.totalSpots = Math.max(floor, Math.min(MAX_SPOTS, requested));
  ensureSpotsLength(room);
}

function roomSummary(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    settings: room.settings,
    participants: Array.from(room.participants.values()),
    spots: room.spots,
  };
}

function findRoomBySocket(socketId) {
  for (const room of rooms.values()) {
    if (room.participants.has(socketId)) return room;
  }
  return null;
}

export {
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
  DEFAULT_SETTINGS,
  MAX_SPOTS,
};
