'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, apiFetch, LoadingSpinner, ErrorDisplay, Toast } from '../../../lib';

const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [aspectRatings, setAspectRatings] = useState({
    Punctuality: 5,
    Knowledge: 5,
    Language: 4,
    Value: 4,
  });

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    apiFetch(`/api/bookings/${params.id}`)
      .then((result) => {
        setBooking(result.data);
        if (result.data.status !== 'COMPLETED') {
          setError('Reviews can only be submitted for completed bookings.');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id, user]);

  const handleSubmit = async () => {
    if (rating === 0) {
      setToast({ message: 'Please select an overall rating', type: 'error' });
      return;
    }
    if (!reviewText.trim()) {
      setToast({ message: 'Please share your experience', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: params.id,
          rating,
          reviewText: reviewText.trim(),
        }),
      });
      setToast({ message: 'Review submitted successfully!', type: 'success' });
      setTimeout(() => router.push('/bookings'), 1500);
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to submit review', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-muted">Please log in to submit a review</p>
      </div>
    );
  }

  if (loading) return <LoadingSpinner text="Loading booking..." />;
  if (error) return <ErrorDisplay message={error} onRetry={() => window.location.reload()} />;
  if (!booking) return <ErrorDisplay message="Booking not found" />;

  return (
    <div className="animate-fade-in py-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="font-bold text-xl text-ink">How was your experience?</h2>
        <p className="text-sm text-muted mt-1.5 max-w-xs mx-auto">
          Your review helps other travellers find verified local guides
        </p>
      </div>

      {/* ── Booking Summary ────────────────────────────────────────── */}
      <div className="card p-4 mb-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-dark to-primary flex items-center justify-center text-xl text-white shadow-md flex-shrink-0">
          {booking.provider?.providerType === 'GUIDE' ? '🧭' : 
           booking.provider?.providerType === 'SURF_SCHOOL' ? '🏄' : '🧘'}
        </div>
        <div>
          <p className="font-bold text-sm">{booking.provider?.fullName || 'Provider'}</p>
          <p className="text-[10px] text-muted">
            {booking.provider?.providerType?.replace('_', ' ')} · {new Date(booking.startTime).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · {Number(booking.durationHours)}h
          </p>
        </div>
      </div>

      {/* ── Overall Rating ─────────────────────────────────────────── */}
      <div className="card p-5 mb-4 text-center">
        <p className="font-bold text-sm mb-4 text-ink">Overall Rating</p>
        <div className="flex justify-center gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className={`text-4xl transition-all duration-150 ${
                star <= (hoverRating || rating)
                  ? 'text-accent scale-110 drop-shadow-sm'
                  : 'text-gray-300 hover:text-accent/50'
              }`}
            >
              ★
            </button>
          ))}
        </div>
        <p className="text-sm font-medium mt-2 text-ink/70">
          {rating === 0 ? 'Tap a star to rate' : ratingLabels[rating]}
        </p>
      </div>

      {/* ── Aspect Ratings ─────────────────────────────────────────── */}
      <div className="card p-4 mb-4">
        <p className="font-bold text-sm mb-3 text-ink">Rate specific aspects</p>
        <div className="space-y-1">
          {Object.entries(aspectRatings).map(([aspect, val]) => (
            <div key={aspect} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-sm text-ink">{aspect}</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setAspectRatings(prev => ({ ...prev, [aspect]: star }))}
                    className={`text-lg transition-all ${
                      star <= val ? 'text-accent' : 'text-gray-300'
                    } hover:scale-110`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Review Text ────────────────────────────────────────────── */}
      <div className="card p-4 mb-5">
        <p className="font-bold text-sm mb-3 text-ink">Share your experience</p>
        <textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="What made this experience special? Tell other travellers about your guide, the scenery, and any highlights..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none min-h-[110px] text-sm resize-none transition-all leading-relaxed"
          maxLength={2000}
        />
        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] text-muted">Your feedback helps the community</p>
          <p className="text-[10px] text-muted">{reviewText.length}/2000</p>
        </div>
      </div>

      {/* ── Submit Button ──────────────────────────────────────────── */}
      <button
        onClick={handleSubmit}
        disabled={submitting || rating === 0}
        className="btn-primary w-full py-4 text-base disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Submitting...
          </span>
        ) : (
          'Submit Review'
        )}
      </button>

      <div className="text-center mt-3">
        <button
          onClick={() => router.push('/bookings')}
          className="text-sm text-muted hover:text-primary font-medium transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
