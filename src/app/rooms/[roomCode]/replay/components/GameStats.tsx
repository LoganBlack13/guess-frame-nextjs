'use client';

import { Game } from '@/lib/database/types';
import { useState, useEffect } from 'react';

interface GameStatsProps {
  game: Game;
}

export default function GameStats({ game }: GameStatsProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/games/${game.id}/stats`);
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setStats(result.data);
          }
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
        // Optionnel: afficher une erreur à l'utilisateur
        // setError(error instanceof Error ? error.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [game.id]);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (loading) {
    return (
      <div className="card bg-base-200">
        <div className="card-body">
          <div className="flex items-center justify-center py-4">
            <div className="loading loading-spinner loading-md"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="card bg-base-200">
        <div className="card-body">
          <h3 className="card-title">Statistiques</h3>
          <p className="text-base-content/70">Aucune statistique disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-200">
      <div className="card-body">
        <h3 className="card-title">Statistiques de la Partie</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat">
            <div className="stat-title">Durée</div>
            <div className="stat-value text-primary">
              {formatDuration(stats.duration)}
            </div>
          </div>
          
          <div className="stat">
            <div className="stat-title">Frames</div>
            <div className="stat-value text-secondary">
              {stats.totalFrames}
            </div>
          </div>
          
          <div className="stat">
            <div className="stat-title">Tentatives</div>
            <div className="stat-value text-accent">
              {stats.totalGuesses}
            </div>
          </div>
          
          <div className="stat">
            <div className="stat-title">Précision</div>
            <div className="stat-value text-info">
              {Math.round(stats.accuracy * 100)}%
            </div>
          </div>
        </div>

        {stats.playerStats && stats.playerStats.length > 0 && (
          <div className="mt-6">
            <h4 className="text-lg font-semibold mb-4">Scores des Joueurs</h4>
            <div className="space-y-2">
              {stats.playerStats
                .sort((a: any, b: any) => b.score - a.score)
                .map((player: any, index: number) => (
                  <div key={player.playerId} className="flex items-center justify-between p-3 bg-base-100 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary text-primary-content rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-semibold">{player.playerName}</div>
                        <div className="text-sm text-base-content/70">
                          {player.correctGuesses}/{player.guesses} corrects
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">
                        {player.score} pts
                      </div>
                      <div className="text-sm text-base-content/70">
                        {Math.round(player.accuracy * 100)}%
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
