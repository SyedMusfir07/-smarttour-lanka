'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, apiFetch, LoadingSpinner, ErrorDisplay, Toast } from '../../lib';

// ── Mock Sessions ──────────────────────────────────────────────────────

const sessions = [
  { time: '7:00 AM', level: 'Beginner', spots: 5, maxCapacity: 8 },
  { time: '9:30 AM', level: 'Intermediate', spots: 2, maxCapacity: 8 },
  { time: '12:00 PM', level: 'Advanced', spots: 0, maxCapacity: 8 },
  { time: '3:00 PM', level: 'Beginner', spots: 8, maxCapacity: 8 },
];

// ── Page Component ─────────────────────────────────────────────────────

export default function SurfBookingPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [boardRent, setBoardRent] = useState(false);
  const [wetsuitRent, setWetsuitRent] = useState(false);
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

  if (loading) return <LoadingSpinner text="Loading surf school..." />;
  if (error || !provider) return <ErrorDisplay message={error || 'Not found'} />;

  const surfProfile = provider.surfProfile;
  if (!surfProfile) return <ErrorDisplay message="Surf profile not found" />;

  const handleBook = async (sessionIndex: number) => {
    if (!user) {
      router.push(`/auth/login?redirect=/surf/${params.id}`);
      return;
    }

    setSubmitting(true);
    try {
      const session = sessions[sessionIndex];
      const result = await apiFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          providerId: params.id,
          startTime: new Date().toISOString(),
          durationHours: 2,
          addOnsTotal: (boardRent ? Number(surfProfile.boardRentDaily) : 0) + (wetsuitRent ? Number(surfProfile.wetsuitRentDaily) : 0),
          netAmount: Number(surfProfile.sessionRate) + (boardRent ? Number(surfProfile.boardRentDaily) : 0) + (wetsuitRent ? Number(surfProfile.wetsuitRentDaily) : 0),
          requestedBoards: 1,
          requestedStudents: 1,
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

  return (
    <div className="animate-fade-in py-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Provider Header ────────────────────────────────────────── */}
      <div className="card p-4 mb-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-xl text-white shadow-md flex-shrink-0">
          🏄
        </div>
        <div className="flex-1">
          <h2 className="font-bold">{provider.fullName}</h2>
          <p className="text-sm text-muted">Weligama Beach</p>
          <div className="flex gap-2 mt-1">
            {surfProfile.isaCertified && (
              <span className="verified-badge text-[9px]">ISA Certified</span>
            )}
            <span className="text-[10px] text-muted">{surfProfile.boardInventory} boards</span>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-primary text-sm">${Number(surfProfile.sessionRate).toFixed(0)}</p>
          <p className="text-[10px] text-muted">per session</p>
        </div>
      </div>

      {/* ── Live Wave Conditions Widget ────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 rounded-xl p-4 text-white mb-5 shadow-lg">
        <p className="text-[10px] opacity-75 mb-3 uppercase tracking-wider font-semibold">
          🌊 Live Conditions · Weligama Beach
        </p>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="bg-white/10 rounded-lg p-2.5 backdrop-blur">
            <p className="text-xl font-extrabold">1.4m</p>
            <p className="text-[9px] opacity-75 mt-0.5">Wave Height</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2.5 backdrop-blur">
            <p className="text-xl font-extrabold">11s</p>
            <p className="text-[9px] opacity-75 mt-0.5">Period</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2.5 backdrop-blur">
            <p className="text-xl font-extrabold">14km/h</p>
            <p className="text-[9px] opacity-75 mt-0.5">Wind</p>
          </div>
          <div className="bg-white/10 rounded-lg p-2.5 backdrop-blur">
            <p className="text-lg font-extrabold text-green-300">✅ GOOD</p>
            <p className="text-[9px] opacity-75 mt-0.5">Conditions</p>
          </div>
        </div>
      </div>

      {/* ── Available Sessions Today ───────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm">Available Sessions Today</h3>
          <span className="text-[10px] text-muted">{sessions.filter(s => s.spots > 0).length} available</span>
        </div>
        <div className="space-y-3">
          {sessions.map((session, i) => {
            const isFull = session.spots === 0;
            const isSelected = selectedSlot === i;
            const fillPercent = ((session.maxCapacity - session.spots) / session.maxCapacity) * 100;
            const spotsColor = isFull ? 'text-danger' : session.spots <= 3 ? 'text-accent' : 'text-success';

            return (
              <div
                key={i}
                onClick={() => !isFull && setSelectedSlot(i)}
                className={`card p-4 border-2 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-primary bg-primary-light/30 ring-1 ring-primary/20'
                    : isFull
                    ? 'border-red-100 bg-red-50/50'
                    : 'border-transparent hover:border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isFull ? 'bg-danger' : spotsColor}`} />
                    <div>
                      <p className="font-bold text-sm">{session.time}</p>
                      <p className="text-[10px] text-muted">{session.level}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleBook(i); }}
                    disabled={isFull || submitting}
                    className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                      isFull
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-accent text-white hover:bg-accent/90 shadow-sm hover:shadow-md'
                    }`}
                  >
                    {isFull ? 'Join Waitlist' : 'Book'}
                  </button>
                </div>

                {/* Capacity Progress Bar */}
                {!isFull && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className={spotsColor}>
                        {session.spots} spot{session.spots !== 1 ? 's' : ''} left
                      </span>
                      <span className="text-muted">of {session.maxCapacity}</span>
                    </div>
                    <div className="progress-bar h-2">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${fillPercent}%`,
                          background: fillPercent > 80
                            ? '#D32F2F'
                            : fillPercent > 60
                            ? '#FF8F00'
                            : '#2E7D32',
                        }}
                      />
                    </div>
                  </div>
                )}

                {isFull && (
                  <p className="text-[10px] text-danger font-semibold mt-1">This session is full — join the waitlist</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Equipment Add-ons ──────────────────────────────────────── */}
      <div className="card p-4 mb-4">
        <h3 className="font-bold text-sm mb-3">Equipment Add-ons</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium">🏄 Surfboard</p>
              <p className="text-xs text-muted">${Number(surfProfile.boardRentDaily).toFixed(0)} / day</p>
            </div>
            <button
              onClick={() => setBoardRent(!boardRent)}
              className={`w-11 h-6 rounded-full transition-all duration-200 ${
                boardRent ? 'bg-primary' : 'bg-gray-200'
              } relative`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all duration-200 shadow-sm ${
                boardRent ? 'right-0.5' : 'left-0.5'
              }`} />
            </button>
          </div>
          <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
            <div>
              <p className="text-sm font-medium">🤿 Wetsuit</p>
              <p className="text-xs text-muted">${Number(surfProfile.wetsuitRentDaily).toFixed(0)} / day</p>
            </div>
            <button
              onClick={() => setWetsuitRent(!wetsuitRent)}
              className={`w-11 h-6 rounded-full transition-all duration-200 ${
                wetsuitRent ? 'bg-primary' : 'bg-gray-200'
              } relative`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all duration-200 shadow-sm ${
                wetsuitRent ? 'right-0.5' : 'left-0.5'
              }`} />
            </button>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <div>
              <p className="text-sm font-medium">🦺 Safety Vest</p>
              <p className="text-xs text-success font-medium">Included</p>
            </div>
            <div className="w-11 h-6 rounded-full bg-success/30 flex items-center justify-center">
              <span className="text-success text-xs font-bold">✓</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Inventory Status ────────────────────────────────────────── */}
      <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-5 flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-base">✅</span>
        </div>
        <div>
          <p className="text-sm text-success font-semibold">
            {surfProfile.boardInventory} boards and {surfProfile.instructorCount} instructors available
          </p>
          <p className="text-[11px] text-muted mt-0.5">
            {selectedSlot !== null
              ? `Ready for the ${sessions[selectedSlot]?.time} ${sessions[selectedSlot]?.level} session`
              : 'Select a session above to book'}
          </p>
        </div>
      </div>

      {/* ── Checkout Button ─────────────────────────────────────────── */}
      {selectedSlot !== null && (
        <div className="sticky bottom-20 md:bottom-0 bg-white border-t border-gray-100 p-4 -mx-4 px-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted">{sessions[selectedSlot]?.time} · {sessions[selectedSlot]?.level}</p>
              <p className="text-xs text-muted">
                ${Number(surfProfile.sessionRate).toFixed(0)} session
                {boardRent ? ` + $${Number(surfProfile.boardRentDaily).toFixed(0)} board` : ''}
                {wetsuitRent ? ` + $${Number(surfProfile.wetsuitRentDaily).toFixed(0)} wetsuit` : ''}
              </p>
            </div>
            <p className="font-bold text-lg text-primary">
              ${(
                Number(surfProfile.sessionRate) +
                (boardRent ? Number(surfProfile.boardRentDaily) : 0) +
                (wetsuitRent ? Number(surfProfile.wetsuitRentDaily) : 0)
              ).toFixed(0)}
            </p>
          </div>
          <button
            onClick={() => handleBook(selectedSlot)}
            disabled={submitting}
            className="btn-teal w-full py-4 text-base disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Booking...
              </span>
            ) : (
              <>Proceed to Checkout <span className="text-lg">→</span></>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
