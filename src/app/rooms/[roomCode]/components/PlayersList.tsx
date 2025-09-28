'use client';

import PlayerAvatarSimple from './PlayerAvatarSimple';

interface Player {
  id: string;
  name: string;
  role: string;
  joinedAt: number;
  score: number;
}

interface PlayersListProps {
  players: Player[];
  currentPlayerId?: string | null;
  className?: string;
}

export default function PlayersList({ 
  players, 
  currentPlayerId,
  className 
}: PlayersListProps) {
  // Trier les joueurs par score décroissant
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.joinedAt - b.joinedAt;
  });

  // Prendre tous les joueurs sauf les 3 premiers
  const remainingPlayers = sortedPlayers.slice(3);

  if (remainingPlayers.length === 0) {
    return null;
  }

  return (
    <div className={`card bg-base-200 shadow-xl ${className}`}>
      <div className="card-body">
        <h3 className="card-title text-lg mb-4">Other Players</h3>
        
        <div className="space-y-2">
          {remainingPlayers.map((player, index) => {
            const isCurrentPlayer = player.id === currentPlayerId;
            const isHost = player.role === 'host';
            const globalRank = index + 4; // Commence à 4 car on a déjà les 3 premiers
            
            return (
              <div
                key={player.id}
                className={`card bg-base-100 ${
                  isCurrentPlayer ? 'ring-2 ring-primary' : ''
                } ${isHost ? 'ring-2 ring-warning' : ''}`}
              >
                <div className="card-body p-4">
                  <div className="flex items-center gap-4">
                    {/* Rang global */}
                    <div className="flex-shrink-0 w-8 text-center">
                      <span className="text-lg font-bold text-base-content/70">
                        #{globalRank}
                      </span>
                    </div>
                    
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <PlayerAvatarSimple
                        name={player.name}
                        isHost={isHost}
                        isCurrentPlayer={isCurrentPlayer}
                      />
                    </div>
                    
                    {/* Informations du joueur */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold">
                          {player.name}
                        </span>
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
                    </div>
                    
                    {/* Score */}
                    <div className="flex-shrink-0 text-right">
                      <div className="text-xl font-bold text-primary">
                        {player.score}
                      </div>
                      <div className="text-xs opacity-70">
                        point{player.score !== 1 ? 's' : ''}
                      </div>
                    </div>
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
