import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/prisma';
import { generateToken, generateRefreshToken, authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// ── Validation Schemas ──────────────────────────────────────────────────

const touristRegisterSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email().max(100),
  password: z.string().min(6).max(100),
  phoneNo: z.string().max(20).optional(),
});

const touristLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const providerRegisterSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email().max(100),
  password: z.string().min(6).max(100),
  providerType: z.enum(['GUIDE', 'SURF_SCHOOL', 'YOGA_STUDIO']),
  phoneNo: z.string().max(20).optional(),
  sltdaLicenseNo: z.string().max(50).optional(),
  baseLat: z.number().optional(),
  baseLng: z.number().optional(),
  languagesSpoken: z.string().optional(),
});

// Generic schema for email + password login (used by provider and admin)
const emailPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// ── Helper ──────────────────────────────────────────────────────────────

const setAuthCookie = (res: Response, token: string) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// ── POST /api/auth/tourist/register ─────────────────────────────────────

router.post('/tourist/register', validate(touristRegisterSchema), async (req: Request, res: Response) => {
  try {
    const { fullName, email, password, phoneNo } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        userId: uuidv4(),
        fullName,
        email,
        passwordHash,
        phoneNo: phoneNo || null,
        role: 'TOURIST',
      },
    });

    const payload = { userId: user.userId, email: user.email, role: 'TOURIST' as const };
    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: 'Tourist registered successfully',
      data: {
        user: {
          userId: user.userId,
          fullName: user.fullName,
          email: user.email,
          phoneNo: user.phoneNo,
          role: user.role,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Tourist register error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── POST /api/auth/tourist/login ────────────────────────────────────────

router.post('/tourist/login', validate(touristLoginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const payload = { userId: user.userId, email: user.email, role: user.role as 'TOURIST' | 'ADMIN' };
    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    setAuthCookie(res, token);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          userId: user.userId,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Tourist login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── POST /api/auth/provider/register ────────────────────────────────────

router.post('/provider/register', validate(providerRegisterSchema), async (req: Request, res: Response) => {
  try {
    const { fullName, email, password, providerType, phoneNo, sltdaLicenseNo, baseLat, baseLng, languagesSpoken } = req.body;

    const existing = await prisma.provider.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const providerId = uuidv4();

    const provider = await prisma.provider.create({
      data: {
        providerId,
        fullName,
        email,
        passwordHash,
        providerType,
        phoneNo: phoneNo || null,
        sltdaLicenseNo: sltdaLicenseNo || null,
        baseLat: baseLat || null,
        baseLng: baseLng || null,
        languagesSpoken: languagesSpoken || null,
        isVerified: false, // Sandbox mode - must be verified by admin
        ratingAverage: 0,
      },
    });

    // Create sub-profile based on provider type
    if (providerType === 'GUIDE') {
      await prisma.guideProfile.create({
        data: {
          guideId: providerId,
          tierClassification: 'SITE',
          hourlyRate: 12,
          halfDayRate: 48,
          fullDayRate: 96,
          languagePremium: 0,
          vehicleProvided: false,
          maxGroupSize: 8,
        },
      });
    } else if (providerType === 'SURF_SCHOOL') {
      await prisma.surfProfile.create({
        data: {
          surfId: providerId,
          isaCertified: false,
          instructorCount: 1,
          boardInventory: 5,
          sessionRate: 30,
          boardRentDaily: 12,
          wetsuitRentDaily: 8,
        },
      });
    } else if (providerType === 'YOGA_STUDIO') {
      await prisma.yogaProfile.create({
        data: {
          yogaId: providerId,
          maxMatCapacity: 10,
          currentOccupancy: 0,
          dropInRate: 18,
          package5Rate: 75,
          package10Rate: 130,
          classDurationMin: 90,
          matRentalIncluded: false,
        },
      });
    }

    const payload = { userId: providerId, email, role: 'PROVIDER' as const, providerType };
    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: 'Provider registered successfully. Awaiting admin verification.',
      data: {
        provider: {
          providerId: provider.providerId,
          fullName: provider.fullName,
          email: provider.email,
          providerType: provider.providerType,
          isVerified: provider.isVerified,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Provider register error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── POST /api/auth/provider/login ───────────────────────────────────────

router.post('/provider/login', validate(emailPasswordSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const provider = await prisma.provider.findUnique({ where: { email } });
    if (!provider) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const validPassword = await bcrypt.compare(password, provider.passwordHash);
    if (!validPassword) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const payload = {
      userId: provider.providerId,
      email: provider.email,
      role: 'PROVIDER' as const,
      providerType: provider.providerType,
    };
    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    setAuthCookie(res, token);

    res.json({
      success: true,
      message: 'Provider login successful',
      data: {
        provider: {
          providerId: provider.providerId,
          fullName: provider.fullName,
          email: provider.email,
          providerType: provider.providerType,
          isVerified: provider.isVerified,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Provider login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── POST /api/auth/admin/login ──────────────────────────────────────────

router.post('/admin/login', validate(emailPasswordSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Admin is a special user with role ADMIN
    const admin = await prisma.user.findUnique({ where: { email } });
    
    if (!admin || admin.role !== 'ADMIN') {
      res.status(401).json({ success: false, error: 'Invalid admin credentials' });
      return;
    }

    const validPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!validPassword) {
      res.status(401).json({ success: false, error: 'Invalid admin credentials' });
      return;
    }

    const payload = { userId: admin.userId, email: admin.email, role: 'ADMIN' as const };
    const token = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    setAuthCookie(res, token);

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        admin: {
          userId: admin.userId,
          fullName: admin.fullName,
          email: admin.email,
          role: admin.role,
        },
        token,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── POST /api/auth/logout ───────────────────────────────────────────────

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// ── PATCH /api/auth/sos (Activate SOS alert) ────────────────────────────

router.patch('/sos', authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user!.role === 'TOURIST' || req.user!.role === 'ADMIN') {
      await prisma.user.update({
        where: { userId: req.user!.userId },
        data: { sosActive: true },
      });
    }
    res.json({ success: true, message: 'SOS alert activated', data: { sosActive: true, timestamp: new Date().toISOString() } });
  } catch (error) {
    console.error('SOS error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── PATCH /api/auth/sos/cancel (Cancel SOS alert) ───────────────────────

router.patch('/sos/cancel', authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user!.role === 'TOURIST' || req.user!.role === 'ADMIN') {
      await prisma.user.update({
        where: { userId: req.user!.userId },
        data: { sosActive: false },
      });
    }
    res.json({ success: true, message: 'SOS alert cancelled' });
  } catch (error) {
    console.error('SOS cancel error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /api/auth/me ────────────────────────────────────────────────────

router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    if (req.user!.role === 'TOURIST' || req.user!.role === 'ADMIN') {
      const user = await prisma.user.findUnique({
        where: { userId: req.user!.userId },
        select: { userId: true, fullName: true, email: true, phoneNo: true, role: true, sosActive: true },
      });
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }
      res.json({ success: true, data: user });
    } else {
      const provider = await prisma.provider.findUnique({
        where: { providerId: req.user!.userId },
        select: {
          providerId: true, fullName: true, email: true, providerType: true,
          isVerified: true, sltdaLicenseNo: true, ratingAverage: true,
        },
      });
      if (!provider) {
        res.status(404).json({ success: false, error: 'Provider not found' });
        return;
      }
      res.json({ success: true, data: provider });
    }
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
