/**
 * Toast Notification Utilities
 * Centralized toast functions for consistent user feedback
 */

import { toast } from 'sonner';

/**
 * Show a success toast
 */
export const showSuccess = (message, options = {}) => {
  toast.success(message, {
    duration: 4000,
    ...options
  });
};

/**
 * Show an error toast
 */
export const showError = (message, options = {}) => {
  toast.error(message || 'An error occurred', {
    duration: 6000,
    ...options
  });
};

/**
 * Show a warning toast
 */
export const showWarning = (message, options = {}) => {
  toast.warning(message, {
    duration: 5000,
    ...options
  });
};

/**
 * Show an info toast
 */
export const showInfo = (message, options = {}) => {
  toast.info(message, {
    duration: 4000,
    ...options
  });
};

/**
 * Show a loading toast that can be updated
 * Returns a function to dismiss the toast
 */
export const showLoading = (message, options = {}) => {
  return toast.loading(message, options);
};

/**
 * Update an existing toast (typically a loading toast)
 */
export const updateToast = (toastId, options) => {
  toast.dismiss(toastId);
  if (options.type === 'success') {
    toast.success(options.message, { duration: 4000 });
  } else if (options.type === 'error') {
    toast.error(options.message, { duration: 6000 });
  }
};

/**
 * Dismiss a specific toast or all toasts
 */
export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};

/**
 * Handle API errors with appropriate toast messages
 */
export const handleApiError = (error, customMessage) => {
  console.error('[API Error]', error);

  let message = customMessage || 'An error occurred';

  if (error?.response?.status) {
    switch (error.response.status) {
      case 400:
        message = error.response.data?.message || 'Invalid request. Please check your input.';
        break;
      case 401:
        message = 'Your session has expired. Please log in again.';
        break;
      case 403:
        message = 'You do not have permission to perform this action.';
        break;
      case 404:
        message = 'The requested resource was not found.';
        break;
      case 429:
        message = 'Too many requests. Please try again later.';
        break;
      case 500:
        message = 'Server error. Please try again later.';
        break;
      default:
        message = error.response.data?.message || 'An unexpected error occurred.';
    }
  } else if (error?.message) {
    if (error.message.includes('Network Error') || error.message.includes('fetch')) {
      message = 'Network error. Please check your connection.';
    } else {
      message = error.message;
    }
  }

  showError(message);
  return message;
};

/**
 * Promise-based toast for async operations
 */
export const toastPromise = (promise, messages) => {
  return toast.promise(promise, {
    loading: messages.loading || 'Loading...',
    success: messages.success || 'Success!',
    error: messages.error || 'Something went wrong',
  });
};

export default {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  loading: showLoading,
  update: updateToast,
  dismiss: dismissToast,
  handleApiError,
  promise: toastPromise,
};
