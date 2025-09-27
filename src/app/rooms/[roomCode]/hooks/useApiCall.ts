'use client';

import { useState, useCallback } from 'react';

interface UseApiCallOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  retryAttempts?: number;
  retryDelay?: number;
}

interface UseApiCallReturn<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  execute: (url: string, options?: RequestInit) => Promise<T | null>;
  reset: () => void;
}

export function useApiCall<T = any>({
  onSuccess,
  onError,
  retryAttempts = 3,
  retryDelay = 1000,
}: UseApiCallOptions = {}): UseApiCallReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async (
    url: string, 
    options: RequestInit = {}
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          const errorMessage = errorData?.error || `HTTP ${response.status}: ${response.statusText}`;
          throw new Error(errorMessage);
        }

        const result = await response.json();
        setData(result);
        onSuccess?.(result);
        return result;

      } catch (err) {
        lastError = err as Error;
        console.error(`API call attempt ${attempt + 1} failed:`, err);

        if (attempt < retryAttempts) {
          // Wait before retrying with exponential backoff
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    const errorMessage = lastError?.message || 'Request failed after multiple attempts';
    setError(errorMessage);
    onError?.(lastError || new Error(errorMessage));
    return null;

  }, [onSuccess, onError, retryAttempts, retryDelay]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    data,
    error,
    isLoading,
    execute,
    reset,
  };
}
