// QwickServices CIS Dashboard — Auth Context

'use client';

import { createContext, useContext } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'trust_safety' | 'ops' | 'legal_compliance';
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

// RBAC helpers
export function hasAccess(role: string, module: string): boolean {
  const ACCESS_MATRIX: Record<string, Record<string, boolean>> = {
    trust_safety: {
      intelligence: true,
      overview: true, category: true,
      alerts: true, cases: true, enforcement: true, risk_trends: true,
      appeals: true, system_health: true, audit_logs: true,
    },
    ops: {
      intelligence: true,
      overview: true, category: true,
      alerts: true, cases: false, enforcement: false, risk_trends: true,
      appeals: false, system_health: true, audit_logs: false,
    },
    legal_compliance: {
      intelligence: true,
      overview: true, category: true,
      alerts: true, cases: true, enforcement: true, risk_trends: true,
      appeals: true, system_health: false, audit_logs: true,
    },
  };

  return ACCESS_MATRIX[role]?.[module] ?? false;
}
