/**
 * API Utilities
 * Centralized error handling, request wrapping, and API helpers
 */

import { showError, showSuccess, toastPromise } from '@/lib/toast';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Wrap an API call with error handling
 * @param {Function} apiCall - The async API function to call
 * @param {Object} options - Configuration options
 * @returns {Promise} - Resolves with data or rejects with handled error
 */
export async function withErrorHandling(apiCall, options = {}) {
  const {
    showErrorToast = true,
    errorMessage = 'An error occurred',
    rethrow = false,
  } = options;

  try {
    const result = await apiCall();
    return result;
  } catch (error) {
    console.error('[API Error]', error);

    const message = getErrorMessage(error, errorMessage);

    if (showErrorToast) {
      showError(message);
    }

    if (rethrow) {
      throw error;
    }

    return null;
  }
}

/**
 * Wrap an async mutation with loading toast
 * @param {Function} mutationFn - The async mutation function
 * @param {Object} messages - Toast messages for different states
 */
export async function withLoadingToast(mutationFn, messages = {}) {
  const {
    loading = 'Processing...',
    success = 'Success!',
    error = 'An error occurred',
  } = messages;

  return toastPromise(mutationFn(), { loading, success, error });
}

/**
 * Extract error message from various error formats
 */
export function getErrorMessage(error, fallback = 'An error occurred') {
  if (!error) return fallback;

  // API response error
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  // API response detail
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }

  // Direct message
  if (error.message) {
    // Network errors
    if (error.message.includes('Network Error')) {
      return 'Network error. Please check your connection.';
    }
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }
    return error.message;
  }

  // String error
  if (typeof error === 'string') {
    return error;
  }

  return fallback;
}

/**
 * Create a mutation handler with toast feedback
 */
export function createMutationHandler(options = {}) {
  const {
    onSuccess,
    onError,
    successMessage,
    errorMessage,
    invalidateQueries,
    queryClient,
  } = options;

  return {
    onSuccess: (data) => {
      if (successMessage) {
        showSuccess(successMessage);
      }
      if (invalidateQueries && queryClient) {
        invalidateQueries.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
      onSuccess?.(data);
    },
    onError: (error) => {
      const message = getErrorMessage(error, errorMessage);
      showError(message);
      onError?.(error);
    },
  };
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    shouldRetry = (error) => error?.status >= 500 || error?.message?.includes('Network'),
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Debounce an API call
 */
export function debounceApi(fn, delay = 300) {
  let timeoutId;

  return (...args) => {
    clearTimeout(timeoutId);
    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
}

export default {
  ApiError,
  withErrorHandling,
  withLoadingToast,
  getErrorMessage,
  createMutationHandler,
  withRetry,
  debounceApi,
};
