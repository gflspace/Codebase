import { Router, Request, Response } from 'express';
import { prisma } from '../index';

const router = Router();

// Get calendar availability (PUBLIC)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    // Check if schedule is published
    const publishedCheck = await prisma.businessHours.findFirst({
      select: { isPublished: true }
    });

    if (!publishedCheck?.isPublished) {
      return res.json({
        slots: [],
        businessHours: [],
        isPublished: false,
        message: 'Contact for availability'
      });
    }

    const now = new Date();
    const start = startDate ? new Date(startDate as string) : new Date(now);
    const end = endDate ? new Date(endDate as string) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

    // Ensure we only show future dates
    if (start < now) {
      start.setTime(now.getTime());
    }

    // Get business hours
    const businessHours = await prisma.businessHours.findMany({
      orderBy: { dayOfWeek: 'asc' },
    });

    // Get admin calendar blocks (single source of truth)
    const calendarBlocks = await prisma.calendarBlock.findMany({
      where: {
        date: {
          gte: new Date(start.getFullYear(), start.getMonth(), start.getDate()),
          lte: new Date(end.getFullYear(), end.getMonth(), end.getDate()),
        },
      },
    });

    // Get existing appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        startTime: { gte: start },
        endTime: { lte: end },
        status: { not: 'CANCELLED' },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
      },
    });

    // Generate time slots
    const slots: any[] = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      const dayHours = businessHours.find((bh) => bh.dayOfWeek === dayOfWeek);

      if (dayHours && dayHours.isOpen && dayHours.openTime && dayHours.closeTime) {
        const [openHour, openMin] = dayHours.openTime.split(':').map(Number);
        const [closeHour, closeMin] = dayHours.closeTime.split(':').map(Number);

        const slotStart = new Date(currentDate);
        slotStart.setHours(openHour, openMin, 0, 0);

        const slotEnd = new Date(currentDate);
        slotEnd.setHours(closeHour, closeMin, 0, 0);

        // Only add slots in the future
        if (slotStart >= now) {
          // Check admin calendar blocks first (single source of truth)
          const dateKey = currentDate.toISOString().split('T')[0];
          const dayBlock = calendarBlocks.find((block) => {
            const blockDate = block.date.toISOString().split('T')[0];
            return blockDate === dateKey;
          });

          let status: 'open' | 'booked' | 'blocked' | 'not_available';

          // If day is blocked, check if specific time slot is open
          if (dayBlock) {
            if (dayBlock.isBlocked) {
              // Day is blocked, but check if specific time slot is explicitly open
              if (dayBlock.startTime && dayBlock.endTime) {
                const blockStart = new Date(dayBlock.startTime);
                const blockEnd = new Date(dayBlock.endTime);
                // If slot overlaps with block, it's blocked
                if (
                  (slotStart >= blockStart && slotStart < blockEnd) ||
                  (slotEnd > blockStart && slotEnd <= blockEnd) ||
                  (slotStart <= blockStart && slotEnd >= blockEnd)
                ) {
                  status = 'blocked';
                } else {
                  // Slot is outside block, check appointments
                  const conflictingAppointment = appointments.find((apt) => {
                    const aptStart = new Date(apt.startTime);
                    const aptEnd = new Date(apt.endTime);
                    return (
                      (slotStart >= aptStart && slotStart < aptEnd) ||
                      (slotEnd > aptStart && slotEnd <= aptEnd) ||
                      (slotStart <= aptStart && slotEnd >= aptEnd)
                    );
                  });
                  status = conflictingAppointment?.status === 'CONFIRMED' ? 'booked' : 'open';
                }
              } else {
                // Entire day is blocked
                status = 'blocked';
              }
            } else {
              // Day is explicitly open, check appointments
              const conflictingAppointment = appointments.find((apt) => {
                const aptStart = new Date(apt.startTime);
                const aptEnd = new Date(apt.endTime);
                return (
                  (slotStart >= aptStart && slotStart < aptEnd) ||
                  (slotEnd > aptStart && slotEnd <= aptEnd) ||
                  (slotStart <= aptStart && slotEnd >= aptEnd)
                );
              });
              status = conflictingAppointment?.status === 'CONFIRMED' ? 'booked' : 'open';
            }
          } else {
            // No admin block, check appointments only
            const conflictingAppointment = appointments.find((apt) => {
              const aptStart = new Date(apt.startTime);
              const aptEnd = new Date(apt.endTime);
              return (
                (slotStart >= aptStart && slotStart < aptEnd) ||
                (slotEnd > aptStart && slotEnd <= aptEnd) ||
                (slotStart <= aptStart && slotEnd >= aptEnd)
              );
            });
            status = conflictingAppointment?.status === 'CONFIRMED' ? 'booked' : 'open';
          }

          slots.push({
            date: currentDate.toISOString().split('T')[0],
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            status,
            dayOfWeek,
          });
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
    }

    res.json({
      slots,
      businessHours: businessHours.map((bh) => ({
        dayOfWeek: bh.dayOfWeek,
        isOpen: bh.isOpen,
        openTime: bh.openTime,
        closeTime: bh.closeTime,
      })),
    });
  } catch (error) {
    console.error('Availability error:', error);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// Get detailed availability for a specific date range with time slots
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, slotDuration = 60 } = req.query; // slotDuration in minutes

    // Check if schedule is published
    const publishedCheck = await prisma.businessHours.findFirst({
      select: { isPublished: true }
    });

    if (!publishedCheck?.isPublished) {
      return res.json({
        availability: {},
        isPublished: false,
        message: 'Contact for availability'
      });
    }

    const now = new Date();
    const start = startDate ? new Date(startDate as string) : new Date(now);
    const end = endDate ? new Date(endDate as string) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Default 7 days

    if (start < now) {
      start.setTime(now.getTime());
    }

    const businessHours = await prisma.businessHours.findMany({
      orderBy: { dayOfWeek: 'asc' },
    });

    const appointments = await prisma.appointment.findMany({
      where: {
        startTime: { gte: start },
        endTime: { lte: end },
        status: { not: 'CANCELLED' },
      },
    });

    const availability: any = {};
    const currentDate = new Date(start);
    const duration = parseInt(slotDuration as string) * 60 * 1000; // Convert to milliseconds

    while (currentDate <= end) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();
      const dayHours = businessHours.find((bh) => bh.dayOfWeek === dayOfWeek);

      availability[dateKey] = {
        date: dateKey,
        dayOfWeek,
        isOpen: dayHours?.isOpen || false,
        openTime: dayHours?.openTime || null,
        closeTime: dayHours?.closeTime || null,
        slots: [] as any[],
      };

      if (dayHours && dayHours.isOpen && dayHours.openTime && dayHours.closeTime) {
        const [openHour, openMin] = dayHours.openTime.split(':').map(Number);
        const [closeHour, closeMin] = dayHours.closeTime.split(':').map(Number);

        let slotTime = new Date(currentDate);
        slotTime.setHours(openHour, openMin, 0, 0);

        const dayEnd = new Date(currentDate);
        dayEnd.setHours(closeHour, closeMin, 0, 0);

        while (slotTime < dayEnd) {
          const slotEnd = new Date(slotTime.getTime() + duration);

          if (slotEnd > dayEnd) break;
          if (slotTime < now) {
            slotTime = new Date(slotTime.getTime() + duration);
            continue;
          }

          // Check for conflicts
          const conflict = appointments.find((apt) => {
            const aptStart = new Date(apt.startTime);
            const aptEnd = new Date(apt.endTime);
            return (
              (slotTime >= aptStart && slotTime < aptEnd) ||
              (slotEnd > aptStart && slotEnd <= aptEnd) ||
              (slotTime <= aptStart && slotEnd >= aptEnd)
            );
          });

          let status: 'open' | 'booked' | 'blocked' | 'not_available';
          if (conflict) {
            status = conflict.status === 'CONFIRMED' ? 'booked' : 'open';
          } else {
            status = 'open';
          }

          availability[dateKey].slots.push({
            startTime: slotTime.toISOString(),
            endTime: slotEnd.toISOString(),
            status,
          });

          slotTime = new Date(slotTime.getTime() + duration);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
    }

    res.json({ availability });
  } catch (error) {
    console.error('Detailed availability error:', error);
    res.status(500).json({ error: 'Failed to fetch detailed availability' });
  }
});

export default router;
