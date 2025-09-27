// Types pour les nouveaux modèles de base de données
export interface Game {
  id: string;
  roomCode: string;
  status: 'generated' | 'started' | 'completed';
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  events: GameEvent[];
  gameFrames: GameFrame[];
}

export interface Movie {
  id: string;
  tmdbId: number;
  title: string;
  originalTitle: string;
  overview: string | null;
  releaseDate: Date | null;
  genres: string[];
  runtime: number | null;
  tagline: string | null;
  languages: string[];
  posterUrl: string | null;
  backdropUrl: string | null;
  stillsUrls: string[];
  createdAt: Date;
  updatedAt: Date;
  gameFrames: GameFrame[];
}

export interface GameFrame {
  id: string;
  gameId: string;
  movieId: string;
  frameId: string | null;
  imageUrl: string;
  aspectRatio: number;
  isScene: boolean;
  order: number;
  createdAt: Date;
  game: Game;
  movie: Movie;
  frame?: any; // Frame legacy optionnel
}

export interface GameEvent {
  id: string;
  gameId: string;
  type: 'game_started' | 'frame_started' | 'guess_submitted' | 'frame_advanced' | 'game_completed';
  data: any; // JSON data
  timestamp: Date;
  game: Game;
}

// Types pour les événements de jeu
export interface GameStartedEvent {
  type: 'game_started';
  data: {
    roomCode: string;
    playerCount: number;
    targetFrameCount: number;
  };
}

export interface FrameStartedEvent {
  type: 'frame_started';
  data: {
    frameIndex: number;
    frameId: string;
    movieTitle: string;
    timeLimit: number;
  };
}

export interface GuessSubmittedEvent {
  type: 'guess_submitted';
  data: {
    playerId: string;
    playerName: string;
    guess: string;
    frameId: string;
    isCorrect: boolean;
    pointsAwarded: number;
  };
}

export interface FrameAdvancedEvent {
  type: 'frame_advanced';
  data: {
    fromFrameIndex: number;
    toFrameIndex: number;
    correctAnswer: string;
    totalGuesses: number;
    correctGuesses: number;
  };
}

export interface GameCompletedEvent {
  type: 'game_completed';
  data: {
    totalFrames: number;
    totalGuesses: number;
    correctGuesses: number;
    playerScores: Array<{
      playerId: string;
      playerName: string;
      score: number;
    }>;
    duration: number; // en secondes
  };
}

export type GameEventData = 
  | GameStartedEvent 
  | FrameStartedEvent 
  | GuessSubmittedEvent 
  | FrameAdvancedEvent 
  | GameCompletedEvent;

// Types pour les statistiques de jeu
export interface GameStats {
  gameId: string;
  roomCode: string;
  duration: number;
  totalFrames: number;
  totalGuesses: number;
  correctGuesses: number;
  accuracy: number;
  averageResponseTime: number;
  playerStats: PlayerGameStats[];
}

export interface PlayerGameStats {
  playerId: string;
  playerName: string;
  score: number;
  guesses: number;
  correctGuesses: number;
  accuracy: number;
  averageResponseTime: number;
}

// Types pour la relecture de timeline
export interface GameTimeline {
  gameId: string;
  roomCode: string;
  events: GameEvent[];
  frames: GameFrame[];
  stats: GameStats;
  duration: number;
}
