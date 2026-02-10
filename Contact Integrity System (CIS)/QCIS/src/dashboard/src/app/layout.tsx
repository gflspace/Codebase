'use client';

import { useState, useCallback, useEffect } from 'react';
import { AuthContext, AuthState, AuthUser } from '@/lib/auth';
import '@/styles/globals.css';

/** Decode a JWT payload without a library (only reads exp claim). */
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return false; // no expiry claim — treat as valid
    return payload.exp * 1000 < Date.now();
  } catch {
    return true; // malformed token — treat as expired
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
  });

  const logout = useCallback(() => {
    localStorage.removeItem('cis_token');
    localStorage.removeItem('cis_user');
    setAuth({ user: null, token: null, isAuthenticated: false });
  }, []);

  // Bootstrap auth from localStorage — validate token isn't expired
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cis_token') : null;
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('cis_user') : null;
    if (token && userStr) {
      if (isTokenExpired(token)) {
        // Stale token — clear and stay on login page
        localStorage.removeItem('cis_token');
        localStorage.removeItem('cis_user');
        return;
      }
      try {
        const user = JSON.parse(userStr) as AuthUser;
        setAuth({ user, token, isAuthenticated: true });
      } catch {
        localStorage.removeItem('cis_token');
        localStorage.removeItem('cis_user');
      }
    }
  }, []);

  // Listen for 401 responses from the API client — auto-logout on expired token
  useEffect(() => {
    function handleAuthExpired() {
      logout();
    }
    window.addEventListener('cis-auth-expired', handleAuthExpired);
    return () => window.removeEventListener('cis-auth-expired', handleAuthExpired);
  }, [logout]);

  const login = useCallback((token: string, user: AuthUser) => {
    localStorage.setItem('cis_token', token);
    localStorage.setItem('cis_user', JSON.stringify(user));
    setAuth({ user, token, isAuthenticated: true });
  }, []);

  return (
    <html lang="en">
      <body>
        <AuthContext.Provider value={{ auth, login, logout }}>
          {children}
        </AuthContext.Provider>
      </body>
    </html>
  );
}
