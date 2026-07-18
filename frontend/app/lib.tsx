'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import clsx from 'clsx';

// ── Auth Context ───────────────────────────────────────────────────────

interface AuthUser {
  userId: string;
  fullName: string;
  email: string;
  role: 'TOURIST' | 'PROVIDER' | 'ADMIN';
  providerType?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (userData: AuthUser, newToken: string) => {
    setUser(userData);
    setToken(newToken);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── API Client ─────────────────────────────────────────────────────────

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

// ── Toast Component ────────────────────────────────────────────────────

export function Toast({ message, type = 'info', onClose }: {
  message: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    info: 'bg-primary text-white',
    success: 'bg-success text-white',
    error: 'bg-danger text-white',
    warning: 'bg-accent text-white',
  };

  return (
    <div className={clsx(
      'fixed top-20 left-4 right-4 z-50 py-3 px-4 rounded-xl shadow-lg animate-slide-up',
      colors[type]
    )}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="ml-3 text-lg opacity-70 hover:opacity-100">✕</button>
      </div>
    </div>
  );
}

// ── Loading Spinner ────────────────────────────────────────────────────

export function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-muted text-sm">{text}</p>
    </div>
  );
}

// ── Error Display ──────────────────────────────────────────────────────

export function ErrorDisplay({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="text-4xl mb-4">⚠️</div>
      <p className="text-danger font-semibold text-center mb-4">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary text-sm">
          Try Again
        </button>
      )}
    </div>
  );
}
