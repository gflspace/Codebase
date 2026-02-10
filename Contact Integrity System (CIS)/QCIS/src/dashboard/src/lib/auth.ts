// QwickServices CIS Dashboard — Auth Context

'use client';

import { createContext, useContext, useMemo } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  force_password_change?: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<{
  auth: AuthState;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}>({
  auth: { user: null, token: null, isAuthenticated: false },
  login: () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// Permission-based access check
export function hasPermission(user: AuthUser | null, ...perms: string[]): boolean {
  if (!user || !user.permissions) return false;
  return perms.every((p) => user.permissions.includes(p));
}

// Hook: returns true if the current user has all specified permissions
export function usePermission(...perms: string[]): boolean {
  const { auth } = useAuth();
  return useMemo(() => hasPermission(auth.user, ...perms), [auth.user, ...perms]);
}
