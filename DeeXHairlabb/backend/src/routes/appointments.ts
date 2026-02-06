import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AuthRequest, requireAdmin } from '../middleware/auth';

const router = Router();

const createAppointmentSchema = z.object({
  clientId: z.string().uuid(),
  hairstyleName: z.string().min(1),
  price: z.number().positive(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  notes: z.string().optional(),
});

// All routes require admin
router.use(requireAdmin);

// Get all appointments (admin only)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, status } = req.query;

    const where: any = {};

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate as string);
      if (endDate) where.startTime.lte = new Date(endDate as string);
    }

    if (status) {
      where.status = status;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    res.json({ appointments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Create appointment (admin only - for manual entry)
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = createAppointmentSchema.parse(req.body);
    const now = new Date();

    // Validate times are in the future
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    if (startTime <= now) {
      return res.status(400).json({ error: 'Start time must be in the future' });
    }

    if (endTime <= startTime) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }

    // Check for conflicts
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        startTime: {
          lt: endTime,
        },
        endTime: {
          gt: startTime,
        },
        status: {
          not: 'CANCELLED',
        },
      },
    });

    if (conflictingAppointment) {
      return res.status(400).json({ error: 'Time slot is not available' });
    }

    // Calculate duration
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    const appointment = await prisma.appointment.create({
      data: {
        clientId: data.clientId,
        adminId: req.user!.id,
        hairstyleName: data.hairstyleName,
        price: data.price,
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        notes: data.notes,
        status: 'CONFIRMED',
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    res.status(201).json({ appointment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Update appointment (admin only)
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData: any = {};

    if (req.body.status) {
      if (!['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(req.body.status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updateData.status = req.body.status;
    }

    if (req.body.startTime) updateData.startTime = new Date(req.body.startTime);
    if (req.body.endTime) updateData.endTime = new Date(req.body.endTime);
    if (req.body.hairstyleName) updateData.hairstyleName = req.body.hairstyleName;
    if (req.body.price !== undefined) updateData.price = req.body.price;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;

    // Recalculate duration if times changed
    if (updateData.startTime || updateData.endTime) {
      const existing = await prisma.appointment.findUnique({ where: { id } });
      if (existing) {
        const start = updateData.startTime || existing.startTime;
        const end = updateData.endTime || existing.endTime;
        updateData.duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      }
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    // If completed, create revenue log
    if (updateData.status === 'COMPLETED' && !appointment.revenueLog) {
      await prisma.revenueLog.create({
        data: {
          appointmentId: appointment.id,
          clientId: appointment.clientId,
          amount: appointment.price,
          hairstyleName: appointment.hairstyleName,
          date: new Date(),
        },
      });
    }

    res.json({ appointment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Cancel appointment (admin only)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    await prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json({ message: 'Appointment cancelled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

export default router;
