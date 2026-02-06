import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Validate Base44 App ID is configured via environment variable
const BASE44_APP_ID = import.meta.env.VITE_BASE44_APP_ID;

if (!BASE44_APP_ID) {
  console.error(
    'SECURITY: VITE_BASE44_APP_ID environment variable is not set. ' +
    'Base44 client will not function correctly.'
  );
}

// Create a client with authentication required
export const base44 = createClient({
  appId: BASE44_APP_ID || '',
  requiresAuth: true // Ensure authentication is required for all operations
});

// Export a function to check if Base44 is properly configured
export function isBase44Configured() {
  return Boolean(BASE44_APP_ID);
}
