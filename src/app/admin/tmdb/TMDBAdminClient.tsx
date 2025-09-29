'use client';

import {
  AlertCircle,
  CheckCircle,
  Database,
  Download,
  Film,
  Loader2,
  RefreshCw,
  Settings,
} from 'lucide-react';

import { useEffect, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select } from '@/components/ui/select';

interface MovieStats {
  totalMovies: number;
  moviesByGenre: Record<string, number>;
  moviesByYear: Record<string, number>;
  lastUpdate: string | null;
}

interface FetchProgress {
  isFetching: boolean;
  currentPage: number;
  totalPages: number;
  moviesFetched: number;
  moviesSaved: number;
  currentGenre?: string;
}

export function TMDBAdminClient() {
  const [stats, setStats] = useState<MovieStats | null>(null);
  const [progress, setProgress] = useState<FetchProgress>({
    isFetching: false,
    currentPage: 0,
    totalPages: 0,
    moviesFetched: 0,
    moviesSaved: 0,
  });
  const [settings, setSettings] = useState({
    pages: 5,
    genres: [] as string[],
    years: { min: 1990, max: 2024 },
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Charger les statistiques au montage
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/tmdb/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const startFetching = async () => {
    setError(null);
    setSuccess(null);
    setProgress({
      isFetching: true,
      currentPage: 0,
      totalPages: settings.pages,
      moviesFetched: 0,
      moviesSaved: 0,
    });

    try {
      const response = await fetch('/api/admin/tmdb/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to start fetching');
      }

      // Simuler le suivi du progrès (à remplacer par SSE)
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev.currentPage >= prev.totalPages) {
            clearInterval(interval);
            setProgress((prev) => ({ ...prev, isFetching: false }));
            setSuccess(
              `✅ Récupération terminée ! ${prev.moviesSaved} films ajoutés.`
            );
            loadStats();
            return prev;
          }
          return {
            ...prev,
            currentPage: prev.currentPage + 1,
            moviesFetched: prev.moviesFetched + 20,
            moviesSaved: prev.moviesSaved + 15,
          };
        });
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setProgress((prev) => ({ ...prev, isFetching: false }));
    }
  };

  const clearDatabase = async () => {
    if (
      !confirm('Êtes-vous sûr de vouloir vider la base de données des films ?')
    ) {
      return;
    }

    try {
      const response = await fetch('/api/admin/tmdb/clear', {
        method: 'DELETE',
      });
      if (response.ok) {
        setSuccess('✅ Base de données vidée avec succès');
        loadStats();
      } else {
        throw new Error('Failed to clear database');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  };

  const genres = [
    { value: '28', label: 'Action' },
    { value: '12', label: 'Aventure' },
    { value: '16', label: 'Animation' },
    { value: '35', label: 'Comédie' },
    { value: '80', label: 'Crime' },
    { value: '99', label: 'Documentaire' },
    { value: '18', label: 'Drame' },
    { value: '10751', label: 'Famille' },
    { value: '14', label: 'Fantasy' },
    { value: '36', label: 'Histoire' },
    { value: '27', label: 'Horreur' },
    { value: '10402', label: 'Musique' },
    { value: '9648', label: 'Mystère' },
    { value: '10749', label: 'Romance' },
    { value: '878', label: 'Science-Fiction' },
    { value: '10770', label: 'Téléfilm' },
    { value: '53', label: 'Thriller' },
    { value: '10752', label: 'Guerre' },
    { value: '37', label: 'Western' },
  ];

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Statistiques de la base</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadStats}
            disabled={progress.isFetching}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {stats ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {stats.totalMovies}
              </div>
              <div className="text-sm text-base-content/70">Films total</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-secondary">
                {Object.keys(stats.moviesByGenre).length}
              </div>
              <div className="text-sm text-base-content/70">Genres</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent">
                {stats.lastUpdate
                  ? new Date(stats.lastUpdate).toLocaleDateString()
                  : 'Jamais'}
              </div>
              <div className="text-sm text-base-content/70">
                Dernière mise à jour
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p>Chargement des statistiques...</p>
          </div>
        )}
      </Card>

      {/* Configuration */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Configuration</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Nombre de pages à récupérer
            </label>
            <Input
              type="number"
              min="1"
              max="20"
              value={settings.pages}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  pages: parseInt(e.target.value) || 1,
                }))
              }
              disabled={progress.isFetching}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Difficulté</label>
            <Select
              value={settings.difficulty}
              onValueChange={(value: string) =>
                setSettings((prev) => ({ ...prev, difficulty: value }))
              }
              disabled={progress.isFetching}
            >
              <option value="easy">Facile</option>
              <option value="medium">Moyen</option>
              <option value="hard">Difficile</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Année minimum
            </label>
            <Input
              type="number"
              min="1900"
              max="2024"
              value={settings.years.min}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  years: {
                    ...prev.years,
                    min: parseInt(e.target.value) || 1990,
                  },
                }))
              }
              disabled={progress.isFetching}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Année maximum
            </label>
            <Input
              type="number"
              min="1900"
              max="2024"
              value={settings.years.max}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  years: {
                    ...prev.years,
                    max: parseInt(e.target.value) || 2024,
                  },
                }))
              }
              disabled={progress.isFetching}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">
            Genres (optionnel)
          </label>
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <Badge
                key={genre.value}
                variant={
                  settings.genres.includes(genre.value) ? 'default' : 'outline'
                }
                className="cursor-pointer"
                onClick={() => {
                  if (progress.isFetching) return;
                  setSettings((prev) => ({
                    ...prev,
                    genres: prev.genres.includes(genre.value)
                      ? prev.genres.filter((g) => g !== genre.value)
                      : [...prev.genres, genre.value],
                  }));
                }}
              >
                {genre.label}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      {/* Progrès */}
      {progress.isFetching && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <h2 className="text-xl font-semibold">Récupération en cours...</h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>
                  Page {progress.currentPage} / {progress.totalPages}
                </span>
                <span>
                  {Math.round(
                    (progress.currentPage / progress.totalPages) * 100
                  )}
                  %
                </span>
              </div>
              <Progress
                value={(progress.currentPage / progress.totalPages) * 100}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Films récupérés:</span>{' '}
                {progress.moviesFetched}
              </div>
              <div>
                <span className="font-medium">Films sauvegardés:</span>{' '}
                {progress.moviesSaved}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="w-4 h-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          onClick={startFetching}
          disabled={progress.isFetching}
          className="flex-1"
        >
          <Download className="w-4 h-4 mr-2" />
          {progress.isFetching ? 'Récupération...' : 'Récupérer des films'}
        </Button>

        <Button
          variant="outline"
          onClick={clearDatabase}
          disabled={progress.isFetching}
        >
          <Film className="w-4 h-4 mr-2" />
          Vider la base
        </Button>
      </div>
    </div>
  );
}
