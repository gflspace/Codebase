import { useState, useCallback, useRef, useEffect } from 'react';
import { sendChatMessage } from '@/api/mikoAI';

/**
 * Intent categories for conversation classification
 */
export const INTENT_TYPES = {
  BOOK_CONSULTATION: 'book_consultation',
  PROCEDURE_INFORMATION: 'procedure_information',
  PRICING_INSURANCE: 'pricing_insurance',
  OUT_OF_TOWN_PATIENT: 'out_of_town_patient',
  MEDIA_PROFESSIONAL: 'media_professional',
  POST_OP_RECOVERY: 'post_op_recovery',
  GENERAL_QUESTION: 'general_question',
};

/**
 * Conversation stages
 */
export const CONVERSATION_STAGES = {
  NEW_INQUIRY: 'new_inquiry',
  GATHERING_INFO: 'gathering_info',
  SCHEDULING: 'scheduling',
  CONFIRMATION: 'confirmation',
  HUMAN_HANDOFF: 'human_handoff',
};

/**
 * Initial welcome message
 */
const INITIAL_MESSAGE = {
  id: 1,
  role: 'assistant',
  content: "Welcome to MiKO Plastic Surgery. I'm here to assist you 24/7 with any questions about our procedures, scheduling, or your journey with us. How may I help you today?",
  timestamp: new Date(),
  isAI: true,
};

/**
 * Custom hook for managing conversation state
 */
export const useConversation = () => {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const [isHumanAgent, setIsHumanAgent] = useState(false);
  const [currentStage, setCurrentStage] = useState(CONVERSATION_STAGES.NEW_INQUIRY);
  const [detectedIntent, setDetectedIntent] = useState(INTENT_TYPES.GENERAL_QUESTION);
  const [patientData, setPatientData] = useState({
    name: '',
    email: '',
    phone: '',
    procedure: '',
    timeline: 'flexible',
    consultType: 'virtual',
    caseType: 'new',
    location: '',
  });
  const [error, setError] = useState(null);

  // Track if this is the first message
  const messageCountRef = useRef(1);

  /**
   * Local intent detection for immediate UI feedback
   */
  const detectLocalIntent = useCallback((text) => {
    const lowerText = text.toLowerCase();

    if (lowerText.match(/\b(book|schedule|appointment|consultation|visit)\b/)) {
      return INTENT_TYPES.BOOK_CONSULTATION;
    }
    if (lowerText.match(/\b(price|cost|financing|payment|how much|afford)\b/)) {
      return INTENT_TYPES.PRICING_INSURANCE;
    }
    if (lowerText.match(/\b(procedure|surgery|facelift|rhinoplasty|breast|tummy|lipo|bbl)\b/)) {
      return INTENT_TYPES.PROCEDURE_INFORMATION;
    }
    if (lowerText.match(/\b(out of town|traveling|fly|international|virtual)\b/)) {
      return INTENT_TYPES.OUT_OF_TOWN_PATIENT;
    }
    if (lowerText.match(/\b(media|press|journalist|celebrity|professional)\b/)) {
      return INTENT_TYPES.MEDIA_PROFESSIONAL;
    }
    if (lowerText.match(/\b(recovery|post.?op|healing|after surgery|follow.?up)\b/)) {
      return INTENT_TYPES.POST_OP_RECOVERY;
    }

    return INTENT_TYPES.GENERAL_QUESTION;
  }, []);

  /**
   * Send a message and get AI response
   */
  const sendMessage = useCallback(async (text) => {
    if (!text.trim()) return;

    setError(null);

    // Detect intent locally for immediate feedback
    const localIntent = detectLocalIntent(text);
    setDetectedIntent(localIntent);

    // Create user message
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Call n8n webhook
      const response = await sendChatMessage(text, {
        channel: 'web_chat',
        stage: currentStage,
        intent: localIntent,
        patientData,
        conversationHistory,
      });

      // Update intent if AI detected something different
      if (response.intent) {
        setDetectedIntent(response.intent);
      }

      // Check for human handoff
      if (response.handoffRequired) {
        setIsHumanAgent(true);
        setCurrentStage(CONVERSATION_STAGES.HUMAN_HANDOFF);
      }

      // Create assistant message
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        isAI: !isHumanAgent && !response.handoffRequired,
        isHuman: isHumanAgent || response.handoffRequired,
        suggestedActions: response.suggestedActions,
      };

      setMessages(prev => [...prev, assistantMessage]);
      messageCountRef.current += 2;

      return response;
    } catch (err) {
      setError(err.message);

      // Add error message to conversation
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: "I apologize, but I'm experiencing a brief connection issue. Please try again in a moment, or call us directly at (310) 275-2705.",
        timestamp: new Date(),
        isAI: true,
        isError: true,
      };

      setMessages(prev => [...prev, errorMessage]);
      return { success: false, error: err.message };
    } finally {
      setIsTyping(false);
    }
  }, [messages, currentStage, patientData, detectLocalIntent, isHumanAgent]);

  /**
   * Update patient data progressively
   */
  const updatePatientData = useCallback((field, value) => {
    setPatientData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  /**
   * Set multiple patient data fields at once
   */
  const setPatientInfo = useCallback((data) => {
    setPatientData(prev => ({
      ...prev,
      ...data,
    }));
  }, []);

  /**
   * Reset conversation
   */
  const resetConversation = useCallback(() => {
    setMessages([INITIAL_MESSAGE]);
    setIsTyping(false);
    setIsHumanAgent(false);
    setCurrentStage(CONVERSATION_STAGES.NEW_INQUIRY);
    setDetectedIntent(INTENT_TYPES.GENERAL_QUESTION);
    setError(null);
    messageCountRef.current = 1;
  }, []);

  /**
   * Request human handoff
   */
  const requestHumanAgent = useCallback(async () => {
    setIsTyping(true);

    const handoffMessage = {
      id: Date.now(),
      role: 'assistant',
      content: "Connecting you with a MiKO patient coordinator now.",
      timestamp: new Date(),
      isAI: true,
    };

    setMessages(prev => [...prev, handoffMessage]);

    // Simulate human joining
    setTimeout(() => {
      setIsHumanAgent(true);
      setCurrentStage(CONVERSATION_STAGES.HUMAN_HANDOFF);
      setIsTyping(false);

      const humanJoinMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: "Hi, this is a MiKO patient coordinator. How can I help?",
        timestamp: new Date(),
        isHuman: true,
      };

      setMessages(prev => [...prev, humanJoinMessage]);
    }, 2000);
  }, []);

  /**
   * Add a system message to the conversation
   */
  const addSystemMessage = useCallback((content, options = {}) => {
    const systemMessage = {
      id: Date.now(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      isAI: !options.isHuman,
      isHuman: options.isHuman,
      isSystem: true,
      ...options,
    };

    setMessages(prev => [...prev, systemMessage]);
  }, []);

  return {
    // State
    messages,
    isTyping,
    isHumanAgent,
    currentStage,
    detectedIntent,
    patientData,
    error,

    // Actions
    sendMessage,
    updatePatientData,
    setPatientInfo,
    resetConversation,
    requestHumanAgent,
    addSystemMessage,

    // Setters
    setCurrentStage,
    setDetectedIntent,
  };
};

export default useConversation;
