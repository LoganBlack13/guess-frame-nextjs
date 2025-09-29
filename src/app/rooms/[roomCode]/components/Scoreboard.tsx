'use client';

import type { Player } from '@/lib/rooms';

interface ScoreboardProps {
  players: Player[];
  currentPlayerId?: string | null;
  targetFrameCount: number;
  isVisible: boolean;
}

export default function Scoreboard({
  players,
  currentPlayerId,
  targetFrameCount,
  isVisible,
}: ScoreboardProps) {
  if (!isVisible) return null;

  const sortedPlayersWithFlags = players.map((player) => ({
    ...player,
    isYou: player.id === (currentPlayerId ?? ''),
    isHost: player.role === 'host',
  }));

  return (
    <section className="card border border-base-300 bg-base-200 shadow-md">
      <div className="card-body gap-3">
        <div className="flex items-center justify-between">
          <h2 className="card-title text-2xl text-base-content">
            Final scoreboard
          </h2>
          <span className="badge badge-outline">
            {targetFrameCount} frame party
          </span>
        </div>
        <ol className="space-y-2">
          {sortedPlayersWithFlags.map((player, index) => (
            <li
              key={player.id}
              className={`flex items-center justify-between rounded-lg border border-base-300 bg-base-100 px-4 py-3 ${
                index === 0 ? 'shadow-md' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-base-content/60">
                  #{index + 1}
                </span>
                <span className="text-base font-semibold text-base-content">
                  {player.name}
                  {player.isYou ? ' (You)' : ''}
                  {player.isHost ? ' • Host' : ''}
                </span>
              </div>
              <span className="badge badge-primary badge-lg font-semibold">
                {player.score} pt{player.score === 1 ? '' : 's'}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
