'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth, apiFetch, LoadingSpinner, ErrorDisplay } from '../lib';
import { useGeolocation } from '../../hooks/useGeolocation';
import type { MapMarker } from '../../components/Map';

// Dynamically import map to avoid SSR issues
const MapComponent = dynamic(() => import('../../components/Map'), { ssr: false });

// ── Category config ────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'ALL', label: 'All', icon: '●', color: 'bg-primary text-white' },
  { key: 'GUIDE', label: 'Guides', icon: '🧭', color: 'bg-teal-600 text-white' },
  { key: 'SURF_SCHOOL', label: 'Surf', icon: '🏄', color: 'bg-blue-600 text-white' },
  { key: 'YOGA_STUDIO', label: 'Yoga', icon: '🧘', color: 'bg-purple-600 text-white' },
  { key: 'EVENT', label: 'Events', icon: '🎭', color: 'bg-orange-600 text-white' },
];

const TIME_FILTERS = ['Now', 'Today', 'Tonight', 'This Week'];

// ── Format helpers ─────────────────────────────────────────────────────

const typeIcons: Record<string, string> = {
  GUIDE: '🧭',
  SURF_SCHOOL: '🏄',
  YOGA_STUDIO: '🧘',
  EVENT: '🎭',
};

const typeLabels: Record<string, string> = {
  GUIDE: 'Guide',
  SURF_SCHOOL: 'Surf School',
  YOGA_STUDIO: 'Yoga Studio',
  EVENT: 'Live Event',
};

function getPrice(p: any): string {
  if (p.guideProfile) return `$${p.guideProfile.hourlyRate}/hr`;
  if (p.surfProfile) return `$${p.surfProfile.sessionRate}/session`;
  if (p.yogaProfile) return `$${p.yogaProfile.dropInRate}/class`;
  return '';
}

// ── Main Content ───────────────────────────────────────────────────────

function MapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeFilter = searchParams.get('type')?.toUpperCase() || 'ALL';
  
  const { user } = useAuth();
  const geo = useGeolocation();
  
  const [providers, setProviders] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [filter, setFilter] = useState(typeFilter);
  const [timeFilter, setTimeFilter] = useState('Now');
  const [searchQuery, setSearchQuery] = useState('');
  const [center, setCenter] = useState<[number, number]>([geo.lat, geo.lng]);

  // Update center when geolocation changes
  useEffect(() => {
    if (!geo.loading) {
      setCenter([geo.lat, geo.lng]);
    }
  }, [geo.lat, geo.lng, geo.loading]);

  // Fetch providers and events (triggered by center/filter changes)
  const fetchData = useCallback(async (query?: string) => {
    // Skip loading flash when user is re-centering by clicking a card
    if (!isReCentering.current) {
      setLoading(true);
    }
    isReCentering.current = false;
    try {
      const lat = center[0];
      const lng = center[1];
      const q = query !== undefined ? query : searchQuery;
      const searchParam = q ? `&search=${encodeURIComponent(q)}` : '';
      
      const [providersData, eventsData] = await Promise.all([
        apiFetch(`/api/providers/nearby?lat=${lat}&lng=${lng}&radius=50000&type=${filter}${searchParam}`)
          .catch(() => ({ data: [] })),
        apiFetch(`/api/events/nearby?lat=${lat}&lng=${lng}&radius=50000`)
          .catch(() => ({ data: [] })),
      ]);
      
      setProviders(providersData.data || []);
      setEvents(eventsData.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [center, filter]); // Note: searchQuery is NOT a dependency — search uses debounce

  // Fetch on center or filter change
  useEffect(() => {
    fetchData(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, filter]);

  // Debounced search — only fires when user types
  useEffect(() => {
    if (!searchQuery && searchQuery !== '') {
      // Initial empty search is handled by center/filter effect
      return;
    }
    const timer = setTimeout(() => {
      fetchData(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Build markers from providers + events
  const markers: MapMarker[] = [
    ...providers.map((p: any) => ({
      id: p.providerId,
      lat: Number(p.baseLat),
      lng: Number(p.baseLng),
      title: p.fullName,
      type: p.providerType,
      isVerified: p.isVerified,
      rating: Number(p.ratingAverage),
      distance: p.distance,
      isAvailable: p.isAvailable,
      imageUrl: p.profileImageUrl || undefined,
      price: getPrice(p),
      data: p,
    })),
    ...events.map((e: any) => ({
      id: e.eventId,
      lat: Number(e.eventLat),
      lng: Number(e.eventLng),
      title: e.eventTitle,
      type: 'EVENT',
      isVerified: e.isVerified,
      distance: e.distance,
      isAvailable: true,
      price: e.entryFee > 0 ? `$${e.entryFee}` : 'Free',
      data: e,
    })),
  ].filter(m => m.lat && m.lng);

  // ── Time filter logic ────────────────────────────────────────────
  const now = new Date();
  const isWithinTimeFilter = (item: any): boolean => {
    if (timeFilter === 'Now') {
      // Show providers that are available + events starting within 1 hour
      if (item._type === 'provider') return item.isAvailable === true;
      if (item._type === 'event' && item.eventStart) {
        const start = new Date(item.eventStart).getTime();
        return start - now.getTime() <= 3600000 && start > now.getTime();
      }
      return true;
    }
    if (timeFilter === 'Today') {
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      if (item._type === 'event' && item.eventStart) {
        return new Date(item.eventStart) <= endOfDay;
      }
      return true;
    }
    if (timeFilter === 'Tonight') {
      const tonightStart = new Date(now);
      tonightStart.setHours(18, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      if (item._type === 'event' && item.eventStart) {
        const start = new Date(item.eventStart);
        return start >= tonightStart && start <= endOfDay;
      }
      return item.isAvailable === true;
    }
    if (timeFilter === 'This Week') {
      const endOfWeek = new Date(now);
      endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
      endOfWeek.setHours(23, 59, 59, 999);
      if (item._type === 'event' && item.eventStart) {
        return new Date(item.eventStart) <= endOfWeek;
      }
      return true;
    }
    return true;
  };

  // Combine, filter by time, and sort by distance for the bottom drawer
  const allItems = [
    ...providers.map((p: any) => ({
      ...p,
      _type: 'provider' as const,
      icon: typeIcons[p.providerType] || '📍',
    })),
    ...events.map((e: any) => ({
      ...e,
      _type: 'event' as const,
      icon: typeIcons['EVENT'] || '🎭',
      fullName: e.eventTitle,
      providerType: 'EVENT',
      ratingAverage: 0,
      isVerified: e.isVerified,
      profileImageUrl: e.imageUrl,
      isAvailable: true,
      distance: e.distance,
    })),
  ]
    .filter(isWithinTimeFilter)
    .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

  // Track when user is re-centering by clicking a card (skip loading flash)
  const isReCentering = React.useRef(false);

  // ── Handlers ───────────────────────────────────────────────────────

  const handleMarkerClick = (marker: MapMarker) => {
    setSelectedMarker(marker);
  };

  const handlePopupBook = (marker: MapMarker) => {
    if (!user) {
      router.push(`/auth/login?redirect=/map`);
      return;
    }
    if (marker.type === 'EVENT') {
      router.push('/events');
    } else if (marker.type === 'GUIDE') {
      router.push(`/bookings/new?providerId=${marker.id}&type=guide`);
    } else if (marker.type === 'SURF_SCHOOL') {
      router.push(`/surf/${marker.id}`);
    } else if (marker.type === 'YOGA_STUDIO') {
      router.push(`/yoga/${marker.id}`);
    }
  };

  const handlePopupViewProfile = (marker: MapMarker) => {
    if (marker.type === 'EVENT') {
      router.push('/events');
    } else {
      router.push(`/providers/${marker.id}`);
    }
  };

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setSelectedMarker(null);
  };

  const handleCardClick = (item: any) => {
    // Find matching marker
    const marker = markers.find(m => m.id === (item.providerId || item.eventId));
    if (marker) {
      setSelectedMarker(marker);
      isReCentering.current = true;
      setCenter([marker.lat, marker.lng]);
    }
  };

  if (error && !loading) return <ErrorDisplay message={error} onRetry={() => fetchData()} />;

  return (
    <div className="animate-fade-in -mx-4 px-0 relative">
      {/* ── Map Container ──────────────────────────────────────────── */}
      <div className="h-[45vh] relative">
        <MapComponent
          center={center}
          markers={markers}
          userLocation={!geo.loading && !geo.error ? [geo.lat, geo.lng] : undefined}
          onMarkerClick={handleMarkerClick}
          onPopupBook={handlePopupBook}
          onPopupViewProfile={handlePopupViewProfile}
        />

        {/* Search Bar Overlay */}
        <div className="absolute top-3 left-3 right-3 z-[1000]">
          <div className="bg-white rounded-full shadow-lg flex items-center px-4 py-2.5 gap-2">
            <span className="text-base text-muted">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guides, surf, yoga, cities..."
              className="flex-1 border-none outline-none text-sm bg-transparent placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-muted hover:text-ink text-sm"
              >
                ✕
              </button>
            )}
            {geo.loading ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : geo.error ? (
              <span className="text-xs text-danger" title={geo.error}>📍</span>
            ) : (
              <span className="text-xs text-success" title={`Accuracy: ${Math.round(geo.accuracy || 0)}m`}>
                📍 Live
              </span>
            )}
          </div>
        </div>

        {/* SOS Button */}
        <Link
          href="/sos"
          className="absolute bottom-5 right-4 z-[1000] w-12 h-12 rounded-full bg-danger text-white flex items-center justify-center font-bold text-xs shadow-lg animate-sos hover:scale-105 transition-transform"
        >
          SOS
        </Link>

        {/* GPS accuracy indicator */}
        {!geo.loading && !geo.error && (
          <div className="absolute bottom-5 left-4 z-[1000] bg-white/90 backdrop-blur rounded-lg px-2.5 py-1.5 shadow text-[10px] text-muted flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping" />
            GPS Active
          </div>
        )}
      </div>

      {/* ── Bottom Sheet ───────────────────────────────────────────── */}
      <div className="bg-white rounded-t-2xl -mt-4 relative z-10 px-4 pt-4 pb-24 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        {/* Drag Handle */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>

        {/* Instruction */}
        <p className="text-center text-[10px] text-muted mb-3">
          Tap a pin for a preview · Swipe up for details
        </p>

        {/* ── Category Filters ───────────────────────────────────── */}
        <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-none pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => handleFilterChange(cat.key)}
              className={`chip transition-all whitespace-nowrap text-xs font-semibold ${
                filter === cat.key
                  ? cat.color
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* ── Time Filters ────────────────────────────────────────── */}
        <div className="bg-gray-50 rounded-xl p-2.5 mb-4">
          <p className="text-[10px] text-muted font-semibold uppercase tracking-wider mb-2">
            ⏰ Time Filter
          </p>
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {TIME_FILTERS.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeFilter(tf)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  timeFilter === tf
                    ? 'bg-accent text-white shadow-md'
                    : 'bg-white text-muted border border-gray-200 hover:border-gray-300'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* ── Selected Marker Preview ─────────────────────────────── */}
        {selectedMarker && (
          <div className="card p-4 mb-4 animate-slide-up border-l-4 border-primary">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                style={{
                  background: selectedMarker.imageUrl
                    ? `url(${selectedMarker.imageUrl}) center/cover`
                    : '#E0F2F1',
                }}
              >
                {!selectedMarker.imageUrl && (typeIcons[selectedMarker.type] || '📍')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm truncate">{selectedMarker.title}</h3>
                  {selectedMarker.isVerified && (
                    <span className="verified-badge text-[9px]">✓</span>
                  )}
                </div>
                <p className="text-xs text-muted">
                  {typeLabels[selectedMarker.type] || selectedMarker.type.replace('_', ' ')}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {selectedMarker.rating !== undefined && selectedMarker.rating > 0 && (
                    <span className="text-accent text-xs font-bold">
                      {'★'.repeat(Math.round(selectedMarker.rating))} {selectedMarker.rating.toFixed(1)}
                    </span>
                  )}
                  {selectedMarker.distance && (
                    <span className="text-[10px] text-muted">
                      · {(selectedMarker.distance / 1000).toFixed(1)} km
                    </span>
                  )}
                  {selectedMarker.price && (
                    <span className="text-[10px] text-primary font-bold">
                      · {selectedMarker.price}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handlePopupBook(selectedMarker)}
                className="btn-primary text-xs py-2 flex-1 text-center"
              >
                Book Now
              </button>
              <button
                onClick={() => handlePopupViewProfile(selectedMarker)}
                className="btn-outline text-xs py-2 flex-1 text-center"
              >
                View Profile
              </button>
            </div>
          </div>
        )}

        {/* ── Providers/Events List ───────────────────────────────── */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-base">
            {filter === 'ALL' ? 'All' : typeLabels[filter] || filter.replace('_', ' ')}
          </h3>
          <span className="text-xs text-muted">
            {allItems.length} {allItems.length === 1 ? 'result' : 'results'} · Sorted by distance
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : allItems.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-3xl mb-3">🔍</div>
            <p className="text-muted text-sm font-medium">No providers found</p>
            <p className="text-xs text-muted mt-1">
              {searchQuery
                ? `No results for "${searchQuery}". Try a different search.`
                : 'Try adjusting your filters or expanding the search radius.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="btn-primary text-xs mt-4 px-6 py-2"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {allItems.map((item: any) => {
              const distanceKm = item.distance
                ? `${(item.distance / 1000).toFixed(1)} km`
                : null;
              const itemPrice = getPrice(item);
              const itemRating = Number(item.ratingAverage) || 0;
              const isSelected = selectedMarker?.id === (item.providerId || item.eventId);

              return (
                <div
                  key={item.providerId || item.eventId}
                  className={`card p-3 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'ring-2 ring-primary shadow-md border-primary/30'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => handleCardClick(item)}
                >
                  {/* Top row: image + info */}
                  <div className="flex items-center gap-3">
                    {/* Icon / Image */}
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-xl flex-shrink-0 border-2 border-gray-100"
                      style={{
                        background: item.profileImageUrl
                          ? `url(${item.profileImageUrl}) center/cover`
                          : '#E0F2F1',
                      }}
                    >
                      {!item.profileImageUrl && item.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm truncate">{item.fullName}</h4>
                        {item.isVerified && (
                          <span className="text-success text-xs">✓</span>
                        )}
                      </div>
                      <p className="text-xs text-muted">
                        {typeLabels[item.providerType] || item.providerType?.replace('_', ' ')}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {itemRating > 0 && (
                          <span className="text-accent text-[10px] font-bold">
                            {itemRating.toFixed(1)} ★
                          </span>
                        )}
                        {distanceKm && (
                          <span className="text-[10px] text-muted">📍 {distanceKm}</span>
                        )}
                        {itemPrice && (
                          <span className="text-[10px] text-primary font-bold">{itemPrice}</span>
                        )}
                        {item.city && (
                          <span className="text-[10px] text-muted">🏙️ {item.city}</span>
                        )}
                      </div>
                    </div>

                    {/* Open/Closed indicator */}
                    <div className="flex-shrink-0 text-right">
                      <span className={`chip text-[9px] ${
                        item.isAvailable
                          ? 'bg-green-50 text-success border border-green-200'
                          : 'bg-red-50 text-danger border border-red-200'
                      }`}>
                        {item.isAvailable ? '🟢 Open' : '🔴 Closed'}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Find the matching marker and book
                        const marker = markers.find(m => m.id === (item.providerId || item.eventId));
                        if (marker) handlePopupBook(marker);
                      }}
                      className="flex-1 btn-primary text-[10px] py-2 text-center"
                    >
                      Book Now
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item._type === 'event') {
                          router.push('/events');
                        } else {
                          router.push(`/providers/${item.providerId}`);
                        }
                      }}
                      className="flex-1 btn-outline text-[10px] py-2 text-center"
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page Export ────────────────────────────────────────────────────────

export default function MapPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading map..." />}>
      <MapContent />
    </Suspense>
  );
}
