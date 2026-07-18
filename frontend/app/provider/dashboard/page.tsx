'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, apiFetch, LoadingSpinner, ErrorDisplay } from '../../lib';

export default function ProviderDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'incoming' | 'calendar'>('incoming');
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'PROVIDER') {
      setLoading(false);
      return;
    }

    Promise.all([
      apiFetch('/api/provider/dashboard/stats').catch(() => ({ data: { stats: {} } })),
      apiFetch('/api/bookings').catch(() => ({ data: [] })),
    ]).then(([statsData, bookingsData]) => {
      setStats(statsData.data);
      setBookings(bookingsData.data || []);
    }).catch((err) => {
      setError(err.message);
    }).finally(() => setLoading(false));
  }, [user]);

  if (!user || user.role !== 'PROVIDER') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-12">
        <p className="text-muted mb-4">Provider access only</p>
        <Link href="/auth/login" className="btn-primary">Login as Provider</Link>
      </div>
    );
  }

  if (loading) return <LoadingSpinner text="Loading dashboard..." />;
  if (error) return <ErrorDisplay message={error} onRetry={() => window.location.reload()} />;

  const s = stats?.stats || {};
  const pendingBookings = bookings.filter((b: any) => b.status === 'PENDING');
  const upcomingBookings = bookings.filter((b: any) => b.status === 'CONFIRMED' || b.status === 'ONGOING');

  return (
    <div className="animate-fade-in py-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 -mx-4 px-4 py-5 text-white mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl">
            {user.providerType === 'GUIDE' ? '🧭' : user.providerType === 'SURF_SCHOOL' ? '🏄' : '🧘'}
          </div>
          <div className="flex-1">
            <p className="text-sm opacity-80">Good morning,</p>
            <p className="font-bold text-lg">{user.fullName}</p>
          </div>
          <button
            onClick={() => setIsAvailable(!isAvailable)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold ${
              isAvailable ? 'bg-green-500 text-white' : 'bg-white/20 text-white'
            }`}
          >
            {isAvailable ? '🟢 Available' : '⚪ Busy'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Earnings', value: `$${Number(s.totalEarnings || 0).toFixed(0)}`, color: 'text-success' },
          { label: 'Bookings', value: s.totalBookings || 0, color: 'text-indigo-600' },
          { label: 'Pending', value: s.pendingBookings || 0, color: 'text-accent' },
          { label: 'Rating', value: `${(Number(s.averageRating) || 0).toFixed(1)}★`, color: 'text-primary' },
        ].map((stat, i) => (
          <div key={i} className="card p-3 text-center">
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-0 mb-4 bg-pearl rounded-xl p-1">
        {[
          { key: 'incoming', label: '📥 Incoming Bookings' },
          { key: 'calendar', label: '📅 Calendar' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'incoming' | 'calendar')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              tab === t.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Incoming Booking Requests */}
      {tab === 'incoming' && (
        <div>
          {pendingBookings.length > 0 && (
            <>
              <h3 className="font-bold text-sm mb-3">Pending Requests ({pendingBookings.length})</h3>
              <div className="space-y-3 mb-6">
                {pendingBookings.map((booking: any) => (
                  <div key={booking.bookingId} className="card p-4 border-l-4 border-accent">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm">👤</div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{booking.user?.fullName || 'Tourist'}</p>
                        <p className="text-xs text-muted">
                          {new Date(booking.startTime).toLocaleDateString()} · {Number(booking.durationHours)}h
                        </p>
                      </div>
                      <p className="font-bold text-success">${Number(booking.netAmount).toFixed(2)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 bg-success text-white py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors">✓ Accept</button>
                      <button className="flex-1 border-2 border-danger text-danger py-2 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors">✕ Decline</button>
                      <button className="flex-1 border-2 border-accent text-accent py-2 rounded-lg text-sm font-bold hover:bg-amber-50 transition-colors">✎ Counter</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Upcoming */}
          {upcomingBookings.length > 0 && (
            <>
              <h3 className="font-bold text-sm mb-3">Upcoming ({upcomingBookings.length})</h3>
              <div className="space-y-3">
                {upcomingBookings.map((booking: any) => (
                  <div key={booking.bookingId} className="card p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-sm">👤</div>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{booking.user?.fullName || 'Tourist'}</p>
                        <p className="text-xs text-muted">
                          {new Date(booking.startTime).toLocaleDateString()} · {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className="chip bg-blue-100 text-blue-800 text-[10px]">{booking.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {pendingBookings.length === 0 && upcomingBookings.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📅</div>
              <p className="text-muted">No booking requests yet</p>
              <p className="text-xs text-muted mt-1">Your profile is live on the map for tourists to find</p>
            </div>
          )}

          {/* Create Event */}
          <div className="mt-6">
            <Link href="/events" className="btn-primary w-full block text-center py-3">
              + Create New Live Event
            </Link>
            <p className="text-xs text-muted text-center mt-1">For verified hotel &amp; venue operators only</p>
          </div>
        </div>
      )}

      {/* Calendar tab */}
      {tab === 'calendar' && (
        <div>
          <p className="text-sm text-muted mb-4">Manage your availability</p>
          <Link href="/provider/calendar" className="btn-teal w-full block text-center py-3">
            Open Full Calendar →
          </Link>
          <div className="mt-4 space-y-2">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
              <div key={day} className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm">{day}</span>
                <span className={`chip text-[10px] ${
                  day === 'Sunday' ? 'bg-red-100 text-red-800' : 
                  day === 'Saturday' ? 'bg-amber-100 text-amber-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {day === 'Sunday' ? 'OFF' : day === 'Saturday' ? 'BUSY' : 'AVAILABLE'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
