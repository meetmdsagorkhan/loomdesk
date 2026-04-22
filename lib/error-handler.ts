import { showToast } from '@/components/shared/Toast';
import { logger } from '@/lib/logger';

export type ApiError = {
  message?: string;
  error?: string;
  status?: number;
};

export function handleApiError(error: unknown, context: string, showToastError: boolean = true) {
  logger.error(context, {
    error: error instanceof Error ? error.message : String(error),
  });

  let errorMessage = 'An unexpected error occurred';

  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error !== null) {
    const apiError = error as ApiError;
    errorMessage = apiError.message || apiError.error || errorMessage;
  }

  if (showToastError) {
    showToast(errorMessage, 'error');
  }

  return errorMessage;
}

export function createErrorHandler(context: string, showToastError: boolean = true) {
  return (error: unknown) => handleApiError(error, context, showToastError);
}
