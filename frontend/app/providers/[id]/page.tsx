'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, apiFetch, LoadingSpinner, ErrorDisplay } from '../../lib';

// ── Constants ──────────────────────────────────────────────────────────

const tierLabels: Record<string, string> = {
  NATIONAL: 'National Guide',
  AREA: 'Area Guide',
  SITE: 'Site Guide',
  CHAUFFEUR: 'Chauffeur Guide',
};

const typeIcons: Record<string, string> = {
  GUIDE: '🧭',
  SURF_SCHOOL: '🏄',
  YOGA_STUDIO: '🧘',
};

const typeHeroEmoji: Record<string, string> = {
  GUIDE: '🏔️',
  SURF_SCHOOL: '🌊',
  YOGA_STUDIO: '🧘',
};

const vibeReels = ['🌅', '🐘', '🏯', '🌊', '🦁'];

// ── Page Component ─────────────────────────────────────────────────────

export default function ProviderProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`/api/providers/${params.id}`)
      .then((result) => setProvider(result.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <LoadingSpinner text="Loading profile..." />;
  if (error || !provider) return <ErrorDisplay message={error || 'Provider not found'} onRetry={() => window.location.reload()} />;

  const isGuide = provider.providerType === 'GUIDE';
  const isSurf = provider.providerType === 'SURF_SCHOOL';
  const isYoga = provider.providerType === 'YOGA_STUDIO';
  const guideProfile = provider.guideProfile;
  const surfProfile = provider.surfProfile;
  const yogaProfile = provider.yogaProfile;

  // Determine hero title and subtitle
  let heroSubtitle = '';
  let heroTitle = '';
  if (isGuide) {
    heroSubtitle = tierLabels[guideProfile?.tierClassification] || 'Tour Guide';
    heroTitle = guideProfile?.tierClassification === 'NATIONAL'
      ? 'Heritage & Wildlife Tour'
      : 'Local Tour Experience';
  } else if (isSurf) {
    heroSubtitle = 'Surf School';
    heroTitle = 'Weligama Beach Sessions';
  } else if (isYoga) {
    heroSubtitle = 'Yoga Studio';
    heroTitle = 'Wellness & Meditation';
  }

  // Price string
  const priceStr = isGuide
    ? `$${guideProfile?.hourlyRate}/hr`
    : isSurf
    ? `$${surfProfile?.sessionRate}/session`
    : `$${yogaProfile?.dropInRate}/class`;

  const languages = provider.languagesSpoken?.split(',').map((l: string) => l.trim()) || [];
  const reviewCount = provider._count?.reviews || provider.reviews?.length || 0;
  const rating = Number(provider.ratingAverage) || 0;
  const fullStars = Math.round(rating);

  // Handle booking
  const handleBookNow = () => {
    if (!user) {
      router.push(`/auth/login?redirect=/providers/${params.id}`);
      return;
    }
    if (isGuide) router.push(`/bookings/new?providerId=${params.id}`);
    else if (isSurf) router.push(`/surf/${params.id}`);
    else if (isYoga) router.push(`/yoga/${params.id}`);
  };

  return (
    <div className="animate-fade-in -mx-4 px-0">
      {/* ── 1. Hero Image ─────────────────────────────────────────── */}
      <div className="h-48 relative overflow-hidden">
        <div className="w-full h-full bg-gradient-to-br from-teal-900 via-teal-700 to-teal-600">
          <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-20 select-none">
            {typeHeroEmoji[provider.providerType] || '🏔️'}
          </div>
        </div>
        {/* Overlay gradient */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 pt-12">
          <p className="text-white/70 text-[10px] uppercase tracking-[1px] font-semibold">
            {heroSubtitle.toUpperCase()}
          </p>
          <p className="text-white font-bold text-base mt-0.5">
            {heroTitle}
          </p>
        </div>
      </div>

      {/* ── 2. Profile Header ─────────────────────────────────────── */}
      <div className="px-4 relative -mt-10 mb-3">
        <div className="flex items-end gap-3">
          {/* Avatar */}
          <div className="w-[52px] h-[52px] rounded-full bg-white border-[3px] border-white shadow-lg flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden"
            style={{
              background: provider.profileImageUrl
                ? `url(${provider.profileImageUrl}) center/cover`
                : 'linear-gradient(135deg, #00796B, #004D40)',
            }}
          >
            {!provider.profileImageUrl && (typeIcons[provider.providerType] || '👤')}
          </div>

          {/* Name + Verified + Rating */}
          <div className="flex-1 pb-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-bold text-lg">{provider.fullName}</h1>
              {provider.isVerified && (
                <span className="verified-badge text-[10px]">✅ SLTDA Verified</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {/* Stars */}
              <span className="text-accent text-sm">
                {'★'.repeat(fullStars)}{'☆'.repeat(5 - fullStars)}
              </span>
              <span className="text-sm font-semibold text-ink">
                {rating.toFixed(1)}
              </span>
              <span className="text-xs text-muted">
                ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          </div>

          {/* Price */}
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-primary">{priceStr}</p>
            <p className="text-[10px] text-muted uppercase tracking-wider">
              {isGuide ? 'National Guide' : provider.providerType.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. Main Card ──────────────────────────────────────────── */}
      <div className="px-4">
        <div className="card p-4 mb-4">
          {/* Languages */}
          {languages.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-3">
              {languages.map((lang: string) => (
                <span
                  key={lang}
                  className="chip text-[10px] font-semibold"
                  style={{
                    background: lang === 'English' ? '#E3F2FD' : lang === 'German' ? '#FCE4EC' : lang === 'Russian' ? '#F3E5F5' : lang === 'Sinhala' ? '#E8F5E9' : '#E0F2F1',
                    color: lang === 'English' ? '#1565C0' : lang === 'German' ? '#880E4F' : lang === 'Russian' ? '#6A1B9A' : lang === 'Sinhala' ? '#2E7D32' : '#00796B',
                  }}
                >
                  {lang === 'English' ? '🇬🇧' : lang === 'German' ? '🇩🇪' : lang === 'Russian' ? '🇷🇺' : lang === 'Sinhala' ? '🇱🇰' : '🌐'} {lang}
                </span>
              ))}
            </div>
          )}

          {/* ── Vibe Reels Carousel ───────────────────────────────── */}
          <div className="mb-3">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">
              Vibe Reels
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
              {vibeReels.map((emoji, i) => (
                <div
                  key={i}
                  className="w-[54px] h-[54px] rounded-full flex-shrink-0 border-2 border-accent overflow-hidden flex items-center justify-center text-2xl bg-gradient-to-br from-teal-50 to-teal-100 cursor-pointer hover:border-accent/70 transition-colors shadow-sm"
                >
                  {emoji}
                </div>
              ))}
            </div>
          </div>

          {/* ── License Section ───────────────────────────────────── */}
          {provider.sltdaLicenseNo && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-lg shadow-sm flex-shrink-0">
                🔒
              </div>
              <div>
                <p className="text-sm font-bold text-success">
                  License #{provider.sltdaLicenseNo}
                </p>
                <p className="text-[11px] text-muted">
                  Government verified · SLTDA registered · Expires 2027
                </p>
              </div>
            </div>
          )}

          {/* Description */}
          {provider.description && (
            <p className="text-sm text-ink/80 mb-3 leading-relaxed">
              {provider.description}
            </p>
          )}

          {/* ── Tour Tags (Guide-specific) ────────────────────────── */}
          <div className="flex gap-2 flex-wrap mb-2">
            {isGuide && (
              <>
                <span className="chip bg-green-50 text-success text-[10px] border border-green-100">🏛️ Heritage</span>
                <span className="chip bg-green-50 text-success text-[10px] border border-green-100">🦁 Wildlife</span>
                <span className="chip bg-green-50 text-success text-[10px] border border-green-100">🚗 Chauffeur</span>
                {guideProfile?.tierClassification === 'NATIONAL' && (
                  <span className="chip bg-primary-light text-primary text-[10px] border border-primary/20">🏆 National Guide</span>
                )}
              </>
            )}
            {isSurf && (
              <>
                {surfProfile?.isaCertified && (
                  <span className="chip bg-green-50 text-success text-[10px] border border-green-100">🏄 ISA Certified</span>
                )}
                {surfProfile?.lessonTypes && JSON.parse(surfProfile.lessonTypes).map((lt: string) => (
                  <span key={lt} className="chip bg-blue-50 text-blue-700 text-[10px] border border-blue-100">{lt}</span>
                ))}
              </>
            )}
            {isYoga && yogaProfile?.stylesOffered && (
              yogaProfile.stylesOffered.split(',').map((style: string) => (
                <span key={style} className="chip bg-purple-50 text-purple-700 text-[10px] border border-purple-100">{style.trim()}</span>
              ))
            )}
          </div>

          {/* ── Guide-specific info ───────────────────────────────── */}
          {isGuide && guideProfile && (
            <div className="mt-3 space-y-2.5 bg-pearl rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Hourly Rate</span>
                <span className="font-bold text-primary">${Number(guideProfile.hourlyRate).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Half Day (4h)</span>
                <span className="font-bold text-primary">${Number(guideProfile.halfDayRate).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Full Day (8h)</span>
                <span className="font-bold text-primary">${Number(guideProfile.fullDayRate).toFixed(2)}</span>
              </div>
              {guideProfile.vehicleProvided && (
                <div className="flex items-center gap-2 text-sm border-t border-gray-200 pt-2">
                  <span className="text-lg">🚗</span>
                  <span className="text-ink">Vehicle: <strong>{guideProfile.vehicleType || 'Car'}</strong> available</span>
                </div>
              )}
              {guideProfile.languagePremium > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-lg">🌍</span>
                  <span className="text-ink">Language premium: <strong>+${guideProfile.languagePremium}/hr</strong></span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-lg">👥</span>
                <span className="text-ink">Max group size: <strong>{guideProfile.maxGroupSize} people</strong></span>
              </div>
            </div>
          )}

          {/* ── Surf-specific info ────────────────────────────────── */}
          {isSurf && surfProfile && (
            <div className="mt-3 space-y-2.5 bg-pearl rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Session Rate</span>
                <span className="font-bold text-primary">${Number(surfProfile.sessionRate).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Board Rental</span>
                <span className="font-bold text-primary">${Number(surfProfile.boardRentDaily).toFixed(2)}/day</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Wetsuit Rental</span>
                <span className="font-bold text-primary">${Number(surfProfile.wetsuitRentDaily).toFixed(2)}/day</span>
              </div>
              <div className="flex items-center gap-2 text-sm border-t border-gray-200 pt-2">
                <span className="text-lg">🏄</span>
                <span className="text-ink"><strong>{surfProfile.boardInventory}</strong> boards · <strong>{surfProfile.instructorCount}</strong> instructors</span>
              </div>
              {surfProfile.isaCertified && (
                <div className="verified-badge text-[10px]">🏄 ISA Certified School</div>
              )}
            </div>
          )}

          {/* ── Yoga-specific info ────────────────────────────────── */}
          {isYoga && yogaProfile && (
            <div className="mt-3 space-y-3">
              <div className="bg-pearl rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted">Mat Capacity</span>
                  <span className="font-bold text-sm text-ink">{yogaProfile.currentOccupancy} / {yogaProfile.maxMatCapacity}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill bg-purple-600"
                    style={{ width: `${(Number(yogaProfile.currentOccupancy) / Number(yogaProfile.maxMatCapacity)) * 100}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-pearl rounded-xl p-3">
                  <p className="font-bold text-lg text-purple-700">${Number(yogaProfile.dropInRate).toFixed(0)}</p>
                  <p className="text-[10px] text-muted">Drop-in</p>
                </div>
                <div className="bg-pearl rounded-xl p-3">
                  <p className="font-bold text-lg text-purple-700">${Number(yogaProfile.package5Rate).toFixed(0)}</p>
                  <p className="text-[10px] text-muted">5 Classes</p>
                </div>
                <div className="bg-pearl rounded-xl p-3">
                  <p className="font-bold text-lg text-purple-700">${Number(yogaProfile.package10Rate).toFixed(0)}</p>
                  <p className="text-[10px] text-muted">10 Classes</p>
                </div>
              </div>
              {yogaProfile.matRentalIncluded && (
                <p className="text-xs text-success font-medium text-center">✅ Mat rental included with all classes</p>
              )}
            </div>
          )}
        </div>

        {/* ── Scroll Indicator ────────────────────────────────────── */}
        <p className="text-center text-[10px] text-muted mb-4 flex items-center justify-center gap-1">
          <span>▾</span>
          <span>Scroll for cancellation policy &amp; full reviews</span>
          <span>▾</span>
        </p>

        {/* ── Reviews Section ─────────────────────────────────────── */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg">Reviews ({reviewCount})</h2>
            {rating > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-accent font-bold text-lg">{rating.toFixed(1)}</span>
                <span className="text-accent">{'★'.repeat(fullStars)}</span>
              </div>
            )}
          </div>

          {provider.reviews?.length > 0 ? (
            <div className="space-y-3">
              {provider.reviews.map((review: any) => (
                <div key={review.reviewId} className="card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                      {review.user?.fullName?.[0] || '👤'}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{review.user?.fullName || 'Anonymous'}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-accent text-[10px]">
                          {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                        </span>
                        <span className="text-[10px] text-muted">
                          {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-ink/80 leading-relaxed">{review.reviewText}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-pearl rounded-xl">
              <p className="text-muted text-sm">No reviews yet. Be the first!</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky Book Button ────────────────────────────────────── */}
      <div className="sticky bottom-20 md:bottom-0 bg-white border-t border-gray-100 p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <button
          onClick={handleBookNow}
          className="btn-primary w-full py-4 text-base font-bold flex items-center justify-center gap-2"
        >
          {user ? (
            <>Select Date &amp; Time <span className="text-lg">→</span></>
          ) : (
            <>Login to Book <span className="text-lg">→</span></>
          )}
        </button>
        <p className="text-[10px] text-muted text-center mt-2">
          🔒 Stripe &amp; GovPay secured · Free cancellation up to 24h before
        </p>
      </div>
    </div>
  );
}
