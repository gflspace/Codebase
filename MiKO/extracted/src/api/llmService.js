/**
 * MiKO LLM Service
 * Unified LLM interface with n8n primary and Base44 fallback
 */

import config from '@/config';
import { InvokeLLM } from './integrations';

// System prompt for the AI assistant - FAST RESPONSE MODE
const SYSTEM_PROMPT = `You are MiKO, the AI Live Chat Concierge for MiKO Plastic Surgery, representing Dr. Michael K. Obeng in Beverly Hills.

CRITICAL BEHAVIOR RULES:
1. SPEED FIRST - Respond in 1 concise message, no long explanations
2. MINIMAL QUESTIONS - Ask NO MORE than ONE question per response, only if it directly moves user forward
3. ASSUME INTENT - User is exploring procedures, pricing, or booking. Don't ask exploratory questions
4. GUIDE, DON'T INTERVIEW - Replace follow-up questions with quick explanations and clear next steps

RESPONSE FORMAT (MANDATORY):
1. Direct helpful statement (1-2 sentences max)
2. Short reassurance or value (1 sentence)
3. Guided options OR single action (not open-ended questions)

WHAT YOU MUST NEVER DO:
- Ask multiple questions
- Say "Can you tell me more?" or "What are you looking for?"
- Give long medical explanations unless explicitly requested
- End with "Let me know if you need anything else"
- Repeat information already given

PROCEDURES OFFERED:
- Facial: Facelift, Rhinoplasty, Blepharoplasty, Neck lift
- Breast: Augmentation, Lift, Reduction, Revision
- Body: Liposuction, Tummy Tuck, BBL, Mommy Makeover
- Non-Surgical: Injectables, Skin treatments

PRACTICE INFO:
- Location: Beverly Hills, CA
- Consultations: Virtual or In-Person
- Phone: (310) 275-2705
- Dr. Obeng: 20+ years experience, 5000+ procedures

RESPONSE EXAMPLES:

For procedure inquiry:
"We offer advanced cosmetic and reconstructive procedures performed by Dr. Obeng, including body contouring, breast procedures, and facial surgery.
Options: View procedures | Book consultation"

For pricing:
"Pricing varies by procedure and is reviewed during consultation. Flexible financing available.
Next step: Schedule a consultation"

For booking intent:
"I can help you schedule a private consultation with Dr. Obeng quickly.
Continue: Book consultation"

For general browsing:
"Many patients start by reviewing procedures before booking.
Choose: View procedures | Book consultation"

SAFETY: Never provide specific medical advice. For emergencies, direct to 911.

SUCCESS METRIC: User moves forward in FEWER messages. When uncertain, provide direction, not questions.`;

// Response schema for structured outputs
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    message: { type: 'string', description: 'The response message to show the user' },
    intent: {
      type: 'string',
      enum: ['book_consultation', 'procedure_information', 'pricing_insurance', 'general_question', 'human_handoff', 'post_op', 'complaint'],
      description: 'Detected user intent'
    },
    suggestedActions: {
      type: 'array',
      items: { type: 'string' },
      description: 'Quick reply suggestions for the user'
    },
    shouldShowCalendar: { type: 'boolean', description: 'Whether to prompt calendar view' },
    handoffRequired: { type: 'boolean', description: 'Whether human handoff is needed' },
    collectedData: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        procedure: { type: 'string' },
        timeline: { type: 'string' },
      },
      description: 'Any patient data collected from the conversation'
    }
  },
  required: ['message', 'intent']
};

/**
 * Build the prompt for the LLM - Optimized for fast responses
 */
const buildPrompt = (message, context = {}) => {
  // Only include last 5 messages for context (faster)
  const historyText = context.conversationHistory
    ?.slice(-5)
    ?.map(m => `${m.role === 'user' ? 'Patient' : 'MiKO'}: ${m.content}`)
    ?.join('\n') || '';

  const patientContext = context.patientData?.name
    ? `\nPatient: ${context.patientData.name}`
    : '';

  return `${SYSTEM_PROMPT}

HISTORY:
${historyText}
${patientContext}

PATIENT: ${message}

RESPOND NOW (1 message, max 2 sentences, include quick options):`;
};

