'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, apiFetch } from '../lib';

export default function SOSPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(10);
  const [isActive, setIsActive] = useState(true);
  const [location, setLocation] = useState({ lat: '6.1429', lng: '80.4295' });

  useEffect(() => {
    // Get actual GPS position if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude.toFixed(4), lng: pos.coords.longitude.toFixed(4) }),
        () => {} // Fallback to default
      );
    }

    // Activate SOS on backend
    if (user) {
      apiFetch('/api/auth/sos', { method: 'PATCH' }).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isActive]);

  const handleCancel = async () => {
    if (user) {
      await apiFetch('/api/auth/sos/cancel', { method: 'PATCH' }).catch(() => {});
    }
    setIsActive(false);
    router.push('/');
  };

  const handleCallPolice = () => {
    window.location.href = 'tel:+94112675675';
  };

  return (
    <div className="animate-fade-in -mx-4 px-0 min-h-screen" style={{ background: '#B71C1C' }}>
      {isActive ? (
        <div className="min-h-screen flex flex-col items-center justify-center text-white p-6">
          {/* SOS Icon */}
          <div className="animate-sos mb-8">
            <div className="w-28 h-28 rounded-full bg-white/15 backdrop-blur border-4 border-white/40 flex items-center justify-center shadow-[0_0_60px_rgba(255,255,255,0.2)]">
              <span className="text-5xl">🆘</span>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold mb-3 tracking-tight">Emergency SOS</h1>
          <p className="text-center text-white/75 mb-8 max-w-sm text-sm leading-relaxed">
            Your live GPS location is being shared with Sri Lanka Tourism Police and your emergency contact.
          </p>

          {/* Location Card */}
          <div className="bg-white/12 backdrop-blur rounded-xl p-5 w-full max-w-sm mb-8 border border-white/10 shadow-lg">
            <p className="text-[10px] text-white/60 uppercase tracking-wider font-semibold mb-2">
              📍 Current Location
            </p>
            <p className="font-bold text-lg">Weligama Beach, Southern Province</p>
            <p className="text-sm text-white/60 mt-1 font-mono">
              {location.lat}° N, {location.lng}° E · Updated 2s ago
            </p>
          </div>

          {/* Emergency Contacts */}
          <div className="w-full max-w-sm space-y-3 mb-8">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 flex items-center justify-between border border-white/10">
              <div>
                <p className="font-semibold text-sm">🚔 Tourism Police</p>
                <p className="text-xs text-white/60">0112 675 675</p>
              </div>
              <span className="chip bg-green-500/80 text-white text-[9px] border border-green-400/30">Notified</span>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 flex items-center justify-between border border-white/10">
              <div>
                <p className="font-semibold text-sm">👤 Emergency Contact</p>
                <p className="text-xs text-white/60">Fathima (Family)</p>
              </div>
              <span className="chip bg-green-500/80 text-white text-[9px] border border-green-400/30">SMS Sent</span>
            </div>
          </div>

          <p className="text-sm text-white/60 mb-5">Hold to cancel · Auto-notifying in <strong className="text-white">{countdown}s</strong></p>

          <div className="flex gap-3 w-full max-w-sm">
            <button
              onClick={handleCancel}
              className="flex-1 bg-white/15 backdrop-blur text-white font-bold py-3.5 rounded-xl border-2 border-white/30 hover:bg-white/25 transition-all text-sm"
            >
              Cancel Alert
            </button>
            <button
              onClick={handleCallPolice}
              className="flex-1 bg-white text-[#B71C1C] font-bold py-3.5 rounded-xl hover:bg-white/90 transition-all text-sm shadow-lg"
            >
              Call Police
            </button>
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex flex-col items-center justify-center text-white p-6">
          <div className="w-24 h-24 rounded-full bg-white/15 backdrop-blur flex items-center justify-center mb-6 border-2 border-white/20">
            <span className="text-5xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">SOS Cancelled</h2>
          <p className="text-white/70 mb-8 text-sm">Alert has been cancelled successfully.</p>
          <Link href="/" className="btn-primary text-base px-10 py-3.5">
            Return Home
          </Link>
        </div>
      )}
    </div>
  );
}
