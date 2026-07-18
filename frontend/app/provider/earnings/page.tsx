'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib';

export default function ProviderEarningsPage() {
  const { user } = useAuth();

  const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const barHeights = [55, 70, 40, 85, 95, 60, 75, 88, 45, 70, 90, 100];
  const totalEarnings = 1240;
  const grossRevenue = 1380;
  const commission = 138;
  const bookingCount = 19;
  const avgPerBooking = 73;

  const recentTransactions = [
    { name: 'Sarah M.', service: 'Heritage Tour 8h', date: 'Jun 24', amount: 160 },
    { name: 'Marco R.', service: 'Airport Transfer', date: 'Jun 25', amount: 95 },
    { name: 'Anna W.', service: 'Kandy Day Tour', date: 'Jun 20', amount: 180 },
    { name: 'James L.', service: 'Wildlife Safari', date: 'Jun 18', amount: 220 },
    { name: 'Lisa K.', service: 'City Tour 4h', date: 'Jun 15', amount: 90 },
  ];

  if (!user || user.role !== 'PROVIDER') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-muted">Provider access only</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in py-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-700 to-green-600 -mx-4 px-4 py-6 text-white mb-4">
        <p className="text-xs opacity-80 uppercase tracking-wider">Total Earnings · June 2026</p>
        <p className="text-3xl font-bold mt-1">${totalEarnings.toFixed(2)}</p>
        <p className="text-xs opacity-80 mt-1">
          After 10% platform commission · +18% vs last month
        </p>
      </div>

      {/* Monthly Chart */}
      <div className="card p-4 mb-4">
        <h3 className="font-bold text-sm mb-3">Monthly Trend</h3>
        <div className="flex items-end gap-1 h-32">
          {barHeights.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded-t ${
                  i === barHeights.length - 1 ? 'bg-green-500' : 'bg-green-200'
                } transition-all`}
                style={{ height: `${h * 0.28}%` }}
              />
              <span className="text-[8px] text-muted">{months[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Gross Revenue', value: `$${grossRevenue}`, color: 'text-green-600' },
          { label: 'Commission', value: `−$${commission}`, color: 'text-danger' },
          { label: 'Bookings', value: bookingCount, color: 'text-indigo-600' },
          { label: 'Avg/Booking', value: `$${avgPerBooking}`, color: 'text-accent' },
        ].map((stat, i) => (
          <div key={i} className="card p-3 text-center">
            <p className={`text-base font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[9px] text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Transactions */}
      <h3 className="font-bold text-sm mb-3">Recent Transactions</h3>
      <div className="card mb-4">
        {recentTransactions.map((tx, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0">
            <div>
              <p className="font-semibold text-sm">{tx.name}</p>
              <p className="text-xs text-muted">{tx.service} · {tx.date}</p>
            </div>
            <p className="font-bold text-green-600">+${tx.amount.toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* Request Payout */}
      <button className="bg-green-600 text-white font-bold py-4 px-6 rounded-xl w-full text-base hover:bg-green-700 transition-all">
        Request Payout · ${totalEarnings.toFixed(2)}
      </button>

      <div className="mt-4">
        <Link href="/provider/dashboard" className="btn-outline w-full block text-center py-3">
          ← Back to Hub
        </Link>
      </div>
    </div>
  );
}
