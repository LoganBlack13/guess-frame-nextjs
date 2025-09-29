import { lazy, ComponentType } from 'react';

export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
): T {
  return lazy(importFunc) as T;
}

// Pre-configured lazy components for common use cases
export const LazyGameInterface = createLazyComponent(
  () => import('@/app/rooms/[roomCode]/party/components/GameInterface')
);

export const LazyReplayPlayer = createLazyComponent(
  () => import('@/app/rooms/[roomCode]/replay/components/ReplayPlayer')
);

export const LazyGameStats = createLazyComponent(
  () => import('@/app/rooms/[roomCode]/replay/components/GameStats')
);

export const LazyTMDBAdmin = createLazyComponent(
  () => import('@/app/admin/tmdb/TMDBAdminClient')
);
