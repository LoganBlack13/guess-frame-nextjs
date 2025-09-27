import { writeFile, readFile, mkdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { MovieMetadata } from '../tmdb/types';

export interface MetadataCacheEntry {
  tmdbId: number;
  data: MovieMetadata;
  cachedAt: Date;
  lastAccessed: Date;
  accessCount: number;
}

export interface MetadataCacheStats {
  totalMovies: number;
  totalSize: number;
  mostAccessed: Array<{
    tmdbId: number;
    title: string;
    accessCount: number;
  }>;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

export class MetadataCache {
  private cacheDir: string;
  private maxEntries: number;
  private maxAge: number; // Âge maximal d'une entrée en millisecondes
  private entries = new Map<number, MetadataCacheEntry>();

  constructor(cacheDir: string = './cache/metadata', maxEntries: number = 1000, maxAge: number = 30 * 24 * 60 * 60 * 1000) {
    this.cacheDir = cacheDir;
    this.maxEntries = maxEntries;
    this.maxAge = maxAge;
  }

  // Initialise le cache
  async initialize(): Promise<void> {
    try {
      await mkdir(this.cacheDir, { recursive: true });
      await this.loadCacheIndex();
    } catch (error) {
      console.error('Failed to initialize metadata cache:', error);
    }
  }

  // Charge l'index du cache
  private async loadCacheIndex(): Promise<void> {
    try {
      const indexPath = join(this.cacheDir, 'index.json');
      const indexData = await readFile(indexPath, 'utf-8');
      const index = JSON.parse(indexData);
      
      for (const [tmdbId, entry] of Object.entries(index)) {
        this.entries.set(Number(tmdbId), {
          ...(entry as any),
          data: (entry as any).data,
          cachedAt: new Date((entry as any).cachedAt),
          lastAccessed: new Date((entry as any).lastAccessed),
        });
      }
    } catch (error) {
      // Index n'existe pas encore, c'est normal
    }
  }

  // Sauvegarde l'index du cache
  private async saveCacheIndex(): Promise<void> {
    try {
      const indexPath = join(this.cacheDir, 'index.json');
      const index = Object.fromEntries(this.entries);
      await writeFile(indexPath, JSON.stringify(index, null, 2));
    } catch (error) {
      console.error('Failed to save metadata cache index:', error);
    }
  }

  // Met en cache les métadonnées d'un film
  async cacheMovie(metadata: MovieMetadata): Promise<void> {
    const entry: MetadataCacheEntry = {
      tmdbId: metadata.tmdbId,
      data: metadata,
      cachedAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 1,
    };

    this.entries.set(metadata.tmdbId, entry);
    await this.saveCacheIndex();

    // Nettoyer le cache si nécessaire
    await this.cleanupCache();
  }

  // Récupère les métadonnées d'un film depuis le cache
  async getCachedMovie(tmdbId: number): Promise<MovieMetadata | null> {
    const entry = this.entries.get(tmdbId);
    if (!entry) {
      return null;
    }

    // Vérifier l'âge de l'entrée
    const age = Date.now() - entry.cachedAt.getTime();
    if (age > this.maxAge) {
      await this.removeMovie(tmdbId);
      return null;
    }

    // Mettre à jour les statistiques d'accès
    entry.lastAccessed = new Date();
    entry.accessCount++;
    await this.saveCacheIndex();

    return entry.data;
  }

  // Supprime un film du cache
  async removeMovie(tmdbId: number): Promise<void> {
    this.entries.delete(tmdbId);
    await this.saveCacheIndex();
  }

  // Nettoie le cache
  private async cleanupCache(): Promise<void> {
    if (this.entries.size <= this.maxEntries) {
      return;
    }

    // Trier les entrées par nombre d'accès et date d'accès
    const sortedEntries = Array.from(this.entries.entries())
      .sort(([, a], [, b]) => {
        // Priorité aux entrées les moins accédées et les plus anciennes
        const scoreA = a.accessCount + (Date.now() - a.lastAccessed.getTime()) / (24 * 60 * 60 * 1000);
        const scoreB = b.accessCount + (Date.now() - b.lastAccessed.getTime()) / (24 * 60 * 60 * 1000);
        return scoreA - scoreB;
      });

    const toRemove = sortedEntries.slice(0, this.entries.size - this.maxEntries + 10);
    
    for (const [tmdbId] of toRemove) {
      await this.removeMovie(tmdbId);
    }
  }

  // Récupère les statistiques du cache
  getStats(): MetadataCacheStats {
    const entries = Array.from(this.entries.values());
    
    const mostAccessed = entries
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map(entry => ({
        tmdbId: entry.tmdbId,
        title: entry.data.title,
        accessCount: entry.accessCount,
      }));

    return {
      totalMovies: entries.length,
      totalSize: JSON.stringify(entries).length,
      mostAccessed,
      oldestEntry: entries.length > 0 ? new Date(Math.min(...entries.map(e => e.cachedAt.getTime()))) : null,
      newestEntry: entries.length > 0 ? new Date(Math.max(...entries.map(e => e.cachedAt.getTime()))) : null,
    };
  }

  // Vide tout le cache
  async clearCache(): Promise<void> {
    this.entries.clear();
    await this.saveCacheIndex();
  }

  // Vérifie si un film est en cache
  isCached(tmdbId: number): boolean {
    return this.entries.has(tmdbId);
  }

  // Récupère tous les IDs de films en cache
  getCachedMovieIds(): number[] {
    return Array.from(this.entries.keys());
  }

  // Recherche des films par titre
  searchMovies(query: string): MovieMetadata[] {
    const results: MovieMetadata[] = [];
    const lowerQuery = query.toLowerCase();

    for (const entry of this.entries.values()) {
      const movie = entry.data;
      if (
        movie.title.toLowerCase().includes(lowerQuery) ||
        movie.originalTitle.toLowerCase().includes(lowerQuery)
      ) {
        results.push(movie);
      }
    }

    return results;
  }

  // Récupère les films les plus populaires du cache
  getPopularMovies(limit: number = 10): MovieMetadata[] {
    const entries = Array.from(this.entries.values())
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);

    return entries.map(entry => entry.data);
  }

  // Récupère les films récemment ajoutés
  getRecentMovies(limit: number = 10): MovieMetadata[] {
    const entries = Array.from(this.entries.values())
      .sort((a, b) => b.cachedAt.getTime() - a.cachedAt.getTime())
      .slice(0, limit);

    return entries.map(entry => entry.data);
  }
}

// Instance singleton du cache de métadonnées
export const metadataCache = new MetadataCache();

// Fonctions utilitaires
export async function cacheMovie(metadata: MovieMetadata): Promise<void> {
  return metadataCache.cacheMovie(metadata);
}

export async function getCachedMovie(tmdbId: number): Promise<MovieMetadata | null> {
  return metadataCache.getCachedMovie(tmdbId);
}

export async function removeCachedMovie(tmdbId: number): Promise<void> {
  return metadataCache.removeMovie(tmdbId);
}

export function isMovieCached(tmdbId: number): boolean {
  return metadataCache.isCached(tmdbId);
}

export function getMetadataCacheStats(): MetadataCacheStats {
  return metadataCache.getStats();
}

export async function clearMetadataCache(): Promise<void> {
  return metadataCache.clearCache();
}

export function searchCachedMovies(query: string): MovieMetadata[] {
  return metadataCache.searchMovies(query);
}

export function getPopularCachedMovies(limit: number = 10): MovieMetadata[] {
  return metadataCache.getPopularMovies(limit);
}

export function getRecentCachedMovies(limit: number = 10): MovieMetadata[] {
  return metadataCache.getRecentMovies(limit);
}
