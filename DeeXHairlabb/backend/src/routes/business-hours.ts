import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AuthRequest, requireAdmin } from '../middleware/auth';

const router = Router();

const updateBusinessHoursSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isOpen: z.boolean(),
  openTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional().nullable(),
  closeTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional().nullable(),
});

// Get business hours (PUBLIC) - Respects isPublished flag
router.get('/public', async (req: Request, res: Response) => {
  try {
    const hours = await prisma.businessHours.findMany({
      orderBy: { dayOfWeek: 'asc' },
    });

    // Check if schedule is published (read from first record or check if any exist)
    const isPublished = hours.length > 0 && hours[0].isPublished;

    if (!isPublished) {
      // Return "Contact for availability" state
      return res.json({
        businessHours: null,
        isPublished: false,
        message: 'Contact for availability'
      });
    }

    res.json({ businessHours: hours, isPublished: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch business hours' });
  }
});

// Get business hours (admin) - Always returns all data
router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const hours = await prisma.businessHours.findMany({
      orderBy: { dayOfWeek: 'asc' },
    });

    // Get published status from first record (if any)
    const isPublished = hours.length > 0 ? hours[0].isPublished : false;

    res.json({ businessHours: hours, isPublished });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch business hours' });
  }
});

// Toggle publish status (admin only)
router.put('/publish', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { isPublished } = req.body;

    if (typeof isPublished !== 'boolean') {
      return res.status(400).json({ error: 'isPublished must be a boolean' });
    }

    // Check if any business hours exist
    const existingHours = await prisma.businessHours.findMany();

    if (existingHours.length === 0) {
      // Create default business hours if none exist
      const defaultHours = [
        { dayOfWeek: 0, isOpen: false, openTime: '09:00', closeTime: '18:00', isPublished },
        { dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '18:00', isPublished },
        { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '18:00', isPublished },
        { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '18:00', isPublished },
        { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '18:00', isPublished },
        { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '18:00', isPublished },
        { dayOfWeek: 6, isOpen: true, openTime: '10:00', closeTime: '16:00', isPublished },
      ];

      await prisma.businessHours.createMany({
        data: defaultHours
      });
    } else {
      // Update all existing records
      await prisma.businessHours.updateMany({
        data: { isPublished }
      });
    }

    res.json({
      isPublished,
      message: isPublished ? 'Schedule published' : 'Schedule unpublished'
    });
  } catch (error) {
    console.error('Failed to update publish status:', error);
    res.status(500).json({ error: 'Failed to update publish status' });
  }
});

// Update business hours (admin only)
router.put('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { businessHours } = req.body;

    if (!Array.isArray(businessHours)) {
      return res.status(400).json({ error: 'businessHours must be an array' });
    }

    // Get current published status to preserve it
    const currentHours = await prisma.businessHours.findFirst();
    const currentPublished = currentHours?.isPublished ?? false;

    const updates = await Promise.all(
      businessHours.map(async (hours: any) => {
        const data = updateBusinessHoursSchema.parse(hours);
        return prisma.businessHours.upsert({
          where: { dayOfWeek: data.dayOfWeek },
          update: {
            isOpen: data.isOpen,
            openTime: data.openTime,
            closeTime: data.closeTime,
          },
          create: {
            dayOfWeek: data.dayOfWeek,
            isOpen: data.isOpen,
            openTime: data.openTime,
            closeTime: data.closeTime,
            isPublished: currentPublished,
          },
        });
      })
    );

    res.json({ businessHours: updates, isPublished: currentPublished });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update business hours' });
  }
});

export default router;
