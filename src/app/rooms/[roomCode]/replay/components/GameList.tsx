'use client';

import { Game } from '@/lib/database/types';

interface GameListProps {
  games: Game[];
  selectedGame: Game | null;
  onGameSelect: (game: Game) => void;
}

export default function GameList({ games, selectedGame, onGameSelect }: GameListProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'badge-success';
      case 'started':
        return 'badge-warning';
      case 'generated':
        return 'badge-info';
      default:
        return 'badge-neutral';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Terminée';
      case 'started':
        return 'En cours';
      case 'generated':
        return 'Générée';
      default:
        return status;
    }
  };

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h2 className="card-title">
          Parties ({games.length})
        </h2>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {games.map((game) => (
            <div
              key={game.id}
              className={`card bg-base-100 cursor-pointer transition-all hover:bg-base-300 ${
                selectedGame?.id === game.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => onGameSelect(game)}
            >
              <div className="card-body p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm text-base-content/70">
                    #{game.id.slice(-8)}
                  </span>
                  <span className={`badge ${getStatusColor(game.status)}`}>
                    {getStatusText(game.status)}
                  </span>
                </div>
                
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Créée:</span>
                    <span>{formatDate(game.createdAt)}</span>
                  </div>
                  
                  {game.startedAt && (
                    <div className="flex justify-between">
                      <span className="text-base-content/70">Démarrée:</span>
                      <span>{formatDate(game.startedAt)}</span>
                    </div>
                  )}
                  
                  {game.completedAt && (
                    <div className="flex justify-between">
                      <span className="text-base-content/70">Terminée:</span>
                      <span>{formatDate(game.completedAt)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Frames:</span>
                    <span>{game.gameFrames.length}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Événements:</span>
                    <span>{game.events.length}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
