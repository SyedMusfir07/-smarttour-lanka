import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/prisma';
import { authenticate, authorizeRole } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const createReviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().min(1).max(2000),
});

// ── POST /api/reviews ──────────────────────────────────────────────────

router.post('/', authenticate, authorizeRole('TOURIST'), validate(createReviewSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { bookingId, rating, reviewText } = req.body;

    // Check booking exists and belongs to user
    const booking = await prisma.booking.findUnique({
      where: { bookingId },
    });

    if (!booking) {
      res.status(404).json({ success: false, error: 'Booking not found' });
      return;
    }

    if (booking.userId !== userId) {
      res.status(403).json({ success: false, error: 'You can only review your own bookings' });
      return;
    }

    // Enforce: Reviews can only be created for COMPLETED bookings
    if (booking.status !== 'COMPLETED') {
      res.status(400).json({
        success: false,
        error: `Reviews can only be submitted for completed bookings. Current status: ${booking.status}`,
      });
      return;
    }

    // Check if review already exists
    const existing = await prisma.review.findUnique({
      where: { bookingId },
    });

    if (existing) {
      res.status(409).json({ success: false, error: 'A review for this booking already exists' });
      return;
    }

    const review = await prisma.review.create({
      data: {
        reviewId: uuidv4(),
        bookingId,
        userId,
        providerId: booking.providerId,
        rating,
        reviewText,
      },
      include: {
        user: { select: { fullName: true } },
        provider: { select: { fullName: true } },
        booking: { select: { startTime: true, durationHours: true, netAmount: true } },
      },
    });

    // Update provider average rating
    const avgResult = await prisma.review.aggregate({
      where: { providerId: booking.providerId },
      _avg: { rating: true },
    });

    await prisma.provider.update({
      where: { providerId: booking.providerId },
      data: { ratingAverage: Math.round((avgResult._avg.rating || 0) * 10) / 10 },
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review,
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /api/reviews/provider/:id ───────────────────────────────────────

router.get('/provider/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const reviews = await prisma.review.findMany({
      where: { providerId: id },
      include: {
        user: { select: { fullName: true } },
        booking: { select: { startTime: true, durationHours: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    res.json({
      success: true,
      data: {
        reviews,
        stats: {
          totalReviews: reviews.length,
          averageRating: Math.round(avgRating * 10) / 10,
          distribution: [1, 2, 3, 4, 5].map((star) => ({
            star,
            count: reviews.filter((r) => r.rating === star).length,
          })),
        },
      },
    });
  } catch (error) {
    console.error('Get provider reviews error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
