'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, apiFetch, LoadingSpinner, ErrorDisplay } from '../lib';

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  CONFIRMED: 'bg-green-50 text-green-700 border-green-200',
  ONGOING: 'bg-blue-50 text-blue-700 border-blue-200',
  COMPLETED: 'bg-gray-50 text-gray-700 border-gray-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

export default function BookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    apiFetch('/api/bookings')
      .then((result) => setBookings(result.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-12">
        <p className="text-muted mb-4">Please log in to see your bookings</p>
        <Link href="/auth/login" className="btn-primary">Login</Link>
      </div>
    );
  }

  if (loading) return <LoadingSpinner text="Loading bookings..." />;
  if (error) return <ErrorDisplay message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="animate-fade-in py-4">
      {user.role === 'PROVIDER' && (
        <div className="flex gap-2 mb-4">
          <Link href="/provider/dashboard" className="btn-teal flex-1 text-center text-sm py-2">Provider Hub</Link>
          <Link href="/provider/calendar" className="btn-outline flex-1 text-center text-sm py-2">Calendar</Link>
        </div>
      )}

      <h2 className="font-bold text-lg mb-4">
        {user.role === 'PROVIDER' ? 'Booking Requests' : 'My Bookings'}
      </h2>

      {bookings.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📅</div>
          <p className="text-muted mb-4">No bookings yet</p>
          <Link href="/map" className="btn-primary">Browse Providers</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking: any) => (
            <div key={booking.bookingId} className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-lg">
                    {user.role === 'PROVIDER' ? '👤' : 
                     booking.provider?.providerType === 'GUIDE' ? '🧭' :
                     booking.provider?.providerType === 'SURF_SCHOOL' ? '🏄' : '🧘'}
                  </div>
                  <div>
                    <p className="font-bold text-sm">
                      {user.role === 'PROVIDER' ? booking.user?.fullName : booking.provider?.fullName}
                    </p>
                    <p className="text-xs text-muted">{booking.provider?.providerType?.replace('_', ' ') || 'Booking'}</p>
                  </div>
                </div>
                <span className={`chip border ${statusColors[booking.status] || 'bg-gray-100 text-gray-600'} text-[10px]`}>
                  {booking.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <p className="text-muted text-xs">Date & Time</p>
                  <p className="font-semibold">{new Date(booking.startTime).toLocaleDateString()}</p>
                  <p className="text-xs text-muted">{new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div>
                  <p className="text-muted text-xs">Duration</p>
                  <p className="font-semibold">{Number(booking.durationHours)} hours</p>
                  <p className="font-semibold text-primary">${Number(booking.netAmount).toFixed(2)}</p>
                </div>
              </div>

              {/* Action buttons based on status */}
              <div className="flex gap-2">
                {booking.status === 'PENDING' && user.role === 'PROVIDER' && (
                  <>
                    <button className="flex-1 bg-success text-white py-2 rounded-lg text-sm font-bold">✓ Accept</button>
                    <button className="flex-1 border-2 border-danger text-danger py-2 rounded-lg text-sm font-bold">✕ Decline</button>
                  </>
                )}
                {booking.status === 'PENDING' && user.role === 'TOURIST' && (
                  <Link
                    href={`/bookings/${booking.bookingId}/pay`}
                    className="btn-primary flex-1 text-center text-sm py-2"
                  >
                    Pay Now
                  </Link>
                )}
                {booking.status === 'COMPLETED' && !booking.review && user.role === 'TOURIST' && (
                  <Link
                    href={`/bookings/${booking.bookingId}/review`}
                    className="btn-teal flex-1 text-center text-sm py-2"
                  >
                    Write Review
                  </Link>
                )}
                {booking.status === 'CONFIRMED' && (
                  <Link href={`/chat?bookingId=${booking.bookingId}`} className="flex-1 btn-outline text-center text-sm py-2">
                    Message Provider
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
