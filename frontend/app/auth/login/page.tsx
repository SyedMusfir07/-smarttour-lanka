'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, apiFetch } from '../../lib';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', role: 'tourist' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint = form.role === 'tourist'
        ? '/api/auth/tourist/login'
        : form.role === 'provider'
        ? '/api/auth/provider/login'
        : '/api/auth/admin/login';

      const result = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      const userData = result.data?.user || result.data?.provider || result.data?.admin;
      login(
        {
          userId: userData.userId || userData.providerId,
          fullName: userData.fullName,
          email: userData.email,
          role: form.role === 'tourist' ? 'TOURIST' : form.role === 'provider' ? 'PROVIDER' : 'ADMIN',
          providerType: userData.providerType,
        },
        result.data.token
      );

      // Redirect based on role
      if (form.role === 'admin') router.push('/admin');
      else if (form.role === 'provider') router.push('/provider/dashboard');
      else router.push('/map');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-primary-dark mb-2">Welcome Back</h1>
          <p className="text-muted">Sign in to continue your journey</p>
        </div>

        <div className="card p-6">
          {/* Role Tabs */}
          <div className="flex gap-2 mb-6 bg-pearl rounded-xl p-1">
            {[
              { key: 'tourist', label: 'Tourist' },
              { key: 'provider', label: 'Provider' },
              { key: 'admin', label: 'Admin' },
            ].map((r) => (
              <button
                key={r.key}
                onClick={() => setForm({ ...form, role: r.key })}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  form.role === r.key
                    ? 'bg-primary text-white shadow-md'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="bg-red-50 text-danger text-sm p-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Password</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="text-primary font-semibold hover:underline">
                Sign up
              </Link>
            </p>
            <p className="text-xs text-muted mt-2">
              Want to list your services?{' '}
              <Link href="/provider/register" className="text-primary font-semibold hover:underline">
                Register as Provider
              </Link>
            </p>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-6 bg-primary-light rounded-xl p-4 text-sm">
          <p className="font-bold text-primary-dark mb-2">🔑 Demo Credentials</p>
          <div className="space-y-1 text-primary-dark/80">
            <p><strong>Tourist:</strong> sarah@example.com / password123</p>
            <p><strong>Provider:</strong> ravi.guide@example.com / password123</p>
            <p><strong>Admin:</strong> admin@smarttour.lk / password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
