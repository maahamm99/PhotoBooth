import { customAlphabet } from "nanoid";

const makeCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 5);

const DEFAULT_SETTINGS = {
  filter: "classic",
  color: "ink",
  shape: "square",
  infoPosition: "below",
  caption: "Together",
  totalSpots: 1,
};

// code -> room
const rooms = new Map();

function createRoom(hostSocketId, hostName) {
  let code = makeCode();
  while (rooms.has(code)) code = makeCode();

  const room = {
    code,
    hostId: hostSocketId,
    settings: { ...DEFAULT_SETTINGS },
    participants: new Map([[hostSocketId, { name: hostName, id: hostSocketId }]]),
    round: null,
  };
  rooms.set(code, room);
  return room;
}

function getRoom(code) {
  return rooms.get((code || "").toUpperCase());
}

function joinRoom(code, socketId, name) {
  const room = getRoom(code);
  if (!room) return { error: "That booth code doesn't exist." };
  if (room.participants.size >= 8) return { error: "This booth is full (max 8)." };
  room.participants.set(socketId, { name, id: socketId });
  if (room.settings.totalSpots < room.participants.size) {
    room.settings.totalSpots = room.participants.size;
  }
  return { room };
}

function leaveRoom(code, socketId) {
  const room = getRoom(code);
  if (!room) return null;
  room.participants.delete(socketId);
  if (room.round) room.round.submissions.delete(socketId);

  if (room.participants.size === 0) {
    rooms.delete(room.code);
    return null;
  }
  if (room.hostId === socketId) {
    room.hostId = room.participants.keys().next().value;
  }
  return room;
}

function roomSummary(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    settings: room.settings,
    participants: Array.from(room.participants.values()),
  };
}

function findRoomBySocket(socketId) {
  for (const room of rooms.values()) {
    if (room.participants.has(socketId)) return room;
  }
  return null;
}

export { createRoom, getRoom, joinRoom, leaveRoom, roomSummary, findRoomBySocket, DEFAULT_SETTINGS };
