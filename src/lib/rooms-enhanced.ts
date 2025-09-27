import { randomUUID } from "crypto";
import type {
  Prisma,
  Frame as PrismaFrame,
  Guess as PrismaGuess,
  Player as PrismaPlayer,
  Room as PrismaRoom,
} from "@prisma/client";
import { MOVIE_FRAMES } from "@/data/movieFrames";
import { prisma } from "./prisma";
import { publishRoomUpdate, publishPartyRedirect, publishPartyCountdown } from "./roomEvents";
import { QuizGenerator, GameEventManager } from "./games";
import { createGame, startGame, completeGame, getGameByRoomCode } from "./database";

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
  gameId?: string; // ID de la partie associée
}

export interface CreateRoomResult {
  room: Room;
  host: Player;
  sessionToken: string;
}

export interface UpdateRoomSettingsInput {
  difficulty?: GameDifficulty;
  durationMinutes?: number;
  guessWindowSeconds?: number;
  targetFrameCount?: number;
}

// Configuration par défaut du jeu
function deriveGameSettings() {
  return {
    difficulty: "normal" as GameDifficulty,
    durationMinutes: 10,
    guessWindowSeconds: 20,
    targetFrameCount: 30,
  };
}

// Include par défaut pour les requêtes de salle
const defaultRoomInclude = {
  players: true,
  frames: {
    orderBy: {
      order: "asc",
    },
  },
  game: {
    include: {
      gameFrames: {
        include: {
          movie: true,
        },
        orderBy: {
          order: "asc",
        },
      },
    },
  },
} as const;

// Conversion des types Prisma vers les types de l'application
function toPlayer(prismaPlayer: PrismaPlayer): Player {
  return {
    id: prismaPlayer.id,
    name: prismaPlayer.name,
    role: prismaPlayer.role as PlayerRole,
    joinedAt: prismaPlayer.joinedAt.getTime(),
    score: prismaPlayer.score,
  };
}

function toFrame(prismaFrame: PrismaFrame): Frame {
  return {
    id: prismaFrame.id,
    url: prismaFrame.url,
    addedBy: prismaFrame.addedBy,
    order: prismaFrame.order,
    createdAt: prismaFrame.createdAt.getTime(),
    solvedPlayerIds: [], // Sera rempli par les guesses
  };
}

function toRoom(prismaRoom: PrismaRoom & typeof defaultRoomInclude): Room {
  const frames = (prismaRoom.frames as any[]).map(toFrame);
  
  // Remplir les solvedPlayerIds pour chaque frame
  frames.forEach((frame: any) => {
    const frameGuesses = (prismaRoom.guesses as any[]).filter((guess: any) => guess.frameId === frame.id);
    frame.solvedPlayerIds = frameGuesses
      .filter((guess: any) => guess.isCorrect)
      .map((guess: any) => guess.playerId);
  });

  return {
    code: prismaRoom.code,
    createdAt: prismaRoom.createdAt.getTime(),
    status: prismaRoom.status as RoomStatus,
    players: (prismaRoom.players as any[]).map(toPlayer),
    frames,
    difficulty: prismaRoom.difficulty as GameDifficulty,
    durationMinutes: prismaRoom.durationMinutes,
    guessWindowSeconds: prismaRoom.guessWindowSeconds,
    targetFrameCount: prismaRoom.targetFrameCount,
    roundStartedAt: prismaRoom.roundStartedAt?.getTime() ?? null,
    frameStartedAt: prismaRoom.frameStartedAt?.getTime() ?? null,
    currentFrameIndex: prismaRoom.currentFrameIndex,
    gameId: (prismaRoom.game as any)?.id,
  };
}

// Génération d'un code de salle unique
async function generateRoomCode(): Promise<string> {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const codeLength = 6;
  
  while (true) {
    let code = "";
    for (let i = 0; i < codeLength; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    const existing = await prisma.room.findUnique({ where: { code } });
    if (!existing) {
      return code;
    }
  }
}

// Création d'une salle avec génération de quiz TMDB
export async function createRoom(hostName: string, useTMDB: boolean = true): Promise<CreateRoomResult> {
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

    // Générer les frames selon le mode choisi
    if (useTMDB) {
      // Générer un quiz avec TMDB
      const quizGenerator = new QuizGenerator(process.env.TMDB_API_KEY || '');
      const quizResult = await quizGenerator.generateQuickQuiz(
        createdRoom.code, 
        gameSettings.targetFrameCount
      );
      
      // Créer la partie associée
      const game = await createGame(createdRoom.code);
      
      // Enregistrer l'événement de génération
      await GameEventManager.recordGameStarted(
        game.id,
        createdRoom.code,
        1, // Seulement l'hôte pour l'instant
        gameSettings.targetFrameCount
      );
    } else {
      // Utiliser l'ancien système avec les frames statiques
      await regenerateRoomFrames(tx, createdRoom.code, hostPlayerRecord?.id ?? null, gameSettings.targetFrameCount);
    }

    const refreshedRoomRecord = await tx.room.findUnique({
      where: { code: createdRoom.code },
      include: defaultRoomInclude,
    });

    if (!refreshedRoomRecord || !hostPlayerRecord) {
      throw new Error("Failed to initialise the room quiz.");
    }

    return { refreshedRoom: refreshedRoomRecord, hostPlayer: hostPlayerRecord };
  });

  const room = toRoom(refreshedRoom as any);
  const host = toPlayer(hostPlayer);

  publishRoomUpdate(room);

  return { room, host, sessionToken };
}

