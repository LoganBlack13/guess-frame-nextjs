'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface GameCompletedProps {
  className?: string;
  roomCode: string;
}

export default function GameCompleted({
  className,
  roomCode,
}: GameCompletedProps) {
  const searchParams = useSearchParams();
  const playerId = searchParams.get('playerId');
  const role = searchParams.get('role');
  const [isResetting, setIsResetting] = useState(false);

  const handleReturnToLobby = async () => {
    setIsResetting(true);
    try {
      // Reset room status to lobby before navigating
      const response = await fetch(`/api/rooms/${roomCode}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'lobby' }),
      });

      if (!response.ok) {
        console.error('Failed to reset room status to lobby');
        return;
      }

      // Navigate to lobby after successful reset
      const lobbyUrl = `/rooms/${roomCode}/lobby${playerId ? `?playerId=${playerId}` : ''}${role ? `&role=${role}` : ''}`;
      window.location.href = lobbyUrl;
    } catch (error) {
      console.error('Error resetting room status:', error);
    } finally {
      setIsResetting(false);
    }
  };
  return (
    <div className={`card bg-base-200 shadow-xl ${className}`}>
      <div className="card-body text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-primary mb-2">
          Game Completed!
        </h1>
        <p className="text-base-content/70 mb-6">
          Great game everyone! Check out the final results below.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleReturnToLobby}
            className="btn btn-secondary btn-lg"
            disabled={isResetting}
          >
            {isResetting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Returning to Lobby...
              </>
            ) : (
              <>🎮 Return to Lobby</>
            )}
          </button>
          <Link href="/" className="btn btn-primary btn-lg">
            🏠 Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
