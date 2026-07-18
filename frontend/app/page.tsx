'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, apiFetch, LoadingSpinner, ErrorDisplay } from './lib';

export default function HomePage() {
  const { user } = useAuth();
  const [providers, setProviders] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/providers/nearby?lat=7.0&lng=80.0&radius=50000').catch(() => ({ data: [] })),
      apiFetch('/api/events/nearby?lat=7.0&lng=80.0&radius=50000').catch(() => ({ data: [] })),
    ]).then(([providersData, eventsData]) => {
      setProviders(providersData.data || []);
      setEvents(eventsData.data || []);
    }).catch((err) => {
      setError(err.message);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSpinner text="Loading SmartTour..." />;
  if (error) return <ErrorDisplay message={error} onRetry={() => window.location.reload()} />;

  const categories = [
    { icon: '🧭', title: 'Tour Guides', desc: 'Expert guides for heritage & wildlife', href: '/map?type=GUIDE', color: 'from-teal-600 to-teal-700' },
    { icon: '🏄', title: 'Surf Schools', desc: 'ISA-certified surf experiences', href: '/map?type=SURF_SCHOOL', color: 'from-blue-600 to-blue-700' },
    { icon: '🧘', title: 'Yoga Studios', desc: 'Wellness & meditation retreats', href: '/map?type=YOGA_STUDIO', color: 'from-purple-600 to-purple-700' },
    { icon: '🎭', title: 'Live Events', desc: 'Cultural & nightlife experiences', href: '/events', color: 'from-orange-600 to-orange-700' },
  ];

  const testimonials = [
    { name: 'Sarah M.', text: 'Ravi was an incredible guide! His knowledge of Sri Lankan history made our trip unforgettable.', rating: 5, role: 'Tourist' },
    { name: 'Marco R.', text: 'The surf school booking was seamless. Great waves at Weligama!', rating: 5, role: 'Tourist' },
    { name: 'Anna W.', text: 'Ocean View Yoga in Ella is paradise. Highly recommend the sunrise session.', rating: 5, role: 'Tourist' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative -mx-4 px-4 py-16 md:py-24 bg-hero-gradient text-white text-center overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Ccircle cx=\'30\' cy=\'30\' r=\'3\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
        </div>
        <div className="relative z-10">
          <h1 className="font-serif text-4xl md:text-5xl mb-4 leading-tight">
            Discover Sri Lanka<br />
            <span className="text-accent">Your Way</span>
          </h1>
          <p className="text-lg md:text-xl mb-8 opacity-90 max-w-lg mx-auto">
            Book verified guides, surf lessons, yoga sessions, and local events — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/map" className="btn-primary text-base px-8 py-4">
              Explore Lanka Pulse
            </Link>
            <Link href="/auth/register" className="bg-white/20 backdrop-blur text-white font-bold px-8 py-4 rounded-xl hover:bg-white/30 transition-all text-base">
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8">
        <h2 className="text-xl font-bold mb-6">Browse Experiences</h2>
        <div className="grid grid-cols-2 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.title}
              href={cat.href}
              className={`card p-4 text-center bg-gradient-to-br ${cat.color} text-white hover:shadow-xl transition-all`}
            >
              <div className="text-4xl mb-3">{cat.icon}</div>
              <h3 className="font-bold text-base">{cat.title}</h3>
              <p className="text-xs mt-1 opacity-80">{cat.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Providers */}
      <section className="py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Featured Providers</h2>
          <Link href="/map" className="text-primary font-semibold text-sm">See all →</Link>
        </div>
        <div className="grid gap-4">
          {providers.slice(0, 3).map((p: any) => (
            <Link key={p.providerId} href={`/providers/${p.providerId}`} className="card p-4 flex gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center text-2xl flex-shrink-0">
                {p.providerType === 'GUIDE' ? '🧭' : p.providerType === 'SURF_SCHOOL' ? '🏄' : '🧘'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold">{p.fullName}</h3>
                  {p.isVerified && <span className="verified-badge text-xs">✓ Verified</span>}
                </div>
                <p className="text-sm text-muted">{p.providerType.replace('_', ' ')}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-accent font-bold">
                    {'★'.repeat(Math.round(Number(p.ratingAverage) || 0))}{'☆'.repeat(5 - Math.round(Number(p.ratingAverage) || 0))}
                  </span>
                  <span className="text-xs text-muted">{Number(p.ratingAverage).toFixed(1)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Upcoming Events */}
      {events.length > 0 && (
        <section className="py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Nearby Events</h2>
            <Link href="/events" className="text-primary font-semibold text-sm">See all →</Link>
          </div>
          <div className="grid gap-3">
            {events.slice(0, 3).map((e: any) => (
              <div key={e.eventId} className="card p-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {e.typeTag === 'CULTURAL' ? '🎭' : e.typeTag === 'NIGHTLIFE' ? '🌙' : e.typeTag === 'SPORTS' ? '🏄' : '🎉'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm">{e.eventTitle}</h3>
                    <p className="text-xs text-muted">
                      {e.distance ? `${(e.distance / 1000).toFixed(1)} km away` : 'Local event'}
                    </p>
                  </div>
                  <Link href="/events" className="btn-primary text-xs px-4 py-2">
                    Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Testimonials */}
      <section className="py-8">
        <h2 className="text-xl font-bold mb-6">What Travellers Say</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <div key={i} className="card p-4">
              <div className="text-accent mb-2">
                {'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}
              </div>
              <p className="text-sm text-ink/80 mb-3">&ldquo;{t.text}&rdquo;</p>
              <div className="font-semibold text-sm">{t.name}</div>
              <div className="text-xs text-muted">{t.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="py-8 text-center">
          <div className="bg-primary-dark rounded-2xl p-8 text-white">
            <h2 className="font-serif text-2xl mb-3">Ready to explore Sri Lanka?</h2>
            <p className="mb-6 opacity-90">Join thousands of travellers booking authentic experiences.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/auth/register" className="btn-primary text-base px-8 py-3">
                Sign Up Free
              </Link>
              <Link href="/auth/login" className="bg-white/20 text-white px-8 py-3 rounded-xl font-bold hover:bg-white/30">
                Login
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 text-center text-muted text-sm">
        <p className="font-bold text-ink">SmartTour Lanka</p>
        <p className="mt-1">NIBM Colombo · Higher Diploma in Software Engineering</p>
        <p className="mt-1">© 2026 SmartTour Lanka. All rights reserved.</p>
      </footer>
    </div>
  );
}
