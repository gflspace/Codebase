'use client';

import { useState, useCallback, useEffect } from 'react';
import { AuthContext, AuthState, AuthUser } from '@/lib/auth';
import '@/styles/globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
  });

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cis_token') : null;
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('cis_user') : null;
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as AuthUser;
        setAuth({ user, token, isAuthenticated: true });
      } catch {
        localStorage.removeItem('cis_token');
        localStorage.removeItem('cis_user');
      }
    }
  }, []);

  const login = useCallback((token: string, user: AuthUser) => {
    localStorage.setItem('cis_token', token);
    localStorage.setItem('cis_user', JSON.stringify(user));
    setAuth({ user, token, isAuthenticated: true });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('cis_token');
    localStorage.removeItem('cis_user');
    setAuth({ user: null, token: null, isAuthenticated: false });
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
