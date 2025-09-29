// Local storage utilities
export function setLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to set localStorage:', error);
  }
}

export function getLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Failed to get localStorage:', error);
    return defaultValue;
  }
}

export function removeLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove localStorage:', error);
  }
}

// Session storage utilities
export function setSessionStorage<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to set sessionStorage:', error);
  }
}

export function getSessionStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Failed to get sessionStorage:', error);
    return defaultValue;
  }
}

export function removeSessionStorage(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove sessionStorage:', error);
  }
}

// Cache utilities
export function createCache<T>(ttl: number = 5 * 60 * 1000) {
  const cache = new Map<string, { value: T; expiry: number }>();

  return {
    set(key: string, value: T): void {
      cache.set(key, {
        value,
        expiry: Date.now() + ttl,
      });
    },

    get(key: string): T | null {
      const item = cache.get(key);
      if (!item) return null;

      if (Date.now() > item.expiry) {
        cache.delete(key);
        return null;
      }

      return item.value;
    },

    has(key: string): boolean {
      const item = cache.get(key);
      if (!item) return false;

      if (Date.now() > item.expiry) {
        cache.delete(key);
        return false;
      }

      return true;
    },

    delete(key: string): boolean {
      return cache.delete(key);
    },

    clear(): void {
      cache.clear();
    },

    size(): number {
      return cache.size;
    },
  };
}
