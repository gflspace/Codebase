import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * AI Intent Interpretation Endpoint (PUBLIC - no auth required)
 * 
 * This endpoint receives natural language requests and:
 * 1. Interprets user intent
 * 2. Prepares structured instructions for the backend
 * 3. Does NOT execute actions directly
 */
router.post('/interpret', async (req: Request, res: Response) => {
  try {
    const { message, context, sessionId } = req.body;
    const authReq = req as AuthRequest;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Generate session ID if not provided (for anonymous users)
    const finalSessionId = sessionId || (authReq.user?.id ? `user-${authReq.user.id}` : `anon-${Date.now()}-${Math.random()}`);

    // Store chat message
    const chatMessage = await prisma.chatMessage.create({
      data: {
        userId: authReq.user?.id || null,
        sessionId: finalSessionId,
        role: authReq.user ? 'admin' : 'user',
        content: message,
        metadata: context || {},
      },
    });

    // AI interpretation logic
    // In production, this would call an LLM API
    const intent = interpretIntent(message, req.user!.role);

    // Generate response based on intent
    const response = await generateResponse(intent, authReq.user, message);

    // Store AI response
    await prisma.chatMessage.create({
      data: {
        userId: authReq.user?.id || null,
        sessionId: finalSessionId,
        role: 'assistant',
        content: response.text,
        metadata: {
          intent: intent.type,
          instructions: intent.instructions,
        },
      },
    });

    res.json({
      intent,
      response,
      chatMessageId: chatMessage.id,
      sessionId: finalSessionId,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to interpret intent' });
  }
});

/**
 * Prepare Export Instructions
 * 
 * AI prepares export definition, backend executes
 */
router.post('/prepare-export', async (req: AuthRequest, res: Response) => {
  try {
    const { reportType, timeRange, filters } = req.body;

    if (!reportType) {
      return res.status(400).json({ error: 'Report type is required' });
    }

    // Validate and structure export instructions
    const exportInstructions = {
      reportType,
      timeRange: timeRange || {},
      filters: filters || {},
      requestedBy: req.user!.id,
    };

    // Store as chat message for audit
    await prisma.chatMessage.create({
      data: {
        userId: req.user!.id,
        role: 'assistant',
        content: `Prepared export instructions for ${reportType} report`,
        metadata: {
          type: 'export_preparation',
          instructions: exportInstructions,
        },
      },
    });

    res.json({
      message: 'Export instructions prepared. Use /api/exports/request to execute.',
      instructions: exportInstructions,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to prepare export instructions' });
  }
});

// Helper function to interpret user intent
function interpretIntent(message: string, userRole?: string): any {
  const lowerMessage = message.toLowerCase();

  // Booking-related intents
  if (lowerMessage.includes('book') || lowerMessage.includes('appointment') || lowerMessage.includes('schedule')) {
    return {
      type: 'booking_request',
      instructions: {
        action: 'check_availability',
        extractParams: ['date', 'time', 'service', 'duration'],
      },
    };
  }

  // Availability check
  if (lowerMessage.includes('available') || lowerMessage.includes('free') || lowerMessage.includes('open')) {
    return {
      type: 'availability_check',
      instructions: {
        action: 'get_availability',
        extractParams: ['date', 'duration'],
      },
    };
  }

  // Revenue/analytics (admin only)
  if (userRole === 'ADMIN' && (lowerMessage.includes('revenue') || lowerMessage.includes('earnings') || lowerMessage.includes('analytics'))) {
    return {
      type: 'revenue_query',
      instructions: {
        action: 'get_revenue_analytics',
        extractParams: ['timeframe', 'startDate', 'endDate', 'clientId'],
      },
    };
  }

  // Export requests (admin only)
  if (userRole === 'ADMIN' && (lowerMessage.includes('export') || lowerMessage.includes('report') || lowerMessage.includes('sheet'))) {
    return {
      type: 'export_request',
      instructions: {
        action: 'prepare_export',
        extractParams: ['reportType', 'timeRange', 'filters'],
      },
    };
  }

  // General query
  return {
    type: 'general_query',
    instructions: {
      action: 'respond',
    },
  };
}

// Generate AI response
async function generateResponse(intent: any, user: any | null, originalMessage: string): Promise<any> {
  switch (intent.type) {
    case 'booking_request':
      return {
        text: "I can help you book an appointment! Let me check available time slots. What date and service are you interested in?",
        suggestions: ['Check availability', 'View services'],
      };

    case 'availability_check':
      return {
        text: "I'll check the calendar for available slots. What date are you looking for?",
        suggestions: ['Today', 'This week', 'Next week'],
      };

    case 'revenue_query':
      if (user.role !== 'ADMIN') {
        return {
          text: "I can only provide revenue information to administrators.",
        };
      }
      return {
        text: "I can help you understand your revenue analytics. Would you like to see daily, weekly, monthly, quarterly, or yearly breakdowns?",
        suggestions: ['Today', 'This week', 'This month', 'This year'],
      };

    case 'export_request':
      if (user.role !== 'ADMIN') {
        return {
          text: "Export functionality is only available to administrators.",
        };
      }
      return {
        text: "I can prepare a Google Sheets export for you. Please specify:\n- Report type (customers, appointments, revenue, promotions)\n- Time range\n- Any filters (client, service, status)",
        suggestions: ['Customers report', 'Appointments report', 'Revenue report'],
      };

    default:
      return {
        text: "I'm here to help with bookings, availability, and business insights. How can I assist you today?",
        suggestions: ['Book appointment', 'Check availability', 'View services'],
      };
  }
}

export default router;
