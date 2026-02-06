import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AuthRequest, requireAdmin } from '../middleware/auth';

const router = Router();

const createClientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  notes: z.string().optional(),
});

// All routes require admin
router.use(requireAdmin);

// Get all clients
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        appointments: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            hairstyleName: true,
            price: true,
            status: true,
          },
          orderBy: { startTime: 'desc' },
        },
        _count: {
          select: {
            appointments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ clients });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// Get single client
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        appointments: {
          orderBy: { startTime: 'desc' },
        },
      },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({ client });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// Create client
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = createClientSchema.parse(req.body);

    const client = await prisma.client.create({
      data,
    });

    res.status(201).json({ client });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// Update client
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = createClientSchema.partial().parse(req.body);

    const client = await prisma.client.update({
      where: { id },
      data,
    });

    res.json({ client });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// Delete client
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.client.delete({
      where: { id },
    });

    res.json({ message: 'Client deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

export default router;
