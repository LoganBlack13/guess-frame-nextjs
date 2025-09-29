'use client';

import { useEffect } from 'react';

import ThemeSelector from '@/components/ui/theme-selector';
import type { Room } from '@/lib/rooms';

import GameCompleted from '../components/GameCompleted';
import PlayerListGame from '../components/PlayerListGame';
import PlayersList from '../components/PlayersList';
import Podium from '../components/Podium';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useRoomState } from './hooks/useRoomState';
import { useGameSettings } from './hooks/useGameSettings';
import GameInterface from './components/GameInterface';

interface PartyClientProps {
  initialRoom: Room;
  roomCode: string;
  playerId?: string | null;
  hostSessionActive?: boolean;
}

export default function PartyClient({
  initialRoom,
  roomCode,
  playerId,
  hostSessionActive = false,
}: PartyClientProps) {
  const canManage = Boolean(hostSessionActive);
  const effectivePlayerId = playerId ?? null;
  
  // Use specialized hooks
  const roomState = useRoomState({ 
    initialRoom, 
    canManage 
  });
  
  const gameSettings = useGameSettings({
    initialDifficulty: initialRoom.difficulty,
    initialDuration: initialRoom.durationMinutes,
  });

  // WebSocket connection for real-time updates
  const {
    isConnected: wsConnected,
    error: wsError,
    sendChatMessage: wsSendChatMessage,
  } = useWebSocket({
    roomCode,
    playerId: effectivePlayerId,
    onRoomUpdate: (data: Room) => {
      roomState.setRoom(data);
      roomState.setRoomMissing(false);
      roomState.setErrorMessage(null);
    },
    onChatMessage: (message) => {
      // Handle chat messages if needed
      console.log('Chat message received:', message);
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
      roomState.setErrorMessage(error.message || 'Connection error');
    },
  });

  // Update events connected state based on WebSocket connection
  useEffect(() => {
    roomState.setEventsConnected(wsConnected);
    if (wsError) {
      roomState.setErrorMessage(wsError.message || 'Connection error');
    }
  }, [wsConnected, wsError, roomState]);

  // Auto-refresh room data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      void roomState.refreshRoom({ silent: true });
    }, 5000);

    return () => clearInterval(interval);
  }, [roomState]);

  if (roomState.roomMissing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <span>This lobby has wrapped. Ask the host for a fresh code.</span>
        </div>
      </div>
    );
  }

  if (!roomState.room) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  const room = roomState.room;

  // Show game completed screen
  if (room?.status === 'completed') {
    return (
      <div className="container mx-auto px-4 py-8">
        <ThemeSelector />
        <GameCompleted room={room} roomCode={roomCode} />
        <Podium players={room?.players || []} />
      </div>
    );
  }

  // Show game interface
  return (
    <div className="container mx-auto px-4 py-8">
      <ThemeSelector />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main game interface */}
        <div className="lg:col-span-2">
          <GameInterface
            room={room}
            roomCode={roomCode}
            playerId={effectivePlayerId}
            canManage={canManage}
            onAdvanceFrame={roomState.handleAdvanceFrame}
            isAdvancingFrame={roomState.isAdvancingFrame}
            statusError={roomState.statusError}
          />
        </div>

        {/* Sidebar with players and controls */}
        <div className="space-y-4">
          <PlayerListGame
            players={room?.players || []}
            currentFrameIndex={room?.currentFrameIndex || 0}
            frames={room?.frames || []}
          />
          
          {canManage && (
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="card-title">Host Controls</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => roomState.mutateStatus('completed')}
                    className="btn btn-warning btn-sm w-full"
                    disabled={roomState.isUpdatingStatus}
                  >
                    End Game
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error messages */}
      {roomState.errorMessage && (
        <div className="alert alert-error mt-4">
          <span>{roomState.errorMessage}</span>
        </div>
      )}

      {/* Connection status */}
      {!roomState.eventsConnected && (
        <div className="alert alert-warning mt-4">
          <span>Connection lost. Attempting to reconnect...</span>
        </div>
      )}
    </div>
  );
}
