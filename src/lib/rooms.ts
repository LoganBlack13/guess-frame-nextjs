import { randomUUID } from "crypto";
import type {
  Prisma,
  Frame as PrismaFrame,
  Guess as PrismaGuess,
  Player as PrismaPlayer,
  Room as PrismaRoom,
} from "@prisma/client";
import { prisma } from "./prisma";
import { publishRoomUpdate, publishPartyRedirect, publishPartyCountdown } from "./roomEvents";
import type { MovieFrame } from './tmdb/types';

export type PlayerRole = "host" | "guest";
export type RoomStatus = "lobby" | "in-progress" | "completed";
export type GameDifficulty = "easy" | "normal" | "hard";

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  joinedAt: number;
  score: number;
}

export interface Frame {
  id: string;
  url: string;
  addedBy: string;
  order: number;
  createdAt: number;
  solvedPlayerIds: string[];
}

export interface Room {
  code: string;
  createdAt: number;
  status: RoomStatus;
  players: Player[];
  frames: Frame[];
  difficulty: GameDifficulty;
  durationMinutes: number;
  guessWindowSeconds: number;
  targetFrameCount: number;
  roundStartedAt: number | null;
  frameStartedAt: number | null;
  currentFrameIndex: number;
}

export interface CreateRoomResult {
  room: Room;
  host: Player;
  sessionToken: string;
}

const CODE_LENGTH = 6;
const MAX_ROOM_SIZE = 12;
const DEFAULT_DIFFICULTY: GameDifficulty = "normal";
const DEFAULT_DURATION_MINUTES = 10;
const ALLOWED_DURATIONS = new Set([5, 10, 15]);
const QUIZ_GENERATOR_ID = "quiz-generator";
const defaultRoomInclude = {
  players: true,
  guesses: true,
  frames: {
    include: { guesses: true },
    orderBy: { order: "asc" as const },
  },
  game: {
    include: {
      gameFrames: {
        include: {
          movie: true,
        },
        orderBy: {
          order: "asc" as const,
        },
      },
      events: {
        orderBy: {
          timestamp: "asc" as const,
        },
      },
    },
  },
} as const;

function shuffleArray<T>(values: T[]): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}



function normalizeAnswerText(value: string): string {
  return value.trim().replace(/\s+/g, " " ).toLowerCase();
}

function answersMatch(submitted: string, expected: string): boolean {
  const normalizedSubmitted = normalizeAnswerText(submitted);
  const normalizedExpected = normalizeAnswerText(expected);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Answer comparison:');
    console.log('  Original submitted:', submitted);
    console.log('  Original expected:', expected);
    console.log('  Normalized submitted:', normalizedSubmitted);
    console.log('  Normalized expected:', normalizedExpected);
    console.log('  Match:', normalizedSubmitted === normalizedExpected);
  }
  
  return normalizedSubmitted === normalizedExpected;
}

// This function is no longer needed - frames are created only when games start

const PRE_ROLL_SECONDS = 5;

const DIFFICULTY_WINDOWS: Record<GameDifficulty, number> = {
  hard: 10,
  normal: 20,
  easy: 30,
};

function normalizeDifficulty(value: string): GameDifficulty {
  if (value === "easy" || value === "normal" || value === "hard") {
    return value;
  }
  return DEFAULT_DIFFICULTY;
}

function calculateTargetFrameCount(durationMinutes: number, guessWindowSeconds: number): number {
  const totalSeconds = durationMinutes * 60;
  const frames = Math.max(1, Math.floor(totalSeconds / guessWindowSeconds));
  return frames;
}

interface GameSettings {
  difficulty: GameDifficulty;
  durationMinutes: number;
  guessWindowSeconds: number;
  targetFrameCount: number;
}

function deriveGameSettings(
  difficulty: GameDifficulty = DEFAULT_DIFFICULTY,
  durationMinutes: number = DEFAULT_DURATION_MINUTES,
): GameSettings {
  const normalizedDifficulty = normalizeDifficulty(difficulty);
  const safeDuration = ALLOWED_DURATIONS.has(durationMinutes) ? durationMinutes : DEFAULT_DURATION_MINUTES;
  const guessWindowSeconds = DIFFICULTY_WINDOWS[normalizedDifficulty];
  const rawTarget = calculateTargetFrameCount(safeDuration, guessWindowSeconds);
  const targetFrameCount = Math.max(1, rawTarget);

  return {
    difficulty: normalizedDifficulty,
    durationMinutes: safeDuration,
    guessWindowSeconds,
    targetFrameCount,
  };
}

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
    score: player.score,
  };
}

