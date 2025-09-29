import { useCallback, useRef } from 'react';

export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef<number>(0);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastRun.current >= delay) {
        lastRun.current = now;
        callback(...args);
      }
    }) as T,
    [callback, delay]
  );
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastRun = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastRun >= delay) {
      lastRun = now;
      func(...args);
    }
  };
}
