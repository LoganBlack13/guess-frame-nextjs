export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  SERVER_ERROR = 'SERVER_ERROR',
  
  // Room errors
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  ROOM_FULL = 'ROOM_FULL',
  ROOM_CLOSED = 'ROOM_CLOSED',
  INVALID_ROOM_CODE = 'INVALID_ROOM_CODE',
  
  // Game errors
  GAME_NOT_STARTED = 'GAME_NOT_STARTED',
  GAME_ALREADY_STARTED = 'GAME_ALREADY_STARTED',
  GAME_COMPLETED = 'GAME_COMPLETED',
  INVALID_GUESS = 'INVALID_GUESS',
  
  // Player errors
  PLAYER_NOT_FOUND = 'PLAYER_NOT_FOUND',
  PLAYER_ALREADY_JOINED = 'PLAYER_ALREADY_JOINED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  
  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // System errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  stack?: string;
}

export class AppErrorClass extends Error implements AppError {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: Date;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppErrorClass);
    }
  }
}
