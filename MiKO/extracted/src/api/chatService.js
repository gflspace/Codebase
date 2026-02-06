/**
 * MiKO Chat Service
 *
 * Integrates chat functionality with Supabase for lead tracking and session management
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { createLead, createClinicalInterest } from './leadService';
import { getBestTrackingData, persistUTMParams } from '@/lib/utmTracking';

/**
 * Generate a cryptographically secure session ID
 * Uses crypto.getRandomValues() for secure random generation
 * @returns {string} Secure session ID
 */
const generateSessionId = () => {
  // Use crypto.getRandomValues for cryptographically secure random bytes
  const buffer = new Uint8Array(16);
  crypto.getRandomValues(buffer);

  // Convert to hex string
  const randomHex = Array.from(buffer, byte => byte.toString(16).padStart(2, '0')).join('');

  // Include timestamp for uniqueness and debugging, but security comes from random bytes
  return `session_${Date.now()}_${randomHex}`;
};

// Store session ID in memory (persists during page session)
let currentSessionId = null;
let currentLeadId = null;

/**
 * Get or create a chat session
 * @returns {string} Session ID
 */
export function getSessionId() {
  if (!currentSessionId) {
    // Check sessionStorage first
    currentSessionId = sessionStorage.getItem('miko_session_id');
    if (!currentSessionId) {
      currentSessionId = generateSessionId();
      sessionStorage.setItem('miko_session_id', currentSessionId);
      // Persist UTM params when new session starts
      persistUTMParams();
    }
  }
  return currentSessionId;
}

/**
 * Get current lead ID if exists
 * @returns {string|null} Lead ID
 */
export function getCurrentLeadId() {
  if (!currentLeadId) {
    currentLeadId = sessionStorage.getItem('miko_lead_id');
  }
  return currentLeadId;
}

/**
 * Set the current lead ID
 * @param {string} leadId - Lead ID
 */
export function setCurrentLeadId(leadId) {
  currentLeadId = leadId;
  sessionStorage.setItem('miko_lead_id', leadId);
}

/**
 * Create or update chat session in Supabase
 * @param {Object} sessionData - Session data
 * @returns {Promise<Object>} Created/updated session
 */
export async function upsertChatSession(sessionData = {}) {
  if (!isSupabaseConfigured()) {
    return { success: true, sessionId: getSessionId() };
  }

  try {
    const sessionId = getSessionId();

    const { data, error } = await supabase
      .from('chat_sessions')
      .upsert(
        {
          session_id: sessionId,
          lead_id: getCurrentLeadId(),
          is_active: true,
          source_page: sessionData.sourcePage || window.location.pathname,
          user_agent: navigator.userAgent,
          context_data: sessionData.context || {},
          collected_data: sessionData.collectedData || {},
        },
        {
          onConflict: 'session_id',
        }
      )
      .select()
      .single();

    if (error && error.code !== '23505') {
      // Ignore duplicate key errors
      console.error('Error upserting chat session:', error);
    }

    return { success: true, data, sessionId };
  } catch (error) {
    console.error('Error in upsertChatSession:', error);
    return { success: true, sessionId: getSessionId() }; // Still return session ID
  }
}

/**
 * Log AI qualification interaction to Supabase
 * @param {Object} logData - Log data
 * @returns {Promise<Object>} Created log entry
 */
