/**
 * MiKO Security Utilities
 *
 * Provides security functions for:
 * - Secure session management with HMAC signatures
 * - CSRF token generation and validation
 * - Rate limiting for authentication
 * - Audit logging for PHI access
 */

import { supabase, isSupabaseConfigured } from './supabase';

// ===========================================
// SECURE RANDOM GENERATION
// ===========================================

/**
 * Generate cryptographically secure random bytes as hex string
 * @param {number} length - Number of bytes to generate
 * @returns {string} Hex string of random bytes
 */
export function generateSecureRandom(length = 32) {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, byte => byte.toString(16).padStart(2, '0')).join('');
}

// ===========================================
// HMAC SESSION SIGNATURE
// ===========================================

// Session signing key (generated once per browser session)
let sessionSigningKey = null;

/**
 * Get or generate the session signing key
 * This key is stored in memory only and regenerated on page reload
 * @returns {Promise<CryptoKey>}
 */
async function getSigningKey() {
  if (sessionSigningKey) {
    return sessionSigningKey;
  }

  // Generate a new signing key for this browser session
  sessionSigningKey = await crypto.subtle.generateKey(
    { name: 'HMAC', hash: 'SHA-256' },
    false, // not extractable
    ['sign', 'verify']
  );

  return sessionSigningKey;
}

/**
 * Create HMAC signature for data
 * @param {string} data - Data to sign
 * @returns {Promise<string>} Base64 encoded signature
 */
export async function createSignature(data) {
  const key = await getSigningKey();
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Verify HMAC signature
 * @param {string} data - Original data
 * @param {string} signature - Base64 encoded signature to verify
 * @returns {Promise<boolean>} Whether signature is valid
 */
export async function verifySignature(data, signature) {
  try {
    const key = await getSigningKey();
    const encoder = new TextEncoder();
    const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(data));
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

// ===========================================
// SECURE SESSION STORAGE
// ===========================================

/**
 * Store a value securely in sessionStorage with HMAC signature
 * @param {string} key - Storage key
 * @param {any} value - Value to store (will be JSON serialized)
 * @param {number} expiryMs - Expiry time in milliseconds (default 1 hour)
 */
export async function secureSessionStore(key, value, expiryMs = 60 * 60 * 1000) {
  const data = {
    value,
    expiry: Date.now() + expiryMs,
    nonce: generateSecureRandom(8),
  };

  const dataString = JSON.stringify(data);
  const signature = await createSignature(dataString);

  sessionStorage.setItem(`${key}_data`, dataString);
  sessionStorage.setItem(`${key}_sig`, signature);
}

/**
 * Retrieve and verify a value from secure sessionStorage
 * @param {string} key - Storage key
 * @returns {Promise<any|null>} The stored value, or null if invalid/expired
 */
export async function secureSessionRetrieve(key) {
  try {
    const dataString = sessionStorage.getItem(`${key}_data`);
    const signature = sessionStorage.getItem(`${key}_sig`);

    if (!dataString || !signature) {
      return null;
    }

    // Verify signature
    const isValid = await verifySignature(dataString, signature);
    if (!isValid) {
      console.warn(`Security: Invalid signature for session key: ${key}`);
      secureSessionRemove(key);
      return null;
    }

    const data = JSON.parse(dataString);

    // Check expiry
    if (Date.now() > data.expiry) {
      secureSessionRemove(key);
      return null;
    }

    return data.value;
  } catch (error) {
    console.error('Error retrieving secure session data:', error);
    return null;
  }
}

/**
 * Remove a value from secure sessionStorage
 * @param {string} key - Storage key
 */
export function secureSessionRemove(key) {
  sessionStorage.removeItem(`${key}_data`);
  sessionStorage.removeItem(`${key}_sig`);
}

// ===========================================
// CSRF PROTECTION
// ===========================================

const CSRF_TOKEN_KEY = 'miko_csrf_token';

/**
 * Generate and store a new CSRF token
 * @returns {Promise<string>} The CSRF token
 */
export async function generateCSRFToken() {
  const token = generateSecureRandom(32);
  await secureSessionStore(CSRF_TOKEN_KEY, token, 24 * 60 * 60 * 1000); // 24 hour expiry
  return token;
}

/**
 * Get the current CSRF token, generating one if needed
 * @returns {Promise<string>} The CSRF token
 */
export async function getCSRFToken() {
  let token = await secureSessionRetrieve(CSRF_TOKEN_KEY);
  if (!token) {
    token = await generateCSRFToken();
  }
  return token;
}

/**
 * Validate a CSRF token
 * @param {string} token - Token to validate
 * @returns {Promise<boolean>} Whether token is valid
 */
export async function validateCSRFToken(token) {
  const storedToken = await secureSessionRetrieve(CSRF_TOKEN_KEY);
  return storedToken && token === storedToken;
}

// ===========================================
// RATE LIMITING
// ===========================================

// In-memory rate limit store (resets on page reload, which is acceptable for client-side)
const rateLimitStore = new Map();

/**
 * Rate limit configuration
 */
const RATE_LIMIT_CONFIG = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    lockoutMs: 30 * 60 * 1000, // 30 minute lockout after max attempts
  },
  api: {
    maxAttempts: 100,
    windowMs: 60 * 1000, // 1 minute
    lockoutMs: 60 * 1000, // 1 minute lockout
  },
};

/**
 * Check if an action is rate limited
 * @param {string} action - Action type (e.g., 'login', 'api')
 * @param {string} identifier - Unique identifier (e.g., email, IP proxy)
 * @returns {Object} { allowed: boolean, remainingAttempts: number, lockoutUntil: number|null, message: string }
 */
