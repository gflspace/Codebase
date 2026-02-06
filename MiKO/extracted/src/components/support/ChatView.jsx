import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Image, User, Sparkles, Calendar, RefreshCw, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sendChatMessage } from '@/api/mikoAI';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  getSessionId,
  upsertChatSession,
  logAIInteraction,
  createLeadFromChat,
  extractPatientDataFromConversation,
  detectRiskKeywords,
} from '@/api/chatService';

const quickReplies = [
  { label: 'View Procedures', action: 'chat', intent: 'procedure_information' },
  { label: 'Book Consultation', action: 'book', intent: 'book_consultation' },
  { label: 'Financing & Pricing', action: 'chat', intent: 'pricing_insurance' },
  { label: 'Speak with Care Team', action: 'human', intent: 'human_handoff' },
];

const initialMessages = [
  {
    id: 1,
    role: 'assistant',
    content: "Welcome to MiKO Plastic Surgery. I'm here to assist you 24/7 with any questions about our procedures, scheduling, or your journey with us. How may I help you today?",
    timestamp: new Date(),
    isAI: true,
  },
];

export default function ChatView({ onBookClick, onSwitchToCalendar }) {
  const [messages, setMessages] = useState(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isHuman, setIsHuman] = useState(false);
  const [patientData, setPatientData] = useState({
    name: '',
    email: '',
    phone: '',
    procedure: '',
    consultType: 'virtual',
  });
  const [conversationStage, setConversationStage] = useState('new_inquiry');
  const [connectionError, setConnectionError] = useState(false);
  const [supabaseConnected] = useState(isSupabaseConfigured());
  const messagesEndRef = useRef(null);
  const sessionId = useRef(getSessionId());

  // Initialize chat session on mount
  useEffect(() => {
    if (supabaseConnected) {
      upsertChatSession({ sourcePage: window.location.pathname });
    }
  }, [supabaseConnected]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Build conversation history for context
  const getConversationHistory = useCallback(() => {
    return messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content,
    }));
  }, [messages]);

  // Detect intent locally for immediate UI feedback
  const detectLocalIntent = (text) => {
    const lowerText = text.toLowerCase();

    if (lowerText.match(/\b(book|schedule|appointment|consultation|visit)\b/)) {
      return 'book_consultation';
    }
    if (lowerText.match(/\b(price|cost|financing|payment|how much|afford)\b/)) {
      return 'pricing_insurance';
    }
    if (lowerText.match(/\b(procedure|surgery|facelift|rhinoplasty|breast|tummy|lipo|bbl)\b/)) {
      return 'procedure_information';
    }
    if (lowerText.match(/\b(coordinator|human|person|speak|talk to someone)\b/)) {
      return 'human_handoff';
    }

    return 'general_question';
  };

  // Fallback responses when webhook is unavailable
  const getFallbackResponse = (text, intent) => {
    switch (intent) {
      case 'book_consultation':
        return "I'd be delighted to help you schedule a consultation with Dr. Obeng. You can view our available times in the calendar tab, or I can connect you with a patient coordinator who can assist with finding the perfect time. Would you like me to show you our next available appointments?";

      case 'pricing_insurance':
        return "We understand that investing in yourself is an important decision. MiKO offers personalized consultations where Dr. Obeng can provide tailored recommendations and pricing. We also partner with CareCredit and Prosper Healthcare Lending for flexible financing options. Shall I connect you with our financial coordinator?";

      case 'procedure_information':
        return "Dr. Obeng specializes in a comprehensive range of procedures including facial rejuvenation (facelifts, rhinoplasty, eyelid surgery), body contouring (liposuction, tummy tuck, Brazilian butt lift), and breast procedures (augmentation, lift, reduction). Which area interests you most?";

      case 'human_handoff':
        return "Of course. I'm connecting you with a MiKO patient coordinator now. They'll be with you momentarily to provide personalized assistance.";

      default: {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('before') || lowerText.includes('after') || lowerText.includes('photos') || lowerText.includes('results')) {
          return "Our before and after gallery showcases Dr. Obeng's exceptional results across all procedure types. For privacy reasons, we share our complete gallery during consultations. However, I can have a coordinator share some examples relevant to your interests. What procedure results would you like to see?";
        }
        return "Thank you for reaching out. I'd be happy to help you learn more about our services or connect you with our team. Would you like information about specific procedures, financing options, or would you prefer to schedule a consultation with Dr. Obeng?";
      }
    }
  };

  const handleSend = async (text) => {
    const messageText = text || inputValue;
    if (!messageText.trim()) return;

    setConnectionError(false);
    const startTime = Date.now();

    // Detect intent for UI purposes
    const localIntent = detectLocalIntent(messageText);

    // Detect risk keywords
    const riskDetection = detectRiskKeywords(messageText);

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Extract patient data from conversation after adding new message
    const updatedMessages = [...messages, userMessage];
    const extractedData = extractPatientDataFromConversation(updatedMessages);
    if (extractedData.name || extractedData.email || extractedData.phone) {
      setPatientData((prev) => ({ ...prev, ...extractedData }));

      // Create lead if we have enough data (email or phone)
      if ((extractedData.email || extractedData.phone) && supabaseConnected) {
        createLeadFromChat(extractedData);
      }
    }

    try {
      // Call n8n webhook
      const response = await sendChatMessage(messageText, {
        channel: 'web_chat',
        stage: conversationStage,
        intent: localIntent,
        patientData: { ...patientData, ...extractedData },
        conversationHistory: getConversationHistory(),
        sessionId: sessionId.current,
        riskKeywords: riskDetection.keywords,
      });

      const responseTime = Date.now() - startTime;
      setIsTyping(false);

      // Check for human handoff
      if (response.handoffRequired || riskDetection.shouldEscalate) {
        setIsHuman(true);
        setConversationStage('human_handoff');
      }

      // Update conversation stage based on intent
      if (localIntent === 'book_consultation' && !response.handoffRequired) {
        setConversationStage('scheduling');
      }

      const assistantMessage = {
        id: Date.now(),
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        isAI: !isHuman && !response.handoffRequired,
        isHuman: isHuman || response.handoffRequired,
        suggestedActions: response.suggestedActions,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Log to Supabase
      if (supabaseConnected) {
        logAIInteraction({
          userMessage: messageText,
          aiResponse: response.message,
          intent: response.intent || localIntent,
          intentConfidence: response.intentConfidence || 0.8,
          riskKeywords: riskDetection.keywords,
          riskScore: riskDetection.score,
          escalated: riskDetection.shouldEscalate || response.handoffRequired,
          escalationReason: riskDetection.shouldEscalate
            ? `Risk keywords detected: ${riskDetection.keywords.join(', ')}`
            : response.handoffReason,
          action: response.handoffRequired ? 'escalated' : 'responded',
          suggestedActions: response.suggestedActions,
          responseTimeMs: responseTime,
          procedureIdentified: extractedData.procedure,
        });
      }

      // If scheduling action detected, show calendar prompt
      if (response.schedulingAction || localIntent === 'book_consultation') {
        setTimeout(() => {
          const schedulePrompt = {
            id: Date.now() + 1,
            role: 'assistant',
            content: "Would you like to view available appointment times? I can show you our calendar with open slots.",
            timestamp: new Date(),
            isAI: true,
            showCalendarButton: true,
          };
          setMessages((prev) => [...prev, schedulePrompt]);
        }, 1000);
      }

    } catch (error) {
      console.error('Chat error:', error);
      setConnectionError(true);
      setIsTyping(false);

      // Use fallback response if webhook fails
      const fallbackResponse = getFallbackResponse(messageText, localIntent);
      const responseTime = Date.now() - startTime;

      // Log fallback interaction to Supabase
      if (supabaseConnected) {
        logAIInteraction({
          userMessage: messageText,
          aiResponse: fallbackResponse,
          intent: localIntent,
          intentConfidence: 0.6, // Lower confidence for local detection
          riskKeywords: riskDetection.keywords,
          riskScore: riskDetection.score,
          escalated: riskDetection.shouldEscalate || localIntent === 'human_handoff',
          escalationReason: riskDetection.shouldEscalate
            ? `Risk keywords detected: ${riskDetection.keywords.join(', ')}`
            : localIntent === 'human_handoff' ? 'User requested human' : null,
          action: localIntent === 'human_handoff' ? 'transferred_to_human' : 'responded',
          responseTimeMs: responseTime,
          procedureIdentified: extractedData.procedure,
        });
      }

      // Handle human handoff in fallback mode
      if (localIntent === 'human_handoff' || riskDetection.shouldEscalate) {
        setIsHuman(true);
        setConversationStage('human_handoff');

        const handoffMessage = {
          id: Date.now(),
          role: 'assistant',
          content: riskDetection.shouldEscalate
            ? "I understand you have some concerns that require personalized attention. I'm connecting you with a clinical coordinator who can better assist you."
            : fallbackResponse,
          timestamp: new Date(),
          isAI: true,
        };
        setMessages((prev) => [...prev, handoffMessage]);

        setTimeout(() => {
          setMessages((prev) => [...prev, {
            id: Date.now() + 1,
            role: 'assistant',
            content: "Hello! This is Sarah from MiKO Plastic Surgery. I'm here to help with any questions you have. How may I assist you today?",
            timestamp: new Date(),
            isHuman: true,
          }]);
        }, 2000);
      } else {
        const assistantMessage = {
          id: Date.now(),
          role: 'assistant',
          content: fallbackResponse,
          timestamp: new Date(),
          isAI: !isHuman,
          isHuman: isHuman,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      }
    }
  };

  const handleQuickReply = (reply) => {
    if (reply.action === 'book') {
      // Switch to calendar tab
      if (onSwitchToCalendar) {
        onSwitchToCalendar();
      } else if (onBookClick) {
        onBookClick();
      }
    } else if (reply.action === 'human') {
      handleRequestHuman();
    } else {
      handleSend(reply.label);
    }
  };

  const handleRequestHuman = () => {
    setIsTyping(true);

    const handoffMessage = {
      id: Date.now(),
      role: 'assistant',
      content: "I'm connecting you with a MiKO patient coordinator now. They'll be with you momentarily to provide personalized assistance.",
      timestamp: new Date(),
      isAI: true,
    };

    setMessages((prev) => [...prev, handoffMessage]);

    setTimeout(() => {
      setIsHuman(true);
      setConversationStage('human_handoff');
      setIsTyping(false);

      const humanJoinMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: "Hello! This is Sarah from MiKO Plastic Surgery. I'm here to help with any questions you have. How may I assist you today?",
        timestamp: new Date(),
        isHuman: true,
      };

      setMessages((prev) => [...prev, humanJoinMessage]);
    }, 2000);
  };

  const handleViewCalendar = () => {
    if (onSwitchToCalendar) {
      onSwitchToCalendar();
    } else if (onBookClick) {
      onBookClick();
    }
  };

  const handleRetry = () => {
    setConnectionError(false);
    // Retry the last user message
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      handleSend(lastUserMessage.content);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#FDFCFB]">
      {/* Connection Error Banner */}
      <AnimatePresence>
        {connectionError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between"
          >
            <span className="text-xs text-amber-700">
              Connection issues detected. Using offline mode.
            </span>
            <button
              onClick={handleRetry}
              className="text-xs text-amber-700 hover:text-amber-900 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-end gap-2 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {message.role === 'assistant' && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.isHuman ? 'bg-[#4A1515]' : 'bg-gradient-to-br from-[#3D1010] to-[#4A1515]'
                  }`}>
                    {message.isHuman ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-[#C4A484]" />
                    )}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-[#3D1010] to-[#4A1515] text-white rounded-br-md'
                        : 'bg-white text-[#2D0A0A] shadow-sm border border-[#F0EBE5] rounded-bl-md'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className={`text-xs font-medium ${message.isHuman ? 'text-[#4A1515]' : 'text-[#C4A484]'}`}>
                          {message.isHuman ? 'Sarah — Patient Coordinator' : 'MiKO Patient Support 24/7'}
                        </span>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {/* Calendar Button for scheduling prompts */}
                  {message.showCalendarButton && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={handleViewCalendar}
                      className="self-start flex items-center gap-2 px-4 py-2 bg-[#3D1010] text-white rounded-xl text-sm font-medium hover:bg-[#4A1515] transition-colors"
                    >
                      <Calendar className="w-4 h-4" />
                      View Available Times
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3D1010] to-[#4A1515] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#C4A484]" />
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm border border-[#F0EBE5]">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-[#4A1515] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-[#4A1515] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-[#4A1515] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies */}
      <div className="px-4 py-3 border-t border-[#F0EBE5] bg-white">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {quickReplies.map((reply, index) => (
            <button
              key={index}
              onClick={() => handleQuickReply(reply)}
              className="flex-shrink-0 px-4 py-2 text-xs font-medium text-[#4A1515] bg-[#F8F5F2] hover:bg-[#F0EBE5] rounded-full transition-colors border border-[#E8E3DC]"
            >
              {reply.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-4 py-4 bg-white border-t border-[#F0EBE5]">
        <div className="flex items-center gap-2">
          <button className="p-2 text-[#8B7355] hover:text-[#4A1515] transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>
          <button className="p-2 text-[#8B7355] hover:text-[#4A1515] transition-colors">
            <Image className="w-5 h-5" />
          </button>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type your message..."
            className="flex-1 bg-[#F8F5F2] border-0 focus-visible:ring-1 focus-visible:ring-[#4A1515] rounded-full px-4"
          />
          <Button
            onClick={() => handleSend()}
            disabled={!inputValue.trim() || isTyping}
            className="bg-gradient-to-r from-[#3D1010] to-[#4A1515] hover:from-[#4A1515] hover:to-[#5A2020] text-white rounded-full w-10 h-10 p-0 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-center text-xs text-[#8B7355] mt-3">
          Your care is our priority • HIPAA Compliant
        </p>
      </div>
    </div>
  );
}
