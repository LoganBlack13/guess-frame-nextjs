'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Room } from '@/lib/rooms';

interface UseSSEConnectionOptions {
  roomCode: string;
  onUpdate: (room: Room) => void;
  onError?: (error: Error) => void;
  enabled?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

interface UseSSEConnectionReturn {
  isConnected: boolean;
  isReconnecting: boolean;
  error: string | null;
  retryCount: number;
  reconnect: () => void;
}

export function useSSEConnection({
  roomCode,
  onUpdate,
  onError,
  enabled = true,
  maxRetries = 5,
  retryDelay = 1000,
}: UseSSEConnectionOptions): UseSSEConnectionReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled || !isMountedRef.current) return;

    cleanup();
    setIsReconnecting(true);
    setError(null);

    try {
      const eventSource = new EventSource(`/api/rooms/${roomCode}/events`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (!isMountedRef.current) return;
        setIsConnected(true);
        setIsReconnecting(false);
        setRetryCount(0);
        setError(null);
      };

      eventSource.addEventListener('room:update', (event) => {
        if (!isMountedRef.current) return;
        try {
          const data = JSON.parse(event.data) as Room;
          onUpdate(data);
        } catch (parseError) {
          console.error('Failed to parse SSE data:', parseError);
          if (onError) {
            onError(new Error('Failed to parse room update'));
          }
        }
      });

      eventSource.onerror = (event) => {
        if (!isMountedRef.current) return;
        console.error('SSE connection error:', event);
        setIsConnected(false);
        setIsReconnecting(false);
        
        const errorMessage = 'Connection lost. Attempting to reconnect...';
        setError(errorMessage);
        
        if (onError) {
          onError(new Error(errorMessage));
        }

        // Retry logic
        if (retryCount < maxRetries) {
          const delay = retryDelay * Math.pow(2, retryCount); // Exponential backoff
          retryTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              setRetryCount(prev => prev + 1);
              connect();
            }
          }, delay);
        } else {
          setError('Failed to reconnect after multiple attempts. Please refresh the page.');
        }
      };

    } catch (connectionError) {
      console.error('Failed to create SSE connection:', connectionError);
      setIsConnected(false);
      setIsReconnecting(false);
      setError('Failed to establish connection');
      
      if (onError) {
        onError(connectionError as Error);
      }
    }
  }, [roomCode, onUpdate, onError, enabled, maxRetries, retryDelay, retryCount]);

  const reconnect = useCallback(() => {
    setRetryCount(0);
    connect();
  }, [connect]);

  useEffect(() => {
    isMountedRef.current = true;
    if (enabled) {
      connect();
    }

    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [enabled, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  return {
    isConnected,
    isReconnecting,
    error,
    retryCount,
    reconnect,
  };
}
