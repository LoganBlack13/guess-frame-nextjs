'use client';

import { formatJoinedTime } from '@/lib/dateUtils';

import PlayerAvatarSimple from './PlayerAvatarSimple';

interface Player {
  id: string;
  name: string;
  role: string;
  joinedAt: number;
  score: number;
}

interface PlayerListProps {
  players: Player[];
  currentPlayerId?: string | null;
  className?: string;
}

export default function PlayerList({
  players,
  currentPlayerId,
  className,
}: PlayerListProps) {
  const sortedPlayers = [...players].sort((a, b) => {
    // Host en premier, puis par ordre d'arrivée
    if (a.role === 'host' && b.role !== 'host') return -1;
    if (b.role === 'host' && a.role !== 'host') return 1;
    return a.joinedAt - b.joinedAt;
  });

  return (
    <div
      className={`card bg-base-200 shadow-xl h-full flex flex-col ${className}`}
    >
      <div className="card-body flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="card-title">Players</h3>
          <div className="badge badge-primary">{players.length} joined</div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {sortedPlayers.map((player) => {
            const isCurrentPlayer = player.id === currentPlayerId;
            const isHost = player.role === 'host';

            return (
              <div
                key={player.id}
                className={`card bg-base-100 ${
                  isCurrentPlayer ? 'border-primary' : ''
                } ${isHost ? 'border-warning' : ''}`}
              >
                <div className="card-body p-4">
                  <div className="flex items-center gap-3">
                    <PlayerAvatarSimple
                      name={player.name}
                      isHost={isHost}
                      isCurrentPlayer={isCurrentPlayer}
                    />

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{player.name}</span>
                        {isCurrentPlayer && (
                          <span className="badge badge-primary badge-sm">
                            YOU
                          </span>
                        )}
                        {isHost && (
                          <span className="badge badge-warning badge-sm">
                            HOST
                          </span>
                        )}
                      </div>

                      <div className="text-sm opacity-70">
                        Joined {formatJoinedTime(player.joinedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {players.length === 1 && (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🎬</div>
              <p className="font-bold">Waiting for players to join...</p>
              <p className="text-sm opacity-70 mt-2">
                Share the room code above to invite friends!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
