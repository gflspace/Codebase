/**
 * Supabase Client Configuration
 *
 * PCE COMPLIANCE: This file establishes the connection to the Coordination Layer (Supabase)
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Run the schema from supabase/schema.sql in the SQL Editor
 * 3. Copy your project URL and anon key to .env:
 *    VITE_SUPABASE_URL=https://your-project.supabase.co
 *    VITE_SUPABASE_ANON_KEY=your-anon-key
 */

import { createClient } from '@supabase/supabase-js';

// Environment configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[VIOE] Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env'
  );
}

/**
 * Supabase client instance
 * Used for database operations and authentication
 */
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          'X-Client-Info': 'vioe-frontend',
        },
      },
    })
  : null;

/**
 * Check if Supabase is properly configured
 * @returns {boolean}
 */
export function isSupabaseConfigured() {
  return supabase !== null;
}

/**
 * Get the current session
 * @returns {Promise<Session|null>}
 */
export async function getSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Get the current user
 * @returns {Promise<User|null>}
 */
export async function getCurrentUser() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Set the current user context for RLS policies and audit logging
 * Call this after authentication to enable user-specific RLS
 * @param {string} userId - The user's ID
 */
export async function setUserContext(userId) {
  if (!supabase) return;
  await supabase.rpc('set_config', {
    setting: 'app.current_user',
    value: userId,
  }).catch(() => {
    // Ignore if function doesn't exist
  });
}

/**
 * Table name mappings (entity name to table name)
 * Matches the mockClient entity names to Supabase table names
 */
export const TABLE_NAMES = {
  Vulnerability: 'vulnerabilities',
  Team: 'teams',
  Asset: 'assets',
  RemediationTask: 'remediation_tasks',
  IncidentResponse: 'incident_responses',
  SuppressionRule: 'suppression_rules',
  ComplianceReport: 'compliance_reports',
  ThreatHuntingSession: 'threat_hunting_sessions',
  OwnershipLog: 'ownership_logs',
  VulnerabilitySnapshot: 'vulnerability_snapshots',
  CodebaseAnalysis: 'codebase_analyses',
  ThreatModel: 'threat_models',
  PredictiveAnalysis: 'predictive_analyses',
  ThreatAlert: 'threat_alerts',
  ComplianceEvidence: 'compliance_evidence',
  IncidentPlaybook: 'incident_playbooks',
};

/**
 * Field mappings for snake_case to camelCase conversion
 * Only maps fields that need conversion
 */
export const FIELD_MAPPINGS = {
  // Vulnerabilities
  assigned_team: 'assigned_team_id',
  first_detected: 'first_detected',
  resolved_date: 'resolved_date',
  ownership_confidence: 'ownership_confidence',
  needs_review: 'needs_review',
  sla_due_date: 'sla_due_date',
  sla_breached: 'sla_breached',
  cvss_score: 'cvss_score',
  epss_score: 'epss_score',
  cve_id: 'cve_id',
  affected_component: 'affected_component',
  fix_available: 'fix_available',
  fix_version: 'fix_version',

  // Common fields
  created_date: 'created_at',
  updated_date: 'updated_at',
};

/**
 * Convert entity data from frontend format to database format
 * @param {object} data - Frontend data object
 * @returns {object} Database-formatted object
 */
export function toDbFormat(data) {
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    // Convert camelCase to snake_case
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    // Apply specific mappings
    const dbKey = FIELD_MAPPINGS[key] || snakeKey;
    result[dbKey] = value;
  }
  return result;
}

/**
 * Convert database data to frontend format
 * @param {object} data - Database data object
 * @returns {object} Frontend-formatted object
 */
export function fromDbFormat(data) {
  if (!data) return data;

  const result = { ...data };

  // Ensure id is always present (Supabase uses 'id' by default)
  if (!result.id && result.uuid) {
    result.id = result.uuid;
  }

  // Map assigned_team_id to assigned_team for compatibility
  if (result.assigned_team_id !== undefined) {
    result.assigned_team = result.assigned_team_id;
  }

  return result;
}

export default supabase;
