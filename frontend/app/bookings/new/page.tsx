'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, apiFetch, LoadingSpinner, ErrorDisplay, Toast } from '../../lib';

// ── Constants ──────────────────────────────────────────────────────────

const durations = [
  { label: '2 Hours', hours: 2, price: 50 },
  { label: 'Half Day (4h)', hours: 4, price: 90 },
  { label: 'Full Day (8h)', hours: 8, price: 160 },
  { label: 'Custom', hours: 0, price: 0 },
];

const tiers = ['NATIONAL', 'AREA', 'SITE', 'CHAUFFEUR'];

const tierRates: Record<string, number> = {
  NATIONAL: 25,
  AREA: 18,
  SITE: 12,
  CHAUFFEUR: 15,
};

const tierLabels: Record<string, string> = {
  NATIONAL: 'National',
  AREA: 'Area',
  SITE: 'Site',
  CHAUFFEUR: 'Chauffeur',
};

// ── Form Component ─────────────────────────────────────────────────────

function BookingNewForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const providerId = searchParams.get('providerId');
  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Booking form state
  const [selectedDuration, setSelectedDuration] = useState(1); // Default: Half Day
  const [selectedTier, setSelectedTier] = useState('SITE');
  const [groupSize, setGroupSize] = useState(2);
  const [vehicleEnabled, setVehicleEnabled] = useState(true); // Default ON per wireframe
  const [vehicleType, setVehicleType] = useState<'car' | 'tuk-tuk'>('car');
  const [languagePremium, setLanguagePremium] = useState(true); // Default ON per wireframe
  const [premiumLanguage, setPremiumLanguage] = useState('GERMAN');
  const [lunchIncluded, setLunchIncluded] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (providerId) {
      apiFetch(`/api/providers/${providerId}`)
        .then((result) => {
          setProvider(result.data);
          if (result.data.guideProfile?.tierClassification) {
            setSelectedTier(result.data.guideProfile.tierClassification);
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [providerId]);

  // ── Pricing Calculations ──────────────────────────────────────────

  const dur = durations[selectedDuration];
  const hours = dur.hours || 4;
  const baseRate = tierRates[selectedTier] || 12;
  
  // Wireframe shows: Base = $90 for 4h Half Day (so $22.50/hr = SITE tier rate)
  // But we use tier-based pricing which is more flexible
  const baseTotal = baseRate * hours;
  
  // Wireframe shows: Chauffeur Vehicle +$32 for Half Day (so $8/hr × 4h)
  const vehicleFee = vehicleEnabled ? (vehicleType === 'car' ? 8 : 5) * hours : 0;
  
  // Wireframe shows: Language Premium (DE) +$20 for Half Day ($5/hr × 4h)
  const langPremium = languagePremium ? 5 * hours : 0;
  
  // Lunch: flat $15 per booking (wireframe)
  const lunchFee = lunchIncluded ? 15 : 0;
  
  // Group discount: 5% per person above 4, max 20%
  const groupDiscountPercent = groupSize > 4 ? Math.min((groupSize - 4) * 5, 20) : 0;
  const subtotal = baseTotal + vehicleFee + langPremium + lunchFee;
  const groupDiscount = (subtotal * groupDiscountPercent) / 100;
  const total = subtotal - groupDiscount;

  // ── Handlers ──────────────────────────────────────────────────────

  const handleBook = async () => {
    if (!user) {
      router.push(`/auth/login?redirect=/bookings/new?providerId=${providerId}`);
      return;
    }
    if (!startDate || !startTime) {
      setToast({ message: 'Please select a date and time', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          providerId,
          startTime: `${startDate}T${startTime}:00.000Z`,
          durationHours: hours,
          addOnsTotal: vehicleFee + langPremium + lunchFee,
          netAmount: total,
        }),
      });
      setToast({ message: 'Booking created! Proceed to payment.', type: 'success' });
      setTimeout(() => router.push(`/bookings/${result.data.bookingId}/pay`), 1000);
    } catch (err: any) {
      setToast({ message: err.message || 'Booking failed', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading provider..." />;
  if (error || !provider) return <ErrorDisplay message={error || 'Provider not found'} />;

  const isGuide = provider.providerType === 'GUIDE';

  return (
    <div className="animate-fade-in py-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Provider Info Header ──────────────────────────────────── */}
      <div className="card p-4 mb-5 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-dark to-primary flex items-center justify-center text-xl text-white shadow-md flex-shrink-0">
          🧭
        </div>
        <div>
          <h2 className="font-bold text-base">{provider.fullName}</h2>
          <p className="text-sm text-muted">
            {isGuide
              ? `${tierLabels[selectedTier] || 'National'} Guide · Chauffeur`
              : provider.providerType?.replace('_', ' ')}
          </p>
        </div>
      </div>

      {/* ── Select Duration ────────────────────────────────────────── */}
      <div className="mb-5">
        <h3 className="font-bold text-sm mb-3">Select Duration</h3>
        <div className="grid grid-cols-4 gap-3">
          {durations.map((d, i) => {
            const isSelected = selectedDuration === i;
            return (
              <button
                key={d.label}
                onClick={() => setSelectedDuration(i)}
                className={`p-3 rounded-xl text-center transition-all duration-200 ${
                  isSelected
                    ? 'bg-primary text-white shadow-md ring-2 ring-primary/30 scale-[1.02]'
                    : 'bg-white text-ink border border-gray-100 hover:border-primary/30 hover:shadow-sm'
                }`}
              >
                <p className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-primary'}`}>
                  {d.hours > 0 ? `$${d.price}` : '—'}
                </p>
                <p className={`text-[10px] mt-1 ${isSelected ? 'text-white/80' : 'text-muted'}`}>
                  {d.label}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Guide Tier (only for guides) ───────────────────────────── */}
      {isGuide && (
        <div className="mb-5">
          <h3 className="font-bold text-sm mb-3">Guide Tier</h3>
          <div className="flex gap-2">
            {tiers.map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${
                  selectedTier === tier
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-pearl text-muted hover:bg-gray-200'
                }`}
              >
                <div>{tier}</div>
                <div className="text-[10px] opacity-75 mt-0.5">${tierRates[tier]}/hr</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Date & Time ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
            📅 Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
            ⏰ Time
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
          />
        </div>
      </div>

      {/* ── Group Size ─────────────────────────────────────────────── */}
      <div className="mb-5">
        <h3 className="font-bold text-sm mb-3">Group Size</h3>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setGroupSize(Math.max(1, groupSize - 1))}
            disabled={groupSize <= 1}
            className="w-10 h-10 rounded-full bg-pearl flex items-center justify-center font-bold text-lg hover:bg-gray-200 transition-colors disabled:opacity-40"
          >
            −
          </button>
          <div className="text-center min-w-[60px]">
            <span className="text-3xl font-bold text-ink">{groupSize}</span>
            <p className="text-[10px] text-muted">
              {groupSize === 1 ? 'person' : 'people'}
            </p>
          </div>
          <button
            onClick={() => setGroupSize(Math.min(8, groupSize + 1))}
            disabled={groupSize >= 8}
            className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg hover:bg-primary-dark transition-colors disabled:opacity-40"
          >
            +
          </button>
          {groupSize > 4 && (
            <div className="ml-2 bg-green-50 text-success text-[10px] font-bold px-3 py-1.5 rounded-full border border-green-100">
              −{groupDiscountPercent}% off!
            </div>
          )}
        </div>
      </div>

      {/* ── Add-ons ────────────────────────────────────────────────── */}
      <div className="card p-4 mb-5">
        <h3 className="font-bold text-sm mb-3">Add-ons</h3>
        
        {/* Vehicle */}
        <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
          <div>
            <p className="text-sm font-medium">🚗 Chauffeur Vehicle</p>
            <p className="text-xs text-muted">
              {vehicleType === 'car' ? `+$${(8 * hours).toFixed(0)} (Car)` : `+$${(5 * hours).toFixed(0)} (Tuk-tuk)`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {vehicleEnabled && (
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as 'car' | 'tuk-tuk')}
                className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-primary"
              >
                <option value="car">Car</option>
                <option value="tuk-tuk">Tuk-tuk</option>
              </select>
            )}
            <button
              onClick={() => setVehicleEnabled(!vehicleEnabled)}
              className={`w-11 h-6 rounded-full transition-all duration-200 ${
                vehicleEnabled ? 'bg-primary' : 'bg-gray-200'
              } relative`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all duration-200 shadow-sm ${
                vehicleEnabled ? 'right-0.5' : 'left-0.5'
              }`} />
            </button>
          </div>
        </div>

        {/* Language Premium */}
        <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
          <div>
            <p className="text-sm font-medium">🌍 Language Premium</p>
            <p className="text-xs text-muted">+${(5 * hours).toFixed(0)} ({premiumLanguage})</p>
          </div>
          <div className="flex items-center gap-2">
            {languagePremium && (
              <select
                value={premiumLanguage}
                onChange={(e) => setPremiumLanguage(e.target.value)}
                className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-primary"
              >
                <option value="GERMAN">German</option>
                <option value="RUSSIAN">Russian</option>
                <option value="MANDARIN">Mandarin</option>
              </select>
            )}
            <button
              onClick={() => setLanguagePremium(!languagePremium)}
              className={`w-11 h-6 rounded-full transition-all duration-200 ${
                languagePremium ? 'bg-primary' : 'bg-gray-200'
              } relative`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all duration-200 shadow-sm ${
                languagePremium ? 'right-0.5' : 'left-0.5'
              }`} />
            </button>
          </div>
        </div>

        {/* Lunch Included */}
        <div className="flex items-center justify-between py-2.5">
          <div>
            <p className="text-sm font-medium">🍛 Lunch Included</p>
            <p className="text-xs text-muted">+$15.00 flat</p>
          </div>
          <button
            onClick={() => setLunchIncluded(!lunchIncluded)}
            className={`w-11 h-6 rounded-full transition-all duration-200 ${
              lunchIncluded ? 'bg-primary' : 'bg-gray-200'
            } relative`}
          >
            <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all duration-200 shadow-sm ${
              lunchIncluded ? 'right-0.5' : 'left-0.5'
            }`} />
          </button>
        </div>
      </div>

      {/* ── Dynamic Price Breakdown ────────────────────────────────── */}
      <div className="card p-4 mb-5 bg-gradient-to-br from-white to-gray-50">
        <h3 className="font-bold text-sm mb-4 text-ink">Dynamic Price Breakdown</h3>
        <div className="space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted">
              Base ({hours}h × ${baseRate.toFixed(2)})
            </span>
            <span className="font-semibold text-ink">${baseTotal.toFixed(2)}</span>
          </div>
          {vehicleFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">
                🚗 Chauffeur Vehicle ({vehicleType}, {hours}h)
              </span>
              <span className="font-semibold text-ink">+${vehicleFee.toFixed(2)}</span>
            </div>
          )}
          {langPremium > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">
                🌍 Language Premium ({premiumLanguage})
              </span>
              <span className="font-semibold text-ink">+${langPremium.toFixed(2)}</span>
            </div>
          )}
          {lunchFee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">🍛 Lunch Included</span>
              <span className="font-semibold text-ink">+${lunchFee.toFixed(2)}</span>
            </div>
          )}
          {groupDiscount > 0 && (
            <div className="flex justify-between text-sm bg-green-50 -mx-4 px-4 py-2 rounded-none">
              <span className="text-success font-medium">
                🎉 Group Discount (−{groupDiscountPercent}%)
              </span>
              <span className="text-success font-bold">−${groupDiscount.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-3 mt-2 flex justify-between items-center">
            <span className="font-bold text-base text-primary">Net Total</span>
            <span className="font-bold text-xl text-primary">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* ── Book Button ────────────────────────────────────────────── */}
      <button
        onClick={handleBook}
        disabled={submitting}
        className="btn-primary w-full py-4 text-base disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </span>
        ) : (
          <>Proceed to Secure Payment <span className="text-lg">→</span></>
        )}
      </button>
      <p className="text-[11px] text-muted text-center mt-3">
        🔒 Stripe &amp; GovPay secured · Free cancellation up to 24h before
      </p>
    </div>
  );
}

// ── Page Export ────────────────────────────────────────────────────────

export default function BookingNewPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading..." />}>
      <BookingNewForm />
    </Suspense>
  );
}