export function checkRateLimit(action, identifier) {
  const config = RATE_LIMIT_CONFIG[action] || RATE_LIMIT_CONFIG.api;
  const key = `${action}:${identifier}`;
  const now = Date.now();

  let record = rateLimitStore.get(key);

  // Clean up expired records
  if (record && now > record.windowStart + config.windowMs) {
    record = null;
    rateLimitStore.delete(key);
  }

  // Check if currently locked out
  if (record && record.lockedUntil && now < record.lockedUntil) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    const remainingMinutes = Math.ceil(remainingSeconds / 60);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutUntil: record.lockedUntil,
      message: `Too many attempts. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`,
    };
  }

  // Initialize or get current record
  if (!record) {
    record = {
      attempts: 0,
      windowStart: now,
      lockedUntil: null,
    };
  }

  const remainingAttempts = config.maxAttempts - record.attempts;

  return {
    allowed: remainingAttempts > 0,
    remainingAttempts: Math.max(0, remainingAttempts),
    lockoutUntil: null,
    message: remainingAttempts <= 2 ? `${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining` : '',
  };
}

/**
 * Record an attempt for rate limiting
 * @param {string} action - Action type
 * @param {string} identifier - Unique identifier
 * @param {boolean} success - Whether the attempt was successful
 */
export function recordRateLimitAttempt(action, identifier, success = false) {
  const config = RATE_LIMIT_CONFIG[action] || RATE_LIMIT_CONFIG.api;
  const key = `${action}:${identifier}`;
  const now = Date.now();

  let record = rateLimitStore.get(key);

  // Reset on successful attempt
  if (success) {
    rateLimitStore.delete(key);
    return;
  }

  // Initialize or update record
  if (!record || now > record.windowStart + config.windowMs) {
    record = {
      attempts: 1,
      windowStart: now,
      lockedUntil: null,
    };
  } else {
    record.attempts++;

    // Apply lockout if max attempts reached
    if (record.attempts >= config.maxAttempts) {
      record.lockedUntil = now + config.lockoutMs;
    }
  }

  rateLimitStore.set(key, record);
}

/**
 * Clear rate limit for an identifier (e.g., after password reset)
 * @param {string} action - Action type
 * @param {string} identifier - Unique identifier
 */
export function clearRateLimit(action, identifier) {
  const key = `${action}:${identifier}`;
  rateLimitStore.delete(key);
}

// ===========================================
// AUDIT LOGGING
// ===========================================

/**
 * Log an audit event for PHI access
 * @param {Object} event - Audit event details
 * @param {string} event.action - Action performed (view, create, update, delete, export)
 * @param {string} event.resourceType - Type of resource (lead, appointment, report)
 * @param {string} event.resourceId - ID of the resource (optional)
 * @param {Object} event.details - Additional details (optional)
 * @returns {Promise<Object>} Result of the audit log operation
 */
export async function auditLog(event) {
  if (!isSupabaseConfigured()) {
    console.warn('Audit logging skipped: Supabase not configured');
    return { success: false, reason: 'supabase_not_configured' };
  }

  try {
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();

    const auditEntry = {
      user_id: session?.user?.id || null,
      user_email: session?.user?.email || 'anonymous',
      action: event.action,
      resource_type: event.resourceType,
      resource_id: event.resourceId || null,
      details: event.details || {},
      ip_address: null, // Would need server-side to get real IP
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      session_id: sessionStorage.getItem('miko_session_id') || null,
    };

    const { data, error } = await supabase
      .from('audit_logs')
      .insert([auditEntry]);

    if (error) {
      // Log to console as fallback, but don't throw
      console.error('Audit log error:', error);
      console.info('Audit event (fallback):', auditEntry);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Audit logging failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Audit log helper for viewing PHI
 */
export function auditView(resourceType, resourceId, details = {}) {
  return auditLog({ action: 'view', resourceType, resourceId, details });
}

/**
 * Audit log helper for creating PHI
 */
export function auditCreate(resourceType, resourceId, details = {}) {
  return auditLog({ action: 'create', resourceType, resourceId, details });
}

/**
 * Audit log helper for updating PHI
 */
export function auditUpdate(resourceType, resourceId, details = {}) {
  return auditLog({ action: 'update', resourceType, resourceId, details });
}

/**
 * Audit log helper for deleting PHI
 */
export function auditDelete(resourceType, resourceId, details = {}) {
  return auditLog({ action: 'delete', resourceType, resourceId, details });
}

/**
 * Audit log helper for exporting PHI
 */
export function auditExport(resourceType, details = {}) {
  return auditLog({ action: 'export', resourceType, resourceId: null, details });
}

// ===========================================
// INPUT SANITIZATION
// ===========================================

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - User input string
 * @returns {string} Sanitized string
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Whether email format is valid
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') {
    return false;
  }

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Sanitize and validate email
 * @param {string} email - Email to sanitize
 * @returns {string|null} Sanitized email or null if invalid
 */
export function sanitizeEmail(email) {
  if (typeof email !== 'string') {
    return null;
  }

  const cleaned = email.trim().toLowerCase();
  return isValidEmail(cleaned) ? cleaned : null;
}

export default {
  // Random generation
  generateSecureRandom,

  // Session signatures
  createSignature,
  verifySignature,

  // Secure storage
  secureSessionStore,
  secureSessionRetrieve,
  secureSessionRemove,

  // CSRF
  generateCSRFToken,
  getCSRFToken,
  validateCSRFToken,

  // Rate limiting
  checkRateLimit,
  recordRateLimitAttempt,
  clearRateLimit,

  // Audit logging
  auditLog,
  auditView,
  auditCreate,
  auditUpdate,
  auditDelete,
  auditExport,

  // Input sanitization
  sanitizeInput,
  isValidEmail,
  sanitizeEmail,
};
