/**
 * MiKO AI API Service
 * Connects to n8n webhook workflow for AI Lead Qualification & Scheduling
 *
 * NOTE: For enhanced chatbot functionality with LLM fallback,
 * use the llmService.js which provides:
 * - n8n primary integration
 * - Base44 LLM fallback
 * - Better prompt engineering
 * - Conversation context management
 */

import config from '@/config';

// Use environment variables via config (falls back to empty string if not set)
const N8N_WEBHOOK_URL = config.n8n.webhookUrl;
const N8N_INSTANCE_ID = config.n8n.instanceId;

// Session management
let sessionId = null;

const generateSessionId = () => {
  return `miko_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const getSessionId = () => {
  if (!sessionId) {
    sessionId = localStorage.getItem('miko_session_id');
    if (!sessionId) {
      sessionId = generateSessionId();
      localStorage.setItem('miko_session_id', sessionId);
    }
  }
  return sessionId;
};

// Normalize phone number to E.164 format (internal helper)
const normalizePhoneNumber = (phone) => {
  if (!phone) return null;

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If it's a 10-digit US number, add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If it starts with 1 and is 11 digits, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // If it already has country code, just add +
  if (digits.length > 10) {
    return `+${digits}`;
  }

  // Return as-is if we can't normalize
  return phone;
};

// Get current time in ISO format
const getCurrentTime = () => {
  return new Date().toISOString();
};

// Get timezone
const getTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles';
};

/**
 * Send a chat message to the MiKO AI
 * @param {string} message - User's message
 * @param {Object} context - Additional context data
 * @returns {Promise<Object>} - AI response
 */
export const sendChatMessage = async (message, context = {}) => {
  try {
    const currentSessionId = getSessionId();

    // n8n Chat format payload
    const payload = {
      action: 'sendMessage',
      sessionId: currentSessionId,
      chatInput: message,
      // Additional context for the AI agent
      channel: context.channel || 'web_chat',
      timezone: context.timezone || getTimezone(),
      stage: context.stage || 'new_inquiry',
      intent: context.intent || 'general_question',
      timestamp: getCurrentTime(),
      // Patient data if collected
      ...(context.patientData && {
        patient_name: context.patientData.name,
        patient_email: context.patientData.email,
        patient_phone: normalizePhoneNumber(context.patientData.phone),
        procedure: context.patientData.procedure,
        timeline: context.patientData.timeline,
        consult_type: context.patientData.consultType,
        case_type: context.patientData.caseType,
        patient_location: context.patientData.location,
      }),
    };

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Instance-Id': N8N_INSTANCE_ID,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Handle n8n async response - if we get executionStarted, workflow is processing async
    if (data.executionStarted) {
      // Workflow started but response is async - throw to trigger fallback
      throw new Error('ASYNC_EXECUTION');
    }

    // Parse the response - n8n chat returns output in various formats
    let responseMessage = 'Thank you for your message. How may I assist you further?';

    if (data.output) {
      responseMessage = data.output;
    } else if (data.message) {
      responseMessage = data.message;
    } else if (data.response) {
      responseMessage = data.response;
    } else if (data.text) {
      responseMessage = data.text;
    } else if (Array.isArray(data) && data.length > 0) {
      // Sometimes n8n returns array of messages
      const lastMessage = data[data.length - 1];
      responseMessage = lastMessage.output || lastMessage.message || lastMessage.text || responseMessage;
    }

    return {
      success: true,
      message: responseMessage,
      intent: data.intent,
      handoffRequired: data.handoff_required || false,
      schedulingAction: data.scheduling_action,
      patientDataNeeded: data.patient_data_needed,
      suggestedActions: data.suggested_actions || [],
    };
  } catch (error) {
    console.error('MiKO AI Chat Error:', error);
    // Throw error to trigger fallback responses in ChatView
    throw error;
  }
};

/**
 * Check calendar availability
 * @param {Object} params - Availability check parameters
 * @returns {Promise<Object>} - Available slots
 */
export const checkAvailability = async (params = {}) => {
  try {
    const payload = {
      action: 'schedule_calendar_event',
      scheduling_action: 'check_availability',
      sessionId: getSessionId(),
      timezone: params.timezone || getTimezone(),
      timestamp: getCurrentTime(),
      availability_time: params.date || getCurrentTime(),
      consult_type: params.consultType || 'virtual',
      // Date range if specified
      ...(params.startDate && { start_date: params.startDate }),
      ...(params.endDate && { end_date: params.endDate }),
    };

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      availableSlots: data.available_slots || data.slots || [],
      message: data.message,
    };
  } catch (error) {
    console.error('MiKO Availability Check Error:', error);
    return {
      success: false,
      availableSlots: [],
      error: error.message,
    };
  }
};

/**
 * Book an appointment
 * @param {Object} appointmentData - Appointment details
 * @returns {Promise<Object>} - Booking confirmation
 */
export const bookAppointment = async (appointmentData) => {
  try {
    const payload = {
      action: 'schedule_calendar_event',
      scheduling_action: 'book',
      sessionId: getSessionId(),
      timezone: appointmentData.timezone || getTimezone(),
      timestamp: getCurrentTime(),
      // Patient details
      full_name: appointmentData.name,
      email: appointmentData.email,
      phone: normalizePhoneNumber(appointmentData.phone),
      // Appointment details
      booking_time: appointmentData.dateTime,
      consult_type: appointmentData.consultType || 'virtual',
      procedure: appointmentData.procedure || 'general_consultation',
      notes: appointmentData.notes || '',
    };

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      confirmed: data.confirmed || data.success || true,
      appointmentId: data.appointment_id || data.event_id,
      message: data.message || `Your consultation has been successfully booked for ${appointmentData.dateTime}.`,
      details: data.details,
    };
  } catch (error) {
    console.error('MiKO Booking Error:', error);
    return {
      success: false,
      confirmed: false,
      message: "I apologize, but I couldn't complete the booking. Please call us at (310) 275-2705 to schedule your appointment.",
      error: error.message,
    };
  }
};

/**
 * Reschedule an appointment
 * @param {Object} rescheduleData - Reschedule details
 * @returns {Promise<Object>} - Reschedule confirmation
 */
export const rescheduleAppointment = async (rescheduleData) => {
  try {
    const payload = {
      action: 'schedule_calendar_event',
      scheduling_action: 'reschedule',
      sessionId: getSessionId(),
      timezone: rescheduleData.timezone || getTimezone(),
      timestamp: getCurrentTime(),
      // Identify existing appointment
      email: rescheduleData.email,
      booking_time: rescheduleData.currentDateTime,
      // New time
      reschedule_time: rescheduleData.newDateTime,
    };

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      confirmed: data.confirmed || data.success || true,
      message: data.message || `Your appointment has been rescheduled to ${rescheduleData.newDateTime}.`,
    };
  } catch (error) {
    console.error('MiKO Reschedule Error:', error);
    return {
      success: false,
      confirmed: false,
      message: "I couldn't reschedule the appointment. Please contact us at (310) 275-2705.",
      error: error.message,
    };
  }
};

/**
 * Cancel an appointment
 * @param {Object} cancelData - Cancel details
 * @returns {Promise<Object>} - Cancellation confirmation
 */
export const cancelAppointment = async (cancelData) => {
  try {
    const payload = {
      action: 'schedule_calendar_event',
      scheduling_action: 'cancel',
      sessionId: getSessionId(),
      timezone: cancelData.timezone || getTimezone(),
      timestamp: getCurrentTime(),
      email: cancelData.email,
      booking_time: cancelData.dateTime,
    };

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      confirmed: data.confirmed || data.success || true,
      message: data.message || 'Your appointment has been cancelled.',
    };
  } catch (error) {
    console.error('MiKO Cancel Error:', error);
    return {
      success: false,
      confirmed: false,
      message: "I couldn't cancel the appointment. Please contact us at (310) 275-2705.",
      error: error.message,
    };
  }
};

/**
 * Submit contact/inquiry form
 * @param {Object} formData - Form data
 * @returns {Promise<Object>} - Submission confirmation
 */
export const submitInquiry = async (formData) => {
  try {
    const payload = {
      action: 'contact_inquiry',
      sessionId: getSessionId(),
      timezone: getTimezone(),
      timestamp: getCurrentTime(),
      channel: 'email_form',
      // Form data
      full_name: formData.name,
      email: formData.email,
      phone: normalizePhoneNumber(formData.phone),
      procedure: formData.procedure,
      message: formData.message,
      intent: 'contact_inquiry',
    };

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      message: data.message || 'Thank you for your inquiry. Our team will respond within 24 hours.',
      inquiryId: data.inquiry_id,
    };
  } catch (error) {
    console.error('MiKO Inquiry Submission Error:', error);
    return {
      success: false,
      message: "I apologize, but I couldn't submit your inquiry. Please email us directly at office@mikoplasticsurgery.com or call (310) 275-2705.",
      error: error.message,
    };
  }
};

/**
 * Get existing appointment details
 * @param {Object} params - Search parameters
 * @returns {Promise<Object>} - Appointment details
 */
export const getAppointment = async (params) => {
  try {
    const payload = {
      action: 'schedule_calendar_event',
      scheduling_action: 'get',
      sessionId: getSessionId(),
      timezone: params.timezone || getTimezone(),
      timestamp: getCurrentTime(),
      email: params.email,
      booking_time: params.dateTime,
    };

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      found: data.found || !!data.appointment,
      appointment: data.appointment || data.details,
      message: data.message,
    };
  } catch (error) {
    console.error('MiKO Get Appointment Error:', error);
    return {
      success: false,
      found: false,
      message: "I couldn't find the appointment details. Please contact us at (310) 275-2705.",
      error: error.message,
    };
  }
};

// Export session utilities
export const clearSession = () => {
  sessionId = null;
  localStorage.removeItem('miko_session_id');
};

export const getCurrentSession = getSessionId;
