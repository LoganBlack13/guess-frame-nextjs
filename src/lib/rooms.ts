import { randomUUID } from "crypto";
import type {
  Frame as PrismaFrame,
  Player as PrismaPlayer,
  Room as PrismaRoom,
} from "@prisma/client";
import { prisma } from "./prisma";
import { publishRoomUpdate } from "./roomEvents";

export type PlayerRole = "host" | "guest";
export type RoomStatus = "lobby" | "in-progress" | "completed";

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  joinedAt: number;
}

export interface Frame {
  id: string;
  url: string;
  addedBy: string;
  order: number;
  createdAt: number;
}

export interface Room {
  code: string;
  createdAt: number;
  status: RoomStatus;
  players: Player[];
  frames: Frame[];
}

export interface CreateRoomResult {
  room: Room;
  host: Player;
  sessionToken: string;
}

const CODE_LENGTH = 6;
const MAX_ROOM_SIZE = 12;

function assertRole(role: string): PlayerRole {
  if (role === "host" || role === "guest") {
    return role;
  }

  throw new Error(`Unknown role encountered: ${role}`);
}

function assertStatus(status: string): RoomStatus {
  if (status === "lobby" || status === "in-progress" || status === "completed") {
    return status;
  }

  throw new Error(`Unknown room status encountered: ${status}`);
}

function toPlayer(player: PrismaPlayer): Player {
  return {
    id: player.id,
    name: player.name,
    role: assertRole(player.role),
    joinedAt: player.joinedAt.getTime(),
  };
}

function toFrame(frame: PrismaFrame): Frame {
  return {
    id: frame.id,
    url: frame.url,
    addedBy: frame.addedBy,
    order: frame.order,
    createdAt: frame.createdAt.getTime(),
  };
}

function toRoom(room: PrismaRoom & { players: PrismaPlayer[]; frames: PrismaFrame[] }): Room {
  return {
    code: room.code,
    createdAt: room.createdAt.getTime(),
    status: assertStatus(room.status),
    players: room.players
      .map(toPlayer)
      .sort((a, b) => a.joinedAt - b.joinedAt),
    frames: room.frames
      .map(toFrame)
      .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt),
  };
}

async function generateRoomCode(): Promise<string> {
  const digits = "0123456789";

  while (true) {
    let code = "";
    for (let index = 0; index < CODE_LENGTH; index += 1) {
      const randomIndex = Math.floor(Math.random() * digits.length);
      code += digits[randomIndex];
    }

    const existing = await prisma.room.findUnique({ where: { code } });
    if (!existing) {
      return code;
    }
  }
}

export async function createRoom(hostName: string): Promise<CreateRoomResult> {
  const trimmedName = hostName.trim();
  if (!trimmedName) {
    throw new Error("Host name is required");
  }

  const hostId = randomUUID();
  const sessionToken = randomUUID();
  const now = new Date();

  const created = await prisma.room.create({
    data: {
      code: await generateRoomCode(),
      status: "lobby",
      createdAt: now,
      players: {
        create: {
          id: hostId,
          name: trimmedName,
          role: "host",
          joinedAt: now,
          sessionToken,
        },
      },
    },
    include: {
      players: true,
      frames: true,
    },
  });

  const room = toRoom(created);
  const host = room.players.find((player) => player.id === hostId);

  if (!host) {
    throw new Error("Failed to create host player");
  }

  publishRoomUpdate(room);

  return { room, host, sessionToken };
}

export async function joinRoom(
  roomCode: string,
  playerName: string,
): Promise<{ room: Room; player: Player }> {
  const trimmedCode = roomCode.trim();
  const trimmedName = playerName.trim();

  if (!trimmedCode || trimmedCode.length !== CODE_LENGTH) {
    throw new Error("Enter a valid 6-digit room code");
  }

  if (!trimmedName) {
    throw new Error("Player name is required");
  }

  const result = await prisma.$transaction(async (tx) => {
    const existingRoom = await tx.room.findUnique({
      where: { code: trimmedCode },
      include: { players: true },
    });

    if (!existingRoom) {
      throw new Error("Room not found. Double-check the code with your host.");
    }

    if (existingRoom.status !== "lobby") {
      throw new Error("This match has already started. Ask the host for a fresh room.");
    }

    if (existingRoom.players.length >= MAX_ROOM_SIZE) {
      throw new Error("Room is at capacity. Check with the host for another code.");
    }

    const playerId = randomUUID();
    const now = new Date();

    const createdPlayer = await tx.player.create({
      data: {
        id: playerId,
        name: trimmedName,
        role: "guest",
        joinedAt: now,
        roomCode: existingRoom.code,
      },
    });

    const refreshedRoom = await tx.room.findUnique({
      where: { code: existingRoom.code },
      include: { players: true, frames: true },
    });

    if (!refreshedRoom) {
      throw new Error("Room not found after join");
    }

    return {
      room: refreshedRoom,
      player: createdPlayer,
    };
  });

  const room = toRoom(result.room);
  publishRoomUpdate(room);

  return {
    room,
    player: toPlayer(result.player),
  };
}