function toFrame(frame: PrismaFrame & { guesses?: PrismaGuess[] }): Frame {
  const solvedPlayerIds = (frame.guesses ?? [])
    .filter((guess) => guess.isCorrect)
    .map((guess) => guess.playerId);

  return {
    id: frame.id,
    url: frame.url,
    addedBy: frame.addedBy,
    order: frame.order,
    createdAt: frame.createdAt.getTime(),
    solvedPlayerIds,
  };
}

function toRoom(
  room: PrismaRoom & { 
    players: PrismaPlayer[]; 
    guesses: PrismaGuess[];
    frames: (PrismaFrame & { guesses?: PrismaGuess[] })[]; 
    game?: {
      gameFrames: Array<{
        id: string;
        imageUrl: string;
        aspectRatio: number;
        isScene: boolean;
        order: number;
        movie: {
          title: string;
        };
      }>;
      events: Array<{
        id: string;
        type: string;
        data: string;
        timestamp: Date;
      }>;
    } | null;
  },
): Room {
  // All frames now come from GameFrames (database-generated quizzes)
  const frames = room.game?.gameFrames?.length 
    ? room.game.gameFrames.map((gameFrame, index) => {
        // Only log in development and when there are frames
        if (process.env.NODE_ENV === 'development' && room.game?.gameFrames && room.game.gameFrames.length > 0) {
          console.log(`🎬 Creating frame ${index}:`, {
            id: gameFrame.id,
            movieTitle: gameFrame.movie.title,
            imageUrl: gameFrame.imageUrl,
            order: gameFrame.order
          });
        }
        
        // Calculate solvedPlayerIds from GameEvents for this specific GameFrame
        const solvedPlayerIds = room.game?.events
          ?.filter((event: { type: string; data: string }) => {
            if (event.type !== "guess_submitted") return false;
            try {
              const data = JSON.parse(event.data);
              return data.frameIndex === index && data.isCorrect === true;
            } catch {
              return false;
            }
          })
          ?.map((event: { data: string }) => {
            try {
              const data = JSON.parse(event.data);
              return data.playerId;
            } catch {
              return null;
            }
          })
          ?.filter(Boolean) || [];
        
        return {
          id: gameFrame.id,
          url: gameFrame.imageUrl,
          answer: gameFrame.movie.title,
          addedBy: "tmdb-generator",
          order: gameFrame.order,
          createdAt: Date.now(),
          solvedPlayerIds,
        };
      }).sort((a, b) => a.order - b.order)
    : []; // No fallback - all frames come from database

  // Only log frames if there are any and in development mode
  if (process.env.NODE_ENV === 'development' && frames.length > 0) {
    console.log('📋 Final frames array:', frames.map((f, i) => ({ 
      arrayIndex: i, 
      order: f.order, 
      title: f.answer, 
      id: f.id 
    })));
  }

  return {
    code: room.code,
    createdAt: room.createdAt.getTime(),
    status: assertStatus(room.status),
    players: room.players
      .map(toPlayer)
      .sort((a, b) => a.joinedAt - b.joinedAt),
    frames,
    difficulty: normalizeDifficulty(room.difficulty),
    durationMinutes: room.durationMinutes,
    guessWindowSeconds: room.guessWindowSeconds,
    targetFrameCount: room.game?.gameFrames?.length || room.targetFrameCount,
    roundStartedAt: room.roundStartedAt ? room.roundStartedAt.getTime() : null,
    frameStartedAt: room.frameStartedAt ? room.frameStartedAt.getTime() : null,
    currentFrameIndex: room.currentFrameIndex,
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
  const gameSettings = deriveGameSettings();

  const { refreshedRoom, hostPlayer } = await prisma.$transaction(async (tx) => {
    const createdRoom = await tx.room.create({
      data: {
        code: await generateRoomCode(),
        status: "lobby",
        createdAt: now,
        difficulty: gameSettings.difficulty,
        durationMinutes: gameSettings.durationMinutes,
        guessWindowSeconds: gameSettings.guessWindowSeconds,
        targetFrameCount: gameSettings.targetFrameCount,
        roundStartedAt: null,
        frameStartedAt: null,
        currentFrameIndex: 0,
        players: {
          create: {
            id: hostId,
            name: trimmedName,
            role: "host",
            joinedAt: now,
            sessionToken,
            score: 0,
          },
        },
      },
      include: { players: true },
    });

    const hostPlayerRecord = createdRoom.players.find((player) => player.id === hostId) ?? null;

    // No quiz generation during room creation - quizzes are generated only when game starts

    const refreshedRoomRecord = await tx.room.findUnique({
      where: { code: createdRoom.code },
      include: defaultRoomInclude,
    });

    if (!refreshedRoomRecord || !hostPlayerRecord) {
      throw new Error("Failed to initialise the room quiz.");
    }

    return { refreshedRoom: refreshedRoomRecord, hostPlayer: hostPlayerRecord };
  });

  // Game creation is now handled when the game starts, not during room creation

  const room = toRoom(refreshedRoom);
  const host = toPlayer(hostPlayer);

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
        score: 0,
      },
    });

    const refreshedRoom = await tx.room.findUnique({
      where: { code: existingRoom.code },
      include: defaultRoomInclude,
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
    include: defaultRoomInclude,
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
      include: defaultRoomInclude,
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
      include: defaultRoomInclude,
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

    const now = new Date();
    const updateData: Prisma.RoomUpdateInput = {
      status: normalizedStatus,
    };

    if (normalizedStatus === "in-progress") {
      // Check for game frames instead of static frames
      if (!room.game || !(room.game as any).gameFrames || (room.game as any).gameFrames.length === 0) {
        throw new Error("Add at least one frame before starting the match.");
      }
      updateData.roundStartedAt = now;
      updateData.frameStartedAt = new Date(now.getTime() + PRE_ROLL_SECONDS * 1000);
      updateData.currentFrameIndex = 0;
    } else if (normalizedStatus === "lobby") {
      updateData.roundStartedAt = null;
      updateData.frameStartedAt = null;
      updateData.currentFrameIndex = 0;
    } else if (normalizedStatus === "completed") {
      updateData.frameStartedAt = null;
    }

    await tx.room.update({
      where: { code: room.code },
      data: updateData,
    });

    const refreshedRoom = await tx.room.findUnique({
      where: { code: room.code },
      include: defaultRoomInclude,
    });

    if (!refreshedRoom) {
      throw new Error("Could not reload room after updating status.");
    }

    return refreshedRoom;
  });

  const normalizedRoom = toRoom(result);
  publishRoomUpdate(normalizedRoom);
  
  // If we start the game, trigger the redirection and countdown
  if (normalizedStatus === "in-progress") {
    console.log('🔄 Publishing party redirect event for room:', normalizedRoom.code);
    // Publish the redirection event immediately
    publishPartyRedirect(normalizedRoom);
    
    console.log('⏰ Starting countdown for room:', normalizedRoom.code);
    // Start the 5 second countdown
    let countdown = 5;
    publishPartyCountdown(normalizedRoom, countdown);
    
    const countdownInterval = setInterval(() => {
      countdown--;
      console.log(`⏰ Countdown for room ${normalizedRoom.code}: ${countdown}`);
      if (countdown > 0) {
        publishPartyCountdown(normalizedRoom, countdown);
      } else {
        clearInterval(countdownInterval);
        console.log('🎮 Game starting now for room:', normalizedRoom.code);
        // The game starts now - frameStartedAt is already configured
        publishRoomUpdate(normalizedRoom);
      }
    }, 1000);
  }
  
  return normalizedRoom;
}

