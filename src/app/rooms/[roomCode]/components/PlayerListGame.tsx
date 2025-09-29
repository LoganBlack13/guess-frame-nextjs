'use client';

import PlayerAvatarSimple from './PlayerAvatarSimple';

interface Player {
  id: string;
  name: string;
  role: string;
  joinedAt: number;
  score: number;
}

interface PlayerListGameProps {
  players: Player[];
  currentPlayerId?: string | null;
  currentFrameSolvedPlayerIds?: string[];
  className?: string;
}

export default function PlayerListGame({
  players,
  currentPlayerId,
  currentFrameSolvedPlayerIds = [],
  className,
}: PlayerListGameProps) {
  const sortedPlayers = [...players].sort((a, b) => {
    // Host en premier, puis par score décroissant
    if (a.role === 'host' && b.role !== 'host') return -1;
    if (b.role === 'host' && a.role !== 'host') return 1;
    if (b.score !== a.score) return b.score - a.score;
    return a.joinedAt - b.joinedAt;
  });

  return (
    <div className={`card bg-base-200 shadow-xl ${className}`}>
      <div className="card-body p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="card-title text-lg">Players</h3>
          <div className="badge badge-primary">{players.length} joined</div>
        </div>

        <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
          {sortedPlayers.map((player) => {
            const isCurrentPlayer = player.id === currentPlayerId;
            const isHost = player.role === 'host';
            const hasSolvedCurrentFrame = currentFrameSolvedPlayerIds.includes(
              player.id
            );

            return (
              <div
                key={player.id}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all duration-300 ${
                  hasSolvedCurrentFrame
                    ? 'bg-success/20 border-2 border-success shadow-lg scale-105'
                    : 'bg-base-100 border border-base-300'
                } ${isCurrentPlayer ? 'ring-2 ring-primary' : ''} ${
                  isHost ? 'ring-2 ring-warning' : ''
                }`}
              >
                <div className="relative">
                  <PlayerAvatarSimple
                    name={player.name}
                    isHost={isHost}
                    isCurrentPlayer={isCurrentPlayer}
                  />
                  {hasSolvedCurrentFrame && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-success rounded-full flex items-center justify-center">
                      <span className="text-success-content text-xs">✓</span>
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="font-bold text-sm">{player.name}</span>
                    {isCurrentPlayer && (
                      <span className="badge badge-primary badge-xs">YOU</span>
                    )}
                    {isHost && (
                      <span className="badge badge-warning badge-xs">HOST</span>
                    )}
                  </div>

                  <div className="text-lg font-bold text-primary">
                    {player.score}
                  </div>
                  <div className="text-xs opacity-70">
                    point{player.score !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