export async function getRoom(roomCode: string): Promise<Room | undefined> {
  const trimmedCode = roomCode.trim();
  if (!trimmedCode) return undefined;

  const room = await prisma.room.findUnique({
    where: { code: trimmedCode },
    include: { players: true, frames: true },
  });

  if (!room) return undefined;

  return toRoom(room);
}

export async function removePlayer(roomCode: string, playerId: string): Promise<void> {
  const trimmedCode = roomCode.trim();
  const trimmedPlayerId = playerId.trim();

  if (!trimmedCode || !trimmedPlayerId) {
    return;
  }

  let snapshot: Room | undefined;

  await prisma.$transaction(async (tx) => {
    const deleted = await tx.player.deleteMany({
      where: {
        id: trimmedPlayerId,
        roomCode: trimmedCode,
      },
    });

    if (deleted.count === 0) {
      return;
    }

    const remaining = await tx.player.count({ where: { roomCode: trimmedCode } });
    if (remaining === 0) {
      await tx.room.delete({ where: { code: trimmedCode } });
      snapshot = undefined;
      return;
    }

    const roomRecord = await tx.room.findUnique({
      where: { code: trimmedCode },
      include: { players: true, frames: true },
    });

    if (roomRecord) {
      snapshot = toRoom(roomRecord);
    }
  });

  if (snapshot) {
    publishRoomUpdate(snapshot);
  }
}

export async function updateRoomStatus(
  roomCode: string,
  status: RoomStatus,
  sessionToken?: string,
): Promise<Room> {
  const trimmedCode = roomCode.trim();
  if (!trimmedCode) {
    throw new Error("Room code is required");
  }

  const normalizedStatus = assertStatus(status);

  const result = await prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { code: trimmedCode },
      include: { players: true },
    });

    if (!room) {
      throw new Error("Room not found. Refresh and try again.");
    }

    if (!sessionToken) {
      throw new Error("Host session missing. Reload the lobby.");
    }

    const sessionPlayer = await tx.player.findUnique({ where: { sessionToken } });
    if (!sessionPlayer || sessionPlayer.roomCode !== room.code || sessionPlayer.role !== "host") {
      throw new Error("Only the host can change the match state.");
    }

    await tx.room.update({
      where: { code: room.code },
      data: { status: normalizedStatus },
    });

    const refreshedRoom = await tx.room.findUnique({
      where: { code: room.code },
      include: { players: true, frames: true },
    });

    if (!refreshedRoom) {
      throw new Error("Could not reload room after updating status.");
    }

    return refreshedRoom;
  });

  const normalizedRoom = toRoom(result);
  publishRoomUpdate(normalizedRoom);
  return normalizedRoom;
}

export async function addFrame(
  roomCode: string,
  frameUrl: string,
  sessionToken?: string,
): Promise<Frame> {
  const trimmedCode = roomCode.trim();
  const trimmedUrl = frameUrl.trim();

  if (!trimmedCode) {
    throw new Error("Room code is required");
  }

  if (!trimmedUrl) {
    throw new Error("Provide a frame URL");
  }

  const result = await prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { code: trimmedCode },
      include: {
        players: true,
      },
    });

    if (!room) {
      throw new Error("Room not found. Refresh and try again.");
    }

    if (!sessionToken) {
      throw new Error("Host session missing. Reload the lobby.");
    }

    const sessionPlayer = await tx.player.findUnique({ where: { sessionToken } });
    if (!sessionPlayer || sessionPlayer.roomCode !== room.code || sessionPlayer.role !== "host") {
      throw new Error("Only the host can add frames.");
    }

    const lastFrame = await tx.frame.findFirst({
      where: { roomCode: room.code },
      orderBy: { order: "desc" },
    });

    const nextOrder = lastFrame ? lastFrame.order + 1 : 1;
    const now = new Date();
    const frameId = randomUUID();

    const createdFrame = await tx.frame.create({
      data: {
        id: frameId,
        url: trimmedUrl,
        addedBy: sessionPlayer.id,
        order: nextOrder,
        createdAt: now,
        roomCode: room.code,
      },
    });

    const refreshedRoom = await tx.room.findUnique({
      where: { code: room.code },
      include: { players: true, frames: true },
    });

    if (!refreshedRoom) {
      throw new Error("Could not reload room after adding frame.");
    }

    return {
      frame: createdFrame,
      room: refreshedRoom,
    };
  });

  const normalizedRoom = toRoom(result.room);
  publishRoomUpdate(normalizedRoom);

  return toFrame(result.frame);
}

export async function getPlayerBySessionToken(
  sessionToken: string,
): Promise<(Player & { roomCode: string }) | undefined> {
  const trimmedToken = sessionToken.trim();
  if (!trimmedToken) {
    return undefined;
  }

  const playerRecord = await prisma.player.findUnique({ where: { sessionToken: trimmedToken } });
  if (!playerRecord) {
    return undefined;
  }

  return {
    ...toPlayer(playerRecord),
    roomCode: playerRecord.roomCode,
  };
}
