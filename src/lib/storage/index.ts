// Export principal du module storage
export * from './images';
export * from './metadata';

// Initialisation des caches
export async function initializeStorage(): Promise<void> {
  const { imageCache } = await import('./images');
  const { metadataCache: metaCache } = await import('./metadata');
  
  await Promise.all([
    imageCache.initialize(),
    metaCache.initialize(),
  ]);
}

// Nettoyage des caches
export async function cleanupStorage(): Promise<void> {
  const { imageCache } = await import('./images');
  const { metadataCache: metaCache } = await import('./metadata');
  
  // Les caches se nettoient automatiquement, mais on peut forcer un nettoyage
  await Promise.all([
    imageCache.cleanupCache(),
    // metaCache.cleanupCache(), // Commenté car metadataCache n'est pas exporté
  ]);
}

// Statistiques globales
export async function getStorageStats(): Promise<{
  images: any;
  metadata: any;
}> {
  const { getImageCacheStats } = await import('./images');
  const { getMetadataCacheStats } = await import('./metadata');
  
  return {
    images: getImageCacheStats(),
    metadata: getMetadataCacheStats(),
  };
}
