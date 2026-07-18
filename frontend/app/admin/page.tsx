'use client';

import React, { useState, useEffect } from 'react';
import { useAuth, apiFetch, LoadingSpinner, ErrorDisplay, Toast } from '../lib';

export default function AdminPage() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'verification' | 'analytics' | 'bookings'>('verification');
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' | 'warning' } | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      setLoading(false);
      return;
    }

    Promise.all([
      apiFetch('/api/admin/verification-queue').catch(() => ({ data: [] })),
      apiFetch('/api/admin/analytics').catch(() => ({ data: {} })),
      apiFetch('/api/admin/bookings').catch(() => ({ data: [] })),
    ]).then(([queueData, analyticsData, bookingsData]) => {
      setQueue(queueData.data || []);
      setAnalytics(analyticsData.data);
      setBookings(bookingsData.data || []);
    }).catch((err) => {
      setError(err.message);
    }).finally(() => setLoading(false));
  }, [user]);

  const handleVerify = async (providerId: string) => {
    try {
      await apiFetch(`/api/admin/providers/${providerId}/verify`, { method: 'POST' });
      setToast({ message: 'Provider verified and activated! Pin is now live.', type: 'success' });
      setQueue(queue.filter((p) => p.providerId !== providerId));
    } catch (err: any) {
      setToast({ message: err.message || 'Verification failed', type: 'error' });
    }
  };

  const handleReject = async (providerId: string) => {
    try {
      await apiFetch(`/api/admin/providers/${providerId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Documents incomplete' }),
      });
      setToast({ message: 'Provider rejected', type: 'info' });
      setQueue(queue.filter((p) => p.providerId !== providerId));
    } catch (err: any) {
      setToast({ message: err.message || 'Rejection failed', type: 'error' });
    }
  };

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-12">
        <p className="text-muted mb-4">Admin access only</p>
        <a href="/auth/login" className="btn-primary inline-block">Login as Admin</a>
      </div>
    );
  }

  if (loading) return <LoadingSpinner text="Loading admin panel..." />;
  if (error) return <ErrorDisplay message={error} onRetry={() => window.location.reload()} />;

  const overview = analytics?.overview || {};
  const weekData = analytics?.weeklyBookings || [];
  const maxWeekVal = Math.max(...weekData.map((d: any) => d.count), 1);
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="animate-fade-in py-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-orange-800 via-orange-700 to-red-700 -mx-4 px-4 py-5 text-white mb-5 shadow-lg">
        <h2 className="font-bold text-lg">🛡️ Admin Verification Panel</h2>
        <p className="text-sm opacity-80">Platform control centre · Superadmin access</p>
      </div>

      {/* ── Stats Overview Grid ────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Pending Review', value: queue.length, color: 'text-accent', bg: 'bg-amber-50 border border-amber-100' },
          { label: 'Verified', value: overview.verifiedProviders || 0, color: 'text-success', bg: 'bg-green-50 border border-green-100' },
          { label: 'Flagged', value: analytics?.providerTypeBreakdown?.length || 0, color: 'text-danger', bg: 'bg-red-50 border border-red-100' },
          { label: 'Platform GMV', value: `$${Number(overview.totalRevenue || 0).toFixed(0)}`, color: 'text-primary', bg: 'bg-teal-50 border border-teal-100' },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} rounded-xl p-3 text-center`}>
            <p className={`text-lg font-extrabold ${stat.color}`}>{stat.value}</p>
            <p className="text-[9px] text-muted font-medium mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tab Navigation ─────────────────────────────────────────── */}
      <div className="flex gap-2 mb-4 bg-pearl rounded-xl p-1">
        {[
          { key: 'verification' as const, label: '✅ Pending Queue', count: queue.length },
          { key: 'analytics' as const, label: '📊 Analytics' },
          { key: 'bookings' as const, label: '📋 All Bookings', count: overview.totalBookings || 0 },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 rounded-lg text-[11px] font-bold transition-all ${
              tab === t.key
                ? 'bg-white text-primary shadow-md border border-gray-100'
                : 'text-muted hover:text-ink'
            }`}
          >
            {t.label} {t.count !== undefined ? `(${t.count})` : ''}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: Verification Queue ──────────────────────────────── */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {tab === 'verification' && (
        <div>
          <p className="text-[11px] text-muted mb-3 italic">
            filtered where is_verified = FALSE — {queue.length} provider{queue.length !== 1 ? 's' : ''} pending review
          </p>
          {queue.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-muted font-medium">No pending verifications</p>
              <p className="text-xs text-muted mt-1">All providers have been reviewed and verified</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((p: any) => {
                const typeIcon = p.providerType === 'GUIDE' ? '🧭' : p.providerType === 'SURF_SCHOOL' ? '🏄' : '🧘';
                const docInfo = p.guideProfile?.tierClassification
                  ? `SLTDA Licence #${p.sltdaLicenseNo || 'N/A'}`
                  : p.surfProfile?.isaCertified
                  ? `ISA Cert, Beach Permit ${p.surfProfile?.sltdaBeachPermit || ''}`
                  : `Yoga Alliance, ID Copy`;

                return (
                  <div key={p.providerId} className="card p-4 border-l-4 border-accent">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-lg">
                          {typeIcon}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{p.fullName}</p>
                          <p className="text-[10px] text-muted">
                            {p.providerType.replace('_', ' ')} · {p.email}
                          </p>
                        </div>
                      </div>
                      <span className="chip bg-amber-100 text-amber-800 border border-amber-200 text-[9px]">PENDING</span>
                    </div>

                    {/* Docs & License Row */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                        <p className="text-[9px] text-muted mb-0.5">📄 Documents</p>
                        <p className="text-[10px] font-semibold text-ink truncate">{docInfo}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                        <p className="text-[9px] text-muted mb-0.5">🪪 License</p>
                        <p className="text-[10px] font-semibold text-ink truncate">
                          {p.sltdaLicenseNo || 'Not provided'}
                        </p>
                      </div>
                    </div>

                    {/* Approval Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerify(p.providerId)}
                        className="flex-[2] bg-accent text-white py-2.5 rounded-lg text-xs font-bold hover:bg-orange-600 transition-colors shadow-sm"
                      >
                        ✅ Approve &amp; Activate Pin
                      </button>
                      <button
                        onClick={() => handleReject(p.providerId)}
                        className="flex-1 border-2 border-danger text-danger py-2.5 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                    <p className="text-[8px] text-muted text-center mt-2">
                      Approve sets is_verified = TRUE in PostgreSQL → pin goes live instantly on tourist map
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: Analytics ───────────────────────────────────────── */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {tab === 'analytics' && (
        <div>
          {/* Weekly Bookings Chart */}
          <div className="card p-4 mb-4">
            <h3 className="font-bold text-sm mb-4">Weekly Platform Analytics</h3>
            <div className="flex items-end gap-2 h-36 bg-gray-50/50 rounded-xl p-3">
              {weekData.length > 0 ? weekData.map((day: any, i: number) => {
                const height = Math.max((day.count / maxWeekVal) * 100, 2);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[8px] text-muted font-medium">{day.count}</span>
                    <div
                      className={`w-full rounded-t-lg transition-all ${
                        i === weekData.length - 1 ? 'bg-gradient-to-t from-orange-600 to-orange-400' : 'bg-gradient-to-t from-orange-300 to-orange-200'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[7px] text-muted">{weekDays[i] || day.date?.slice(5) || ''}</span>
                  </div>
                );
              }) : (
                <div className="w-full text-center text-muted text-xs py-8">No data yet</div>
              )}
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Total Users', value: overview.totalUsers || 0, icon: '👤' },
              { label: 'Total Providers', value: overview.totalProviders || 0, icon: '🏪' },
              { label: 'Total Bookings', value: overview.totalBookings || 0, icon: '📋' },
              { label: 'Total Events', value: overview.totalEvents || 0, icon: '🎭' },
              { label: 'Total Reviews', value: overview.totalReviews || 0, icon: '⭐' },
              { label: 'Platform Commission', value: `$${Number(overview.platformCommission || 0).toFixed(2)}`, icon: '💰' },
            ].map((item, i) => (
              <div key={i} className="card p-3 text-center hover:shadow-md transition-shadow">
                <p className="text-lg font-extrabold text-primary">{item.value}</p>
                <p className="text-[9px] text-muted font-medium">{item.icon} {item.label}</p>
              </div>
            ))}
          </div>

          {/* Provider Type Breakdown */}
          {analytics?.providerTypeBreakdown && (
            <div className="card p-4">
              <h3 className="font-bold text-sm mb-3">Provider Types</h3>
              <div className="space-y-2">
                {analytics.providerTypeBreakdown.map((pt: any, i: number) => {
                  const total = analytics.providerTypeBreakdown.reduce((s: number, p: any) => s + p.count, 0);
                  const pct = total > 0 ? Math.round((pt.count / total) * 100) : 0;
                  const colors = ['bg-teal-500', 'bg-blue-500', 'bg-purple-500'];
                  const icons = ['🧭', '🏄', '🧘'];
                  return (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                      <span className="text-lg w-8">{icons[i] || '📍'}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{pt.type.replace('_', ' ')}</span>
                          <span className="text-sm font-bold text-primary">{pt.count} ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${colors[i] || 'bg-primary'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: Bookings Oversight ──────────────────────────────── */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {tab === 'bookings' && (
        <div>
          <p className="text-[11px] text-muted mb-3">
            All platform bookings · {bookings.length} total
          </p>
          {bookings.length === 0 ? (
            <p className="text-muted text-center py-12">No bookings found</p>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking: any) => (
                <div key={booking.bookingId} className="card p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-sm">
                        👤
                      </div>
                      <div>
                        <p className="font-bold text-sm">
                          {booking.user?.fullName} <span className="text-muted font-normal">→</span> {booking.provider?.fullName}
                        </p>
                        <p className="text-[10px] text-muted">
                          {new Date(booking.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {Number(booking.durationHours)}h · <span className="font-bold text-primary">${Number(booking.netAmount).toFixed(2)}</span>
                        </p>
                      </div>
                    </div>
                    <span className={`chip text-[9px] font-bold border ${
                      booking.status === 'COMPLETED' ? 'bg-green-50 text-green-800 border-green-200' :
                      booking.status === 'PENDING' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                      booking.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                      booking.status === 'ONGOING' ? 'bg-teal-50 text-teal-800 border-teal-200' :
                      booking.status === 'CANCELLED' ? 'bg-red-50 text-red-800 border-red-200' :
                      'bg-gray-100 text-gray-800 border-gray-200'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted mt-1">
                    <span>{booking.provider?.providerType?.replace('_', ' ') || '—'}</span>
                    <span>Tourist: {booking.user?.email || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
