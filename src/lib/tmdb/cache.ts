import { MovieFrame, MovieMetadata } from './types';

// Cache en mémoire pour les métadonnées des films
class TMDBMemoryCache {
  private movieCache = new Map<number, MovieMetadata>();
  private framesCache = new Map<number, MovieFrame[]>();
  private maxCacheSize = 1000; // Limite du cache
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 heures en millisecondes
  private cacheTimestamps = new Map<number, number>();

  // Vérifie si un film est en cache et non expiré
  isMovieCached(movieId: number): boolean {
    if (!this.movieCache.has(movieId)) return false;

    const timestamp = this.cacheTimestamps.get(movieId);
    if (!timestamp) return false;

    return Date.now() - timestamp < this.cacheExpiry;
  }

  // Récupère un film du cache
  getMovie(movieId: number): MovieMetadata | null {
    if (!this.isMovieCached(movieId)) {
      this.removeMovie(movieId);
      return null;
    }

    return this.movieCache.get(movieId) || null;
  }

  // Met un film en cache
  setMovie(movieId: number, movie: MovieMetadata): void {
    // Nettoyer le cache si nécessaire
    if (this.movieCache.size >= this.maxCacheSize) {
      this.cleanupOldEntries();
    }

    this.movieCache.set(movieId, movie);
    this.cacheTimestamps.set(movieId, Date.now());
  }

  // Récupère des frames du cache
  getFrames(movieId: number): MovieFrame[] | null {
    if (!this.isMovieCached(movieId)) {
      this.removeMovie(movieId);
      return null;
    }

    return this.framesCache.get(movieId) || null;
  }

  // Met des frames en cache
  setFrames(movieId: number, frames: MovieFrame[]): void {
    if (!this.isMovieCached(movieId)) {
      return; // Ne pas mettre en cache si le film n'est pas en cache
    }

    this.framesCache.set(movieId, frames);
  }

  // Supprime un film du cache
  removeMovie(movieId: number): void {
    this.movieCache.delete(movieId);
    this.framesCache.delete(movieId);
    this.cacheTimestamps.delete(movieId);
  }

  // Nettoie les entrées anciennes
  private cleanupOldEntries(): void {
    const now = Date.now();
    const toRemove: number[] = [];

    for (const [movieId, timestamp] of this.cacheTimestamps) {
      if (now - timestamp > this.cacheExpiry) {
        toRemove.push(movieId);
      }
    }

    // Supprimer les 20% les plus anciens
    const sortedEntries = Array.from(this.cacheTimestamps.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, Math.floor(this.maxCacheSize * 0.2));

    for (const [movieId] of sortedEntries) {
      toRemove.push(movieId);
    }

    toRemove.forEach((movieId) => this.removeMovie(movieId));
  }

  // Vide tout le cache
  clear(): void {
    this.movieCache.clear();
    this.framesCache.clear();
    this.cacheTimestamps.clear();
  }

  // Statistiques du cache
  getStats(): {
    movieCount: number;
    framesCount: number;
    memoryUsage: number;
  } {
    return {
      movieCount: this.movieCache.size,
      framesCount: this.framesCache.size,
      memoryUsage: JSON.stringify(Array.from(this.movieCache.values())).length,
    };
  }
}

// Instance singleton du cache
export const tmdbCache = new TMDBMemoryCache();

// Fonctions utilitaires pour le cache
export function getCachedMovie(movieId: number): MovieMetadata | null {
  return tmdbCache.getMovie(movieId);
}

export function setCachedMovie(movieId: number, movie: MovieMetadata): void {
  tmdbCache.setMovie(movieId, movie);
}

export function getCachedFrames(movieId: number): MovieFrame[] | null {
  return tmdbCache.getFrames(movieId);
}

export function setCachedFrames(movieId: number, frames: MovieFrame[]): void {
  tmdbCache.setFrames(movieId, frames);
}

export function isMovieCached(movieId: number): boolean {
  return tmdbCache.isMovieCached(movieId);
}

export function clearCache(): void {
  tmdbCache.clear();
}

export function getCacheStats() {
  return tmdbCache.getStats();
}
