import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AuthRequest, requireAdmin } from '../middleware/auth';

const router = Router();

const createSocialMediaSchema = z.object({
  platform: z.string().min(1),
  url: z.string().url(),
  icon: z.string().optional(),
  order: z.number().int().default(0),
  active: z.boolean().default(true),
});

// Get active social media links (PUBLIC)
router.get('/public', async (req: Request, res: Response) => {
  try {
    const socialLinks = await prisma.socialMedia.findMany({
      where: { active: true },
      orderBy: { order: 'asc' },
    });

    res.json({ socialLinks });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch social media links' });
  }
});

// Get all social media links (admin only)
router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const socialLinks = await prisma.socialMedia.findMany({
      orderBy: { order: 'asc' },
    });

    res.json({ socialLinks });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch social media links' });
  }
});

// Create social media link (admin only)
router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = createSocialMediaSchema.parse(req.body);

    const socialLink = await prisma.socialMedia.create({
      data,
    });

    res.status(201).json({ socialLink });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create social media link' });
  }
});

// Update social media link (admin only)
router.patch('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = createSocialMediaSchema.partial().parse(req.body);

    const socialLink = await prisma.socialMedia.update({
      where: { id },
      data,
    });

    res.json({ socialLink });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update social media link' });
  }
});

// Delete social media link (admin only)
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.socialMedia.delete({
      where: { id },
    });

    res.json({ message: 'Social media link deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete social media link' });
  }
});

export default router;
