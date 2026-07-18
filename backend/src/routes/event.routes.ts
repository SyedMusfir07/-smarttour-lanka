import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import prisma from '../config/prisma';
import { authenticate, authorizeRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { haversineDistance } from '../utils/geospatial';

const router = Router();

const createEventSchema = z.object({
  eventTitle: z.string().min(2).max(150),
  typeTag: z.enum(['CULTURAL', 'NIGHTLIFE', 'COMMUNITY', 'SPORTS']),
  eventLat: z.number(),
  eventLng: z.number(),
  entryFee: z.number().min(0).optional(),
  eventStart: z.string().datetime(),
  description: z.string().optional(),
});

// ── GET /api/events/nearby?lat&lng&radius ───────────────────────────────

router.get('/nearby', async (req: Request, res: Response) => {
  try {
    const lat = req.query.lat as string;
    const lng = req.query.lng as string;
    const radius = req.query.radius as string | undefined;
    const centerLat = parseFloat(lat as string);
    const centerLng = parseFloat(lng as string);
    const searchRadius = parseInt(radius as string) || 15000;

    const events = await prisma.liveEvent.findMany({
      where: { isVerified: true },
      include: {
        organizer: { select: { fullName: true, providerType: true } },
      },
      orderBy: { eventStart: 'asc' },
    });

    let filteredEvents = events;
    if (!isNaN(centerLat) && !isNaN(centerLng)) {
      filteredEvents = events
        .filter((e) => {
          const dist = haversineDistance(
            { lat: centerLat, lng: centerLng },
            { lat: Number(e.eventLat), lng: Number(e.eventLng) }
          );
          return dist <= searchRadius;
        })
        .map((e) => ({
          ...e,
          distance: haversineDistance(
            { lat: centerLat, lng: centerLng },
            { lat: Number(e.eventLat), lng: Number(e.eventLng) }
          ),
        }))
        .sort((a: any, b: any) => a.distance - b.distance);
    }

    res.json({
      success: true,
      data: filteredEvents,
      count: filteredEvents.length,
    });
  } catch (error) {
    console.error('Nearby events error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /api/events ─────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const limit = req.query.limit as string | undefined;
    const where: any = { isVerified: true };
    if (type) where.typeTag = type;

    const events = await prisma.liveEvent.findMany({
      where,
      include: {
        organizer: { select: { fullName: true, providerType: true } },
      },
      orderBy: { eventStart: 'asc' },
      take: parseInt(limit as string) || 50,
    });

    res.json({ success: true, data: events, count: events.length });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /api/events/:id ─────────────────────────────────────────────────

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const event = await prisma.liveEvent.findUnique({
      where: { eventId: id },
      include: {
        organizer: { select: { fullName: true, providerType: true, isVerified: true } },
      },
    });

    if (!event) {
      res.status(404).json({ success: false, error: 'Event not found' });
      return;
    }

    res.json({ success: true, data: event });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── POST /api/events (Provider creates event) ──────────────────────────

router.post('/', authenticate, authorizeRole('PROVIDER'), validate(createEventSchema), async (req: Request, res: Response) => {
  try {
    const providerId = req.user!.userId;

    const provider = await prisma.provider.findUnique({
      where: { providerId },
      select: { isVerified: true },
    });

    if (!provider?.isVerified) {
      res.status(403).json({ success: false, error: 'Only verified providers can create events' });
      return;
    }

    const { eventTitle, typeTag, eventLat, eventLng, entryFee, eventStart, description } = req.body;

    const event = await prisma.liveEvent.create({
      data: {
        eventId: uuidv4(),
        eventTitle,
        typeTag,
        eventLat,
        eventLng,
        entryFee: entryFee || 0,
        eventStart: new Date(eventStart),
        isVerified: false, // New events need admin verification
        organizerId: providerId,
        description: description || null,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Event created and pending verification',
      data: event,
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
