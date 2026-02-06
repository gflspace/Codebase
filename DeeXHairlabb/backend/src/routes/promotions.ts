import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AuthRequest, requireAdmin } from '../middleware/auth';

const router = Router();

const createPromotionSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  applicableServices: z.array(z.string()).default([]),
  status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'PAUSED']).default('DRAFT'),
});

// Get active promotions (public)
router.get('/active', async (req: Request, res: Response) => {
  try {
    const now = new Date();

    const promotions = await prisma.promotion.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ promotions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch promotions' });
  }
});

// Get all promotions (admin only)
router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const promotions = await prisma.promotion.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({ promotions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch promotions' });
  }
});

// Create promotion (admin only)
router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = createPromotionSchema.parse(req.body);

    const promotion = await prisma.promotion.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    });

    res.status(201).json({ promotion });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create promotion' });
  }
});

// Update promotion (admin only)
router.patch('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = createPromotionSchema.partial().parse(req.body);

    const updateData: any = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);

    const promotion = await prisma.promotion.update({
      where: { id },
      data: updateData,
    });

    res.json({ promotion });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update promotion' });
  }
});

// Delete promotion (admin only)
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.promotion.delete({
      where: { id },
    });

    res.json({ message: 'Promotion deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete promotion' });
  }
});

export default router;
