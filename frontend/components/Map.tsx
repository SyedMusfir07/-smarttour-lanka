'use client';

import React, { useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default marker icon
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ── Custom marker icons by provider type ───────────────────────────────

const typeIcons: Record<string, { emoji: string; color: string }> = {
  GUIDE: { emoji: '🧭', color: '#00796B' },
  SURF_SCHOOL: { emoji: '🏄', color: '#1565C0' },
  YOGA_STUDIO: { emoji: '🧘', color: '#6A1B9A' },
  EVENT: { emoji: '🎭', color: '#E65100' },
};

function createMarkerIcon(type: string, isVerified: boolean) {
  const meta = typeIcons[type] || { emoji: '📍', color: '#00796B' };
  const verifiedBorder = isVerified ? 'outline: 2px solid #2E7D32; outline-offset: 2px;' : '';
  
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: ${meta.color};
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      border: 3px solid white;
      box-shadow: 0 3px 10px rgba(0,0,0,0.3);
      transition: transform 0.2s;
      ${verifiedBorder}
      cursor: pointer;
    ">${meta.emoji}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -22],
  });
}

// ── "You Are Here" marker icon ────────────────────────────────────────

function createUserLocationIcon() {
  return L.divIcon({
    className: 'user-location-marker',
    html: `
      <div style="position:relative;width:24px;height:24px;">
        <div style="
          position:absolute;
          inset:0;
          border-radius:50%;
          background:rgba(33,150,243,0.3);
          animation: user-location-pulse 2s ease-out infinite;
        "></div>
        <div style="
          position:absolute;
          top:4px;left:4px;
          width:16px;height:16px;
          border-radius:50%;
          background:#2196F3;
          border:2.5px solid white;
          box-shadow:0 2px 8px rgba(33,150,243,0.5);
        "></div>
        <div style="
          position:absolute;
          bottom:-16px;
          left:50%;
          transform:translateX(-50%);
          background:rgba(0,0,0,0.7);
          color:white;
          padding:1px 6px;
          border-radius:4px;
          font-size:8px;
          font-weight:700;
          font-family:'Inter',sans-serif;
          white-space:nowrap;
        ">You</div>
      </div>`,
    iconSize: [24, 44],
    iconAnchor: [12, 12],
  });
}

// ── Map type interfaces ────────────────────────────────────────────────

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type: string;
  isVerified: boolean;
  rating?: number;
  distance?: number;
  isAvailable?: boolean;
  imageUrl?: string;
  price?: string;
  data: any;
}

interface MapProps {
  center: [number, number];
  markers: MapMarker[];
  userLocation?: [number, number];
  onMarkerClick: (marker: MapMarker) => void;
  onPopupBook: (marker: MapMarker) => void;
  onPopupViewProfile: (marker: MapMarker) => void;
}

// ── Component that updates map center when props change ────────────────

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

// ── Rich Popup Content ─────────────────────────────────────────────────

function PopupContent({ marker, onBook, onViewProfile }: {
  marker: MapMarker;
  onBook: () => void;
  onViewProfile: () => void;
}) {
  const meta = typeIcons[marker.type] || { emoji: '📍', color: '#00796B' };
  const distanceKm = marker.distance ? (marker.distance / 1000).toFixed(1) : null;

  return (
    <div style={{ minWidth: '200px', fontFamily: 'Inter, sans-serif' }}>
      {/* Header with photo placeholder */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '8px',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: marker.imageUrl
            ? `url(${marker.imageUrl}) center/cover`
            : meta.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: '18px',
        }}>
          {!marker.imageUrl && meta.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700,
            fontSize: '13px',
            color: '#1A1A2E',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {marker.title}
            </span>
            {marker.isVerified && (
              <span style={{
                background: '#E8F5E9',
                color: '#2E7D32',
                padding: '1px 5px',
                borderRadius: '4px',
                fontSize: '8px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}>
                ✓
              </span>
            )}
          </div>
          <div style={{
            fontSize: '11px',
            color: '#78909C',
            textTransform: 'capitalize',
          }}>
            {marker.type.replace('_', ' ')}
          </div>
        </div>
      </div>

      {/* Rating & Distance row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span style={{ color: '#FF8F00', fontSize: '12px' }}>
            {'★'.repeat(Math.round(marker.rating || 0))}
          </span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#555' }}>
            {(marker.rating || 0).toFixed(1)}
          </span>
        </div>
        {distanceKm && (
          <span style={{
            fontSize: '10px',
            color: '#78909C',
            fontWeight: 600,
          }}>
            📍 {distanceKm} km
          </span>
        )}
      </div>

      {/* Availability */}
      {marker.isAvailable !== undefined && (
        <div style={{
          background: marker.isAvailable ? '#E8F5E9' : '#FFEBEE',
          color: marker.isAvailable ? '#2E7D32' : '#D32F2F',
          padding: '4px 10px',
          borderRadius: '8px',
          fontSize: '10px',
          fontWeight: 600,
          marginBottom: '8px',
          textAlign: 'center' as const,
        }}>
          {marker.isAvailable ? '🟢 Available Now' : '🔴 Currently Unavailable'}
        </div>
      )}

      {/* Price */}
      {marker.price && (
        <div style={{
          fontSize: '15px',
          fontWeight: 800,
          color: '#00796B',
          marginBottom: '8px',
        }}>
          {marker.price}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '5px',
      }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBook();
          }}
          style={{
            flex: 1,
            padding: '7px 0',
            background: '#FF8F00',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '10px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Book Now
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewProfile();
          }}
          style={{
            flex: 1,
            padding: '7px 0',
            background: '#fff',
            color: '#00796B',
            border: '1.5px solid #00796B',
            borderRadius: '8px',
            fontSize: '10px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          View Profile
        </button>
      </div>
    </div>
  );
}

// ── Main Map Component ─────────────────────────────────────────────────

export default function MapComponent({ center, markers, userLocation, onMarkerClick, onPopupBook, onPopupViewProfile }: MapProps) {
  // Create popup click handlers using refs to avoid stale closures
  const handleBook = useCallback((marker: MapMarker) => {
    onPopupBook(marker);
  }, [onPopupBook]);

  const handleViewProfile = useCallback((marker: MapMarker) => {
    onPopupViewProfile(marker);
  }, [onPopupViewProfile]);

  return (
    <MapContainer
      center={center}
      zoom={10}
      className="w-full h-full"
      scrollWheelZoom={true}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater center={center} />

      {/* "You Are Here" marker */}
      {userLocation && (
        <Marker
          position={userLocation}
          icon={createUserLocationIcon()}
          interactive={false}
        />
      )}
      
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          position={[marker.lat, marker.lng]}
          icon={createMarkerIcon(marker.type, marker.isVerified)}
          eventHandlers={{
            click: () => onMarkerClick(marker),
          }}
        >
          <Popup maxWidth={280} minWidth={220}>
            <PopupContent
              marker={marker}
              onBook={() => handleBook(marker)}
              onViewProfile={() => handleViewProfile(marker)}
            />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
