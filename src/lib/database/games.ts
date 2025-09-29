import { prisma } from '../prisma';
import {
  Game,
  GameEvent,
  GameEventData,
  GameFrame,
  GameStats,
  GameTimeline,
  Movie,
} from './types';

// Créer une nouvelle partie ou récupérer la partie existante
export async function createGame(roomCode: string): Promise<Game> {
  // Vérifier s'il existe déjà une partie pour cette salle
  const existingGame = await prisma.game.findUnique({
    where: { roomCode },
    include: {
      events: true,
      gameFrames: {
        include: {
          movie: true,
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
  });

  // Si une partie existe et n'est pas terminée, la retourner
  if (existingGame && existingGame.status !== 'completed') {
    return existingGame as unknown as Game;
  }

  // Si une partie terminée existe, la supprimer d'abord
  if (existingGame && existingGame.status === 'completed') {
    await prisma.game.delete({
      where: { id: existingGame.id },
    });
  }

  // Créer une nouvelle partie
  const game = await prisma.game.create({
    data: {
      roomCode,
      status: 'generated',
      startedAt: null,
      completedAt: null,
    },
    include: {
      events: true,
      gameFrames: {
        include: {
          movie: true,
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
  });

  return game as unknown as Game;
}

// Démarrer une partie
export async function startGame(gameId: string): Promise<Game> {
  const game = await prisma.game.update({
    where: { id: gameId },
    data: {
      status: 'started',
      startedAt: new Date(),
    },
    include: {
      events: true,
      gameFrames: {
        include: {
          movie: true,
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
  });

  return game as unknown as Game;
}

// Terminer une partie
export async function completeGame(gameId: string): Promise<Game> {
  const game = await prisma.game.update({
    where: { id: gameId },
    data: {
      status: 'completed',
      completedAt: new Date(),
    },
    include: {
      events: true,
      gameFrames: {
        include: {
          movie: true,
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
  });

  return game as unknown as Game;
}

// Récupérer une partie par ID
export async function getGame(gameId: string): Promise<Game | null> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      events: {
        orderBy: {
          timestamp: 'asc',
        },
      },
      gameFrames: {
        include: {
          movie: true,
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
  });

  return game as Game | null;
}

// Récupérer une partie par code de salle
export async function getGameByRoomCode(
  roomCode: string
): Promise<Game | null> {
  const game = await prisma.game.findUnique({
    where: { roomCode },
    include: {
      events: {
        orderBy: {
          timestamp: 'asc',
        },
      },
      gameFrames: {
        include: {
          movie: true,
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
  });

  return game as Game | null;
}

// Ajouter un événement à une partie
export async function addGameEvent(
  gameId: string,
  eventData: GameEventData
): Promise<GameEvent> {
  const event = await prisma.gameEvent.create({
    data: {
      gameId,
      type: eventData.type,
      data: JSON.stringify(eventData.data),
    },
    include: {
      game: true,
    },
  });

  return event as GameEvent;
}

// Récupérer les événements d'une partie
export async function getGameEvents(gameId: string): Promise<GameEvent[]> {
  const events = await prisma.gameEvent.findMany({
    where: { gameId },
    orderBy: {
      timestamp: 'asc',
    },
    include: {
      game: true,
    },
  });

  return events as GameEvent[];
}

// Créer ou récupérer un film
export async function createOrGetMovie(movieData: {
  tmdbId: number;
  title: string;
  originalTitle: string;
  overview?: string;
  releaseDate?: Date;
  genres: string[];
  runtime?: number;
  tagline?: string;
  languages: string[];
  posterUrl?: string;
  backdropUrl?: string;
  stillsUrls: string[];
}): Promise<Movie> {
  // Vérifier si le film existe déjà
  const existingMovie = await prisma.movie.findUnique({
    where: { tmdbId: movieData.tmdbId },
  });

  if (existingMovie) {
    return existingMovie as unknown as Movie;
  }

  // Créer le nouveau film
  const movie = await prisma.movie.create({
    data: {
      tmdbId: movieData.tmdbId,
      title: movieData.title,
      originalTitle: movieData.originalTitle,
      overview: movieData.overview,
      releaseDate: movieData.releaseDate,
      genres: JSON.stringify(movieData.genres),
      runtime: movieData.runtime,
      tagline: movieData.tagline,
      languages: JSON.stringify(movieData.languages),
      posterUrl: movieData.posterUrl,
      backdropUrl: movieData.backdropUrl,
      stillsUrls: JSON.stringify(movieData.stillsUrls),
    },
  });

  return movie as unknown as Movie;
}

// Ajouter des frames à une partie
export async function addGameFrames(
  gameId: string,
  frames: Array<{
    movieId: string;
    imageUrl: string;
    aspectRatio: number;
    isScene: boolean;
    order: number;
  }>
): Promise<GameFrame[]> {
  await prisma.gameFrame.createMany({
    data: frames.map((frame) => ({
      gameId,
      movieId: frame.movieId,
      imageUrl: frame.imageUrl,
      aspectRatio: frame.aspectRatio,
      isScene: frame.isScene,
      order: frame.order,
    })),
  });

  // Récupérer les frames créées avec leurs relations
  const createdFrames = await prisma.gameFrame.findMany({
    where: { gameId },
    include: {
      movie: true,
      game: true,
    },
    orderBy: {
      order: 'asc',
    },
  });

  return createdFrames as unknown as GameFrame[];
}

// Récupérer les statistiques d'une partie
export async function getGameStats(gameId: string): Promise<GameStats | null> {
  const game = await getGame(gameId);
  if (!game) return null;

  const events = await getGameEvents(gameId);
  const guesses = events.filter((e) => e.type === 'guess_submitted');
  const correctGuesses = guesses.filter((e) => {
    const data = JSON.parse(e.data);
    return data.isCorrect;
  });

  // Calculer les statistiques des joueurs basées sur les événements de cette partie spécifique
  const playerGameStats = [];

  // Grouper les événements par joueur
  const playerEvents = new Map<string, Array<{ type: string; data: string; timestamp: Date }>>();

  events.forEach((event) => {
    if (event.type === 'guess_submitted') {
      const data = JSON.parse(event.data);
      const playerId = data.playerId;

      if (!playerEvents.has(playerId)) {
        playerEvents.set(playerId, []);
      }
      playerEvents.get(playerId)!.push(event);
    }
  });

  // Calculer les statistiques pour chaque joueur
  for (const [playerId, playerEventList] of playerEvents) {
    const correctGuesses = playerEventList.filter((event) => {
      const data = JSON.parse(event.data);
      return data.isCorrect;
    });

    // Récupérer le nom du joueur depuis le premier événement
    const firstEvent = playerEventList[0];
    const firstEventData = JSON.parse(firstEvent.data);
    const playerName = firstEventData.playerName;

    // Calculer le score total du joueur
    const totalScore = playerEventList.reduce((sum, event) => {
      const data = JSON.parse(event.data);
      return sum + (data.pointsAwarded || 0);
    }, 0);

    // Calculer le temps de réponse moyen pour ce joueur
    let averageResponseTime = 0;
    if (playerEventList.length > 0) {
      const responseTimes: number[] = [];

      for (const guessEvent of playerEventList) {
        const guessData = JSON.parse(guessEvent.data);
        const frameIndex = guessData.frameIndex;

        // Trouver l'événement frame_started correspondant à cette frame
        const frameStartedEvent = events.find((e) => {
          if (e.type === 'frame_started') {
            const frameData = JSON.parse(e.data);
            return frameData.frameIndex === frameIndex;
          }
          return false;
        });

        if (frameStartedEvent) {
          const responseTime =
            new Date(guessEvent.timestamp).getTime() -
            new Date(frameStartedEvent.timestamp).getTime();
          responseTimes.push(responseTime);
        }
      }

      if (responseTimes.length > 0) {
        averageResponseTime =
          responseTimes.reduce((sum, time) => sum + time, 0) /
          responseTimes.length;
        // Convertir en secondes
        averageResponseTime = Math.round(averageResponseTime / 1000);
      }
    }

    playerGameStats.push({
      playerId,
      playerName,
      score: totalScore,
      guesses: playerEventList.length,
      correctGuesses: correctGuesses.length,
      accuracy:
        playerEventList.length > 0
          ? correctGuesses.length / playerEventList.length
          : 0,
      averageResponseTime,
    });
  }

  // Calculer la durée basée sur les événements plutôt que sur les timestamps de la game
  let duration = 0;
  if (events.length > 0) {
    const gameStarted = events.find((e) => e.type === 'game_started');
    const gameCompleted = events.find((e) => e.type === 'game_completed');

    if (gameStarted && gameCompleted) {
      duration = Math.floor(
        (new Date(gameCompleted.timestamp).getTime() -
          new Date(gameStarted.timestamp).getTime()) /
          1000
      );
    } else if (gameStarted) {
      // Si pas de game_completed, utiliser une approche plus intelligente
      // Trouver le dernier événement de frame_advanced (qui marque la fin d'une frame)
      const frameAdvancedEvents = events.filter(
        (e) => e.type === 'frame_advanced'
      );

      if (frameAdvancedEvents.length > 0) {
        // Utiliser le dernier frame_advanced comme fin de partie
        const lastFrameAdvanced =
          frameAdvancedEvents[frameAdvancedEvents.length - 1];
        duration = Math.floor(
          (new Date(lastFrameAdvanced.timestamp).getTime() -
            new Date(gameStarted.timestamp).getTime()) /
            1000
        );
      } else {
        // Fallback: utiliser une approche plus intelligente pour les guess_submitted
        // Grouper les guess_submitted par frame et utiliser le dernier groupe
        const guessEvents = events.filter((e) => e.type === 'guess_submitted');

        if (guessEvents.length > 0) {
          // Trouver le dernier groupe de guesses (probablement la dernière frame active)
          const lastGuessEvent = guessEvents[guessEvents.length - 1];

          // Ajouter un délai raisonnable pour la fin de la frame (par exemple 20 secondes)
          const frameEndTime =
            new Date(lastGuessEvent.timestamp).getTime() + 20 * 1000;
          duration = Math.floor(
            (frameEndTime - new Date(gameStarted.timestamp).getTime()) / 1000
          );
        }
      }
    }
  }

  // Calculer le temps de réponse moyen global
  let globalAverageResponseTime = 0;
  if (guesses.length > 0) {
    const allResponseTimes: number[] = [];

    for (const guessEvent of guesses) {
      const guessData = JSON.parse(guessEvent.data);
      const frameIndex = guessData.frameIndex;

      // Trouver l'événement frame_started correspondant à cette frame
      const frameStartedEvent = events.find((e) => {
        if (e.type === 'frame_started') {
          const frameData = JSON.parse(e.data);
          return frameData.frameIndex === frameIndex;
        }
        return false;
      });

      if (frameStartedEvent) {
        const responseTime =
          new Date(guessEvent.timestamp).getTime() -
          new Date(frameStartedEvent.timestamp).getTime();
        allResponseTimes.push(responseTime);
      }
    }

    if (allResponseTimes.length > 0) {
      globalAverageResponseTime =
        allResponseTimes.reduce((sum, time) => sum + time, 0) /
        allResponseTimes.length;
      // Convertir en secondes
      globalAverageResponseTime = Math.round(globalAverageResponseTime / 1000);
    }
  }

  return {
    gameId: game.id,
    roomCode: game.roomCode,
    duration,
    totalFrames: game.gameFrames.length,
    totalGuesses: guesses.length,
    correctGuesses: correctGuesses.length,
    accuracy: guesses.length > 0 ? correctGuesses.length / guesses.length : 0,
    averageResponseTime: globalAverageResponseTime,
    playerStats: playerGameStats,
  };
}

// Récupérer la timeline complète d'une partie
export async function getGameTimeline(
  gameId: string
): Promise<GameTimeline | null> {
  const game = await getGame(gameId);
  if (!game) return null;

  const stats = await getGameStats(gameId);
  if (!stats) return null;

  return {
    gameId: game.id,
    roomCode: game.roomCode,
    events: game.events,
    frames: game.gameFrames,
    stats,
    duration: stats.duration,
  };
}

// Récupérer toutes les parties d'une salle
export async function getRoomGames(roomCode: string): Promise<Game[]> {
  const games = await prisma.game.findMany({
    where: { roomCode },
    include: {
      events: {
        orderBy: {
          timestamp: 'asc',
        },
      },
      gameFrames: {
        include: {
          movie: true,
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return games as unknown as Game[];
}

// Nettoyer les anciennes parties terminées d'une salle
export async function cleanupCompletedGames(roomCode: string): Promise<void> {
  await prisma.game.deleteMany({
    where: {
      roomCode,
      status: 'completed',
    },
  });
}

// Vérifier si une partie existe pour une salle
export async function getActiveGame(roomCode: string): Promise<Game | null> {
  const game = await prisma.game.findFirst({
    where: {
      roomCode,
      status: {
        in: ['generated', 'started'],
      },
    },
    include: {
      events: {
        orderBy: {
          timestamp: 'asc',
        },
      },
      gameFrames: {
        include: {
          movie: true,
        },
        orderBy: {
          order: 'asc',
        },
      },
    },
  });

  return game as Game | null;
}
