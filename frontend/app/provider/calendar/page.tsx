'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib';

export default function ProviderCalendarPage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState('June 2026');

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const calendarDays = Array.from({ length: 30 }, (_, i) => i + 1);

  const dayStatus: Record<number, string> = {
    3: 'booked', 4: 'booked', 5: 'booked', 
    8: 'available', 9: 'available',
    12: 'booked', 13: 'booked',
    15: 'available',
    18: 'booked', 19: 'booked', 20: 'booked',
    22: 'available',
    24: 'today',
    27: 'booked', 28: 'booked',
    29: 'available',
  };

  const statusColors: Record<string, string> = {
    booked: 'bg-red-500 text-white',
    available: 'bg-green-100 text-green-800',
    today: 'bg-indigo-600 text-white',
    pending: 'bg-amber-100 text-amber-800',
  };

  if (!user || user.role !== 'PROVIDER') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-muted">Provider access only</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in py-4">
      {/* Month Header */}
      <div className="flex items-center justify-between mb-4">
        <button className="text-lg">←</button>
        <h2 className="font-bold text-lg">{currentMonth}</h2>
        <button className="text-lg">→</button>
      </div>

      {/* Calendar Grid */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {days.map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-muted py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for start of month */}
          {[0, 1, 2].map((i) => (
            <div key={`empty-${i}`} />
          ))}
          {calendarDays.map((day) => {
            const status = dayStatus[day] || 'available';
            return (
              <button
                key={day}
                className={`aspect-square rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                  statusColors[status] || 'bg-gray-50 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 justify-center">
        {[
          { color: 'bg-green-100 border-green-500', label: 'Available' },
          { color: 'bg-red-500', label: 'Booked' },
          { color: 'bg-amber-100 border-amber-500', label: 'Pending' },
          { color: 'bg-indigo-600', label: 'Today' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${item.color} border`} />
            <span className="text-[10px] font-medium text-muted">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Today's Schedule */}
      <h3 className="font-bold text-sm mb-3">Today&apos;s Schedule — June 24</h3>
      <div className="card p-4 mb-4">
        <div className="flex gap-3">
          <div className="text-center flex-shrink-0">
            <p className="font-bold text-indigo-600">9:00 AM</p>
            <p className="text-[10px] text-muted">8 hours</p>
          </div>
          <div className="border-l-2 border-indigo-600 pl-3">
            <p className="font-bold text-sm">Sarah M. · Heritage Tour</p>
            <span className="chip bg-green-100 text-green-800 text-[10px]">Confirmed</span>
          </div>
        </div>
      </div>

      {/* Quick Availability Toggle */}
      <h3 className="font-bold text-sm mb-3">Weekly Availability</h3>
      <div className="card p-4">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
          <div key={day} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
            <span className="text-sm font-medium">{day}</span>
            <span className={`chip text-[10px] ${
              i === 6 ? 'bg-red-100 text-red-800' : 
              i === 5 ? 'bg-amber-100 text-amber-800' :
              i === 2 ? 'bg-amber-100 text-amber-800' :
              'bg-green-100 text-green-800'
            }`}>
              {i === 6 ? 'OFF' : i === 5 ? 'BUSY' : i === 2 ? 'BUSY' : 'AVAILABLE'}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Link href="/provider/dashboard" className="btn-outline w-full block text-center py-3">
          ← Back to Hub
        </Link>
      </div>
    </div>
  );
}