/**
 * Fallback responses for when all LLM services fail
 * FAST RESPONSE MODE - Short, action-oriented, no follow-up questions
 */
const getFallbackResponse = (message, intent) => {
  const lowerMessage = message.toLowerCase();

  const responses = {
    book_consultation: {
      message: "I can help you schedule a private consultation with Dr. Obeng quickly and securely.",
      suggestedActions: ['Book Consultation', 'View Available Times'],
      shouldShowCalendar: true,
    },
    pricing_insurance: {
      message: "Pricing varies by procedure and is reviewed during consultation to ensure a personalized plan. Flexible financing options are available.",
      suggestedActions: ['Schedule Consultation', 'Learn About Financing'],
      shouldShowCalendar: false,
    },
    procedure_information: {
      message: "We offer advanced cosmetic and reconstructive procedures performed by Dr. Obeng, including body contouring, breast procedures, and facial surgery.",
      suggestedActions: ['View Procedures', 'Book Consultation'],
      shouldShowCalendar: false,
    },
    human_handoff: {
      message: "Connecting you with a MiKO patient coordinator now.",
      suggestedActions: [],
      shouldShowCalendar: false,
      handoffRequired: true,
    },
    general_question: {
      message: "Welcome to MiKO Plastic Surgery. I'm here 24/7 to help with procedures, consultations, and next steps.",
      suggestedActions: ['View Procedures', 'Book Consultation', 'Financing & Pricing'],
      shouldShowCalendar: false,
    },
    post_op_recovery: {
      message: "Recovery guidance varies by procedure. For specific concerns, our care team is available to assist.",
      suggestedActions: ['Contact Care Team', 'View Recovery Info'],
      shouldShowCalendar: false,
    },
    out_of_town: {
      message: "We welcome out-of-town patients. Dr. Obeng offers virtual consultations and our team coordinates travel logistics.",
      suggestedActions: ['Book Virtual Consultation', 'Learn More'],
      shouldShowCalendar: true,
    },
  };

  // Detect intent from message if not provided
  let detectedIntent = intent || 'general_question';

  if (lowerMessage.match(/\b(book|schedule|appointment|consultation)\b/)) {
    detectedIntent = 'book_consultation';
  } else if (lowerMessage.match(/\b(price|cost|financing|payment|afford)\b/)) {
    detectedIntent = 'pricing_insurance';
  } else if (lowerMessage.match(/\b(procedure|surgery|facelift|rhinoplasty|breast|tummy|lipo|bbl)\b/)) {
    detectedIntent = 'procedure_information';
  } else if (lowerMessage.match(/\b(human|person|someone|coordinator|speak|talk)\b/)) {
    detectedIntent = 'human_handoff';
  }

  return {
    ...responses[detectedIntent] || responses.general_question,
    intent: detectedIntent,
    isFallback: true,
  };
};

/**
 * Send message to n8n webhook
 */
