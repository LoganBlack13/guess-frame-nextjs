import { TMDBClient } from './client';

// Export principal du module TMDB
export { TMDBClient } from './client';

export {
  tmdbCache,
  getCachedMovie,
  setCachedMovie,
  getCachedFrames,
  setCachedFrames,
  isMovieCached,
  clearCache,
  getCacheStats,
} from './cache';

export type {
  TMDBMovie,
  TMDBMovieDetails,
  TMDBImage,
  TMDBImagesResponse,
  TMDBDiscoverResponse,
  TMDBConfiguration,
  MovieMetadata,
  MovieFrame,
  TMDBClientConfig,
} from './types';

// Configuration par défaut
export const DEFAULT_TMDB_CONFIG = {
  baseUrl: 'https://api.themoviedb.org/3',
  imageBaseUrl: 'https://image.tmdb.org/t/p/',
  language: 'fr-FR',
  region: 'FR',
} as const;

// Factory function pour créer un client TMDB
export function createTMDBClient(apiKey: string) {
  return new TMDBClient({
    apiKey,
    ...DEFAULT_TMDB_CONFIG,
  });
}
