import { Router, Request, Response } from 'express';
import prisma from '../config/prisma';
import { authenticate, authorizeRole } from '../middleware/auth';
import { haversineDistance } from '../utils/geospatial';

const router = Router();

// ── GET /api/providers/nearby?lat&lng&type&radius&search&isAvailable&timeFilter ──

router.get('/nearby', async (req: Request, res: Response) => {
  try {
    const lat = req.query.lat as string;
    const lng = req.query.lng as string;
    const type = req.query.type as string | undefined;
    const radius = req.query.radius as string | undefined;
    const search = req.query.search as string | undefined;
    const isAvailable = req.query.isAvailable as string | undefined;
    const centerLat = parseFloat(lat as string);
    const centerLng = parseFloat(lng as string);
    const searchRadius = parseInt(radius as string) || 50000; // default 50km

    const where: any = { isVerified: true };
    
    // Filter by provider type
    if (type && type !== 'ALL') {
      where.providerType = type;
    }

    // Filter by availability
    if (isAvailable === 'true') {
      where.isAvailable = true;
    }

    // Search by name, city, or district
    if (search && (search as string).trim()) {
      const q = (search as string).trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { district: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    const providers = await prisma.provider.findMany({
      where,
      include: {
        guideProfile: true,
        surfProfile: true,
        yogaProfile: true,
        _count: { select: { reviews: true } },
      },
    });

    // If we have coordinates, calculate distance and filter by radius
    let filteredProviders = providers;
    if (!isNaN(centerLat) && !isNaN(centerLng)) {
      filteredProviders = providers
        .filter((p) => {
          if (!p.baseLat || !p.baseLng) return false;
          const dist = haversineDistance(
            { lat: centerLat, lng: centerLng },
            { lat: Number(p.baseLat), lng: Number(p.baseLng) }
          );
          return dist <= searchRadius;
        })
        .map((p) => ({
          ...p,
          distance: haversineDistance(
            { lat: centerLat, lng: centerLng },
            { lat: Number(p.baseLat), lng: Number(p.baseLng) }
          ),
        }))
        .sort((a: any, b: any) => a.distance - b.distance);
    }

    res.json({
      success: true,
      data: filteredProviders,
      count: filteredProviders.length,
    });
  } catch (error) {
    console.error('Nearby providers error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /api/providers/:id ──────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const provider = await prisma.provider.findUnique({
      where: { providerId: id },
      include: {
        guideProfile: true,
        surfProfile: true,
        yogaProfile: true,
        reviews: {
          include: {
            user: { select: { fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { reviews: true, bookings: true } },
      },
    });

    if (!provider) {
      res.status(404).json({ success: false, error: 'Provider not found' });
      return;
    }

    // Calculate average rating
    const p = provider as any;
    const avgRating = p.reviews?.length > 0
      ? p.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / p.reviews.length
      : provider.ratingAverage;

    res.json({
      success: true,
      data: {
        ...provider,
        ratingAverage: avgRating,
      },
    });
  } catch (error) {
    console.error('Get provider error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /api/provider/dashboard/stats ───────────────────────────────────

router.get('/dashboard/stats', authenticate, authorizeRole('PROVIDER'), async (req: Request, res: Response) => {
  try {
    const providerId = req.user!.userId;

    const totalBookings = await prisma.booking.count({
      where: { providerId },
    });

    const pendingBookings = await prisma.booking.count({
      where: { providerId, status: 'PENDING' },
    });

    const confirmedBookings = await prisma.booking.count({
      where: { providerId, status: 'CONFIRMED' },
    });

    const completedBookings = await prisma.booking.count({
      where: { providerId, status: 'COMPLETED' },
    });

    const earningsResult = await prisma.booking.aggregate({
      where: { providerId, status: { in: ['COMPLETED', 'ONGOING'] } },
      _sum: { netAmount: true },
    });

    const recentBookings = await prisma.booking.findMany({
      where: { providerId },
      include: {
        user: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const avgRating = await prisma.review.aggregate({
      where: { providerId },
      _avg: { rating: true },
    });

    const totalReviews = await prisma.review.count({
      where: { providerId },
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalBookings,
          pendingBookings,
          confirmedBookings,
          completedBookings,
          totalEarnings: earningsResult._sum.netAmount || 0,
          averageRating: avgRating._avg.rating || 0,
          totalReviews,
        },
        recentBookings,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── PATCH /api/provider/availability ────────────────────────────────────

router.patch('/availability', authenticate, authorizeRole('PROVIDER'), async (req: Request, res: Response) => {
  try {
    const providerId = req.user!.userId;
    const { isAvailable, availability } = req.body;

    const provider = await prisma.provider.update({
      where: { providerId },
      data: {
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Availability updated',
      data: { isAvailable, availability },
    });
  } catch (error) {
    console.error('Availability update error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
