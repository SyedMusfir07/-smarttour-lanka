'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, apiFetch, LoadingSpinner, ErrorDisplay } from '../lib';

export default function DashboardPage() {
  const { user, logout } = useAuth();
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
        <div className="text-4xl mb-4">👤</div>
        <p className="text-muted mb-4">Please log in to view your dashboard</p>
        <Link href="/auth/login" className="btn-primary">Login</Link>
        <Link href="/auth/register" className="text-primary mt-3 text-sm font-semibold">Create account</Link>
      </div>
    );
  }

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;
  if (error) return <ErrorDisplay message={error} onRetry={() => window.location.reload()} />;

  const isProvider = user.role === 'PROVIDER';
  const isAdmin = user.role === 'ADMIN';

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b: any) => b.status === 'PENDING').length,
    confirmed: bookings.filter((b: any) => b.status === 'CONFIRMED').length,
    completed: bookings.filter((b: any) => b.status === 'COMPLETED').length,
    ongoing: bookings.filter((b: any) => b.status === 'ONGOING').length,
  };

  const completedBookings = bookings.filter((b: any) => b.status === 'COMPLETED');

  return (
    <div className="animate-fade-in py-4">
      {/* User Info */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center text-2xl font-bold text-primary">
            {user.fullName[0]}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-lg">{user.fullName}</h2>
            <p className="text-sm text-muted">{user.email}</p>
            <span className="chip bg-primary-light text-primary text-xs mt-1">
              {user.role === 'PROVIDER' ? `Provider · ${user.providerType?.replace('_', ' ') || ''}` : user.role}
            </span>
          </div>
          <button onClick={logout} className="text-sm text-danger font-semibold">Logout</button>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {isProvider ? (
          <>
            <Link href="/provider/dashboard" className="card p-4 text-center hover:shadow-md transition-shadow">
              <div className="text-2xl mb-1">📊</div>
              <p className="font-bold text-sm">Provider Hub</p>
            </Link>
            <Link href="/provider/calendar" className="card p-4 text-center hover:shadow-md transition-shadow">
              <div className="text-2xl mb-1">📅</div>
              <p className="font-bold text-sm">Calendar</p>
            </Link>
            <Link href="/provider/earnings" className="card p-4 text-center hover:shadow-md transition-shadow">
              <div className="text-2xl mb-1">💰</div>
              <p className="font-bold text-sm">Earnings</p>
            </Link>
            <Link href="/bookings" className="card p-4 text-center hover:shadow-md transition-shadow">
              <div className="text-2xl mb-1">📦</div>
              <p className="font-bold text-sm">Requests</p>
            </Link>
          </>
        ) : isAdmin ? (
          <Link href="/admin" className="card p-4 text-center col-span-2 hover:shadow-md transition-shadow">
            <div className="text-2xl mb-1">🛡️</div>
            <p className="font-bold text-sm">Admin Panel</p>
          </Link>
        ) : (
          <>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <p className="text-xs text-muted">Total Bookings</p>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-accent">{stats.pending}</div>
              <p className="text-xs text-muted">Pending</p>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-success">{stats.completed}</div>
              <p className="text-xs text-muted">Completed</p>
            </div>
            <div className="card p-4 text-center">
              <div className="text-2xl font-bold text-primary">{stats.ongoing}</div>
              <p className="text-xs text-muted">Ongoing</p>
            </div>
          </>
        )}
      </div>

      {/* SOS Button */}
      <Link href="/sos" className="block mb-4">
        <div className="bg-danger text-white rounded-xl p-4 flex items-center gap-3 animate-sos">
          <span className="text-3xl">🆘</span>
          <div>
            <p className="font-bold">Emergency SOS</p>
            <p className="text-xs opacity-80">Share your location with emergency contacts</p>
          </div>
          <span className="ml-auto text-xl">→</span>
        </div>
      </Link>

      {/* Recent Bookings */}
      <h3 className="font-bold text-lg mb-3">Recent Bookings</h3>
      {bookings.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted mb-3">No bookings yet</p>
          <Link href="/map" className="btn-primary">Explore Services</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.slice(0, 5).map((booking: any) => (
            <div key={booking.bookingId} className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">
                    {booking.provider?.fullName || 'Provider'}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(booking.startTime).toLocaleDateString()} · {Number(booking.durationHours)}h · ${Number(booking.netAmount).toFixed(2)}
                  </p>
                </div>
                <span className={`chip text-[10px] ${
                  booking.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                  booking.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                  booking.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                  booking.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {booking.status}
                </span>
              </div>
              <Link href={`/bookings`} className="text-primary text-xs font-semibold mt-2 inline-block">
                View details →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* My Reviews */}
      {completedBookings.length > 0 && (
        <>
          <h3 className="font-bold text-lg mt-6 mb-3">My Reviews</h3>
          <div className="space-y-3">
            {completedBookings.filter((b: any) => b.review).map((booking: any) => (
              <div key={booking.bookingId} className="card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-accent">
                    {'★'.repeat(booking.review.rating)}{'☆'.repeat(5 - booking.review.rating)}
                  </span>
                  <span className="text-sm font-semibold">{booking.provider?.fullName}</span>
                </div>
                <p className="text-sm text-ink/80">{booking.review.reviewText}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
