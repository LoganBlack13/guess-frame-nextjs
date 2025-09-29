import { z } from 'zod';

// Room validation schemas
export const roomCodeSchema = z.string().min(1).max(10).regex(/^[A-Z0-9]+$/);
export const playerNameSchema = z.string().min(1).max(50).trim();
export const gameDifficultySchema = z.enum(['easy', 'normal', 'hard']);
export const durationSchema = z.number().min(1).max(60);

// Game validation schemas
export const guessSchema = z.string().min(1).max(200).trim();
export const roomSettingsSchema = z.object({
  difficulty: gameDifficultySchema,
  duration: durationSchema,
});

// Player validation schemas
export const playerSchema = z.object({
  id: z.string().uuid(),
  name: playerNameSchema,
  role: z.enum(['host', 'player']),
  score: z.number().min(0),
  isConnected: z.boolean(),
  joinedAt: z.date(),
});

// Utility validation functions
export function validateRoomCode(code: string): boolean {
  return roomCodeSchema.safeParse(code).success;
}

export function validatePlayerName(name: string): boolean {
  return playerNameSchema.safeParse(name).success;
}

export function validateGuess(guess: string): boolean {
  return guessSchema.safeParse(guess).success;
}

export function validateRoomSettings(settings: unknown): boolean {
  return roomSettingsSchema.safeParse(settings).success;
}

// Sanitization functions
export function sanitizePlayerName(name: string): string {
  return name.trim().slice(0, 50);
}

export function sanitizeGuess(guess: string): string {
  return guess.trim().slice(0, 200);
}

export function sanitizeRoomCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
}
