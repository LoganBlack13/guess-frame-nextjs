'use client';

import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Settings, 
  Clock, 
  Target, 
  Film, 
  Calendar,
  Tag,
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
    const secondsPerFrame = settings.difficulty === 'easy' ? 30 : settings.difficulty === 'normal' ? 20 : 10;
    const totalSeconds = settings.durationMinutes * 60;
    return Math.floor(totalSeconds / secondsPerFrame);
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
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Configuration de la partie</h2>
      </div>

      <div className="space-y-6">
        {/* Paramètres obligatoires */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Difficulté */}
          <div>
            <label className="block text-sm font-medium mb-3">
              <Target className="w-4 h-4 inline mr-2" />
              Difficulté *
            </label>
            <Select
              value={settings.difficulty}
              onValueChange={(value: string) => 
                setSettings(prev => ({ ...prev, difficulty: value }))
              }
              disabled={isGenerating}
            >
              {DIFFICULTY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <p className="text-sm text-base-content/60 mt-1">
              {DIFFICULTY_OPTIONS.find(opt => opt.value === settings.difficulty)?.description}
            </p>
          </div>

          {/* Durée */}
          <div>
            <label className="block text-sm font-medium mb-3">
              <Clock className="w-4 h-4 inline mr-2" />
              Durée (minutes) *
            </label>
            <Input
              type="number"
              min="1"
              max="60"
              value={settings.durationMinutes}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                durationMinutes: parseInt(e.target.value) || 10 
              }))}
              disabled={isGenerating}
            />
            <p className="text-sm text-base-content/60 mt-1">
              Durée totale de la partie
            </p>
          </div>
        </div>

        {/* Résumé */}
        <div className="bg-base-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Film className="w-5 h-5 text-primary" />
            <span className="font-medium">Résumé de la partie</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-base-content/60">Frames estimées:</span>
              <div className="font-semibold text-lg">{frameCount}</div>
            </div>
            <div>
              <span className="text-base-content/60">Temps par frame:</span>
              <div className="font-semibold">
                {settings.difficulty === 'easy' ? '30s' : settings.difficulty === 'normal' ? '20s' : '10s'}
              </div>
            </div>
            <div>
              <span className="text-base-content/60">Durée totale:</span>
              <div className="font-semibold">{settings.durationMinutes}min</div>
            </div>
            <div>
              <span className="text-base-content/60">Genres:</span>
              <div className="font-semibold">
                {settings.genres?.length || 0} sélectionné{(settings.genres?.length || 0) > 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Paramètres avancés */}
        <div>
            <Button
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              disabled={isGenerating}
              className="w-full"
            >
              <Settings className="w-4 h-4 mr-2" />
              {showAdvanced ? 'Masquer' : 'Afficher'} les paramètres avancés
            </Button>

          {showAdvanced && (
            <div className="mt-4 space-y-4 p-4 bg-base-100 rounded-lg border">
              {/* Genres */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  <Tag className="w-4 h-4 inline mr-2" />
                  Genres (optionnel)
                </label>
                <div className="flex flex-wrap gap-2">
                  {GENRE_OPTIONS.map(genre => (
                    <Badge
                      key={genre.value}
                      variant={settings.genres?.includes(genre.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleGenre(genre.value)}
                    >
                      {genre.label}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-base-content/60 mt-2">
                  Laissez vide pour inclure tous les genres
                </p>
              </div>

              {/* Années */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Année minimum
                  </label>
                  <Input
                    type="number"
                    min="1900"
                    max="2024"
                    value={settings.yearRange?.min || 1990}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      yearRange: { ...prev.yearRange!, min: parseInt(e.target.value) || 1990 }
                    }))}
                    disabled={isGenerating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Année maximum
                  </label>
                  <Input
                    type="number"
                    min="1900"
                    max="2024"
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

        {/* Messages d'erreur */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Bouton de démarrage */}
        <Button
          onClick={handleStartGame}
          disabled={isGenerating || frameCount < 1}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Démarrer la partie ({frameCount} frames)
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
