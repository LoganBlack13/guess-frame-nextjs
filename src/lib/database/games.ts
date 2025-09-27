import { prisma } from '../prisma';
import { Game, Movie, GameFrame, GameEvent, GameEventData, GameStats, GameTimeline } from './types';

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
    return existingGame as Game;
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

  return game as Game;
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

  return game as Game;
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

  return game as Game;
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
export async function getGameByRoomCode(roomCode: string): Promise<Game | null> {
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
export async function addGameEvent(gameId: string, eventData: GameEventData): Promise<GameEvent> {
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
    return existingMovie as Movie;
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

  return movie as Movie;
}

// Ajouter des frames à une partie
export async function addGameFrames(gameId: string, frames: Array<{
  movieId: string;
  imageUrl: string;
  aspectRatio: number;
  isScene: boolean;
  order: number;
}>): Promise<GameFrame[]> {
  const gameFrames = await prisma.gameFrame.createMany({
    data: frames.map(frame => ({
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

  return createdFrames as GameFrame[];
}

// Récupérer les statistiques d'une partie
export async function getGameStats(gameId: string): Promise<GameStats | null> {
  const game = await getGame(gameId);
  if (!game) return null;

  const events = await getGameEvents(gameId);
  const guesses = events.filter(e => e.type === 'guess_submitted');
  const correctGuesses = guesses.filter(e => {
    const data = JSON.parse(e.data);
    return data.isCorrect;
  });

  const playerStats = await prisma.player.findMany({
    where: { roomCode: game.roomCode },
    include: {
      guesses: {
        where: {
          roomCode: game.roomCode,
        },
      },
    },
  });

  const playerGameStats = playerStats.map(player => {
    const playerGuesses = player.guesses;
    const correctPlayerGuesses = playerGuesses.filter(g => g.isCorrect);
    
    return {
      playerId: player.id,
      playerName: player.name,
      score: player.score,
      guesses: playerGuesses.length,
      correctGuesses: correctPlayerGuesses.length,
      accuracy: playerGuesses.length > 0 ? correctPlayerGuesses.length / playerGuesses.length : 0,
      averageResponseTime: 0, // TODO: Calculer le temps de réponse moyen
    };
  });

  const duration = game.completedAt && game.startedAt 
    ? Math.floor((game.completedAt.getTime() - game.startedAt.getTime()) / 1000)
    : 0;

  return {
    gameId: game.id,
    roomCode: game.roomCode,
    duration,
    totalFrames: game.gameFrames.length,
    totalGuesses: guesses.length,
    correctGuesses: correctGuesses.length,
    accuracy: guesses.length > 0 ? correctGuesses.length / guesses.length : 0,
    averageResponseTime: 0, // TODO: Calculer le temps de réponse moyen
    playerStats: playerGameStats,
  };
}

// Récupérer la timeline complète d'une partie
export async function getGameTimeline(gameId: string): Promise<GameTimeline | null> {
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

  return games as Game[];
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