export async function addFrame(
  roomCode: string,
  frameUrl: string,
  frameAnswer: string,
  sessionToken?: string,
): Promise<Frame> {
  const trimmedCode = roomCode.trim();
  const trimmedUrl = frameUrl.trim();
  const trimmedAnswer = frameAnswer.trim();

  if (!trimmedCode) {
    throw new Error("Room code is required");
  }

  if (!trimmedUrl) {
    throw new Error("Provide a frame URL");
  }

  if (!trimmedAnswer) {
    throw new Error("Provide an answer for this frame.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { code: trimmedCode },
      include: defaultRoomInclude,
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

    const lastFrame = room.frames.length
      ? room.frames[room.frames.length - 1]
      : null;
    const nextOrder = lastFrame ? lastFrame.order + 1 : 1;
    const now = new Date();
    const frameId = randomUUID();

    const createdFrame = await tx.frame.create({
      data: {
        id: frameId,
        url: trimmedUrl,
        answer: trimmedAnswer,
        addedBy: sessionPlayer.id,
        order: nextOrder,
        createdAt: now,
        roomCode: room.code,
      },
    });

    const refreshedRoom = await tx.room.findUnique({
      where: { code: room.code },
      include: defaultRoomInclude,
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

  return toFrame({ ...result.frame, guesses: [] });
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

interface UpdateRoomSettingsInput {
  difficulty: GameDifficulty;
  durationMinutes: number;
}

export async function updateRoomSettings(
  roomCode: string,
  sessionToken: string | undefined,
  settings: UpdateRoomSettingsInput,
): Promise<Room> {
  const trimmedCode = roomCode.trim();
  if (!trimmedCode) {
    throw new Error("Room code is required");
  }

  if (!sessionToken) {
    throw new Error("Host session missing. Reload the lobby.");
  }

  const normalizedDifficulty = normalizeDifficulty(settings.difficulty);
  const requestedDuration = ALLOWED_DURATIONS.has(settings.durationMinutes)
    ? settings.durationMinutes
    : DEFAULT_DURATION_MINUTES;

  const derived = deriveGameSettings(normalizedDifficulty, requestedDuration);

  const result = await prisma.$transaction(async (tx) => {
    const sessionPlayer = await tx.player.findUnique({ where: { sessionToken } });

    if (!sessionPlayer || sessionPlayer.role !== "host") {
      throw new Error("Only the host can change game settings.");
    }

    if (sessionPlayer.roomCode !== trimmedCode) {
      throw new Error("Session does not match this room.");
    }

    const currentRoom = await tx.room.findUnique({ where: { code: trimmedCode } });
    if (!currentRoom) {
      throw new Error("Room not found. Refresh and try again.");
    }

    const updateData: Prisma.RoomUpdateInput = {
      difficulty: derived.difficulty,
      durationMinutes: derived.durationMinutes,
      guessWindowSeconds: derived.guessWindowSeconds,
      targetFrameCount: derived.targetFrameCount,
    };

    if (currentRoom.status === "in-progress") {
      updateData.frameStartedAt = new Date();
    } else if (currentRoom.status === "lobby") {
      updateData.frameStartedAt = null;
      updateData.currentFrameIndex = 0;
    }

    if (currentRoom.currentFrameIndex >= derived.targetFrameCount) {
      updateData.currentFrameIndex = Math.max(0, derived.targetFrameCount - 1);
    }

    await tx.room.update({
      where: { code: trimmedCode },
      data: updateData,
    });

    // Room settings updated - frames will be generated when game starts

    const refreshedRoom = await tx.room.findUnique({
      where: { code: trimmedCode },
      include: defaultRoomInclude,
    });

    if (!refreshedRoom) {
      throw new Error("Room not found after updating settings.");
    }

    return refreshedRoom;
  });

  const normalizedRoom = toRoom(result);
  publishRoomUpdate(normalizedRoom);
  return normalizedRoom;
}

export async function advanceFrame(
  roomCode: string,
  sessionToken: string | undefined,
): Promise<Room> {
  const trimmedCode = roomCode.trim();
  if (!trimmedCode) {
    throw new Error("Room code is required");
  }

  if (!sessionToken) {
    throw new Error("Host session missing. Reload the lobby.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { code: trimmedCode },
      include: defaultRoomInclude,
    });

    if (!room) {
      throw new Error("Room not found. Refresh and try again.");
    }

    if (room.status !== "in-progress") {
      throw new Error("Start the match before advancing frames.");
    }

    const sessionPlayer = await tx.player.findUnique({ where: { sessionToken } });
    if (!sessionPlayer || sessionPlayer.roomCode !== room.code || sessionPlayer.role !== "host") {
      throw new Error("Only the host can advance frames.");
    }

    // Use GameFrames instead of static frames
    const totalFrames = (room.game as any)?.gameFrames?.length || 0;
    if (totalFrames === 0) {
      throw new Error("No game frames available for advancing.");
    }

    const effectiveTarget = Math.max(1, Math.min(room.targetFrameCount, totalFrames));
    const currentIndex = room.currentFrameIndex;
    const nextIndex = currentIndex + 1;
    const now = new Date();
    const updateData: Prisma.RoomUpdateInput = {};

    if (nextIndex >= effectiveTarget || nextIndex >= totalFrames) {
      updateData.status = "completed";
      updateData.currentFrameIndex = Math.max(0, Math.min(effectiveTarget, totalFrames) - 1);
      updateData.frameStartedAt = null;
      
      // Terminer la partie si elle existe et enregistrer l'événement game_completed
      if (room.game) {
        await (tx as any).game.update({
          where: { id: room.game.id },
          data: {
            status: 'completed',
            completedAt: now,
          },
        });
        
        // Enregistrer l'événement de fin
        const gameStartedEvent = await (tx as any).gameEvent.findFirst({
          where: { gameId: room.game.id, type: 'game_started' },
          orderBy: { timestamp: 'asc' }
        });
        
        const actualDuration = gameStartedEvent 
          ? Math.floor((now.getTime() - new Date(gameStartedEvent.timestamp).getTime()) / 1000)
          : 0;
        
        await (tx as any).gameEvent.create({
          data: {
            gameId: room.game.id,
            type: 'game_completed',
            data: JSON.stringify({
              totalFrames: effectiveTarget,
              totalGuesses: 0, // TODO: Calculer le nombre total de tentatives
              correctGuesses: 0, // TODO: Calculer le nombre de bonnes réponses
              playerScores: room.players.map(p => ({ playerId: p.id, playerName: p.name, score: p.score })),
              duration: actualDuration,
            }),
          },
        });
      }
    } else {
      updateData.currentFrameIndex = nextIndex;
      updateData.frameStartedAt = now;
      
      // Enregistrer l'événement de démarrage de la nouvelle frame
      if (room.game && (room.game as any)?.gameFrames?.[nextIndex]) {
        const gameFrame = (room.game as any).gameFrames[nextIndex];
        await (tx as any).gameEvent.create({
          data: {
            gameId: room.game.id,
            type: 'frame_started',
            data: JSON.stringify({
              frameIndex: nextIndex,
              frameId: gameFrame.id,
              movieTitle: gameFrame.movie.title,
              timeLimit: room.guessWindowSeconds || 20
            }),
          },
        });
      }
    }

    await tx.room.update({
      where: { code: room.code },
      data: updateData,
    });

    const refreshedRoom = await tx.room.findUnique({
      where: { code: room.code },
      include: defaultRoomInclude,
    });

    if (!refreshedRoom) {
      throw new Error("Room not found after advancing frame.");
    }

    return refreshedRoom;
  });

  const normalizedRoom = toRoom(result);
  publishRoomUpdate(normalizedRoom);
  return normalizedRoom;
}

interface GuessOutcome {
  isCorrect: boolean;
  alreadySolved: boolean;
}

export async function submitGuess(
  roomCode: string,
  playerId: string,
  answer: string,
): Promise<{ room: Room; outcome: GuessOutcome }> {
  const trimmedCode = roomCode.trim();
  const trimmedPlayerId = playerId.trim();
  const trimmedAnswer = answer.trim();

  if (!trimmedCode) {
    throw new Error("Room code is required");
  }

  if (!trimmedPlayerId) {
    throw new Error("Player is required");
  }

  if (!trimmedAnswer) {
    throw new Error("Submit an answer before guessing.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { code: trimmedCode },
      include: defaultRoomInclude,
    });

    if (!room) {
      throw new Error("Room not found. Refresh and try again.");
    }

    const player = room.players.find((entry) => entry.id === trimmedPlayerId);
    if (!player) {
      throw new Error("Player is not part of this room.");
    }

    if (room.status !== "in-progress") {
      throw new Error("Round isn't active right now.");
    }

    if (!room.frameStartedAt || room.frameStartedAt.getTime() > Date.now()) {
      throw new Error("Wait for the frame reveal before guessing.");
    }

    // Check if there are GameFrames available
    const hasGameFrames = (room.game as any)?.gameFrames?.length > 0;
    
    if (!hasGameFrames) {
      throw new Error("No game frames available. Start a new game first.");
    }

    // Use GameFrames (all quizzes now come from database)
    const currentFrameIndex = room.currentFrameIndex;
    const gameFrames = (room.game as any)?.gameFrames || [];
    const currentFrame = gameFrames[currentFrameIndex];
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 GameFrames System Debug:');
      console.log('  Has GameFrames:', hasGameFrames);
      console.log('  Current frame index:', currentFrameIndex);
      console.log('  Total GameFrames available:', gameFrames.length);
      console.log('  Room currentFrameIndex from DB:', room.currentFrameIndex);
      console.log('  Game ID:', (room.game as any)?.id);
      console.log('  GameFrames count:', (room.game as any)?.gameFrames?.length);

      console.log('🎯 Frame Index Debug:');
      console.log('  Current frame index:', currentFrameIndex);
      console.log('  Total frames available:', gameFrames.length);
      console.log('  All frames:', gameFrames.map((f: any, i: number) => ({ index: i, title: f.movie.title, id: f.id })));
      console.log('  Frame at current index:', currentFrame ? { title: currentFrame.movie.title, id: currentFrame.id } : 'NO FRAME');
    }

    if (!currentFrame) {
      throw new Error("Host needs to add more frames before continuing.");
    }

    // Check if already solved using GameEvents
    let alreadySolved = false;
    const game = room.game as any;
    if (game && game.id) {
      const gameEvent = await (tx as any).gameEvent.findFirst({
        where: {
          gameId: game.id,
          type: "guess_submitted",
          data: {
            contains: JSON.stringify({
              playerId: trimmedPlayerId,
              frameIndex: currentFrameIndex,
              isCorrect: true
            })
          }
        }
      });
      alreadySolved = !!gameEvent;
    }
    
    // Compare with movie title
    if (process.env.NODE_ENV === 'development') {
      console.log('🎬 GameFrame Debug:');
      console.log('  Expected movie title:', currentFrame.movie.title);
      console.log('  User answer:', trimmedAnswer);
      console.log('  Frame ID:', currentFrame.id);
      console.log('  Frame order:', currentFrame.order);
    }
    
    const isCorrect = answersMatch(trimmedAnswer, currentFrame.movie.title);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('  Match result:', isCorrect);
    }

    if (alreadySolved) {
      return {
        room,
        outcome: { isCorrect: true, alreadySolved: true },
      };
    }

    // Record guess in GameEvents
    if (game && game.id) {
      await (tx as any).gameEvent.create({
        data: {
          gameId: game.id,
          type: "guess_submitted",
          data: JSON.stringify({
            playerId: trimmedPlayerId,
            playerName: player.name,
            frameIndex: currentFrameIndex,
            answer: trimmedAnswer,
            isCorrect,
            pointsAwarded: isCorrect ? 1 : 0,
            timestamp: new Date().toISOString()
          })
        }
      });
    }

    if (isCorrect) {
      await tx.player.update({
        where: { id: trimmedPlayerId },
        data: {
          score: { increment: 1 },
        },
      });
    }

    const refreshedRoom = await tx.room.findUnique({
      where: { code: room.code },
      include: defaultRoomInclude,
    });

    if (!refreshedRoom) {
      throw new Error("Room not found after submitting guess.");
    }

    return {
      room: refreshedRoom,
      outcome: { isCorrect, alreadySolved: false },
    };
  });

  const normalizedRoom = toRoom(result.room);
  publishRoomUpdate(normalizedRoom);

  return {
    room: normalizedRoom,
    outcome: result.outcome,
  };
}