// Fonction legacy pour régénérer les frames (système statique)
async function regenerateRoomFrames(
  tx: Prisma.TransactionClient,
  roomCode: string,
  addedBy: string | null,
  targetFrameCount: number,
): Promise<void> {
  // Supprimer les frames existantes
  await tx.frame.deleteMany({
    where: { roomCode },
  });

  // Sélectionner des frames aléatoires
  const shuffledFrames = [...MOVIE_FRAMES].sort(() => Math.random() - 0.5);
  const selectedFrames = shuffledFrames.slice(0, Math.min(targetFrameCount, shuffledFrames.length));

  // Créer les nouvelles frames
  const frameData = selectedFrames.map((frame, index) => ({
    id: randomUUID(),
    url: frame.imageUrl,
    answer: frame.title,
    addedBy: addedBy || "system",
    order: index,
    roomCode,
  }));

  await tx.frame.createMany({
    data: frameData,
  });
}

// Démarrer une partie avec persistance
export async function startRoomGame(roomCode: string, sessionToken?: string): Promise<Room> {
  const trimmedCode = roomCode.trim();
  if (!trimmedCode) {
    throw new Error("Room code is required");
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
      throw new Error("Only the host can start the game.");
    }

    const now = new Date();
    const updateData: Prisma.RoomUpdateInput = {
      status: "in-progress",
      roundStartedAt: now,
      frameStartedAt: new Date(now.getTime() + 3 * 1000), // 3 secondes de préparation
      currentFrameIndex: 0,
    };

    await tx.room.update({
      where: { code: room.code },
      data: updateData,
    });

    // Démarrer la partie si elle existe
    if (room.game) {
      await startGame(room.game.id);
      
      // Enregistrer l'événement de démarrage
      await GameEventManager.recordGameStarted(
        room.game.id,
        room.code,
        room.players.length,
        room.targetFrameCount
      );
    }

    const refreshedRoom = await tx.room.findUnique({
      where: { code: room.code },
      include: defaultRoomInclude,
    });

    if (!refreshedRoom) {
      throw new Error("Could not reload room after starting game.");
    }

    return refreshedRoom;
  });

  const normalizedRoom = toRoom(result as any);
  publishRoomUpdate(normalizedRoom);

  return normalizedRoom;
}

// Avancer une frame avec persistance
export async function advanceFrame(roomCode: string, sessionToken?: string): Promise<Room> {
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
      throw new Error("Start the game before advancing frames.");
    }

    const sessionPlayer = await tx.player.findUnique({ where: { sessionToken } });
    if (!sessionPlayer || sessionPlayer.roomCode !== room.code || sessionPlayer.role !== "host") {
      throw new Error("Only the host can advance frames.");
    }

    const totalFrames = room.frames.length;
    if (totalFrames === 0) {
      throw new Error("Host needs to add frames before advancing.");
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
      
      // Terminer la partie si elle existe
      if (room.game) {
        await completeGame(room.game.id);
        
        // Enregistrer l'événement de fin
        await GameEventManager.recordGameCompleted(
          room.game.id,
          totalFrames,
          0, // TODO: Calculer le nombre total de tentatives
          0, // TODO: Calculer le nombre de bonnes réponses
          room.players.map(p => ({ playerId: p.id, playerName: p.name, score: p.score })),
          room.roundStartedAt ? Math.floor((now.getTime() - room.roundStartedAt.getTime()) / 1000) : 0
        );
      }
    } else {
      updateData.currentFrameIndex = nextIndex;
      updateData.frameStartedAt = now;
      
      // Enregistrer l'événement d'avancement de frame
      if (room.game) {
        await GameEventManager.recordFrameAdvanced(
          room.game.id,
          currentIndex,
          nextIndex,
          room.frames[currentIndex]?.answer || "",
          0, // TODO: Calculer le nombre total de tentatives
          0  // TODO: Calculer le nombre de bonnes réponses
        );
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
      throw new Error("Could not reload room after advancing frame.");
    }

    return refreshedRoom;
  });

  const normalizedRoom = toRoom(result as any);
  publishRoomUpdate(normalizedRoom);

  return normalizedRoom;
}

// Re-export des autres fonctions existantes
export {
  joinRoom,
  removePlayer,
  updateRoomStatus,
  updateRoomSettings,
  submitGuess,
  getRoom,
  // getRoomByCode, // Commenté car non exporté
} from "./rooms";
