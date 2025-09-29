'use client';

import { useEffect, useRef, useState } from 'react';

interface UseWebSocketOptions {
  roomCode: string;
  playerId?: string | null;
  onRoomUpdate?: (room: unknown) => void;
  onChatMessage?: (message: unknown) => void;
  onError?: (error: Error) => void;
}

export function useWebSocket({
  roomCode,
  playerId,
  onRoomUpdate,
  onChatMessage,
  onError,
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket('ws://localhost:3000/ws');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔌 WebSocket connected');
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        
        // Send join room message
        ws.send(JSON.stringify({
          type: 'join-room',
          data: { roomCode, playerId }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📡 WebSocket message received:', message);
          
          switch (message.type) {
            case 'room-update':
              onRoomUpdate?.(message.data);
              break;
            case 'chat-message':
              onChatMessage?.(message.data);
              break;
            case 'room-joined':
              console.log('✅ Room joined successfully');
              break;
          }
        } catch (parseError) {
          console.error('Error parsing WebSocket message:', parseError);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.pow(2, reconnectAttempts.current) * 1000; // Exponential backoff
          console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setError('Failed to reconnect after multiple attempts');
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setError('WebSocket connection failed');
        onError?.(new Error('WebSocket connection failed'));
      };

    } catch (connectionError) {
      console.error('Failed to create WebSocket connection:', connectionError);
      setError('Failed to establish connection');
    }
  };

  const sendChatMessage = (message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat-message',
        data: { message }
      }));
    } else {
      console.error('WebSocket not connected');
      setError('Not connected to server');
    }
  };

  useEffect(() => {
    if (!roomCode || !playerId) return;

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [roomCode, playerId]);

  return {
    isConnected,
    error,
    sendChatMessage,
    socket: wsRef.current,
  };
}
