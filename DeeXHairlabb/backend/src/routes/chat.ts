import { Router, Request, Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// Get chat history (supports both authenticated and anonymous)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { limit = 50, sessionId } = req.query;
    const authReq = req as AuthRequest;

    const where: any = {};
    
    if (authReq.user) {
      // Authenticated user (admin)
      where.userId = authReq.user.id;
    } else if (sessionId) {
      // Anonymous user
      where.sessionId = sessionId as string;
    } else {
      return res.status(400).json({ error: 'sessionId is required for anonymous users' });
    }

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json({ messages: messages.reverse() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Send chat message (supports both authenticated and anonymous)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { content, metadata, sessionId } = req.body;
    const authReq = req as AuthRequest;

    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Determine if user is authenticated or anonymous
    const userId = authReq.user?.id || null;
    const finalSessionId = sessionId || (userId ? `user-${userId}` : `anon-${Date.now()}-${Math.random()}`);

    if (!userId && !sessionId) {
      // Generate session ID for anonymous user
      return res.status(201).json({
        message: {
          id: 'temp',
          sessionId: finalSessionId,
          role: 'user',
          content,
          createdAt: new Date(),
        },
        sessionId: finalSessionId,
      });
    }

    const message = await prisma.chatMessage.create({
      data: {
        userId: userId,
        sessionId: finalSessionId,
        role: userId ? 'admin' : 'user',
        content,
        metadata: metadata || {},
      },
    });

    // Emit to socket.io for real-time updates
    const { io } = await import('../index');
    io.emit('chat-message', {
      sessionId: finalSessionId,
      userId: userId,
      message,
    });

    res.status(201).json({ message, sessionId: finalSessionId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
