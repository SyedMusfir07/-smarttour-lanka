'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { AuthProvider, useAuth } from './lib';
import './globals.css';

// ── Navigation Component ───────────────────────────────────────────────

const navItems = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/map', label: 'Lanka Pulse', icon: '🗺️' },
  { href: '/events', label: 'Events', icon: '🎭' },
  { href: '/bookings', label: 'Bookings', icon: '📅' },
  { href: '/dashboard', label: 'Profile', icon: '👤' },
];

const providerNavItems = [
  { href: '/provider/dashboard', label: 'Hub', icon: '📊' },
  { href: '/provider/calendar', label: 'Calendar', icon: '📅' },
  { href: '/provider/earnings', label: 'Earnings', icon: '💰' },
  { href: '/bookings', label: 'Requests', icon: '📦' },
  { href: '/dashboard', label: 'Profile', icon: '👤' },
];

function Navigation() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isProvider = user?.role === 'PROVIDER';
  const isAuthPage = pathname.startsWith('/auth');
  const isSosPage = pathname.startsWith('/sos');
  const isAdminPage = pathname.startsWith('/admin');
  const isProviderPage = pathname.startsWith('/provider');

  if (isAuthPage || isSosPage || isAdminPage) return null;

  const items = (isProvider || isProviderPage) ? providerNavItems : navItems;

  return (
    <nav className="mobile-nav md:hidden">
      <div className="flex justify-around py-2 px-2">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex flex-col items-center px-3 py-1.5 rounded-xl transition-colors',
                isActive ? 'text-primary' : 'text-muted'
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-semibold mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ── Header ─────────────────────────────────────────────────────────────

function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isAuthPage = pathname.startsWith('/auth');
  const isSosPage = pathname.startsWith('/sos');
  const isAdminPage = pathname.startsWith('/admin');
  const isProviderPage = pathname.startsWith('/provider');

  if (isSosPage) return null;

  const getTitle = () => {
    if (pathname === '/') return 'SmartTour Lanka';
    if (pathname.startsWith('/map')) return 'Lanka Pulse';
    if (pathname.startsWith('/events')) return 'Horizon Events';
    if (pathname.startsWith('/surf')) return 'Surf Booking';
    if (pathname.startsWith('/yoga')) return 'Yoga Studio';
    if (pathname.startsWith('/chat')) return 'Messages';
    if (pathname.startsWith('/providers')) return 'Vibe Check';
    if (pathname.startsWith('/bookings')) return 'My Bookings';
    if (pathname.startsWith('/dashboard')) return 'Dashboard';
    if (pathname.startsWith('/provider/dashboard')) return 'Provider Hub';
    if (pathname.startsWith('/provider/calendar')) return 'Calendar';
    if (pathname.startsWith('/provider/earnings')) return 'Earnings';
    if (pathname.startsWith('/provider/register')) return 'Provider Registration';
    if (pathname.startsWith('/admin')) return 'Admin Panel';
    return 'SmartTour Lanka';
  };

  if (isAuthPage) return null;

  return (
    <header className={clsx(
      'sticky top-0 z-30 text-white',
      isAdminPage ? 'bg-gradient-to-r from-orange-800 to-orange-700' : 
      isProviderPage ? 'bg-gradient-to-r from-indigo-800 to-indigo-700' :
      'bg-hero-gradient'
    )}>
      <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          {pathname !== '/' && (
            <button onClick={() => window.history.back()} className="text-lg hover:opacity-80">
              ←
            </button>
          )}
          <span className="font-bold text-lg">{getTitle()}</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/dashboard" className="text-sm font-medium opacity-90">
                {user.fullName.split(' ')[0]}
              </Link>
              <button
                onClick={logout}
                className="text-xs bg-white/20 px-3 py-1.5 rounded-full hover:bg-white/30 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/auth/login"
              className="text-xs bg-accent px-4 py-1.5 rounded-full font-bold hover:bg-orange-500 transition-colors"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

// ── Root Layout ────────────────────────────────────────────────────────

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>SmartTour Lanka</title>
        <meta name="description" content="SmartTour Lanka - Tourism Booking Platform for Sri Lanka" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>
        <AuthProvider>
          <div className="min-h-screen bg-pearl pb-16 md:pb-0">
            <Header />
            <main className="max-w-4xl mx-auto px-4">
              {children}
            </main>
            <Navigation />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
