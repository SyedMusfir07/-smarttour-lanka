import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding SmartTour Lanka database...\n');

  // ── Clean existing data ──────────────────────────────────────────────
  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.liveEvent.deleteMany();
  await prisma.guideProfile.deleteMany();
  await prisma.surfProfile.deleteMany();
  await prisma.yogaProfile.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 12);

  // ── 1. Tourists ──────────────────────────────────────────────────────
  const tourist1Id = uuidv4();
  const tourist2Id = uuidv4();
  const adminId = uuidv4();

  await prisma.user.createMany({
    data: [
      {
        userId: tourist1Id,
        fullName: 'Sarah Mitchell',
        email: 'sarah@example.com',
        phoneNo: '+94 77 123 4567',
        passwordHash,
        role: 'TOURIST',
        currentLat: 5.9736,
        currentLng: 80.4295,
      },
      {
        userId: tourist2Id,
        fullName: 'James Wilson',
        email: 'james@example.com',
        phoneNo: '+94 77 987 6543',
        passwordHash,
        role: 'TOURIST',
        currentLat: 6.1429,
        currentLng: 80.4295,
      },
      {
        userId: adminId,
        fullName: 'Admin User',
        email: 'admin@smarttour.lk',
        phoneNo: '+94 11 234 5678',
        passwordHash,
        role: 'ADMIN',
      },
    ],
  });

  console.log('✅ Created 2 tourists + 1 admin');

  // ── 2. Verified Provider: Ravi Bandara (National Guide) ──────────────
  const guideId = uuidv4();
  await prisma.provider.create({
    data: {
      providerId: guideId,
      fullName: 'Ravi Bandara',
      email: 'ravi.guide@example.com',
      passwordHash,
      providerType: 'GUIDE',
      sltdaLicenseNo: 'SLTDA-NG-2019-04478',
      isVerified: true,
      baseLat: 7.9519,
      baseLng: 80.7600,
      languagesSpoken: 'English,German,Russian,Sinhala',
      ratingAverage: 4.9,
      phoneNo: '+94 71 456 7890',
      description: 'Award-winning national guide with over 10 years of experience in heritage and wildlife tours across Sri Lanka.',
      city: 'Sigiriya',
      district: 'Matale',
      isAvailable: true,
      profileImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    },
  });

  await prisma.guideProfile.create({
    data: {
      guideId,
      tierClassification: 'NATIONAL',
      hourlyRate: 25,
      halfDayRate: 90,
      fullDayRate: 160,
      languagePremium: 5,
      vehicleProvided: true,
      vehicleType: 'car',
      maxGroupSize: 8,
    },
  });

  console.log('✅ Created guide: Ravi Bandara (National, verified)');

  // ── 3. Verified Provider: Weligama Surf Academy ──────────────────────
  const surfId = uuidv4();
  await prisma.provider.create({
    data: {
      providerId: surfId,
      fullName: 'Weligama Surf Academy',
      email: 'surf@weligama.com',
      passwordHash,
      providerType: 'SURF_SCHOOL',
      sltdaLicenseNo: 'SLTDA-SF-2020-12345',
      isVerified: true,
      baseLat: 5.9736,
      baseLng: 80.4295,
      languagesSpoken: 'English,Sinhala,Tamil',
      ratingAverage: 4.7,
      phoneNo: '+94 76 234 5678',
      description: 'ISA-certified surf school offering lessons for all levels on the beautiful Weligama Beach.',
      city: 'Weligama',
      district: 'Matara',
      isAvailable: true,
      profileImageUrl: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=400',
    },
  });

  await prisma.surfProfile.create({
    data: {
      surfId,
      isaCertified: true,
      sltdaBeachPermit: 'WSA-2024-447',
      instructorCount: 4,
      boardInventory: 20,
      sessionRate: 30,
      boardRentDaily: 12,
      wetsuitRentDaily: 8,
      lessonTypes: JSON.stringify(['Beginner', 'Intermediate', 'Advanced']),
    },
  });

  console.log('✅ Created surf school: Weligama Surf Academy (verified)');

  // ── 4. Verified Provider: Ocean View Yoga, Ella ──────────────────────
  const yogaId = uuidv4();
  await prisma.provider.create({
    data: {
      providerId: yogaId,
      fullName: 'Ocean View Yoga, Ella',
      email: 'yoga@oceanview.ella',
      passwordHash,
      providerType: 'YOGA_STUDIO',
      sltdaLicenseNo: 'SLTDA-YG-2021-67890',
      isVerified: true,
      baseLat: 6.8667,
      baseLng: 81.0467,
      languagesSpoken: 'English,Sinhala',
      ratingAverage: 4.8,
      phoneNo: '+94 77 345 6789',
      description: 'Serene yoga studio overlooking the Ella Gap. Hatha, Vinyasa, Ashtanga, and Yin classes daily.',
      city: 'Ella',
      district: 'Badulla',
      isAvailable: true,
      profileImageUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400',
    },
  });

  await prisma.yogaProfile.create({
    data: {
      yogaId,
      stylesOffered: 'Hatha,Vinyasa,Ashtanga,Yin',
      maxMatCapacity: 12,
      currentOccupancy: 8,
      dropInRate: 18,
      package5Rate: 75,
      package10Rate: 130,
      classDurationMin: 90,
      matRentalIncluded: true,
    },
  });

  console.log('✅ Created yoga studio: Ocean View Yoga, Ella (verified)');

  // ── 5. Unverified Provider (pending admin review) ────────────────────
  const pendingId = uuidv4();
  await prisma.provider.create({
    data: {
      providerId: pendingId,
      fullName: 'Dilshan Senanayake',
      email: 'dilshan.surf@example.com',
      passwordHash,
      providerType: 'SURF_SCHOOL',
      sltdaLicenseNo: 'SLTDA-SF-2024-98765',
      isVerified: false,
      baseLat: 5.9500,
      baseLng: 80.4100,
      languagesSpoken: 'English,Sinhala',
      ratingAverage: 0,
      phoneNo: '+94 71 555 1234',
      description: 'New surf school in Midigama seeking certification.',
      city: 'Midigama',
      district: 'Matara',
      isAvailable: false,
    },
  });

  await prisma.surfProfile.create({
    data: {
      surfId: pendingId,
      isaCertified: false,
      instructorCount: 2,
      boardInventory: 8,
      sessionRate: 25,
      boardRentDaily: 10,
      wetsuitRentDaily: 6,
      lessonTypes: JSON.stringify(['Beginner', 'Intermediate']),
    },
  });

  console.log('✅ Created unverified provider: Dilshan Senanayake (pending)');

  // ── 6. Live Events ──────────────────────────────────────────────────
  const now = new Date();
  const event1Id = uuidv4();
  const event2Id = uuidv4();
  const event3Id = uuidv4();

  await prisma.liveEvent.createMany({
    data: [
      {
        eventId: event1Id,
        eventTitle: 'Kandy Esala Perahera',
        typeTag: 'CULTURAL',
        eventLat: 7.2906,
        eventLng: 80.6337,
        entryFee: 0,
        eventStart: new Date(now.getTime() + 2 * 60 * 60 * 1000), // Starts in 2 hours
        isVerified: true,
        description: 'The spectacular Esala Perahera featuring traditional dancers, drummers, and decorated elephants.',
      },
      {
        eventId: event2Id,
        eventTitle: 'Weligama Beach Sunset Party',
        typeTag: 'NIGHTLIFE',
        eventLat: 5.9736,
        eventLng: 80.4295,
        entryFee: 15,
        eventStart: new Date(now.getTime() + 8 * 60 * 60 * 1000), // Starts in 8 hours
        isVerified: true,
        description: 'Weekly sunset beach party with live DJ, fire dancing, and cocktails.',
      },
      {
        eventId: event3Id,
        eventTitle: 'Arugam Bay Surf Contest',
        typeTag: 'SPORTS',
        eventLat: 6.8400,
        eventLng: 81.8300,
        entryFee: 0,
        eventStart: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
        isVerified: true,
        description: 'Annual surf competition featuring top surfers from around the island.',
      },
    ],
  });

  console.log('✅ Created 3 live events');

  // ── 7. Completed Bookings with Reviews ──────────────────────────────
  const booking1Id = uuidv4();
  const booking2Id = uuidv4();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  // Booking 1: Sarah with Ravi (completed)
  await prisma.booking.create({
    data: {
      bookingId: booking1Id,
      userId: tourist1Id,
      providerId: guideId,
      startTime: twoDaysAgo,
      durationHours: 8,
      addOnsTotal: 47,
      netAmount: 182,
      status: 'COMPLETED',
      createdAt: twoDaysAgo,
      updatedAt: yesterday,
    },
  });

  await prisma.review.create({
    data: {
      reviewId: uuidv4(),
      bookingId: booking1Id,
      userId: tourist1Id,
      providerId: guideId,
      rating: 5,
      reviewText: 'Absolutely incredible experience! Ravi was knowledgeable, punctual, and made our heritage tour unforgettable. His German language skills were excellent and he took us to hidden spots we would never have found on our own. Highly recommend!',
    },
  });

  // Booking 2: James with Surf Academy (completed)
  await prisma.booking.create({
    data: {
      bookingId: booking2Id,
      userId: tourist2Id,
      providerId: surfId,
      startTime: twoDaysAgo,
      durationHours: 3,
      addOnsTotal: 12,
      netAmount: 42,
      status: 'COMPLETED',
      createdAt: twoDaysAgo,
      updatedAt: yesterday,
    },
  });

  await prisma.review.create({
    data: {
      reviewId: uuidv4(),
      bookingId: booking2Id,
      userId: tourist2Id,
      providerId: surfId,
      rating: 4,
      reviewText: 'Great surf school with patient instructors. The waves at Weligama were perfect for beginners. Equipment was in good condition.',
    },
  });

  // Booking 3: Sarah with Yoga (pending - to demo pending flow)
  await prisma.booking.create({
    data: {
      bookingId: uuidv4(),
      userId: tourist1Id,
      providerId: yogaId,
      startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      durationHours: 1.5,
      addOnsTotal: 0,
      netAmount: 18,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    },
  });

  console.log('✅ Created 3 bookings with 2 reviews');

  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Login Credentials:');
  console.log('   Tourist:    sarah@example.com / password123');
  console.log('   Tourist:    james@example.com / password123');
  console.log('   Provider:   ravi.guide@example.com / password123  (Guide)');
  console.log('   Provider:   surf@weligama.com / password123      (Surf School)');
  console.log('   Provider:   yoga@oceanview.ella / password123    (Yoga Studio)');
  console.log('   Unverified: dilshan.surf@example.com / password123');
  console.log('   Admin:      admin@smarttour.lk / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
