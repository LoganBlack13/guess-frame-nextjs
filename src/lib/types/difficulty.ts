/**
 * Game difficulty levels with their associated parameters
 */
export const DIFFICULTY_LEVELS = {
  easy: {
    label: 'Easy',
    secondsPerFrame: 30,
    description: 'More time to think',
  },
  normal: {
    label: 'Normal',
    secondsPerFrame: 20,
    description: 'Balanced challenge',
  },
  hard: {
    label: 'Hard',
    secondsPerFrame: 10,
    description: 'Quick thinking required',
  },
} as const;

export type DifficultyLevel = keyof typeof DIFFICULTY_LEVELS;

/**
 * Get difficulty configuration
 */
export function getDifficultyConfig(level: DifficultyLevel) {
  return DIFFICULTY_LEVELS[level];
}

/**
 * Calculate frame count based on duration and difficulty
 */
export function calculateFrameCount(
  durationMinutes: number,
  difficulty: DifficultyLevel
): number {
  const { secondsPerFrame } = getDifficultyConfig(difficulty);
  const totalSeconds = durationMinutes * 60;
  return Math.floor(totalSeconds / secondsPerFrame);
}
