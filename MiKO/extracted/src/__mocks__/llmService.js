/**
 * LLM Service Mock
 * Mock implementation for AI/chat testing
 */

import { vi } from 'vitest';

// Configurable mock responses
let mockResponses = {
  default: {
    success: true,
    message: 'Thank you for your inquiry. How can I assist you today?',
    intent: 'general_question',
    intentConfidence: 0.85,
    handoffRequired: false,
    suggestedActions: ['Book consultation', 'Learn about procedures'],
  },
  booking: {
    success: true,
    message: "I'd be happy to help you schedule a consultation. What day works best for you?",
    intent: 'book_consultation',
    intentConfidence: 0.92,
    handoffRequired: false,
    schedulingAction: true,
    suggestedActions: ['View calendar', 'Call us directly'],
  },
  pricing: {
    success: true,
    message: 'Our pricing varies based on the specific procedure and your individual needs. Would you like to schedule a consultation to discuss your goals?',
    intent: 'pricing_insurance',
    intentConfidence: 0.88,
    handoffRequired: false,
    suggestedActions: ['View financing options', 'Book consultation'],
  },
  procedure: {
    success: true,
    message: 'Dr. Obeng specializes in a wide range of procedures. Which area are you most interested in?',
    intent: 'procedure_information',
    intentConfidence: 0.90,
    handoffRequired: false,
    suggestedActions: ['Facial procedures', 'Body contouring', 'Breast procedures'],
  },
  humanHandoff: {
    success: true,
    message: "I'm connecting you with a patient coordinator who can better assist you.",
    intent: 'human_handoff',
    intentConfidence: 0.95,
    handoffRequired: true,
    handoffReason: 'User requested human assistance',
    suggestedActions: [],
  },
  error: {
    success: false,
    message: 'I apologize, but I encountered an issue. Please try again or call us directly.',
    intent: 'error',
    intentConfidence: 0,
    handoffRequired: false,
    suggestedActions: ['Try again', 'Call (310) 275-2705'],
  },
};

// Track calls for assertions
let callHistory = [];

/**
 * Reset mock state
 */
export function resetMockLLM() {
  callHistory = [];
}

/**
 * Get call history
 */
export function getLLMCallHistory() {
  return callHistory;
}

/**
 * Set custom response for next call
 */
export function setNextResponse(response) {
  mockResponses.custom = response;
}

/**
 * Detect intent from message (simplified mock logic)
 */
function detectMockIntent(message) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.match(/\b(book|schedule|appointment|consultation|visit)\b/)) {
    return 'booking';
  }
  if (lowerMessage.match(/\b(price|cost|financing|payment|how much|afford)\b/)) {
    return 'pricing';
  }
  if (lowerMessage.match(/\b(procedure|surgery|facelift|rhinoplasty|breast|tummy|lipo|bbl)\b/)) {
    return 'procedure';
  }
  if (lowerMessage.match(/\b(coordinator|human|person|speak|talk to someone)\b/)) {
    return 'humanHandoff';
  }

  return 'default';
}

/**
 * Mock sendMessageToLLM function
 */
export const sendMessageToLLM = vi.fn(async (message, context = {}) => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Record the call
  callHistory.push({ message, context, timestamp: new Date() });

  // Check for custom response
  if (mockResponses.custom) {
    const response = mockResponses.custom;
    delete mockResponses.custom;
    return response;
  }

  // Determine intent and return appropriate response
  const intent = detectMockIntent(message);
  return { ...mockResponses[intent] };
});

/**
 * Mock sendChatMessage function (used by ChatView)
 */
export const sendChatMessage = vi.fn(async (message, metadata = {}) => {
  return sendMessageToLLM(message, metadata);
});

/**
 * Mock getAIResponse function
 */
export const getAIResponse = vi.fn(async (message, conversationHistory = []) => {
  return sendMessageToLLM(message, { conversationHistory });
});

export default {
  sendMessageToLLM,
  sendChatMessage,
  getAIResponse,
  resetMockLLM,
  getLLMCallHistory,
  setNextResponse,
};
