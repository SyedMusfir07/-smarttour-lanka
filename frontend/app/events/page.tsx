'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch, LoadingSpinner, ErrorDisplay } from '../lib';

const eventIcons: Record<string, string> = {
  CULTURAL: '🎭',
  NIGHTLIFE: '🌙',
  COMMUNITY: '🎉',
  SPORTS: '🏄',
};

const categoryColors: Record<string, string> = {
  CULTURAL: 'bg-purple-100 text-purple-800 border-purple-200',
  NIGHTLIFE: 'bg-blue-100 text-blue-800 border-blue-200',
  COMMUNITY: 'bg-green-100 text-green-800 border-green-200',
  SPORTS: 'bg-teal-100 text-teal-800 border-teal-200',
};

const categoryGradients: Record<string, string> = {
  CULTURAL: 'from-purple-800 via-purple-700 to-purple-600',
  NIGHTLIFE: 'from-indigo-800 via-blue-700 to-indigo-600',
  COMMUNITY: 'from-teal-800 via-teal-700 to-teal-600',
  SPORTS: 'from-cyan-800 via-blue-700 to-cyan-600',
};

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [timeLeft, setTimeLeft] = useState<Record<string, string>>({});

  useEffect(() => {
    apiFetch('/api/events/nearby?lat=7.0&lng=80.0&radius=50000')
      .then((result) => setEvents(result.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Update countdown timers every second
  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft: Record<string, string> = {};
      events.forEach((e: any) => {
        const diff = new Date(e.eventStart).getTime() - Date.now();
        if (diff <= 0) {
          newTimeLeft[e.eventId] = 'Started';
        } else {
          const h = Math.floor(diff / 3600000);
          const m = Math.floor((diff % 3600000) / 60000);
          newTimeLeft[e.eventId] = `${h}h ${m}m`;
        }
      });
      setTimeLeft(newTimeLeft);
    }, 1000);
    return () => clearInterval(timer);
  }, [events]);

  if (loading) return <LoadingSpinner text="Loading events..." />;
  if (error) return <ErrorDisplay message={error} onRetry={() => window.location.reload()} />;

  const categories = ['ALL', 'CULTURAL', 'NIGHTLIFE', 'COMMUNITY', 'SPORTS'];
  const filteredEvents = filter === 'ALL'
    ? events
    : events.filter((e: any) => e.typeTag === filter);

  return (
    <div className="animate-fade-in py-4">
      {/* ── Category Filters ──────────────────────────────────────── */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`chip transition-all whitespace-nowrap ${
              filter === cat
                ? 'bg-primary text-white shadow-md'
                : 'bg-pearl text-muted hover:bg-gray-200 border border-gray-200'
            }`}
          >
            {cat === 'ALL' ? '● All' : `${eventIcons[cat] || '🎉'} ${cat.charAt(0) + cat.slice(1).toLowerCase()}`}
          </button>
        ))}
      </div>

      {/* ── Current Zone ───────────────────────────────────────────── */}
      <div className="mb-5">
        <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">📍 Current Zone</p>
        <div className="flex items-center justify-between">
          <p className="font-bold text-lg">Weligama Coastal Zone</p>
          <span className="text-xs text-muted">
            {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} near you
          </span>
        </div>
      </div>

      {/* ── Events List ────────────────────────────────────────────── */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4 opacity-50">{eventIcons[filter] || '🎭'}</div>
          <p className="text-muted font-medium">No events found in this category</p>
          <p className="text-xs text-muted mt-1">Try a different filter or check back later</p>
          {filter !== 'ALL' && (
            <button onClick={() => setFilter('ALL')} className="btn-primary mt-5 text-sm px-6 py-2.5">
              Show All Events
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event: any) => {
            const isNearby = event.distance && event.distance < 500;
            const gradient = categoryGradients[event.typeTag] || 'from-primary-dark via-primary to-teal-500';
            const catColor = categoryColors[event.typeTag] || 'bg-gray-100 text-gray-800';

            return (
              <div key={event.eventId} className={`card overflow-hidden ${isNearby ? 'ring-2 ring-accent shadow-lg' : 'shadow-sm'}`}>
                {/* Event Image Banner */}
                <div className={`h-32 bg-gradient-to-br ${gradient} relative flex items-center justify-center overflow-hidden`}>
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                      backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%)',
                    }} />
                  </div>
                  <span className="text-6xl opacity-25 select-none">{eventIcons[event.typeTag] || '🎉'}</span>
                  
                  {/* Category Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`chip text-[9px] border ${catColor}`}>
                      {eventIcons[event.typeTag] || '🎉'} {event.typeTag}
                    </span>
                  </div>
                  
                  {/* Distance Badge */}
                  <div className="absolute top-3 right-3">
                    <span className="chip bg-white/90 text-ink text-[9px] shadow-sm">
                      📍 {event.distance ? `${(event.distance / 1000).toFixed(1)} km` : 'Local'}
                    </span>
                  </div>

                  {/* Near You Badge */}
                  {isNearby && (
                    <div className="absolute bottom-3 left-3">
                      <span className="chip bg-accent text-white text-[9px] animate-sos shadow-md">
                        🔔 Near you!
                      </span>
                    </div>
                  )}

                  {/* Countdown Badge */}
                  <div className="absolute bottom-3 right-3">
                    <span className={`chip bg-white/95 text-ink text-[9px] font-bold shadow-sm ${
                      timeLeft[event.eventId] === 'Started' ? 'text-success' : ''
                    }`}>
                      ⏱ {timeLeft[event.eventId] || 'Loading...'}
                    </span>
                  </div>
                </div>

                {/* Event Info */}
                <div className="p-4">
                  <h3 className="font-bold text-base mb-1">{event.eventTitle}</h3>
                  {event.description && (
                    <p className="text-sm text-muted mb-3 line-clamp-2 leading-relaxed">{event.description}</p>
                  )}

                  {/* Entry Fee */}
                  {event.entryFee > 0 && (
                    <div className="flex items-center gap-1 mb-3">
                      <span className="text-xs text-muted">Entry fee:</span>
                      <span className="text-sm font-bold text-primary">${Number(event.entryFee).toFixed(2)}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button className="flex-[2] btn-primary text-xs py-2.5 flex items-center justify-center gap-1">
                      <span>🔔</span> Set Alert
                    </button>
                    <button className="flex-1 btn-outline text-xs py-2.5 text-center flex items-center justify-center gap-1">
                      <span>📍</span> Directions
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
