'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, apiFetch, Toast } from '../../lib';

const providerTypes = [
  { key: 'GUIDE', icon: '🧭', title: 'Tour Guide', desc: 'National, Area, Site or Chauffeur', color: 'bg-teal-50 border-teal-300', iconBg: 'bg-teal-100' },
  { key: 'SURF_SCHOOL', icon: '🏄', title: 'Surf School', desc: 'ISA-certified beach operation', color: 'bg-blue-50 border-blue-300', iconBg: 'bg-blue-100' },
  { key: 'YOGA_STUDIO', icon: '🧘', title: 'Yoga Studio', desc: 'Wellness center with fixed location', color: 'bg-purple-50 border-purple-300', iconBg: 'bg-purple-100' },
];

export default function ProviderRegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phoneNo: '',
    sltdaLicenseNo: '',
    languagesSpoken: '',
    baseLat: '',
    baseLng: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;

    setLoading(true);
    setError(null);

    try {
      const result = await apiFetch('/api/auth/provider/register', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          providerType: selectedType,
          baseLat: form.baseLat ? parseFloat(form.baseLat) : undefined,
          baseLng: form.baseLng ? parseFloat(form.baseLng) : undefined,
        }),
      });

      const userData = result.data.provider;
      login(
        {
          userId: userData.providerId,
          fullName: userData.fullName,
          email: userData.email,
          role: 'PROVIDER',
          providerType: selectedType,
        },
        result.data.token
      );

      setToast({ message: 'Registered successfully! Awaiting admin verification.', type: 'success' });
      setTimeout(() => router.push('/provider/dashboard'), 1500);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in py-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <h2 className="font-bold text-xl mb-2">Join as a Provider</h2>
      <p className="text-muted text-sm mb-6">Select your business type to continue</p>

      {/* Step Indicator */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex-1 h-2 rounded-full ${s <= step ? 'bg-primary' : 'bg-gray-200'}`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            {providerTypes.map((pt) => (
              <button
                key={pt.key}
                onClick={() => setSelectedType(pt.key)}
                className={`p-5 rounded-xl border-2 text-left transition-all ${
                  selectedType === pt.key
                    ? `${pt.color} border-${pt.key === 'GUIDE' ? 'teal' : pt.key === 'SURF_SCHOOL' ? 'blue' : 'purple'}-500`
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl ${pt.iconBg} flex items-center justify-center text-2xl`}>
                    {pt.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-base">{pt.title}</p>
                    <p className="text-sm text-muted">{pt.desc}</p>
                  </div>
                  {selectedType === pt.key && <span className="text-primary text-xl">✓</span>}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => selectedType && setStep(2)}
            disabled={!selectedType}
            className="btn-primary w-full py-3 disabled:opacity-50"
          >
            Continue →
          </button>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Legal Name</label>
            <input
              type="text"
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
              placeholder="your@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={form.phoneNo}
              onChange={(e) => setForm({ ...form, phoneNo: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
              placeholder="+94 77 123 4567"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">SLTDA License Number</label>
            <input
              type="text"
              value={form.sltdaLicenseNo}
              onChange={(e) => setForm({ ...form, sltdaLicenseNo: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
              placeholder="e.g., SLTDA-NG-2019-04478"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
              placeholder="At least 6 characters"
            />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-semibold">
              ← Back
            </button>
            <button type="submit" className="flex-[2] btn-primary py-3">Continue →</button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="card p-4 bg-primary-light">
            <p className="font-bold text-primary-dark">{selectedType === 'GUIDE' ? '🧭 Tour Guide' : selectedType === 'SURF_SCHOOL' ? '🏄 Surf School' : '🧘 Yoga Studio'} Details</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Languages Spoken (comma separated)</label>
            <input
              type="text"
              value={form.languagesSpoken}
              onChange={(e) => setForm({ ...form, languagesSpoken: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
              placeholder="English, Sinhala, German"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Base Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={form.baseLat}
                onChange={(e) => setForm({ ...form, baseLat: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                placeholder="7.9519"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Base Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={form.baseLng}
                onChange={(e) => setForm({ ...form, baseLng: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                placeholder="80.7600"
              />
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl p-4 text-sm">
            <p className="font-semibold text-amber-800">📋 After submission</p>
            <p className="text-amber-700 text-xs mt-1">
              Your profile will be reviewed by an admin before appearing on the tourist map. You will receive a notification once verified.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-danger text-sm p-3 rounded-xl">{error}</div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl border-2 border-gray-200 font-semibold">
              ← Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] btn-primary py-3 disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit for Verification'}
            </button>
          </div>
        </form>
      )}

      <p className="text-center text-xs text-muted mt-4">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-primary font-semibold">Sign in</Link>
      </p>
    </div>
  );
}
