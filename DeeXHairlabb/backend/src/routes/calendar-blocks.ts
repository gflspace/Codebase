import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AuthRequest, requireAdmin } from '../middleware/auth';

const router = Router();

const createBlockSchema = z.object({
  date: z.string().datetime(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  isBlocked: z.boolean().default(true),
  reason: z.string().optional(),
});

// All routes require admin
router.use(requireAdmin);

// Get all calendar blocks
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.date.lte = new Date(endDate as string);
      }
    }

    const blocks = await prisma.calendarBlock.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    res.json({ blocks });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch calendar blocks' });
  }
});

// Create calendar block
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = createBlockSchema.parse(req.body);

    // Normalize date to start of day
    const date = new Date(data.date);
    date.setHours(0, 0, 0, 0);

    const block = await prisma.calendarBlock.create({
      data: {
        date,
        startTime: data.startTime ? new Date(data.startTime) : null,
        endTime: data.endTime ? new Date(data.endTime) : null,
        isBlocked: data.isBlocked,
        reason: data.reason,
        createdBy: req.user!.id,
      },
    });

    res.status(201).json({ block });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create calendar block' });
  }
});

// Update calendar block
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = createBlockSchema.partial().parse(req.body);

    const updateData: any = {};
    if (data.date) {
      const date = new Date(data.date);
      date.setHours(0, 0, 0, 0);
      updateData.date = date;
    }
    if (data.startTime !== undefined) {
      updateData.startTime = data.startTime ? new Date(data.startTime) : null;
    }
    if (data.endTime !== undefined) {
      updateData.endTime = data.endTime ? new Date(data.endTime) : null;
    }
    if (data.isBlocked !== undefined) updateData.isBlocked = data.isBlocked;
    if (data.reason !== undefined) updateData.reason = data.reason;

    const block = await prisma.calendarBlock.update({
      where: { id },
      data: updateData,
    });

    res.json({ block });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update calendar block' });
  }
});

// Delete calendar block
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.calendarBlock.delete({
      where: { id },
    });

    res.json({ message: 'Calendar block deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete calendar block' });
  }
});

export default router;
