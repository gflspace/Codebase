/**
 * Authentication Context
 * Provides authentication state and methods throughout the app
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { showSuccess, showError } from '@/lib/toast';

const AuthContext = createContext(null);

// Demo users for mock mode
const DEMO_USERS = {
  'admin@vioe.demo': { role: 'admin', name: 'Admin User' },
  'analyst@vioe.demo': { role: 'analyst', name: 'Security Analyst' },
  'manager@vioe.demo': { role: 'manager', name: 'Security Manager' },
  'viewer@vioe.demo': { role: 'viewer', name: 'View Only User' },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      // Check for stored session
      const storedUser = localStorage.getItem('vioe_user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        // Try to get user from API
        const currentUser = await base44.auth.me();
        if (currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
          localStorage.setItem('vioe_user', JSON.stringify(currentUser));
        }
      }
    } catch (error) {
      console.log('[Auth] No active session');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    try {
      // Check if demo mode
      const isDemoMode = import.meta.env.VITE_API_MODE === 'mock';

      if (isDemoMode) {
        // Demo mode login
        const demoUser = DEMO_USERS[email.toLowerCase()];
        if (demoUser || password === 'demo') {
          const userData = {
            id: `user-${Date.now()}`,
            email: email.toLowerCase(),
            name: demoUser?.name || email.split('@')[0],
            role: demoUser?.role || 'analyst',
          };
          setUser(userData);
          setIsAuthenticated(true);
          localStorage.setItem('vioe_user', JSON.stringify(userData));
          showSuccess(`Welcome back, ${userData.name}!`);
          return { success: true, user: userData };
        } else {
          throw new Error('Invalid credentials. Use any email with password "demo"');
        }
      }

      // Production mode login
      const result = await base44.auth.login(email, password);
      if (result.success) {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAuthenticated(true);
        localStorage.setItem('vioe_user', JSON.stringify(currentUser));
        showSuccess(`Welcome back, ${currentUser.name}!`);
        return { success: true, user: currentUser };
      } else {
        throw new Error(result.message || 'Login failed');
      }
    } catch (error) {
      const message = error.message || 'Login failed';
      showError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await base44.auth.logout();
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('vioe_user');
      showSuccess('You have been logged out');
      setIsLoading(false);
    }
  }, []);

  const hasPermission = useCallback((permission) => {
    if (!user) return false;

    const rolePermissions = {
      admin: ['*'], // All permissions
      manager: ['read', 'write', 'manage_team', 'view_reports', 'manage_incidents'],
      analyst: ['read', 'write', 'triage', 'view_reports'],
      viewer: ['read', 'view_reports'],
    };

    const userPermissions = rolePermissions[user.role] || [];
    return userPermissions.includes('*') || userPermissions.includes(permission);
  }, [user]);

  const hasRole = useCallback((roles) => {
    if (!user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(user.role);
  }, [user]);

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    hasPermission,
    hasRole,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
