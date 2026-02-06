/**
 * useApiMutation Hook
 * Custom hook for API mutations with built-in error handling and toast notifications
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showSuccess, showError, showLoading } from '@/lib/toast';
import { getErrorMessage } from '@/api/apiUtils';

/**
 * Enhanced useMutation hook with toast notifications
 *
 * @param {Function} mutationFn - The mutation function
 * @param {Object} options - Configuration options
 * @returns {Object} - Mutation object with additional helpers
 */
export function useApiMutation(mutationFn, options = {}) {
  const queryClient = useQueryClient();

  const {
    // Toast messages
    loadingMessage,
    successMessage,
    errorMessage = 'An error occurred',

    // Query invalidation
    invalidateQueries = [],

    // Callbacks
    onSuccess: customOnSuccess,
    onError: customOnError,
    onSettled: customOnSettled,

    // Other options
    ...mutationOptions
  } = options;

  const mutation = useMutation({
    mutationFn,

    onMutate: async (variables) => {
      // Show loading toast if message provided
      if (loadingMessage) {
        mutation._loadingToastId = showLoading(loadingMessage);
      }

      // Call custom onMutate if provided
      if (mutationOptions.onMutate) {
        return await mutationOptions.onMutate(variables);
      }
    },

    onSuccess: (data, variables, context) => {
      // Dismiss loading toast
      if (mutation._loadingToastId) {
        // Toast will be replaced by success toast
      }

      // Show success toast if message provided
      if (successMessage) {
        const message = typeof successMessage === 'function'
          ? successMessage(data)
          : successMessage;
        showSuccess(message);
      }

      // Invalidate queries
      if (invalidateQueries.length > 0) {
        invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] });
        });
      }

      // Call custom onSuccess
      customOnSuccess?.(data, variables, context);
    },

    onError: (error, variables, context) => {
      // Dismiss loading toast
      if (mutation._loadingToastId) {
        // Toast will be replaced by error toast
      }

      // Show error toast
      const message = getErrorMessage(error, errorMessage);
      showError(message);

      // Log error for debugging
      console.error('[Mutation Error]', error);

      // Call custom onError
      customOnError?.(error, variables, context);
    },

    onSettled: (data, error, variables, context) => {
      // Clear loading toast reference
      mutation._loadingToastId = null;

      // Call custom onSettled
      customOnSettled?.(data, error, variables, context);
    },

    ...mutationOptions,
  });

  // Add helper method for executing with loading state
  mutation.executeWithToast = async (variables, toastMessages = {}) => {
    const { loading, success, error } = toastMessages;

    if (loading) {
      const toastId = showLoading(loading);
      try {
        const result = await mutation.mutateAsync(variables);
        if (success) {
          showSuccess(success);
        }
        return result;
      } catch (err) {
        showError(error || getErrorMessage(err));
        throw err;
      }
    } else {
      return mutation.mutateAsync(variables);
    }
  };

  return mutation;
}

/**
 * Hook for creating an entity
 */
export function useCreateEntity(entityClient, options = {}) {
  return useApiMutation(
    (data) => entityClient.create(data),
    {
      successMessage: options.successMessage || 'Created successfully',
      errorMessage: options.errorMessage || 'Failed to create',
      invalidateQueries: options.invalidateQueries || [],
      ...options,
    }
  );
}

/**
 * Hook for updating an entity
 */
export function useUpdateEntity(entityClient, options = {}) {
  return useApiMutation(
    ({ id, data }) => entityClient.update(id, data),
    {
      successMessage: options.successMessage || 'Updated successfully',
      errorMessage: options.errorMessage || 'Failed to update',
      invalidateQueries: options.invalidateQueries || [],
      ...options,
    }
  );
}

/**
 * Hook for deleting an entity
 */
export function useDeleteEntity(entityClient, options = {}) {
  return useApiMutation(
    (id) => entityClient.delete(id),
    {
      successMessage: options.successMessage || 'Deleted successfully',
      errorMessage: options.errorMessage || 'Failed to delete',
      invalidateQueries: options.invalidateQueries || [],
      ...options,
    }
  );
}

/**
 * Hook for invoking a server function
 */
export function useServerFunction(functionName, options = {}) {
  const { base44 } = require('@/api/base44Client');

  return useApiMutation(
    (params) => base44.functions.invoke(functionName, params),
    {
      errorMessage: options.errorMessage || `Failed to execute ${functionName}`,
      ...options,
    }
  );
}

export default useApiMutation;
