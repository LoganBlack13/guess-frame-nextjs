import { useState, useCallback } from 'react';
import { errorHandler, ErrorCode, type AppError } from '@/lib/errors';

export function useErrorHandler() {
  const [errors, setErrors] = useState<AppError[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleError = useCallback((error: AppError | Error) => {
    let appError: AppError;
    
    if (error instanceof Error && 'code' in error) {
      appError = error as AppError;
    } else {
      appError = errorHandler.createError(
        ErrorCode.UNKNOWN_ERROR,
        error.message || 'An unknown error occurred'
      );
    }

    errorHandler.logError(appError);
    setErrors(prev => [...prev, appError]);
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const clearError = useCallback((errorToRemove: AppError) => {
    setErrors(prev => prev.filter(error => error !== errorToRemove));
  }, []);

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    options?: {
      onError?: (error: AppError) => void;
      onSuccess?: (result: T) => void;
      showLoading?: boolean;
    }
  ): Promise<T | null> => {
    if (options?.showLoading) {
      setIsLoading(true);
    }

    try {
      const result = await operation();
      options?.onSuccess?.(result);
      return result;
    } catch (error) {
      const appError = error instanceof Error && 'code' in error 
        ? error as AppError 
        : errorHandler.createError(
            ErrorCode.UNKNOWN_ERROR,
            error instanceof Error ? error.message : 'An unknown error occurred'
          );
      
      handleError(appError);
      options?.onError?.(appError);
      return null;
    } finally {
      if (options?.showLoading) {
        setIsLoading(false);
      }
    }
  }, [handleError]);

  return {
    errors,
    isLoading,
    handleError,
    clearErrors,
    clearError,
    executeWithErrorHandling,
  };
}
