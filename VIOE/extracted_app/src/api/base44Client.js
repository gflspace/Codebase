/**
 * Base44 Client Configuration
 *
 * PCE COMPLIANCE: This file determines which backend adapter to use
 *
 * SUPPORTED MODES:
 * - 'mock': Uses in-memory mock data (default, no setup required)
 * - 'supabase': Uses Supabase as the backend coordination layer
 *
 * CONFIGURATION:
 * Set VITE_API_MODE in .env to switch modes:
 *   VITE_API_MODE=mock      # Use mock data (default)
 *   VITE_API_MODE=supabase  # Use Supabase backend
 */

import { mockBase44 } from './mockClient';
import { supabaseAdapter } from './supabaseAdapter';
import { isSupabaseConfigured } from './supabaseClient';

// Check environment mode
const API_MODE = import.meta.env.VITE_API_MODE || 'mock';

/**
 * Determine which adapter to use based on configuration
 */
function getAdapter() {
  switch (API_MODE) {
    case 'supabase':
      if (!isSupabaseConfigured()) {
        console.warn(
          '[VIOE] Supabase mode requested but not configured. ' +
          'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env. ' +
          'Falling back to mock mode.'
        );
        return mockBase44;
      }
      return supabaseAdapter;

    case 'mock':
    default:
      return mockBase44;
  }
}

// Get the appropriate adapter
export const base44 = getAdapter();

// Log current mode
if (typeof window !== 'undefined') {
  const mode = API_MODE === 'supabase' && isSupabaseConfigured() ? 'SUPABASE' : 'DEMO';
  console.info(`[VIOE] Running in ${mode} mode`);

  // Add mode indicator to window for debugging
  window.__VIOE_MODE__ = mode;
}

/**
 * Export mode information for components that need to know
 */
export const apiMode = {
  current: API_MODE,
  isMock: API_MODE === 'mock' || !isSupabaseConfigured(),
  isSupabase: API_MODE === 'supabase' && isSupabaseConfigured(),
};

/**
 * Re-export individual adapters for direct access if needed
 */
export { mockBase44 } from './mockClient';
export { supabaseAdapter } from './supabaseAdapter';
export { supabase, isSupabaseConfigured } from './supabaseClient';
