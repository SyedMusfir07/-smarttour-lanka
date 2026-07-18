import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== DATABASE INTEGRITY TESTS ===\n');

  // 1. Count all models
  const users = await prisma.user.count();
  const providers = await prisma.provider.count();
  const bookings = await prisma.booking.count();
  const events = await prisma.liveEvent.count();
  const reviews = await prisma.review.count();
  const guideProfiles = await prisma.guideProfile.count();
  const surfProfiles = await prisma.surfProfile.count();
  const yogaProfiles = await prisma.yogaProfile.count();

  console.log('--- Model Counts ---');
  console.log(`Users: ${users}`);
  console.log(`Providers: ${providers}`);
  console.log(`Bookings: ${bookings}`);
  console.log(`Events: ${events}`);
  console.log(`Reviews: ${reviews}`);
  console.log(`Guide Profiles: ${guideProfiles}`);
  console.log(`Surf Profiles: ${surfProfiles}`);
  console.log(`Yoga Profiles: ${yogaProfiles}`);

  // 2. Provider breakdown
  const verified = await prisma.provider.count({ where: { isVerified: true } });
  const unverified = await prisma.provider.count({ where: { isVerified: false } });
  console.log(`\n--- Provider Status ---`);
  console.log(`Verified: ${verified}`);
  console.log(`Unverified: ${unverified}`);

  // 3. User roles
  const tourists = await prisma.user.count({ where: { role: 'TOURIST' } });
  const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
  console.log(`\n--- User Roles ---`);
  console.log(`Tourists: ${tourists}`);
  console.log(`Admins: ${admins}`);

  // 4. Provider types
  const guides = await prisma.provider.count({ where: { providerType: 'GUIDE' } });
  const surfSchools = await prisma.provider.count({ where: { providerType: 'SURF_SCHOOL' } });
  const yogaStudios = await prisma.provider.count({ where: { providerType: 'YOGA_STUDIO' } });
  console.log(`\n--- Provider Types ---`);
  console.log(`Guides: ${guides}`);
  console.log(`Surf Schools: ${surfSchools}`);
  console.log(`Yoga Studios: ${yogaStudios}`);

  // 5. Booking status breakdown
  const pending = await prisma.booking.count({ where: { status: 'PENDING' } });
  const confirmed = await prisma.booking.count({ where: { status: 'CONFIRMED' } });
  const completed = await prisma.booking.count({ where: { status: 'COMPLETED' } });
  const cancelled = await prisma.booking.count({ where: { status: 'CANCELLED' } });
  console.log(`\n--- Booking Status ---`);
  console.log(`Pending: ${pending}`);
  console.log(`Confirmed: ${confirmed}`);
  console.log(`Completed: ${completed}`);
  console.log(`Cancelled: ${cancelled}`);

  // 6. Relations check - orphaned records
  console.log(`\n--- Relation Integrity ---`);
  
  // Bookings without valid user
  const orphanBookings = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM bookings b 
    LEFT JOIN users u ON b.user_id = u.user_id 
    WHERE u.user_id IS NULL
  `;
  console.log(`Orphaned bookings (no user): ${(orphanBookings as any)[0]?.count}`);

  // Bookings without valid provider
  const orphanBookings2 = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM bookings b 
    LEFT JOIN providers p ON b.provider_id = p.provider_id 
    WHERE p.provider_id IS NULL
  `;
  console.log(`Orphaned bookings (no provider): ${(orphanBookings2 as any)[0]?.count}`);

  // Reviews without valid booking
  const orphanReviews = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM reviews r 
    LEFT JOIN bookings b ON r.booking_id = b.booking_id 
    WHERE b.booking_id IS NULL
  `;
  console.log(`Orphaned reviews (no booking): ${(orphanReviews as any)[0]?.count}`);

  // Providers without profiles
  const guidesWithoutProfile = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM providers p 
    LEFT JOIN guide_profiles g ON p.provider_id = g.guide_id 
    WHERE p.provider_type = 'GUIDE' AND g.guide_id IS NULL
  `;
  console.log(`Guides without profile: ${(guidesWithoutProfile as any)[0]?.count}`);

  const surfWithoutProfile = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM providers p 
    LEFT JOIN surf_profiles s ON p.provider_id = s.surf_id 
    WHERE p.provider_type = 'SURF_SCHOOL' AND s.surf_id IS NULL
  `;
  console.log(`Surf schools without profile: ${(surfWithoutProfile as any)[0]?.count}`);

  const yogaWithoutProfile = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM providers p 
    LEFT JOIN yoga_profiles y ON p.provider_id = y.yoga_id 
    WHERE p.provider_type = 'YOGA_STUDIO' AND y.yoga_id IS NULL
  `;
  console.log(`Yoga studios without profile: ${(yogaWithoutProfile as any)[0]?.count}`);

  // 7. Data quality - null fields check
  console.log(`\n--- Data Quality ---`);
  const providersNoLocation = await prisma.provider.count({ where: { baseLat: null } });
  console.log(`Providers without location: ${providersNoLocation}`);

  const usersNoEmail = await prisma.user.count({ where: { email: '' } });
  console.log(`Users without email: ${usersNoEmail}`);

  const eventsNoDescription = await prisma.liveEvent.count({ where: { description: null } });
  console.log(`Events without description: ${eventsNoDescription}`);

  // 8. Event types
  const cultural = await prisma.liveEvent.count({ where: { typeTag: 'CULTURAL' } });
  const nightlife = await prisma.liveEvent.count({ where: { typeTag: 'NIGHTLIFE' } });
  const sports = await prisma.liveEvent.count({ where: { typeTag: 'SPORTS' } });
  const community = await prisma.liveEvent.count({ where: { typeTag: 'COMMUNITY' } });
  console.log(`\n--- Event Types ---`);
  console.log(`Cultural: ${cultural}`);
  console.log(`Nightlife: ${nightlife}`);
  console.log(`Sports: ${sports}`);
  console.log(`Community: ${community}`);

  // 9. Review ratings
  const avgRating = await prisma.review.aggregate({ _avg: { rating: true } });
  console.log(`\n--- Review Stats ---`);
  console.log(`Average rating: ${avgRating._avg.rating}`);

  console.log('\n=== DB INTEGRITY TEST COMPLETE ===');
}

main()
  .catch((e) => {
    console.error('Test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
