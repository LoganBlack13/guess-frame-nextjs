'use client';

import { PlayerAvatar } from '@/components/ui/player-avatar';

interface Player {
  id: string;
  name: string;
  role: string;
  joinedAt: number;
  score: number;
}

interface PlayerListProps {
  players: Player[];
  currentFrameSolvedPlayerIds?: string[];
  className?: string;
}

export default function PlayerList({ players, currentFrameSolvedPlayerIds = [], className }: PlayerListProps) {
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.joinedAt - b.joinedAt;
  });


  return (
    <div className={`card bg-base-200 shadow-xl ${className}`}>
      <div className="card-body">
        <h3 className="text-xl font-semibold mb-4">Players ({players.length})</h3>
        <div className="flex flex-wrap gap-4 justify-center">
          {sortedPlayers.map((player) => {
            const isCorrect = currentFrameSolvedPlayerIds.includes(player.id);
            return (
              <PlayerAvatar
                key={player.id}
                name={player.name}
                score={player.score}
                isCorrect={isCorrect}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}