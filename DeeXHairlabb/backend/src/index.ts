import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Routes
import authRoutes from './routes/auth';
import appointmentRoutes from './routes/appointments';
import publicBookingRoutes from './routes/public-booking';
import clientRoutes from './routes/clients';
import revenueRoutes from './routes/revenue';
import exportRoutes from './routes/exports';
import hairstyleRoutes from './routes/hairstyles';
import socialMediaRoutes from './routes/social-media';
import businessHoursRoutes from './routes/business-hours';
import promotionRoutes from './routes/promotions';
import chatRoutes from './routes/chat';
import aiRoutes from './routes/ai';
import mediaRoutes from './routes/media';
import availabilityRoutes from './routes/availability';
import calendarBlockRoutes from './routes/calendar-blocks';
import socialFeedRoutes from './routes/social-feed';
import feedEngagementRoutes from './routes/feed-engagement';

// Middleware
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';

dotenv.config();

const app = express();
const httpServer = createServer(app);
// Allow multiple localhost ports in development
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://192.168.1.163:3000',
  'http://192.168.1.163:3003',
  process.env.FRONTEND_URL,
].filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

export const prisma = new PrismaClient();
export { io };

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', authenticateToken, appointmentRoutes); // Admin only
app.use('/api/booking', publicBookingRoutes); // Public - no auth required
app.use('/api/clients', authenticateToken, clientRoutes); // Admin only
app.use('/api/revenue', authenticateToken, revenueRoutes);
app.use('/api/exports', authenticateToken, exportRoutes);
app.use('/api/hairstyles', hairstyleRoutes); // Public endpoint at /public
app.use('/api/admin/hairstyles', authenticateToken, hairstyleRoutes); // Admin routes
app.use('/api/social', socialMediaRoutes); // Public endpoint at /public
app.use('/api/admin/social', authenticateToken, socialMediaRoutes); // Admin routes
app.use('/api/business-hours', businessHoursRoutes); // Public endpoint at /public
app.use('/api/admin/business-hours', authenticateToken, businessHoursRoutes); // Admin routes
app.use('/api/promotions', promotionRoutes); // Public for deals
app.use('/api/admin/promotions', authenticateToken, promotionRoutes);
app.use('/api/chat', chatRoutes); // Public - uses sessionId
app.use('/api/ai', aiRoutes); // Public - uses sessionId
app.use('/api/media', mediaRoutes); // Public endpoint at /public
app.use('/api/admin/media', authenticateToken, mediaRoutes); // Admin routes
app.use('/api/availability', availabilityRoutes); // Public - calendar availability
app.use('/api/admin/calendar-blocks', calendarBlockRoutes); // Admin - calendar control
app.use('/api/feed', socialFeedRoutes); // Public - social feed
app.use('/api/feed', feedEngagementRoutes); // Public - engagement (like, comment, share, repost)
app.use('/api/admin/feed', authenticateToken, socialFeedRoutes); // Admin - feed management

// Socket.io for real-time chat
io.use((socket, next) => {
  // Authentication middleware for socket
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret'
    ) as { userId: string };
    socket.data.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
  });

  socket.on('chat-message', (data) => {
    // Broadcast to room
    io.to(data.roomId).emit('chat-message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
