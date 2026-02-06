/**
 * MiKO Supabase Client Configuration
 *
 * This module initializes and exports the Supabase client for use throughout the application.
 * It also provides real-time subscription helpers for the admin dashboard.
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

// Create Supabase client
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Check if Supabase is properly configured
 */
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

/**
 * Subscribe to real-time changes on the leads table
 * @param {Function} callback - Function to call when data changes
 * @returns {Object} Subscription object with unsubscribe method
 */
export const subscribeToLeads = (callback) => {
  return supabase
    .channel('leads-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'leads' },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
};

/**
 * Subscribe to real-time changes on the appointments table
 * @param {Function} callback - Function to call when data changes
 * @returns {Object} Subscription object with unsubscribe method
 */
export const subscribeToAppointments = (callback) => {
  return supabase
    .channel('appointments-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'appointments' },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
};

/**
 * Subscribe to real-time changes on the ai_qual_logs table
 * @param {Function} callback - Function to call when data changes
 * @returns {Object} Subscription object with unsubscribe method
 */
export const subscribeToAILogs = (callback) => {
  return supabase
    .channel('ai-logs-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'ai_qual_logs' },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
};

/**
 * Subscribe to leads requiring clinical review
 * @param {Function} callback - Function to call when data changes
 * @returns {Object} Subscription object with unsubscribe method
 */
export const subscribeToEscalations = (callback) => {
  return supabase
    .channel('escalations-realtime')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'leads',
        filter: 'requires_clinical_review=eq.true',
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();
};

export default supabase;
