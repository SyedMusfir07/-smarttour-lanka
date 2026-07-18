import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/prisma';
import { authenticate, authorizeRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { calculateFlexiFare } from '../services/pricing';
import { validateSurfBooking, validateYogaBooking } from '../services/inventory';

const router = Router();

// ── Validation Schemas ──────────────────────────────────────────────────

const createBookingSchema = z.object({
  providerId: z.string().uuid(),
  startTime: z.string().datetime(),
  durationHours: z.number().positive().max(24),
  addOnsTotal: z.number().min(0).optional(),
  netAmount: z.number().positive(),
  // Surf-specific fields
  requestedBoards: z.number().int().min(0).optional(),
  requestedStudents: z.number().int().min(0).optional(),
  // Yoga-specific fields
  requestedSlots: z.number().int().min(0).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'ONGOING', 'COMPLETED', 'CANCELLED']),
});

// ── Helper: Validate booking state transitions ──────────────────────────

const validTransitions: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ONGOING', 'CANCELLED'],
  ONGOING: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

function isValidTransition(from: string, to: string): boolean {
  return validTransitions[from]?.includes(to) || false;
}

// ── POST /api/bookings ──────────────────────────────────────────────────

router.post('/', authenticate, authorizeRole('TOURIST'), validate(createBookingSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { providerId, startTime, durationHours, addOnsTotal = 0, netAmount, requestedBoards, requestedStudents, requestedSlots } = req.body;

    // Check provider exists and is verified
    const provider = await prisma.provider.findUnique({
      where: { providerId },
      include: { surfProfile: true, yogaProfile: true, guideProfile: true },
    });

    if (!provider) {
      res.status(404).json({ success: false, error: 'Provider not found' });
      return;
    }

    if (!provider.isVerified) {
      res.status(400).json({ success: false, error: 'Provider is not yet verified' });
      return;
    }

    // Check for double-booking (same provider, same time slot)
    const existingBooking = await prisma.booking.findFirst({
      where: {
        providerId,
        startTime: new Date(startTime),
        status: { in: ['PENDING', 'CONFIRMED', 'ONGOING'] },
      },
    });

    if (existingBooking) {
      res.status(409).json({
        success: false,
        error: 'This time slot is already booked. Please choose a different time.',
      });
      return;
    }

    // Provider-specific validations
    if (provider.providerType === 'SURF_SCHOOL' && provider.surfProfile) {
      const surf = provider.surfProfile;
      const previousSurfBookings = await prisma.booking.count({
        where: {
          providerId,
          startTime: new Date(startTime),
          status: { in: ['PENDING', 'CONFIRMED', 'ONGOING'] },
        },
      });

      const validation = validateSurfBooking({
        boardInventory: surf.boardInventory,
        boardsAlreadyReserved: previousSurfBookings * (requestedBoards || 1),
        requestedBoards: requestedBoards || 1,
        instructorCount: surf.instructorCount,
        requestedStudents: requestedStudents || 1,
      });

      if (!validation.valid) {
        res.status(400).json({ success: false, error: validation.error });
        return;
      }
    }

    if (provider.providerType === 'YOGA_STUDIO' && provider.yogaProfile) {
      const yoga = provider.yogaProfile;
      const validation = validateYogaBooking({
        currentOccupancy: yoga.currentOccupancy,
        maxMatCapacity: yoga.maxMatCapacity,
        requestedSlots: requestedSlots || 1,
      });

      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: 'Class is full. Join the waitlist or check alternative studios.',
          isWaitlisted: true,
          availableSlots: validation.availableSlots,
        });
        return;
      }

      // Increment occupancy
      await prisma.yogaProfile.update({
        where: { yogaId: providerId },
        data: { currentOccupancy: { increment: requestedSlots || 1 } },
      });
    }

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        bookingId: uuidv4(),
        userId,
        providerId,
        startTime: new Date(startTime),
        durationHours,
        addOnsTotal,
        netAmount,
        status: 'PENDING',
      },
      include: {
        user: { select: { fullName: true, email: true } },
        provider: { select: { fullName: true, providerType: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking,
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /api/bookings/:id ───────────────────────────────────────────────

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const booking = await prisma.booking.findUnique({
      where: { bookingId: id },
      include: {
        user: { select: { userId: true, fullName: true, email: true, phoneNo: true } },
        provider: {
          select: {
            providerId: true, fullName: true, providerType: true,
            isVerified: true, ratingAverage: true,
          },
        },
        review: true,
      },
    });

    if (!booking) {
      res.status(404).json({ success: false, error: 'Booking not found' });
      return;
    }

    // Check authorization
    const isOwner = booking.userId === req.user!.userId;
    const isProvider = booking.providerId === req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!isOwner && !isProvider && !isAdmin) {
      res.status(403).json({ success: false, error: 'Not authorized to view this booking' });
      return;
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /api/bookings/mine ──────────────────────────────────────────────

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;

    let bookings;
    if (role === 'TOURIST') {
      bookings = await prisma.booking.findMany({
        where: { userId },
        include: {
          provider: {
            select: {
              providerId: true, fullName: true, providerType: true,
              isVerified: true, profileImageUrl: true,
            },
          },
          review: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (role === 'PROVIDER') {
      bookings = await prisma.booking.findMany({
        where: { providerId: userId },
        include: {
          user: { select: { userId: true, fullName: true, email: true, phoneNo: true } },
          review: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      bookings = await prisma.booking.findMany({
        include: {
          user: { select: { fullName: true, email: true } },
          provider: { select: { fullName: true, providerType: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    }

    res.json({ success: true, data: bookings, count: bookings.length });
  } catch (error) {
    console.error('Get my bookings error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── PATCH /api/bookings/:id/status ──────────────────────────────────────

router.patch('/:id/status', authenticate, validate(updateStatusSchema), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status: newStatus } = req.body;

    const booking = await prisma.booking.findUnique({ where: { bookingId: id } });

    if (!booking) {
      res.status(404).json({ success: false, error: 'Booking not found' });
      return;
    }

    // Authorization checks
    const isTouristOwner = booking.userId === req.user!.userId;
    const isProviderOwner = booking.providerId === req.user!.userId;
    const role = req.user!.role;

    // Admins can update any booking status
    if (role === 'ADMIN') {
      // Admin bypass — proceed to transition validation
    } else if (role === 'TOURIST') {
      // Tourists can only cancel their own pending/confirmed bookings
      if (!isTouristOwner) {
        res.status(403).json({ success: false, error: 'Not authorized' });
        return;
      }
      if (newStatus !== 'CANCELLED') {
        res.status(403).json({ success: false, error: 'Tourists can only cancel bookings' });
        return;
      }
    } else if (role === 'PROVIDER') {
      // Providers can accept/decline/complete their own bookings
      if (!isProviderOwner) {
        res.status(403).json({ success: false, error: 'Not authorized' });
        return;
      }
      if (!['CONFIRMED', 'CANCELLED', 'ONGOING', 'COMPLETED'].includes(newStatus)) {
        res.status(403).json({ success: false, error: 'Invalid status transition for provider' });
        return;
      }
    } else {
      res.status(403).json({ success: false, error: 'Unknown role' });
      return;
    }

    // Validate state transition
    if (!isValidTransition(booking.status, newStatus)) {
      res.status(400).json({
        success: false,
        error: `Cannot transition from ${booking.status} to ${newStatus}`,
      });
      return;
    }

    // If cancelling a yoga booking, decrement occupancy
    if (newStatus === 'CANCELLED' && booking.status !== 'CANCELLED') {
      const provider = await prisma.provider.findUnique({
        where: { providerId: booking.providerId },
        select: { providerType: true },
      });
      if (provider?.providerType === 'YOGA_STUDIO') {
        await prisma.yogaProfile.update({
          where: { yogaId: booking.providerId },
          data: { currentOccupancy: { decrement: 1 } },
        });
      }
    }

    const updated = await prisma.booking.update({
      where: { bookingId: id },
      data: { status: newStatus as any },
      include: {
        user: { select: { fullName: true, email: true } },
        provider: { select: { fullName: true, providerType: true } },
      },
    });

    res.json({
      success: true,
      message: `Booking ${newStatus.toLowerCase()} successfully`,
      data: updated,
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── POST /api/bookings/:id/pay (Mock Payment) ──────────────────────────

router.post('/:id/pay', authenticate, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { paymentMethod } = req.body; // 'stripe' | 'govpay'

    const booking = await prisma.booking.findUnique({
      where: { bookingId: id },
      include: { provider: true },
    });

    if (!booking) {
      res.status(404).json({ success: false, error: 'Booking not found' });
      return;
    }

    if (booking.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      res.status(403).json({ success: false, error: 'Not authorized' });
      return;
    }

    if (booking.status !== 'PENDING') {
      res.status(400).json({
        success: false,
        error: `Cannot pay for a booking with status: ${booking.status}`,
      });
      return;
    }

    // Mock payment simulation
    const isSuccess = Math.random() > 0.1; // 90% success rate for demo
    const transactionId = uuidv4();

    if (!isSuccess) {
      res.status(402).json({
        success: false,
        error: 'Payment failed. Please try again.',
        data: {
          transactionId,
          paymentMethod: paymentMethod || 'stripe',
          status: 'FAILED',
          amount: Number(booking.netAmount),
        },
      });
      return;
    }

    // Update booking to CONFIRMED after successful payment
    const updated = await prisma.booking.update({
      where: { bookingId: id },
      data: { status: 'CONFIRMED' },
      include: {
        user: { select: { fullName: true, email: true } },
        provider: { select: { fullName: true, providerType: true } },
      },
    });

    res.json({
      success: true,
      message: 'Payment successful! Booking confirmed.',
      data: {
        booking: updated,
        payment: {
          transactionId,
          paymentMethod: paymentMethod || 'stripe',
          status: 'SUCCESS',
          amount: Number(booking.netAmount),
          platformCommission: Number(booking.netAmount) * 0.1, // 10% platform fee
        },
      },
    });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── POST /api/bookings/pricing (Calculate Flexi-Fare) ──────────────────

router.post('/pricing', authenticate, async (req: Request, res: Response) => {
  try {
    const { tier, hours, vehicleProvided, vehicleType, languagePremium, premiumLanguage, groupSize } = req.body;

    const pricing = calculateFlexiFare({
      tier: tier || 'SITE',
      hours: hours || 4,
      vehicleProvided: vehicleProvided || false,
      vehicleType: vehicleType || undefined,
      languagePremium: languagePremium || false,
      premiumLanguage: premiumLanguage || undefined,
      groupSize: groupSize || 1,
    });

    res.json({ success: true, data: pricing });
  } catch (error) {
    console.error('Pricing calculation error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
