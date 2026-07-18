'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, apiFetch, LoadingSpinner, ErrorDisplay, Toast } from '../../lib';

// ── Mock Classes ───────────────────────────────────────────────────────

const classes = [
  { time: '6:30 AM', style: 'Sunrise Hatha', current: 8, max: 12 },
  { time: '9:00 AM', style: 'Vinyasa Flow', current: 15, max: 15 },
  { time: '5:00 PM', style: 'Sunset Yin', current: 4, max: 12 },
  { time: '7:00 PM', style: 'Ashtanga', current: 6, max: 10 },
];

const pricingPackages = [
  { label: 'Drop-in', price: 18, unit: 'class' },
  { label: '5-Class Pack', price: 75, unit: 'save $15' },
  { label: '10-Class Pack', price: 130, unit: 'save $50' },
  { label: 'Private Session', price: 65, unit: 'hr' },
];

// ── Page Component ─────────────────────────────────────────────────────

export default function YogaStudioPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (params.id) {
      apiFetch(`/api/providers/${params.id}`)
        .then((result) => setProvider(result.data))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [params.id]);

  if (loading) return <LoadingSpinner text="Loading yoga studio..." />;
  if (error || !provider) return <ErrorDisplay message={error || 'Not found'} />;

  const yogaProfile = provider.yogaProfile;
  if (!yogaProfile) return <ErrorDisplay message="Yoga profile not found" />;

  const styles = yogaProfile.stylesOffered?.split(',').map((s: string) => s.trim()) || [];
  const capacityPercent = Math.min((Number(yogaProfile.currentOccupancy) / Number(yogaProfile.maxMatCapacity)) * 100, 100);

  const handleBook = async (classIndex: number) => {
    if (!user) {
      router.push(`/auth/login?redirect=/yoga/${params.id}`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          providerId: params.id,
          startTime: new Date().toISOString(),
          durationHours: 1.5,
          addOnsTotal: 0,
          netAmount: Number(yogaProfile.dropInRate),
          requestedSlots: 1,
        }),
      });
      setToast({ message: 'Mat reserved! Proceed to payment.', type: 'success' });
      setTimeout(() => router.push(`/bookings/${result.data.bookingId}/pay`), 1000);
    } catch (err: any) {
      setToast({ message: err.message || 'Booking failed', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in py-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Studio Header ──────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-purple-800 via-purple-700 to-purple-600 rounded-xl p-5 text-white mb-5 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur flex items-center justify-center text-2xl shadow-inner flex-shrink-0">
            🧘
          </div>
          <div>
            <h2 className="font-bold text-lg">{provider.fullName}</h2>
            <p className="text-sm opacity-80">Certified Instructor · Est. 2018</p>
            <div className="flex gap-2 mt-1.5">
              {provider.isVerified && (
                <span className="verified-badge text-[9px] bg-white/20 text-white border border-white/30">✅ Verified</span>
              )}
            </div>
          </div>
        </div>

        {/* Mat Capacity Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="opacity-80">Mat Capacity</span>
            <span className="font-bold">
              {yogaProfile.currentOccupancy} of {yogaProfile.maxMatCapacity} taken
            </span>
          </div>
          <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${capacityPercent}%`,
                background: capacityPercent > 80
                  ? 'linear-gradient(90deg, #FF8F00, #D32F2F)'
                  : capacityPercent > 60
                  ? 'linear-gradient(90deg, #66BB6A, #FF8F00)'
                  : 'linear-gradient(90deg, #A5D6A7, #66BB6A)',
              }}
            />
          </div>
          {capacityPercent > 80 && (
            <p className="text-[10px] text-accent font-semibold mt-1">⚠️ Almost full — book soon!</p>
          )}
        </div>

        {/* Style Tags */}
        <div className="flex gap-2 flex-wrap">
          {styles.map((style: string) => (
            <span
              key={style}
              className="chip bg-white/15 text-white text-[9px] border border-white/20 backdrop-blur"
            >
              {style}
            </span>
          ))}
        </div>
      </div>

      {/* ── Today's Classes — Live Capacity ─────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm">Today&apos;s Classes — Live Capacity</h3>
          <span className="text-[10px] text-muted">{classes.filter(c => c.current < c.max).length} available</span>
        </div>
        <div className="space-y-3">
          {classes.map((cls, i) => {
            const isFull = cls.current >= cls.max;
            const isSelected = selectedClass === i;
            const fillPercent = (cls.current / cls.max) * 100;

            return (
              <div
                key={i}
                onClick={() => !isFull && setSelectedClass(i)}
                className={`card p-4 border-2 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50/50 ring-1 ring-purple-200'
                    : isFull
                    ? 'border-red-100 bg-red-50/50'
                    : 'border-transparent hover:border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isFull ? 'bg-danger' : 'bg-success'}`} />
                    <div>
                      <p className="font-bold text-sm">{cls.time}</p>
                      <p className="text-xs text-muted">{cls.style}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleBook(i); }}
                    disabled={submitting}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isFull
                        ? 'bg-accent text-white hover:bg-accent/90 shadow-sm'
                        : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm hover:shadow-md'
                    }`}
                  >
                    {isFull ? 'Join Waitlist' : 'Book'}
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className={isFull ? 'text-danger font-semibold' : 'text-success'}>
                      {cls.current} / {cls.max} mats filled
                      {isFull ? ' — View Alternatives' : ''}
                    </span>
                    {!isFull && (
                      <span className="text-muted">{cls.max - cls.current} spot{(cls.max - cls.current) !== 1 ? 's' : ''} left</span>
                    )}
                  </div>
                  <div className="progress-bar h-2">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${fillPercent}%`,
                        background: isFull
                          ? '#D32F2F'
                          : fillPercent > 75
                          ? '#FF8F00'
                          : '#6A1B9A',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Pricing ─────────────────────────────────────────────────── */}
      <div className="card p-4 mb-5">
        <h3 className="font-bold text-sm mb-4">Pricing</h3>
        <div className="space-y-1">
          {pricingPackages.map((pkg, i) => {
            let priceDisplay = '';
            if (pkg.label === 'Drop-in') priceDisplay = `$${pkg.price}/${pkg.unit}`;
            else if (pkg.label === '5-Class Pack') {
              const savings = yogaProfile.dropInRate * 5 - yogaProfile.package5Rate;
              priceDisplay = `$${yogaProfile.package5Rate} (save $${Number(savings).toFixed(0)})`;
            } else if (pkg.label === '10-Class Pack') {
              const savings = yogaProfile.dropInRate * 10 - yogaProfile.package10Rate;
              priceDisplay = `$${yogaProfile.package10Rate} (save $${Number(savings).toFixed(0)})`;
            } else if (pkg.label === 'Private Session') {
              priceDisplay = `$${pkg.price}/${pkg.unit}`;
            } else {
              priceDisplay = `$${yogaProfile.dropInRate || pkg.price}/${pkg.unit}`;
            }

            return (
              <div
                key={i}
                className={`flex items-center justify-between py-3 px-3 rounded-xl transition-colors ${
                  i < 3 ? 'border-b border-gray-100' : ''
                } ${i === 1 ? 'bg-purple-50 border border-purple-100' : ''}`}
              >
                <div className="flex items-center gap-2">
                  {i === 1 && <span className="text-[10px] bg-accent text-white px-2 py-0.5 rounded-full font-bold">POPULAR</span>}
                  <span className={`text-sm ${i === 1 ? 'font-bold text-ink' : 'text-ink'}`}>{pkg.label}</span>
                </div>
                <span className={`font-bold ${i === 1 ? 'text-purple-700 text-base' : 'text-purple-700'}`}>
                  {priceDisplay}
                </span>
              </div>
            );
          })}
        </div>
        {yogaProfile.matRentalIncluded && (
          <div className="mt-3 bg-green-50 border border-green-100 rounded-lg p-3 flex items-center gap-2">
            <span className="text-lg">✅</span>
            <p className="text-xs text-success font-medium">Mat rental included with all classes</p>
          </div>
        )}
      </div>

      {/* ── Reserve My Mat Button ───────────────────────────────────── */}
      <div className="sticky bottom-20 md:bottom-0 bg-white border-t border-gray-100 p-4 -mx-4 px-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <button
          onClick={() => handleBook(selectedClass ?? 0)}
          disabled={submitting}
          className="w-full py-4 text-base font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg transition-all"
          style={{
            background: 'linear-gradient(135deg, #6A1B9A, #7B1FA2)',
            color: 'white',
          }}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Booking...
            </span>
          ) : (
            <>Reserve My Mat <span className="text-lg">→</span></>
          )}
        </button>
        <p className="text-[10px] text-muted text-center mt-2">
          🔒 Secure payment · Free cancellation up to 2h before class
        </p>
      </div>
    </div>
  );
}
