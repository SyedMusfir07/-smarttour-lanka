'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, apiFetch, LoadingSpinner, ErrorDisplay, Toast } from '../../../lib';

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'govpay'>('stripe');
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    apiFetch(`/api/bookings/${params.id}`)
      .then((result) => setBooking(result.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handlePay = async () => {
    setProcessing(true);
    try {
      const result = await apiFetch(`/api/bookings/${params.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ paymentMethod }),
      });
      setToast({ message: 'Payment successful! Booking confirmed.', type: 'success' });
      setTimeout(() => router.push('/bookings'), 1500);
    } catch (err: any) {
      setToast({ message: err.message || 'Payment failed', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-muted">Please log in to complete payment</p>
      </div>
    );
  }

  if (loading) return <LoadingSpinner text="Loading booking..." />;
  if (error) return <ErrorDisplay message={error} onRetry={() => window.location.reload()} />;
  if (!booking) return <ErrorDisplay message="Booking not found" />;

  return (
    <div className="animate-fade-in py-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <h2 className="font-bold text-xl mb-4">Secure Payment</h2>

      {/* Booking Summary */}
      <div className="card p-4 mb-4">
        <h3 className="font-bold text-sm mb-3">Booking Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Provider</span>
            <span className="font-semibold">{booking.provider?.fullName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Date</span>
            <span className="font-semibold">{new Date(booking.startTime).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Duration</span>
            <span className="font-semibold">{Number(booking.durationHours)} hours</span>
          </div>
          <div className="border-t pt-2 flex justify-between">
            <span className="font-bold">Total Amount</span>
            <span className="font-bold text-xl text-primary">${Number(booking.netAmount).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div className="card p-4 mb-4">
        <h3 className="font-bold text-sm mb-3">Payment Method</h3>
        <div className="space-y-3">
          <button
            onClick={() => setPaymentMethod('stripe')}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              paymentMethod === 'stripe'
                ? 'border-primary bg-primary-light'
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-700">
                S
              </div>
              <div>
                <p className="font-bold text-sm">Stripe</p>
                <p className="text-xs text-muted">Credit/Debit card · Visa, Mastercard, Amex</p>
              </div>
              {paymentMethod === 'stripe' && <span className="ml-auto text-primary text-lg">✓</span>}
            </div>
          </button>

          <button
            onClick={() => setPaymentMethod('govpay')}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              paymentMethod === 'govpay'
                ? 'border-primary bg-primary-light'
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-lg font-bold text-green-700">
                G
              </div>
              <div>
                <p className="font-bold text-sm">GovPay</p>
                <p className="text-xs text-muted">Sri Lanka government payment gateway</p>
              </div>
              {paymentMethod === 'govpay' && <span className="ml-auto text-primary text-lg">✓</span>}
            </div>
          </button>
        </div>

        {/* Mock card form */}
        {paymentMethod === 'stripe' && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1">Card Number</label>
              <input
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                placeholder="4242 4242 4242 4242"
                readOnly
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Expiry</label>
                <input
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                  placeholder="12/26"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">CVC</label>
                <input
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                  placeholder="123"
                  readOnly
                />
              </div>
            </div>
          </div>
        )}

        {paymentMethod === 'govpay' && (
          <div className="mt-4 p-4 bg-green-50 rounded-xl text-sm">
            <p className="font-semibold text-success">🏛️ GovPay - Sri Lanka Government Payment Gateway</p>
            <p className="text-xs text-muted mt-1">Redirecting to LankaPay secure portal (mock)</p>
          </div>
        )}
      </div>

      {/* Pay Button */}
      <button
        onClick={handlePay}
        disabled={processing}
        className="btn-primary w-full py-4 text-base disabled:opacity-50"
      >
        {processing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing Payment...
          </span>
        ) : (
          `Pay $${Number(booking.netAmount).toFixed(2)}`
        )}
      </button>

      <div className="text-center mt-4">
        <button
          onClick={() => router.back()}
          className="text-sm text-muted hover:text-ink"
        >
          ← Back to booking
        </button>
      </div>
    </div>
  );
}