export async function logAIInteraction(logData) {
  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const leadId = getCurrentLeadId();

    if (!leadId) {
      // No lead associated yet, skip logging
      return { success: true, skipped: true };
    }

    const { data, error } = await supabase.from('ai_qual_logs').insert([
      {
        lead_id: leadId,
        session_id: getSessionId(),
        input_message: logData.userMessage,
        input_channel: 'web_chat',
        intent_detected: logData.intent || 'unknown',
        intent_confidence: logData.intentConfidence || 0.5,
        risk_keywords_detected: logData.riskKeywords || [],
        risk_score: logData.riskScore || 0,
        escalated: logData.escalated || false,
        escalation_reason: logData.escalationReason,
        ai_response: logData.aiResponse,
        ai_action: logData.action || 'responded',
        suggested_actions: logData.suggestedActions || [],
        model_used: logData.model || 'gpt-4',
        response_time_ms: logData.responseTimeMs,
        procedure_identified: logData.procedureIdentified,
        next_step: logData.nextStep,
      },
    ]);

    if (error) {
      console.error('Error logging AI interaction:', error);
    }

    return { success: !error, data };
  } catch (error) {
    console.error('Error in logAIInteraction:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create a lead from chat interaction
 * @param {Object} patientData - Patient data collected from chat
 * @returns {Promise<Object>} Created lead
 */
export async function createLeadFromChat(patientData) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Check if we already have a lead for this session
    if (getCurrentLeadId()) {
      return { success: true, leadId: getCurrentLeadId(), existing: true };
    }

    // Get tracking data from UTM params and referrer
    const trackingData = getBestTrackingData();

    // Create the lead with detected source
    const result = await createLead({
      name: patientData.name || patientData.full_name,
      email: patientData.email,
      phone: patientData.phone,
      source: trackingData.source,
      utm_source: trackingData.utm_source,
      utm_medium: trackingData.utm_medium,
      utm_campaign: trackingData.utm_campaign,
      referrer_url: trackingData.referrer_url,
      landing_page: trackingData.landing_page,
      notes: `Created from web chat session: ${getSessionId()}`,
      metadata: {
        chat_session_id: getSessionId(),
        source_page: window.location.pathname,
        ...trackingData.metadata,
      },
    });

    if (result.success && result.data) {
      setCurrentLeadId(result.data.id);

      // Update the chat session with the lead ID
      await upsertChatSession({ collectedData: patientData });

      // Create clinical interest if procedure was mentioned
      if (patientData.procedure) {
        await createClinicalInterest(result.data.id, patientData.procedure);
      }

      return { success: true, leadId: result.data.id, data: result.data };
    }

    return result;
  } catch (error) {
    console.error('Error creating lead from chat:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Extract patient data from conversation
 * @param {Array} messages - Conversation messages
 * @returns {Object} Extracted patient data
 */
export function extractPatientDataFromConversation(messages) {
  const patientData = {
    name: null,
    email: null,
    phone: null,
    procedure: null,
  };

  const userMessages = messages.filter((m) => m.role === 'user').map((m) => m.content);
  const allText = userMessages.join(' ');

  // Extract email
  const emailMatch = allText.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) {
    patientData.email = emailMatch[0];
  }

  // Extract phone number
  const phoneMatch = allText.match(
    /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+1\d{10}|\d{10}/
  );
  if (phoneMatch) {
    patientData.phone = phoneMatch[0];
  }

  // Extract name (look for "my name is" or "I'm" patterns)
  const namePatterns = [
    /my name is\s+(\w+(?:\s+\w+)?)/i,
    /i'?m\s+(\w+(?:\s+\w+)?),?\s/i,
    /this is\s+(\w+(?:\s+\w+)?)/i,
    /call me\s+(\w+)/i,
  ];

  for (const pattern of namePatterns) {
    const match = allText.match(pattern);
    if (match) {
      patientData.name = match[1];
      break;
    }
  }

  // Detect procedure interest
  const procedures = [
    { keywords: ['rhinoplasty', 'nose job', 'nose surgery'], procedure: 'Rhinoplasty' },
    { keywords: ['facelift', 'face lift'], procedure: 'Facelift' },
    {
      keywords: ['breast augmentation', 'breast implant', 'boob job'],
      procedure: 'Breast Augmentation',
    },
    { keywords: ['breast lift', 'mastopexy'], procedure: 'Breast Lift' },
    { keywords: ['tummy tuck', 'abdominoplasty'], procedure: 'Tummy Tuck' },
    { keywords: ['liposuction', 'lipo'], procedure: 'Liposuction' },
    { keywords: ['bbl', 'brazilian butt lift', 'butt lift'], procedure: 'Brazilian Butt Lift' },
    { keywords: ['mommy makeover'], procedure: 'Mommy Makeover' },
    { keywords: ['blepharoplasty', 'eyelid surgery', 'eye lift'], procedure: 'Blepharoplasty' },
    { keywords: ['botox'], procedure: 'Botox' },
    { keywords: ['filler', 'dermal filler'], procedure: 'Dermal Fillers' },
  ];

  const lowerText = allText.toLowerCase();
  for (const { keywords, procedure } of procedures) {
    if (keywords.some((kw) => lowerText.includes(kw))) {
      patientData.procedure = procedure;
      break;
    }
  }

  return patientData;
}

/**
 * Detect risk keywords in message
 * @param {string} message - User message
 * @returns {Object} Risk detection results
 */
export function detectRiskKeywords(message) {
  const riskKeywords = [
    'revision',
    'complication',
    'infection',
    'necrosis',
    'cleft lip',
    'whistle deformity',
    'explant',
    'capsular',
    'hematoma',
    'seroma',
    'asymmetry',
    'emergency',
    'urgent',
    'bleeding',
    'pain',
    'swelling',
    'fever',
    'discharge',
    'redo',
    'failed',
    'botched',
    'unhappy with results',
  ];

  const lowerMessage = message.toLowerCase();
  const detectedKeywords = riskKeywords.filter((kw) => lowerMessage.includes(kw));

  return {
    hasRisk: detectedKeywords.length > 0,
    keywords: detectedKeywords,
    score: Math.min(detectedKeywords.length * 25, 100), // 25 points per keyword, max 100
    shouldEscalate: detectedKeywords.length >= 2 ||
      detectedKeywords.some(kw => ['emergency', 'urgent', 'bleeding', 'infection'].includes(kw)),
  };
}

/**
 * End the current chat session
 * @param {string} summary - Conversation summary
 */
export async function endChatSession(summary = '') {
  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const sessionId = getSessionId();

    const { error } = await supabase
      .from('chat_sessions')
      .update({
        is_active: false,
        ended_at: new Date().toISOString(),
        conversation_summary: summary,
      })
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error ending chat session:', error);
    }

    // Clear session storage
    sessionStorage.removeItem('miko_session_id');
    currentSessionId = null;

    return { success: !error };
  } catch (error) {
    console.error('Error in endChatSession:', error);
    return { success: false, error: error.message };
  }
}

export default {
  getSessionId,
  getCurrentLeadId,
  setCurrentLeadId,
  upsertChatSession,
  logAIInteraction,
  createLeadFromChat,
  extractPatientDataFromConversation,
  detectRiskKeywords,
  endChatSession,
};
