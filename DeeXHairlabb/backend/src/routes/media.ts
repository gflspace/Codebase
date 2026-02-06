import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AuthRequest, requireAdmin } from '../middleware/auth';

const router = Router();

const createMediaSchema = z.object({
  type: z.enum(['image', 'video']),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  caption: z.string().optional(),
  description: z.string().optional(),
  hairstyleId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  order: z.number().int().default(0),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
});

// Get all published media (PUBLIC)
router.get('/public', async (req: Request, res: Response) => {
  try {
    const { limit = 50 } = req.query;
    const media = await prisma.media.findMany({
      where: { published: true },
      orderBy: [
        { featured: 'desc' },
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
      take: parseInt(limit as string),
    });

    res.json({ media });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// Get all media (admin only)
router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const media = await prisma.media.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({ media });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// Create media (admin only)
router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = createMediaSchema.parse(req.body);

    const media = await prisma.media.create({
      data: {
        ...data,
        uploadedBy: req.user!.id,
      },
    });

    res.status(201).json({ media });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create media' });
  }
});

// Update media (admin only)
router.patch('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = createMediaSchema.partial().parse(req.body);

    const media = await prisma.media.update({
      where: { id },
      data,
    });

    res.json({ media });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update media' });
  }
});

// Delete media (admin only)
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.media.delete({
      where: { id },
    });

    res.json({ message: 'Media deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

export default router;
