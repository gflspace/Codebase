import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AuthRequest, requireAdmin } from '../middleware/auth';

const router = Router();

const createContentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  galleryUrls: z.array(z.string().url()).default([]),
  tags: z.array(z.string()).default([]),
  published: z.boolean().default(false),
});

// Get all published content (public)
router.get('/public', async (req: Request, res: Response) => {
  try {
    const posts = await prisma.contentPost.findMany({
      where: { published: true },
      orderBy: { publishedAt: 'desc' },
    });

    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// Get all content (admin only)
router.get('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const posts = await prisma.contentPost.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// Create content (admin only)
router.post('/', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const data = createContentSchema.parse(req.body);

    const post = await prisma.contentPost.create({
      data: {
        ...data,
        publishedAt: data.published ? new Date() : null,
      },
    });

    res.status(201).json({ post });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create content' });
  }
});

// Update content (admin only)
router.patch('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = createContentSchema.partial().parse(req.body);

    const post = await prisma.contentPost.update({
      where: { id },
      data: {
        ...data,
        publishedAt: data.published && !data.publishedAt ? new Date() : undefined,
      },
    });

    res.json({ post });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update content' });
  }
});

// Delete content (admin only)
router.delete('/:id', requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.contentPost.delete({
      where: { id },
    });

    res.json({ message: 'Content deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete content' });
  }
});

export default router;
