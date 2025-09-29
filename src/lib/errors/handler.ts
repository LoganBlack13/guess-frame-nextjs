import { ErrorCode, AppErrorClass, type AppError } from './types';

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: AppError[] = [];

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public createError(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>
  ): AppErrorClass {
    return new AppErrorClass(code, message, details);
  }

  public logError(error: AppError): void {
    this.errorLog.push(error);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('App Error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: error.timestamp,
        stack: error.stack,
      });
    }
    
    // In production, you might want to send to an error tracking service
    // like Sentry, LogRocket, etc.
  }

  public getErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  public clearErrorLog(): void {
    this.errorLog = [];
  }

  public getErrorMessage(code: ErrorCode): string {
    const errorMessages: Record<ErrorCode, string> = {
      [ErrorCode.NETWORK_ERROR]: 'Network connection failed. Please check your internet connection.',
      [ErrorCode.CONNECTION_TIMEOUT]: 'Connection timed out. Please try again.',
      [ErrorCode.SERVER_ERROR]: 'Server error occurred. Please try again later.',
      [ErrorCode.ROOM_NOT_FOUND]: 'Room not found. Please check the room code.',
      [ErrorCode.ROOM_FULL]: 'Room is full. Please try another room.',
      [ErrorCode.ROOM_CLOSED]: 'Room has been closed.',
      [ErrorCode.INVALID_ROOM_CODE]: 'Invalid room code. Please check and try again.',
      [ErrorCode.GAME_NOT_STARTED]: 'Game has not started yet.',
      [ErrorCode.GAME_ALREADY_STARTED]: 'Game has already started.',
      [ErrorCode.GAME_COMPLETED]: 'Game has been completed.',
      [ErrorCode.INVALID_GUESS]: 'Invalid guess. Please try again.',
      [ErrorCode.PLAYER_NOT_FOUND]: 'Player not found.',
      [ErrorCode.PLAYER_ALREADY_JOINED]: 'Player has already joined this room.',
      [ErrorCode.UNAUTHORIZED]: 'You are not authorized to perform this action.',
      [ErrorCode.INVALID_INPUT]: 'Invalid input provided.',
      [ErrorCode.MISSING_REQUIRED_FIELD]: 'Required field is missing.',
      [ErrorCode.DATABASE_ERROR]: 'Database error occurred.',
      [ErrorCode.STORAGE_ERROR]: 'Storage error occurred.',
      [ErrorCode.UNKNOWN_ERROR]: 'An unknown error occurred.',
    };

    return errorMessages[code] || 'An unexpected error occurred.';
  }

  public isRetryableError(code: ErrorCode): boolean {
    const retryableErrors = [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.CONNECTION_TIMEOUT,
      ErrorCode.SERVER_ERROR,
      ErrorCode.DATABASE_ERROR,
      ErrorCode.STORAGE_ERROR,
    ];

    return retryableErrors.includes(code);
  }
}

export const errorHandler = ErrorHandler.getInstance();
