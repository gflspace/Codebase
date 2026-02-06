import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index';

const router = Router();

const createBookingSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  hairstyleName: z.string().optional(),
  price: z.number().nonnegative().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  notes: z.string().optional(),
});

// Get available time slots (PUBLIC - no auth required)
router.get('/availability', async (req: Request, res: Response) => {
  try {
    const { date, duration } = req.query;

    if (!date || !duration) {
      return res.status(400).json({ error: 'Date and duration are required' });
    }

    // Check if schedule is published
    const publishedCheck = await prisma.businessHours.findFirst({
      select: { isPublished: true }
    });

    if (!publishedCheck?.isPublished) {
      return res.json({
        availableSlots: [],
        isPublished: false,
        message: 'Contact for availability'
      });
    }

    // Parse date as local time
    const [year, month, day] = (date as string).split('-').map(Number);
    const requestedDate = new Date(year, month - 1, day);
    const requestedDuration = parseInt(duration as string);
    const now = new Date();

    // CRITICAL: Only show future dates (compare just the date part)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (requestedDate < todayStart) {
      return res.status(400).json({ error: 'Cannot book appointments in the past' });
    }

    // Get business hours for the requested day
    const dayOfWeek = requestedDate.getDay();

    const businessHours = await prisma.businessHours.findFirst({
      where: { dayOfWeek },
    });

    if (!businessHours || !businessHours.isOpen) {
      return res.json({ availableSlots: [], message: 'Business is closed on this day' });
    }

    // Parse business hours
    const [openHour, openMin] = businessHours.openTime?.split(':').map(Number) || [9, 0];
    const [closeHour, closeMin] = businessHours.closeTime?.split(':').map(Number) || [18, 0];

    // Get existing appointments for the day
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          not: 'CANCELLED',
        },
      },
    });

    // Generate available slots (only future times)
    const availableSlots: string[] = [];
    const currentTime = new Date(year, month - 1, day, openHour, openMin, 0, 0);

    // If requesting today, start from current time
    if (currentTime.toDateString() === now.toDateString()) {
      currentTime.setHours(now.getHours(), now.getMinutes(), 0, 0);
      // Round up to next 30-minute slot
      const minutes = currentTime.getMinutes();
      if (minutes > 0) {
        currentTime.setMinutes(minutes <= 30 ? 30 : 60);
        if (currentTime.getMinutes() === 60) {
          currentTime.setHours(currentTime.getHours() + 1);
          currentTime.setMinutes(0);
        }
      }
    }

    const slotInterval = 30; // 30-minute slots
    const endOfBusiness = new Date(year, month - 1, day, closeHour, closeMin, 0, 0);

    while (currentTime < endOfBusiness) {
      const slotEnd = new Date(currentTime);
      slotEnd.setMinutes(slotEnd.getMinutes() + requestedDuration);

      // CRITICAL: Only include future slots
      if (currentTime <= now) {
        currentTime.setMinutes(currentTime.getMinutes() + slotInterval);
        continue;
      }

      // Check if slot conflicts with existing appointments
      const hasConflict = existingAppointments.some((apt) => {
        const aptStart = new Date(apt.startTime);
        const aptEnd = new Date(apt.endTime);

        return (
          (currentTime >= aptStart && currentTime < aptEnd) ||
          (slotEnd > aptStart && slotEnd <= aptEnd) ||
          (currentTime <= aptStart && slotEnd >= aptEnd)
        );
      });

      if (!hasConflict && slotEnd <= endOfBusiness) {
        availableSlots.push(currentTime.toISOString());
      }

      currentTime.setMinutes(currentTime.getMinutes() + slotInterval);
    }

    res.json({ availableSlots });
  } catch (error) {
    console.error('Availability check error:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// Create booking (PUBLIC - no auth required)
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = createBookingSchema.parse(req.body);
    const now = new Date();

    // CRITICAL: Validate times are in the future
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

    // Find or create client
    let client = await prisma.client.findFirst({
      where: {
        phone: data.phone,
      },
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          email: data.email,
        },
      });
    } else {
      // Update client info if provided
      client = await prisma.client.update({
        where: { id: client.id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email || client.email,
        },
      });
    }

    // Calculate duration
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        clientId: client.id,
        hairstyleName: data.hairstyleName || 'Custom Service',
        price: data.price || 0,
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        status: 'CONFIRMED',
        notes: data.notes,
      },
      include: {
        client: true,
      },
    });

    res.status(201).json({
      appointment,
      message: 'Appointment booked successfully!',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Booking error:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Get business hours (PUBLIC)
router.get('/business-hours', async (req: Request, res: Response) => {
  try {
    const hours = await prisma.businessHours.findMany({
      orderBy: { dayOfWeek: 'asc' },
    });

    res.json({ businessHours: hours });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch business hours' });
  }
});

export default router;
