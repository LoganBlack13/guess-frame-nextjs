'use client';

import { useEffect } from 'react';
import { ErrorCode, type AppError } from '@/lib/errors';

interface ErrorDisplayProps {
  errors: AppError[];
  onClearError: (error: AppError) => void;
  onClearAll: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export default function ErrorDisplay({
  errors,
  onClearError,
  onClearAll,
  autoHide = true,
  autoHideDelay = 5000,
}: ErrorDisplayProps) {
  useEffect(() => {
    if (autoHide && errors.length > 0) {
      const timer = setTimeout(() => {
        onClearAll();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [errors.length, autoHide, autoHideDelay, onClearAll]);

  if (errors.length === 0) {
    return null;
  }

  const getErrorSeverity = (code: ErrorCode): 'error' | 'warning' | 'info' => {
    const errorSeverities: Record<ErrorCode, 'error' | 'warning' | 'info'> = {
      [ErrorCode.NETWORK_ERROR]: 'warning',
      [ErrorCode.CONNECTION_TIMEOUT]: 'warning',
      [ErrorCode.SERVER_ERROR]: 'error',
      [ErrorCode.ROOM_NOT_FOUND]: 'error',
      [ErrorCode.ROOM_FULL]: 'warning',
      [ErrorCode.ROOM_CLOSED]: 'info',
      [ErrorCode.INVALID_ROOM_CODE]: 'error',
      [ErrorCode.GAME_NOT_STARTED]: 'info',
      [ErrorCode.GAME_ALREADY_STARTED]: 'warning',
      [ErrorCode.GAME_COMPLETED]: 'info',
      [ErrorCode.INVALID_GUESS]: 'warning',
      [ErrorCode.PLAYER_NOT_FOUND]: 'error',
      [ErrorCode.PLAYER_ALREADY_JOINED]: 'warning',
      [ErrorCode.UNAUTHORIZED]: 'error',
      [ErrorCode.INVALID_INPUT]: 'warning',
      [ErrorCode.MISSING_REQUIRED_FIELD]: 'warning',
      [ErrorCode.DATABASE_ERROR]: 'error',
      [ErrorCode.STORAGE_ERROR]: 'error',
      [ErrorCode.UNKNOWN_ERROR]: 'error',
    };

    return errorSeverities[code] || 'error';
  };

  const getAlertClass = (severity: 'error' | 'warning' | 'info'): string => {
    switch (severity) {
      case 'error':
        return 'alert-error';
      case 'warning':
        return 'alert-warning';
      case 'info':
        return 'alert-info';
      default:
        return 'alert-error';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {errors.map((error, index) => {
        const severity = getErrorSeverity(error.code);
        const alertClass = getAlertClass(severity);
        
        return (
          <div
            key={`${error.code}-${error.timestamp.getTime()}-${index}`}
            className={`alert ${alertClass} shadow-lg`}
          >
            <div className="flex-1">
              <div className="font-semibold">{error.message}</div>
              {error.details && Object.keys(error.details).length > 0 && (
                <div className="text-sm opacity-75 mt-1">
                  {JSON.stringify(error.details, null, 2)}
                </div>
              )}
            </div>
            <button
              onClick={() => onClearError(error)}
              className="btn btn-sm btn-ghost"
              aria-label="Close error"
            >
              ✕
            </button>
          </div>
        );
      })}
      
      {errors.length > 1 && (
        <div className="flex justify-end">
          <button
            onClick={onClearAll}
            className="btn btn-sm btn-ghost"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}