const sendToN8N = async (message, context) => {
  if (!config.n8n.webhookUrl) {
    throw new Error('N8N_NOT_CONFIGURED');
  }

  const payload = {
    action: 'sendMessage',
    sessionId: context.sessionId,
    chatInput: message,
    channel: context.channel || 'web_chat',
    timezone: context.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    stage: context.stage || 'new_inquiry',
    intent: context.intent || 'general_question',
    timestamp: new Date().toISOString(),
    ...(context.patientData && {
      patient_name: context.patientData.name,
      patient_email: context.patientData.email,
      patient_phone: context.patientData.phone,
      procedure: context.patientData.procedure,
    }),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.n8n.timeout);

  try {
    const response = await fetch(config.n8n.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Instance-Id': config.n8n.instanceId,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`N8N_HTTP_ERROR: ${response.status}`);
    }

    const data = await response.json();

    // Handle async execution
    if (data.executionStarted) {
      throw new Error('N8N_ASYNC_EXECUTION');
    }

    // Parse response
    let responseMessage = data.output || data.message || data.response || data.text;

    if (Array.isArray(data) && data.length > 0) {
      const last = data[data.length - 1];
      responseMessage = last.output || last.message || last.text;
    }

    return {
      success: true,
      message: responseMessage || 'Thank you for your message. How may I assist you further?',
      intent: data.intent,
      handoffRequired: data.handoff_required || false,
      suggestedActions: data.suggested_actions || [],
      shouldShowCalendar: data.show_calendar || false,
      source: 'n8n',
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

/**
 * Send message to Base44 LLM as fallback
 */
const sendToBase44LLM = async (message, context) => {
  try {
    const prompt = buildPrompt(message, context);

    const response = await InvokeLLM({
      prompt,
      response_json_schema: RESPONSE_SCHEMA,
    });

    // Parse the response
    let parsed;
    try {
      parsed = typeof response === 'string' ? JSON.parse(response) : response;
    } catch {
      // If not JSON, treat as plain text response
      parsed = {
        message: response,
        intent: 'general_question',
      };
    }

    return {
      success: true,
      message: parsed.message,
      intent: parsed.intent,
      handoffRequired: parsed.handoffRequired || false,
      suggestedActions: parsed.suggestedActions || [],
      shouldShowCalendar: parsed.shouldShowCalendar || false,
      collectedData: parsed.collectedData,
      source: 'base44_llm',
    };
  } catch (error) {
    console.error('Base44 LLM Error:', error);
    throw error;
  }
};

/**
 * Main chat function with fallback chain
 * Tries: n8n -> Base44 LLM -> Static fallback
 */
export const chat = async (message, context = {}) => {
  // Try n8n first (if configured)
  if (config.n8n.webhookUrl) {
    try {
      return await sendToN8N(message, context);
    } catch (error) {
      console.warn('N8N chat failed, trying fallback:', error.message);
    }
  }

  // Try Base44 LLM as fallback
  if (config.chatbot.fallbackEnabled) {
    try {
      return await sendToBase44LLM(message, context);
    } catch (error) {
      console.warn('Base44 LLM failed, using static fallback:', error.message);
    }
  }

  // Final fallback to static responses
  const fallback = getFallbackResponse(message, context.intent);
  return {
    success: true,
    ...fallback,
    source: 'fallback',
  };
};

/**
 * Detect intent from message (local, fast)
 */
export const detectIntent = (message) => {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.match(/\b(book|schedule|appointment|consultation|visit|available)\b/)) {
    return 'book_consultation';
  }
  if (lowerMessage.match(/\b(price|cost|financing|payment|how much|afford|insurance)\b/)) {
    return 'pricing_insurance';
  }
  if (lowerMessage.match(/\b(procedure|surgery|facelift|rhinoplasty|breast|tummy|lipo|bbl|augment|lift|reduction)\b/)) {
    return 'procedure_information';
  }
  if (lowerMessage.match(/\b(out of town|traveling|fly|international|virtual|remote)\b/)) {
    return 'out_of_town_patient';
  }
  if (lowerMessage.match(/\b(recovery|post.?op|healing|after surgery|follow.?up|swelling|pain)\b/)) {
    return 'post_op_recovery';
  }
  if (lowerMessage.match(/\b(human|person|someone|coordinator|speak|talk|real|agent)\b/)) {
    return 'human_handoff';
  }
  if (lowerMessage.match(/\b(complain|unhappy|disappointed|problem|issue|wrong)\b/)) {
    return 'complaint';
  }

  return 'general_question';
};

/**
 * Generate a summary of a conversation (for admin dashboard)
 */
export const summarizeConversation = async (messages) => {
  try {
    const transcript = messages
      .map(m => `${m.role === 'user' ? 'Patient' : 'AI'}: ${m.content}`)
      .join('\n');

    const response = await InvokeLLM({
      prompt: `Summarize this patient conversation in 2-3 sentences. Include: main interest, any contact info shared, and next steps.

CONVERSATION:
${transcript}

SUMMARY:`,
    });

    return response;
  } catch (error) {
    console.error('Summary generation failed:', error);
    return 'Summary unavailable';
  }
};

export default {
  chat,
  detectIntent,
  summarizeConversation,
};
