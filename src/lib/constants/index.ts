// Game constants
export const GAME_CONSTANTS = {
  MIN_PLAYERS: 1,
  MAX_PLAYERS: 10,
  MIN_DURATION: 1,
  MAX_DURATION: 60,
  DEFAULT_DURATION: 10,
  DEFAULT_DIFFICULTY: 'normal' as const,
  PRE_ROLL_SECONDS: 3,
  GUESS_WINDOW_SECONDS: 30,
  AUTO_ADVANCE_DELAY: 1000,
} as const;

// API constants
export const API_CONSTANTS = {
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || '',
} as const;

// WebSocket constants
export const WEBSOCKET_CONSTANTS = {
  RECONNECT_DELAY: 1000,
  MAX_RECONNECT_ATTEMPTS: 5,
  PING_INTERVAL: 30000,
  PONG_TIMEOUT: 5000,
} as const;

// UI constants
export const UI_CONSTANTS = {
  ANIMATION_DURATION: 300,
  TOAST_DURATION: 5000,
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 100,
  INFINITE_SCROLL_THRESHOLD: 100,
} as const;

// Storage constants
export const STORAGE_CONSTANTS = {
  CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours
  MAX_CACHE_SIZE: 100 * 1024 * 1024, // 100MB
  CLEANUP_INTERVAL: 60 * 60 * 1000, // 1 hour
} as const;

// Error constants
export const ERROR_CONSTANTS = {
  MAX_ERROR_LOG_SIZE: 100,
  ERROR_DISPLAY_DURATION: 5000,
  RETRY_DELAY: 1000,
} as const;
