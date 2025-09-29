'use client';

import { useState, useEffect } from 'react';
import { Game } from '@/lib/database/types';
import ReplayPlayer from '@/app/rooms/[roomCode]/replay/components/ReplayPlayer';
import GameList from '@/app/rooms/[roomCode]/replay/components/GameList';
import GameStats from '@/app/rooms/[roomCode]/replay/components/GameStats';

interface ReplayViewProps {
  roomCode: string;
  games: Game[];
  selectedGameId?: string;
}

export default function ReplayView({ roomCode, games, selectedGameId }: ReplayViewProps) {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [replayData, setReplayData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sélectionner la première partie par défaut ou celle spécifiée
  useEffect(() => {
    if (selectedGameId) {
      const game = games.find(g => g.id === selectedGameId);
      if (game) {
        setSelectedGame(game);
      }
    } else if (games.length > 0) {
      setSelectedGame(games[0]);
    }
  }, [games, selectedGameId]);

  // Charger les données de replay
  useEffect(() => {
    if (!selectedGame) return;

    const loadReplayData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/games/${selectedGame.id}/replay`);
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to load replay data'}`);
        }

        const result = await response.json();
        if (result.success) {
          setReplayData(result.data);
        } else {
          throw new Error(result.error || 'Failed to load replay data');
        }
      } catch (err) {
        console.error('Error loading replay data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadReplayData();
  }, [selectedGame]);

  const handleGameSelect = (game: Game) => {
    // Ne pas recharger si c'est la même partie
    if (selectedGame?.id === game.id) {
      return;
    }
    setSelectedGame(game);
    setReplayData(null);
  };

  const handleExportReplay = async (format: 'json' | 'text' | 'summary') => {
    if (!selectedGame) return;

    try {
      const response = await fetch(`/api/games/${selectedGame.id}/replay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ format }),
      });

      if (!response.ok) {
        throw new Error('Failed to export replay');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `replay-${selectedGame.id}.${format === 'json' ? 'json' : 'txt'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Colonne de gauche - Liste des parties et statistiques */}
      <div className="lg:col-span-1 space-y-6">
        <GameList
          games={games}
          selectedGame={selectedGame}
          onGameSelect={handleGameSelect}
        />
        
        {/* Statistiques de la partie */}
        {selectedGame && !loading && !error && (
          <GameStats game={selectedGame} />
        )}
      </div>

      {/* Contenu principal */}
      <div className="lg:col-span-2">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="loading loading-spinner loading-lg"></div>
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {selectedGame && !loading && !error && (
          <div className="space-y-6">
            {/* Actions */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title">Actions</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="btn btn-primary"
                    onClick={() => handleExportReplay('json')}
                  >
                    Exporter JSON
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleExportReplay('text')}
                  >
                    Exporter Texte
                  </button>
                  <button
                    className="btn btn-accent"
                    onClick={() => handleExportReplay('summary')}
                  >
                    Résumé
                  </button>
                </div>
              </div>
            </div>

            {/* Lecteur de replay */}
            {replayData && (
              <ReplayPlayer
                replayData={replayData}
                game={selectedGame}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
