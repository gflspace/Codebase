import { Router, Response } from 'express';
import { prisma } from '../index';
import { AuthRequest, requireAdmin } from '../middleware/auth';
import { createGoogleSheetExport } from '../services/googleSheets';

const router = Router();

// All export routes require admin access
router.use(requireAdmin);

// Create export request
router.post('/request', async (req: AuthRequest, res: Response) => {
  try {
    const { reportType, filters, timeRange } = req.body;

    if (!reportType || !['customers', 'appointments', 'revenue', 'promotions'].includes(reportType)) {
      return res.status(400).json({ error: 'Invalid report type' });
    }

    // Create export request record
    const exportRequest = await prisma.exportRequest.create({
      data: {
        requestedBy: req.user!.id,
        reportType,
        filters: filters || {},
        status: 'pending',
      },
    });

    // Process export asynchronously
    processExport(exportRequest.id, reportType, filters, timeRange, req.user!.id)
      .catch((error) => {
        console.error('Export processing error:', error);
        prisma.exportRequest.update({
          where: { id: exportRequest.id },
          data: { status: 'failed' },
        });
      });

    res.status(202).json({
      exportRequest: {
        id: exportRequest.id,
        status: 'processing',
        reportType,
      },
      message: 'Export request submitted. You will be notified when ready.',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create export request' });
  }
});

// Get export status
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const exportRequest = await prisma.exportRequest.findUnique({
      where: { id },
    });

    if (!exportRequest) {
      return res.status(404).json({ error: 'Export request not found' });
    }

    if (exportRequest.requestedBy !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({ exportRequest });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch export request' });
  }
});

// Get all export requests
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const exportRequests = await prisma.exportRequest.findMany({
      where: { requestedBy: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ exportRequests });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch export requests' });
  }
});

// Process export asynchronously
async function processExport(
  exportId: string,
  reportType: string,
  filters: any,
  timeRange: any,
  userId: string
) {
  try {
    await prisma.exportRequest.update({
      where: { id: exportId },
      data: { status: 'processing' },
    });

    let data: any[] = [];
    let headers: string[] = [];

    switch (reportType) {
      case 'customers':
        const customers = await prisma.client.findMany({
          include: {
            appointments: {
              where: { status: 'COMPLETED' },
              include: { revenueLog: true },
            },
          },
        });

        data = customers.map((customer) => {
          const totalSpend = customer.appointments.reduce(
            (sum, apt) => sum + (apt.revenueLog ? Number(apt.revenueLog.amount) : 0),
            0
          );
          const lastAppointment = customer.appointments
            .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())[0];

          return {
            Name: `${customer.firstName} ${customer.lastName}`,
            Email: customer.email || '',
            Phone: customer.phone,
            'Visit Count': customer.appointments.length,
            'Total Spend': totalSpend,
            'Last Appointment': lastAppointment
              ? lastAppointment.startTime.toISOString().split('T')[0]
              : '',
          };
        });

        headers = ['Name', 'Email', 'Phone', 'Visit Count', 'Total Spend', 'Last Appointment'];
        break;

      case 'appointments':
        const where: any = {};
        if (timeRange?.startDate) where.startTime = { gte: new Date(timeRange.startDate) };
        if (timeRange?.endDate) {
          where.startTime = {
            ...where.startTime,
            lte: new Date(timeRange.endDate),
          };
        }
        if (filters?.status) where.status = filters.status;
        if (filters?.clientId) where.clientId = filters.clientId;

        const appointments = await prisma.appointment.findMany({
          where,
          include: {
            client: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
          orderBy: { startTime: 'desc' },
        });

        data = appointments.map((apt) => ({
          Date: apt.startTime.toISOString().split('T')[0],
          'Start Time': apt.startTime.toTimeString().split(' ')[0],
          'End Time': apt.endTime.toTimeString().split(' ')[0],
          Client: `${apt.client.firstName} ${apt.client.lastName}`,
          'Client Email': apt.client.email || '',
          'Client Phone': apt.client.phone,
          Hairstyle: apt.hairstyleName,
          Status: apt.status,
          Revenue: Number(apt.price),
          Duration: `${apt.duration} min`,
        }));

        headers = ['Date', 'Start Time', 'End Time', 'Client', 'Client Email', 'Client Phone', 'Hairstyle', 'Status', 'Revenue', 'Duration'];
        break;

      case 'revenue':
        const revenueWhere: any = {};
        if (timeRange?.startDate) revenueWhere.date = { gte: new Date(timeRange.startDate) };
        if (timeRange?.endDate) {
          revenueWhere.date = {
            ...revenueWhere.date,
            lte: new Date(timeRange.endDate),
          };
        }
        if (filters?.clientId) revenueWhere.clientId = filters.clientId;

        const revenueLogs = await prisma.revenueLog.findMany({
          where: revenueWhere,
          include: {
            client: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            appointment: {
              select: {
                scheduledAt: true,
              },
            },
          },
          orderBy: { date: 'desc' },
        });

        data = revenueLogs.map((log) => ({
          Date: log.date.toISOString().split('T')[0],
          Client: `${log.client.firstName} ${log.client.lastName}`,
          Service: log.hairstyleName,
          Amount: Number(log.amount),
          'Appointment Date': log.appointment.startTime.toISOString().split('T')[0],
        }));

        headers = ['Date', 'Client', 'Service', 'Amount', 'Appointment Date'];
        break;

      case 'promotions':
        const promotions = await prisma.promotion.findMany({
          orderBy: { createdAt: 'desc' },
        });

        data = promotions.map((promo) => ({
          Name: promo.name,
          Description: promo.description,
          'Discount Type': promo.discountType,
          'Discount Value': Number(promo.discountValue),
          'Start Date': promo.startDate.toISOString().split('T')[0],
          'End Date': promo.endDate.toISOString().split('T')[0],
          Status: promo.status,
        }));

        headers = ['Name', 'Description', 'Discount Type', 'Discount Value', 'Start Date', 'End Date', 'Status'];
        break;
    }

    // Create Google Sheet
    const { sheetId, sheetUrl } = await createGoogleSheetExport(
      `${reportType}_export_${new Date().toISOString().split('T')[0]}`,
      headers,
      data
    );

    // Update export request
    await prisma.exportRequest.update({
      where: { id: exportId },
      data: {
        status: 'completed',
        googleSheetId: sheetId,
        googleSheetUrl: sheetUrl,
        completedAt: new Date(),
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'export_completed',
        resource: exportId,
        details: { reportType, filters, timeRange },
      },
    });
  } catch (error) {
    console.error('Export processing failed:', error);
    await prisma.exportRequest.update({
      where: { id: exportId },
      data: { status: 'failed' },
    });
    throw error;
  }
}

export default router;
