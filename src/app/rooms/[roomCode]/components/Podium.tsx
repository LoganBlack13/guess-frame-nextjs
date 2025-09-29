'use client';

import PlayerAvatarSimple from './PlayerAvatarSimple';

interface Player {
  id: string;
  name: string;
  role: string;
  joinedAt: number;
  score: number;
}

interface PodiumProps {
  players: Player[];
  currentPlayerId?: string | null;
  className?: string;
}

export default function Podium({
  players,
  currentPlayerId,
  className,
}: PodiumProps) {
  // Trier les joueurs par score décroissant
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.joinedAt - b.joinedAt;
  });

  const topThree = sortedPlayers.slice(0, 3);
  const hasPlayers = topThree.length > 0;

  if (!hasPlayers) {
    return null;
  }

  const getPodiumPosition = (index: number) => {
    switch (index) {
      case 0:
        return {
          position: '1st',
          medal: '🥇',
          height: 'h-24',
          bg: 'bg-warning',
        };
      case 1:
        return {
          position: '2nd',
          medal: '🥈',
          height: 'h-20',
          bg: 'bg-base-300',
        };
      case 2:
        return {
          position: '3rd',
          medal: '🥉',
          height: 'h-16',
          bg: 'bg-warning/70',
        };
      default:
        return { position: '', medal: '', height: 'h-12', bg: 'bg-base-200' };
    }
  };

  return (
    <div className={`card bg-base-200 shadow-xl ${className}`}>
      <div className="card-body">
        <h2 className="card-title text-2xl justify-center mb-6">🏆 Podium</h2>

        <div className="flex items-end justify-center gap-4 mb-6">
          {topThree.map((player, index) => {
            const isCurrentPlayer = player.id === currentPlayerId;
            const isHost = player.role === 'host';
            const podiumInfo = getPodiumPosition(index);

            return (
              <div key={player.id} className="flex flex-col items-center">
                {/* Position du podium */}
                <div
                  className={`${podiumInfo.height} ${podiumInfo.bg} w-20 rounded-t-lg flex items-end justify-center mb-2 relative`}
                >
                  <div className="text-2xl mb-2">{podiumInfo.medal}</div>
                </div>

                {/* Informations du joueur */}
                <div
                  className={`card ${isCurrentPlayer ? 'ring-2 ring-primary' : ''} ${
                    isHost ? 'ring-2 ring-warning' : ''
                  } min-w-[120px]`}
                >
                  <div className="card-body p-3 text-center">
                    <div className="relative mb-2">
                      <PlayerAvatarSimple
                        name={player.name}
                        isHost={isHost}
                        isCurrentPlayer={isCurrentPlayer}
                      />
                    </div>

                    <div className="font-bold text-sm mb-1">{player.name}</div>

                    <div className="flex items-center justify-center gap-1 mb-1">
                      {isCurrentPlayer && (
                        <span className="badge badge-primary badge-xs">
                          YOU
                        </span>
                      )}
                      {isHost && (
                        <span className="badge badge-warning badge-xs">
                          HOST
                        </span>
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
              </div>
            );
          })}
        </div>

        {topThree.length > 0 && (
          <div className="text-center">
            <div className="text-sm opacity-70">
              {topThree[0].name} wins with {topThree[0].score} point
              {topThree[0].score !== 1 ? 's' : ''}!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
