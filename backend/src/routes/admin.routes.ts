import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import { authenticate, authorizeRole } from '../middleware/auth';

const router = Router();

// All admin routes require authentication + ADMIN role

// ── GET /api/admin/verification-queue ───────────────────────────────────

router.get('/verification-queue', authenticate, authorizeRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    const pendingProviders = await prisma.provider.findMany({
      where: { isVerified: false },
      include: {
        guideProfile: true,
        surfProfile: true,
        yogaProfile: true,
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: pendingProviders,
      count: pendingProviders.length,
    });
  } catch (error) {
    console.error('Verification queue error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── POST /api/admin/providers/:id/verify ────────────────────────────────

router.post('/providers/:id/verify', authenticate, authorizeRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const provider = await prisma.provider.findUnique({ where: { providerId: id } });
    if (!provider) {
      res.status(404).json({ success: false, error: 'Provider not found' });
      return;
    }

    if (provider.isVerified) {
      res.status(400).json({ success: false, error: 'Provider is already verified' });
      return;
    }

    const updated = await prisma.provider.update({
      where: { providerId: id },
      data: { isVerified: true },
      select: {
        providerId: true,
        fullName: true,
        email: true,
        providerType: true,
        isVerified: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      message: 'Provider verified and activated. Pin is now live on the tourist map.',
      data: updated,
    });
  } catch (error) {
    console.error('Verify provider error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── POST /api/admin/providers/:id/reject ────────────────────────────────

router.post('/providers/:id/reject', authenticate, authorizeRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;

    const provider = await prisma.provider.findUnique({ where: { providerId: id } });
    if (!provider) {
      res.status(404).json({ success: false, error: 'Provider not found' });
      return;
    }

    if (provider.isVerified) {
      res.status(400).json({ success: false, error: 'Provider is already verified' });
      return;
    }

    // Delete the rejected provider
    await prisma.provider.delete({ where: { providerId: id } });

    res.json({
      success: true,
      message: `Provider rejected${reason ? ': ' + reason : ''}`,
    });
  } catch (error) {
    console.error('Reject provider error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /api/admin/analytics ────────────────────────────────────────────

router.get('/analytics', authenticate, authorizeRole('ADMIN'), async (_req: Request, res: Response) => {
  try {
    // Total counts
    const totalUsers = await prisma.user.count();
    const totalProviders = await prisma.provider.count();
    const verifiedProviders = await prisma.provider.count({ where: { isVerified: true } });
    const pendingProviders = await prisma.provider.count({ where: { isVerified: false } });
    const totalBookings = await prisma.booking.count();
    const totalEvents = await prisma.liveEvent.count();
    const totalReviews = await prisma.review.count();

    // Revenue
    const completedBookings = await prisma.booking.findMany({
      where: { status: { in: ['COMPLETED', 'ONGOING'] } },
      select: { netAmount: true },
    });
    const totalRevenue = completedBookings.reduce((sum, b) => sum + Number(b.netAmount), 0);
    const platformCommission = totalRevenue * 0.1;

    // Booking status breakdown
    const statusBreakdown = await prisma.booking.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    // Weekly bookings (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyBookings = await prisma.booking.findMany({
      where: { createdAt: { gte: weekAgo } },
      orderBy: { createdAt: 'asc' },
    });

    // Daily booking counts for the week
    const dailyBookings: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyBookings[key] = 0;
    }
    weeklyBookings.forEach((b) => {
      const key = b.createdAt.toISOString().split('T')[0];
      if (dailyBookings[key] !== undefined) dailyBookings[key]++;
    });

    // Provider type breakdown
    const providerTypeBreakdown = await prisma.provider.groupBy({
      by: ['providerType'],
      _count: { providerType: true },
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalProviders,
          verifiedProviders,
          pendingProviders,
          totalBookings,
          totalEvents,
          totalReviews,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          platformCommission: Math.round(platformCommission * 100) / 100,
        },
        statusBreakdown: statusBreakdown.map((s) => ({
          status: s.status,
          count: s._count.status,
        })),
        weeklyBookings: Object.entries(dailyBookings).map(([date, count]) => ({
          date,
          count,
        })),
        providerTypeBreakdown: providerTypeBreakdown.map((p) => ({
          type: p.providerType,
          count: p._count.providerType,
        })),
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /api/admin/bookings (All bookings oversight) ────────────────────

router.get('/bookings', authenticate, authorizeRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const limit = req.query.limit as string | undefined;
    const where: any = {};
    if (status) where.status = status;

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        user: { select: { userId: true, fullName: true, email: true } },
        provider: { select: { providerId: true, fullName: true, providerType: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string) || 50,
    });

    res.json({ success: true, data: bookings, count: bookings.length });
  } catch (error) {
    console.error('Admin bookings error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
