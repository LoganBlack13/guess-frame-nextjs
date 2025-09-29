import { useState, useCallback } from 'react';
import type { Room, RoomStatus } from '@/lib/rooms';

interface UseRoomStateProps {
  initialRoom: Room;
  canManage: boolean;
}

export function useRoomState({ initialRoom, canManage }: UseRoomStateProps) {
  const [room, setRoom] = useState<Room | null>(initialRoom || null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [roomMissing, setRoomMissing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [eventsConnected, setEventsConnected] = useState(true);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [isAdvancingFrame, setIsAdvancingFrame] = useState(false);

  const refreshRoom = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (roomMissing) return;

    if (!silent) setIsRefreshing(true);

    try {
      const response = await fetch(`/api/rooms/${initialRoom.code}`);
      if (!response.ok) {
        if (response.status === 404) {
          setRoomMissing(true);
          return;
        }
        throw new Error('Failed to fetch room');
      }

      const updatedRoom = await response.json();
      setRoom(updatedRoom);
      setRoomMissing(false);
      setErrorMessage(null);
    } catch (error) {
      console.error('Failed to refresh room:', error);
      if (!silent) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to refresh room');
      }
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, [initialRoom.code, roomMissing]);

  const mutateStatus = useCallback(async (nextStatus: RoomStatus) => {
    if (!canManage) {
      setStatusError('Only the host can manage the match state.');
      return;
    }

    setIsUpdatingStatus(true);
    setStatusError(null);

    try {
      const response = await fetch(`/api/rooms/${initialRoom.code}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update status');
      }

      await refreshRoom({ silent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update status';
      setStatusError(message);
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [canManage, initialRoom.code, refreshRoom]);

  const handleAdvanceFrame = useCallback(async () => {
    if (!canManage) {
      setStatusError('Only the host can advance frames.');
      return;
    }

    setIsAdvancingFrame(true);
    setStatusError(null);

    try {
      const response = await fetch(`/api/rooms/${initialRoom.code}/advance-frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to advance frame');
      }

      await refreshRoom({ silent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to advance frame';
      setStatusError(message);
    } finally {
      setIsAdvancingFrame(false);
    }
  }, [canManage, initialRoom.code, refreshRoom]);

  return {
    room,
    setRoom,
    isRefreshing,
    roomMissing,
    errorMessage,
    eventsConnected,
    setEventsConnected,
    isUpdatingStatus,
    statusError,
    isAdvancingFrame,
    refreshRoom,
    mutateStatus,
    handleAdvanceFrame,
  };
}
