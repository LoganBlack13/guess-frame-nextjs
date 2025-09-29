// Types centralisés pour l'application

export interface GameEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: Date;
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  score: number;
  guesses: number;
  correctGuesses: number;
  accuracy: number;
}

export interface RoomState {
  id: string;
  code: string;
  status: 'waiting' | 'in-progress' | 'completed';
  difficulty: 'easy' | 'normal' | 'hard';
  durationMinutes: number;
  targetFrameCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FrameData {
  id: string;
  movieTitle: string;
  imageUrl: string;
  frameIndex: number;
  solvedPlayerIds: string[];
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export interface GameSettings {
  difficulty: 'easy' | 'normal' | 'hard';
  durationMinutes: number;
  genres?: string[];
  yearRange?: { min: number; max: number };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface WebSocketMessage {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  vote_average: number;
  popularity: number;
}

export interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}
