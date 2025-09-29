// Export principal du module storage
export * from './images';
export * from './metadata';
import type { CacheStats } from "@/types";

// Initialisation des caches
export async function initializeStorage(): Promise<void> {
  const { imageCache } = await import('./images');
  const { metadataCache: metaCache } = await import('./metadata');
  
  await Promise.all([
    imageCache.initialize(),
    metaCache.initialize(),
  ]);
}


// Statistiques globales
export async function getStorageStats(): Promise<{
  images: CacheStats;
  metadata: CacheStats;
}> {
  const { getImageCacheStats } = await import('./images');
  const { getMetadataCacheStats } = await import('./metadata');
  
  return {
    images: getImageCacheStats(),
    metadata: getMetadataCacheStats(),
  };
}
