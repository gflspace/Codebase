import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AuthRequest, requireAdmin } from '../middleware/auth';

const router = Router();

// Custom validator for URLs or data URIs (base64 encoded images/videos)
const urlOrDataUri = z.string().refine(
  (val) => {
    if (!val) return true;
    // Accept data URIs (base64 encoded)
    if (val.startsWith('data:')) return true;
    // Accept standard URLs
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Must be a valid URL or data URI' }
);

const createHairstyleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  imageUrl: urlOrDataUri.optional(),
  galleryUrls: z.array(urlOrDataUri).default([]),
  price: z.number().positive().optional(),
  duration: z.number().int().positive().optional(),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
});

// Get all published hairstyles (PUBLIC)
router.get('/public', async (req: Request, res: Response) => {
  try {
    const hairstyles = await prisma.hairstyle.findMany({
      where: { published: true },
      orderBy: [
        { featured: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({ hairstyles });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hairstyles' });
  }
});

// Get all hairstyles (admin only)
router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const hairstyles = await prisma.hairstyle.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({ hairstyles });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hairstyles' });
  }
});

// Create hairstyle (admin only)
router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = createHairstyleSchema.parse(req.body);

    const hairstyle = await prisma.hairstyle.create({
      data,
    });

    res.status(201).json({ hairstyle });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create hairstyle' });
  }
});

// Update hairstyle (admin only)
router.patch('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = createHairstyleSchema.partial().parse(req.body);

    const hairstyle = await prisma.hairstyle.update({
      where: { id },
      data,
    });

    res.json({ hairstyle });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update hairstyle' });
  }
});

// Delete hairstyle (admin only)
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.hairstyle.delete({
      where: { id },
    });

    res.json({ message: 'Hairstyle deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete hairstyle' });
  }
});

export default router;
