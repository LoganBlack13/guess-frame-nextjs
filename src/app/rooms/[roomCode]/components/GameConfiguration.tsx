'use client';

import { useState } from 'react';
import { 
  Settings, 
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface GameConfigurationProps {
  onStartGame: (settings: GameSettings) => void;
  isGenerating: boolean;
}

interface GameSettings {
  difficulty: 'easy' | 'normal' | 'hard';
  durationMinutes: number;
  genres?: string[];
  yearRange?: { min: number; max: number };
}

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Facile (30s par frame)', description: 'Plus de temps pour réfléchir' },
  { value: 'normal', label: 'Normal (20s par frame)', description: 'Équilibre parfait' },
  { value: 'hard', label: 'Difficile (10s par frame)', description: 'Défi intense' }
];

const GENRE_OPTIONS = [
  { value: "28", label: "Action" },
  { value: "12", label: "Aventure" },
  { value: "16", label: "Animation" },
  { value: "35", label: "Comédie" },
  { value: "80", label: "Crime" },
  { value: "99", label: "Documentaire" },
  { value: "18", label: "Drame" },
  { value: "10751", label: "Famille" },
  { value: "14", label: "Fantasy" },
  { value: "36", label: "Histoire" },
  { value: "27", label: "Horreur" },
  { value: "10402", label: "Musique" },
  { value: "9648", label: "Mystère" },
  { value: "10749", label: "Romance" },
  { value: "878", label: "Science-Fiction" },
  { value: "53", label: "Thriller" },
  { value: "10752", label: "Guerre" },
  { value: "37", label: "Western" }
];

export default function GameConfiguration({ onStartGame, isGenerating }: GameConfigurationProps) {
  const [settings, setSettings] = useState<GameSettings>({
    difficulty: 'normal',
    durationMinutes: 10,
    genres: [],
    yearRange: { min: 1990, max: 2024 }
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateFrameCount = () => {
    // Import dynamique pour éviter les erreurs de build
    const { calculateFrameCount } = require('@/lib/types/difficulty');
    return calculateFrameCount(settings.durationMinutes, settings.difficulty);
  };

  const handleStartGame = () => {
    setError(null);
    
    if (settings.durationMinutes < 1 || settings.durationMinutes > 60) {
      setError('La durée doit être entre 1 et 60 minutes');
      return;
    }

    if (settings.yearRange && settings.yearRange.min > settings.yearRange.max) {
      setError('L\'année minimum doit être inférieure à l\'année maximum');
      return;
    }

    onStartGame(settings);
  };

  const toggleGenre = (genreValue: string) => {
    setSettings(prev => ({
      ...prev,
      genres: prev.genres?.includes(genreValue)
        ? prev.genres.filter(g => g !== genreValue)
        : [...(prev.genres || []), genreValue]
    }));
  };

  const frameCount = calculateFrameCount();

  return (
    <div className="card bg-base-200 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Game Configuration</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">
              <span className="label-text">Difficulty *</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={settings.difficulty}
              onChange={(e) => setSettings(prev => ({ ...prev, difficulty: e.target.value as 'easy' | 'normal' | 'hard' }))}
              disabled={isGenerating}
            >
              {DIFFICULTY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="label">
              <span className="label-text-alt">
                {DIFFICULTY_OPTIONS.find(opt => opt.value === settings.difficulty)?.description}
              </span>
            </div>
          </div>

          <div>
            <label className="label">
              <span className="label-text">Duration (minutes) *</span>
            </label>
            <input
              type="number"
              min="1"
              max="60"
              className="input input-bordered w-full"
              value={settings.durationMinutes}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                durationMinutes: parseInt(e.target.value) || 10 
              }))}
              disabled={isGenerating}
            />
            <div className="label">
              <span className="label-text-alt">Total game duration</span>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 mb-4">
          <div className="card-body">
            <h3 className="card-title text-sm">Game Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-xs opacity-70">Estimated frames:</div>
                <div className="font-bold text-lg">{frameCount}</div>
              </div>
              <div>
                <div className="text-xs opacity-70">Time per frame:</div>
                <div className="font-bold">
                  {settings.difficulty === 'easy' ? '30s' : settings.difficulty === 'normal' ? '20s' : '10s'}
                </div>
              </div>
              <div>
                <div className="text-xs opacity-70">Total duration:</div>
                <div className="font-bold">{settings.durationMinutes}min</div>
              </div>
              <div>
                <div className="text-xs opacity-70">Genres:</div>
                <div className="font-bold">
                  {settings.genres?.length || 0} selected
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <button
            className="btn btn-outline w-full"
            onClick={() => setShowAdvanced(!showAdvanced)}
            disabled={isGenerating}
          >
            <Settings className="w-4 h-4 mr-2" />
            {showAdvanced ? 'Hide' : 'Show'} advanced settings
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4 p-4 bg-base-100 rounded-lg">
              <div>
                <label className="label">
                  <span className="label-text">Genres (optional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {GENRE_OPTIONS.map(genre => (
                    <span
                      key={genre.value}
                      className={`badge cursor-pointer ${
                        settings.genres?.includes(genre.value) ? 'badge-primary' : 'badge-outline'
                      }`}
                      onClick={() => toggleGenre(genre.value)}
                    >
                      {genre.label}
                    </span>
                  ))}
                </div>
                <div className="label">
                  <span className="label-text-alt">Leave empty to include all genres</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text">Min year</span>
                  </label>
                  <input
                    type="number"
                    min="1900"
                    max="2024"
                    className="input input-bordered w-full"
                    value={settings.yearRange?.min || 1990}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      yearRange: { ...prev.yearRange!, min: parseInt(e.target.value) || 1990 }
                    }))}
                    disabled={isGenerating}
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">Max year</span>
                  </label>
                  <input
                    type="number"
                    min="1900"
                    max="2024"
                    className="input input-bordered w-full"
                    value={settings.yearRange?.max || 2024}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      yearRange: { ...prev.yearRange!, max: parseInt(e.target.value) || 2024 }
                    }))}
                    disabled={isGenerating}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <button
          className="btn btn-primary w-full"
          onClick={handleStartGame}
          disabled={isGenerating || frameCount < 1}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Start Game ({frameCount} frames)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
