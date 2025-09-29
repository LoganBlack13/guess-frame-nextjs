import { useState, useCallback } from 'react';
import type { GameDifficulty } from '@/lib/rooms';

interface UseGameSettingsProps {
  initialDifficulty: GameDifficulty;
  initialDuration: number;
}

export function useGameSettings({ 
  initialDifficulty, 
  initialDuration 
}: UseGameSettingsProps) {
  const [difficultyChoice, setDifficultyChoice] = useState<GameDifficulty>(initialDifficulty);
  const [durationChoice, setDurationChoice] = useState<number>(initialDuration);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSavedAt, setSettingsSavedAt] = useState<number | null>(null);

  const handleSaveSettings = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingSettings(true);
    setSettingsError(null);

    try {
      const response = await fetch(`/api/rooms/${initialDifficulty}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          difficulty: difficultyChoice,
          duration: durationChoice,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save settings');
      }

      setSettingsSavedAt(Date.now());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save settings';
      setSettingsError(message);
    } finally {
      setIsSavingSettings(false);
    }
  }, [difficultyChoice, durationChoice, initialDifficulty]);

  return {
    difficultyChoice,
    setDifficultyChoice,
    durationChoice,
    setDurationChoice,
    isSavingSettings,
    settingsError,
    settingsSavedAt,
    setSettingsSavedAt,
    handleSaveSettings,
  };
}
