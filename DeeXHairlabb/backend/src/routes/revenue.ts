import { Router, Response } from 'express';
import { prisma } from '../index';
import { AuthRequest, requireAdmin } from '../middleware/auth';

const router = Router();

// All revenue routes require admin access
router.use(requireAdmin);

// Get revenue analytics
router.get('/analytics', async (req: AuthRequest, res: Response) => {
  try {
    const { timeframe, startDate, endDate, clientId } = req.query;

    const where: any = {};

    if (clientId) {
      where.clientId = clientId as string;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    } else if (timeframe) {
      const now = new Date();
      let start: Date;

      switch (timeframe) {
        case 'today':
          start = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          start = new Date(now);
          start.setDate(start.getDate() - 7);
          break;
        case 'month':
          start = new Date(now);
          start.setMonth(start.getMonth() - 1);
          break;
        case 'quarter':
          start = new Date(now);
          start.setMonth(start.getMonth() - 3);
          break;
        case 'year':
          start = new Date(now);
          start.setFullYear(start.getFullYear() - 1);
          break;
        default:
          start = new Date(0);
      }
      where.date = { gte: start };
    }

    const revenueLogs = await prisma.revenueLog.findMany({
      where,
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
        appointment: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // If no revenue logs, fall back to completed appointments for trend data
    let trendData: { date: string; amount: number }[] = [];
    let totalRevenue = 0;
    let count = 0;

    if (revenueLogs.length > 0) {
      // Calculate totals from revenue logs
      totalRevenue = revenueLogs.reduce(
        (sum, log) => sum + Number(log.amount),
        0
      );
      count = revenueLogs.length;

      // Generate trend data from revenue logs
      const dailyRevenue: Record<string, number> = {};
      revenueLogs.forEach((log) => {
        const dateKey = new Date(log.date).toISOString().split('T')[0];
        dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + Number(log.amount);
      });
      trendData = Object.entries(dailyRevenue)
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } else {
      // Fall back to completed appointments for trend data
      const completedAppointments = await prisma.appointment.findMany({
        where: {
          status: 'COMPLETED',
          ...(where.date ? { startTime: where.date } : {}),
        },
        orderBy: { startTime: 'asc' },
      });

      totalRevenue = completedAppointments.reduce(
        (sum, apt) => sum + Number(apt.price || 0),
        0
      );
      count = completedAppointments.length;

      // Generate trend data from appointments
      const dailyRevenue: Record<string, number> = {};
      completedAppointments.forEach((apt) => {
        const dateKey = new Date(apt.startTime).toISOString().split('T')[0];
        dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + Number(apt.price || 0);
      });
      trendData = Object.entries(dailyRevenue)
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    // Calculate average ticket
    const averageTicket = count > 0 ? totalRevenue / count : 0;

    // Group by service (hairstyle)
    const revenueByService = revenueLogs.reduce((acc, log) => {
      const service = log.hairstyleName;
      acc[service] = (acc[service] || 0) + Number(log.amount);
      return acc;
    }, {} as Record<string, number>);

    // Group by client
    const revenueByClient = revenueLogs.reduce((acc, log) => {
      const clientId = log.clientId;
      const clientName = `${log.client.firstName} ${log.client.lastName}`;
      if (!acc[clientId]) {
        acc[clientId] = {
          name: clientName,
          email: log.client.email || '',
          phone: log.client.phone || '',
          total: 0,
          count: 0,
        };
      }
      acc[clientId].total += Number(log.amount);
      acc[clientId].count += 1;
      return acc;
    }, {} as Record<string, { name: string; email: string; phone: string; total: number; count: number }>);

    res.json({
      totalRevenue,
      averageTicket,
      revenueByService,
      revenueByClient: Object.values(revenueByClient),
      revenueLogs,
      trendData,
      count,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
});

// Get revenue by time period
router.get('/by-period', async (req: AuthRequest, res: Response) => {
  try {
    const { period, startDate, endDate } = req.query;

    if (!period || !['day', 'week', 'month', 'quarter', 'year'].includes(period as string)) {
      return res.status(400).json({ error: 'Invalid period. Must be: day, week, month, quarter, year' });
    }

    const start = startDate ? new Date(startDate as string) : new Date(0);
    const end = endDate ? new Date(endDate as string) : new Date();

    const revenueLogs = await prisma.revenueLog.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Group by period
    const grouped: Record<string, number> = {};

    revenueLogs.forEach((log) => {
      const date = new Date(log.date);
      let key: string;

      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'quarter':
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          key = `${date.getFullYear()}-Q${quarter}`;
          break;
        case 'year':
          key = String(date.getFullYear());
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      grouped[key] = (grouped[key] || 0) + Number(log.amount);
    });

    res.json({ revenueByPeriod: grouped });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch revenue by period' });
  }
});

export default router;
