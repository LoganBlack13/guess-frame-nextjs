import { writeFile, mkdir, readFile, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';

export interface ImageCacheEntry {
  url: string;
  localPath: string;
  downloadedAt: Date;
  size: number;
  contentType: string;
  lastAccessed: Date;
}

export interface ImageCacheStats {
  totalImages: number;
  totalSize: number;
  oldestImage: Date | null;
  newestImage: Date | null;
}

export class ImageCache {
  private cacheDir: string;
  private maxSize: number; // Taille maximale du cache en bytes
  private maxAge: number; // Âge maximal d'une image en millisecondes
  private entries = new Map<string, ImageCacheEntry>();

  constructor(cacheDir: string = './cache/images', maxSize: number = 100 * 1024 * 1024, maxAge: number = 7 * 24 * 60 * 60 * 1000) {
    this.cacheDir = cacheDir;
    this.maxSize = maxSize;
    this.maxAge = maxAge;
  }

  // Initialise le cache
  async initialize(): Promise<void> {
    try {
      await mkdir(this.cacheDir, { recursive: true });
      await this.loadCacheIndex();
    } catch (error) {
      console.error('Failed to initialize image cache:', error);
    }
  }

  // Charge l'index du cache
  private async loadCacheIndex(): Promise<void> {
    try {
      const indexPath = join(this.cacheDir, 'index.json');
      const indexData = await readFile(indexPath, 'utf-8');
      const index = JSON.parse(indexData);
      
      for (const [url, entry] of Object.entries(index)) {
        this.entries.set(url, {
          ...(entry as any),
          downloadedAt: new Date((entry as any).downloadedAt),
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
      console.error('Failed to save cache index:', error);
    }
  }

  // Génère un nom de fichier unique pour une URL
  private generateFileName(url: string): string {
    const hash = createHash('md5').update(url).digest('hex');
    const extension = this.getFileExtension(url);
    return `${hash}${extension}`;
  }

  // Extrait l'extension de fichier d'une URL
  private getFileExtension(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const lastDot = pathname.lastIndexOf('.');
      if (lastDot !== -1) {
        return pathname.substring(lastDot);
      }
    } catch (error) {
      // URL invalide
    }
    return '.jpg'; // Extension par défaut
  }

  // Télécharge et met en cache une image
  async cacheImage(url: string): Promise<string | null> {
    try {
      // Vérifier si l'image est déjà en cache
      const cachedPath = await this.getCachedImagePath(url);
      if (cachedPath) {
        return cachedPath;
      }

      // Télécharger l'image
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      // Générer le nom de fichier
      const fileName = this.generateFileName(url);
      const localPath = join(this.cacheDir, fileName);

      // Sauvegarder l'image
      await writeFile(localPath, Buffer.from(buffer));

      // Mettre à jour l'index
      const entry: ImageCacheEntry = {
        url,
        localPath,
        downloadedAt: new Date(),
        size: buffer.byteLength,
        contentType,
        lastAccessed: new Date(),
      };

      this.entries.set(url, entry);
      await this.saveCacheIndex();

      // Nettoyer le cache si nécessaire
      await this.cleanupCache();

      return localPath;
    } catch (error) {
      console.error(`Failed to cache image ${url}:`, error);
      return null;
    }
  }

  // Récupère le chemin d'une image en cache
  async getCachedImagePath(url: string): Promise<string | null> {
    const entry = this.entries.get(url);
    if (!entry) {
      return null;
    }

    // Vérifier si le fichier existe
    try {
      await stat(entry.localPath);
    } catch (error) {
      // Fichier n'existe plus, le supprimer de l'index
      this.entries.delete(url);
      await this.saveCacheIndex();
      return null;
    }

    // Vérifier l'âge de l'image
    const age = Date.now() - entry.downloadedAt.getTime();
    if (age > this.maxAge) {
      await this.removeImage(url);
      return null;
    }

    // Mettre à jour la date d'accès
    entry.lastAccessed = new Date();
    await this.saveCacheIndex();

    return entry.localPath;
  }

  // Supprime une image du cache
  async removeImage(url: string): Promise<void> {
    const entry = this.entries.get(url);
    if (!entry) {
      return;
    }

    try {
      await unlink(entry.localPath);
    } catch (error) {
      // Fichier déjà supprimé
    }

    this.entries.delete(url);
    await this.saveCacheIndex();
  }

  // Nettoie le cache
  private async cleanupCache(): Promise<void> {
    const totalSize = Array.from(this.entries.values()).reduce((sum, entry) => sum + entry.size, 0);
    
    if (totalSize <= this.maxSize) {
      return;
    }

    // Trier les entrées par date d'accès (les plus anciennes en premier)
    const sortedEntries = Array.from(this.entries.entries())
      .sort(([, a], [, b]) => a.lastAccessed.getTime() - b.lastAccessed.getTime());

    let currentSize = totalSize;
    const toRemove: string[] = [];

    // Supprimer les images les plus anciennes jusqu'à ce que la taille soit acceptable
    for (const [url, entry] of sortedEntries) {
      if (currentSize <= this.maxSize * 0.8) { // Garder 80% de la taille maximale
        break;
      }

      toRemove.push(url);
      currentSize -= entry.size;
    }

    // Supprimer les images sélectionnées
    for (const url of toRemove) {
      await this.removeImage(url);
    }
  }

  // Récupère les statistiques du cache
  getStats(): ImageCacheStats {
    const entries = Array.from(this.entries.values());
    
    return {
      totalImages: entries.length,
      totalSize: entries.reduce((sum, entry) => sum + entry.size, 0),
      oldestImage: entries.length > 0 ? new Date(Math.min(...entries.map(e => e.downloadedAt.getTime()))) : null,
      newestImage: entries.length > 0 ? new Date(Math.max(...entries.map(e => e.downloadedAt.getTime()))) : null,
    };
  }

  // Vide tout le cache
  async clearCache(): Promise<void> {
    for (const url of this.entries.keys()) {
      await this.removeImage(url);
    }
  }

  // Vérifie si une image est en cache
  isCached(url: string): boolean {
    return this.entries.has(url);
  }

  // Récupère toutes les URLs en cache
  getCachedUrls(): string[] {
    return Array.from(this.entries.keys());
  }
}

// Instance singleton du cache d'images
export const imageCache = new ImageCache();

// Fonctions utilitaires
export async function cacheImage(url: string): Promise<string | null> {
  return imageCache.cacheImage(url);
}

export async function getCachedImagePath(url: string): Promise<string | null> {
  return imageCache.getCachedImagePath(url);
}

export async function removeCachedImage(url: string): Promise<void> {
  return imageCache.removeImage(url);
}

export function isImageCached(url: string): boolean {
  return imageCache.isCached(url);
}

export function getImageCacheStats(): ImageCacheStats {
  return imageCache.getStats();
}

export async function clearImageCache(): Promise<void> {
  return imageCache.clearCache();
}
