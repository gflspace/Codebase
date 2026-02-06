import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail, Eye, EyeOff, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  secureSessionStore,
  secureSessionRetrieve,
  secureSessionRemove,
  checkRateLimit,
  recordRateLimitAttempt,
  auditLog,
} from '@/lib/security';
import {
  isDemoMode,
  validateDemoCredentials,
  getDemoUser,
  getDemoRoles,
} from '@/lib/demoMode';

/**
 * Check if user is authenticated and has admin/staff role
 * @returns {Promise<boolean>} Authentication status
 */
export async function checkAdminAuth() {
  // In demo mode, check for demo session
  if (isDemoMode()) {
    const demoSession = sessionStorage.getItem('miko_demo_session');
    return demoSession === 'active';
  }

  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured - admin auth unavailable');
    return false;
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return false;
    }

    // Verify user has admin or staff role
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .in('role', ['admin', 'staff', 'clinical_reviewer']);

    if (rolesError || !roles || roles.length === 0) {
      return false;
    }

    return true;
  } catch (err) {
    console.error('Auth check error:', err);
    return false;
  }
}

/**
 * Synchronous auth check for initial render (checks cached session)
 * Use checkAdminAuth() for authoritative check
 * NOTE: This is a sync wrapper - actual verification happens async
 */
export function checkAdminAuthSync() {
  // For initial render, we check a simple flag
  // The actual secure verification happens in checkAdminAuthSecure()
  const cachedAuth = sessionStorage.getItem('miko_admin_auth_valid');
  const cachedExpiry = sessionStorage.getItem('miko_admin_auth_expiry');

  if (cachedAuth === 'true' && cachedExpiry) {
    const expiry = parseInt(cachedExpiry, 10);
    if (Date.now() < expiry) {
      return true;
    }
  }

  return false;
}

/**
 * Async secure auth check with HMAC verification
 * @returns {Promise<boolean>} Whether auth is valid
 */
export async function checkAdminAuthSecure() {
  try {
    const authData = await secureSessionRetrieve('miko_admin_auth');
    if (!authData || !authData.valid) {
      return false;
    }

    // Also verify with Supabase that session is still valid
    if (isSupabaseConfigured()) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Session expired, clear cached auth
        secureSessionRemove('miko_admin_auth');
        sessionStorage.removeItem('miko_admin_auth_valid');
        sessionStorage.removeItem('miko_admin_auth_expiry');
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Secure auth check failed:', error);
    return false;
  }
}

/**
 * Log out the admin user
 */
export async function adminLogout() {
  // In demo mode, just clear demo session
  if (isDemoMode()) {
    sessionStorage.removeItem('miko_demo_session');
    sessionStorage.removeItem('miko_demo_user');
    window.location.href = '/admin';
    return;
  }

  // Log the logout action
  await auditLog({
    action: 'logout',
    resourceType: 'session',
    details: { method: 'user_initiated' },
  });

  if (isSupabaseConfigured()) {
    await supabase.auth.signOut();
  }

  // Clear all cached auth state (both legacy and secure)
  sessionStorage.removeItem('miko_admin_auth_valid');
  sessionStorage.removeItem('miko_admin_auth_expiry');
  secureSessionRemove('miko_admin_auth');

  window.location.href = '/admin';
}

export default function AdminLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [demoModeActive, setDemoModeActive] = useState(false);

  useEffect(() => {
    // Check if demo mode or Supabase is configured
    const demoActive = isDemoMode();
    setDemoModeActive(demoActive);
    setSupabaseReady(demoActive || isSupabaseConfigured());
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    // Handle Demo Mode login
    if (demoModeActive) {
      // Small delay to simulate network request
      await new Promise(resolve => setTimeout(resolve, 500));

      if (validateDemoCredentials(normalizedEmail, password)) {
        const demoUser = getDemoUser();
        const demoRoles = getDemoRoles();

        // Store demo session
        sessionStorage.setItem('miko_demo_session', 'active');
        sessionStorage.setItem('miko_demo_user', JSON.stringify({
          ...demoUser,
          roles: demoRoles,
        }));

        onLoginSuccess();
      } else {
        setError('Invalid credentials. Use demo@miko.com / demo123');
      }
      setIsLoading(false);
      return;
    }

    // Check rate limit BEFORE any authentication attempt
    const rateLimitResult = checkRateLimit('login', normalizedEmail);
    if (!rateLimitResult.allowed) {
      setError(rateLimitResult.message);
      setIsLoading(false);
      return;
    }

    // Show warning if running low on attempts
    if (rateLimitResult.remainingAttempts <= 2 && rateLimitResult.remainingAttempts > 0) {
      // Will be displayed after error if login fails
    }

    // Validate Supabase is configured
    if (!supabaseReady) {
      setError('Authentication service not configured. Please contact administrator.');
      setIsLoading(false);
      return;
    }

    try {
      // Authenticate with Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (authError) {
        // Record failed attempt for rate limiting
        recordRateLimitAttempt('login', normalizedEmail, false);

        // Check remaining attempts after this failure
        const updatedRateLimit = checkRateLimit('login', normalizedEmail);

        // Handle specific auth errors
        let errorMessage = 'Authentication failed';
        if (authError.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password';
        } else if (authError.message.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email address before logging in';
        }

        // Append rate limit warning if applicable
        if (updatedRateLimit.remainingAttempts <= 2 && updatedRateLimit.remainingAttempts > 0) {
          errorMessage += `. ${updatedRateLimit.message}`;
        } else if (!updatedRateLimit.allowed) {
          errorMessage = updatedRateLimit.message;
        }

        setError(errorMessage);
        setIsLoading(false);
        return;
      }

      if (!data.session || !data.user) {
        recordRateLimitAttempt('login', normalizedEmail, false);
        setError('Authentication failed. Please try again.');
        setIsLoading(false);
        return;
      }

      // Verify user has admin/staff role
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .in('role', ['admin', 'staff', 'clinical_reviewer']);

      if (rolesError) {
        console.error('Role check error:', rolesError);
        await supabase.auth.signOut();
        recordRateLimitAttempt('login', normalizedEmail, false);
        setError('Unable to verify permissions. Please contact administrator.');
        setIsLoading(false);
        return;
      }

      if (!roles || roles.length === 0) {
        await supabase.auth.signOut();
        recordRateLimitAttempt('login', normalizedEmail, false);
        setError('Access denied. You do not have admin privileges.');
        setIsLoading(false);
        return;
      }

      // SUCCESS - Clear rate limit and store secure session
      recordRateLimitAttempt('login', normalizedEmail, true);

      // Store secure session with HMAC signature
      await secureSessionStore('miko_admin_auth', {
        valid: true,
        userId: data.user.id,
        email: data.user.email,
        roles: roles.map(r => r.role),
      }, 60 * 60 * 1000); // 1 hour expiry

      // Also set legacy flags for backwards compatibility with checkAdminAuthSync
      sessionStorage.setItem('miko_admin_auth_valid', 'true');
      sessionStorage.setItem('miko_admin_auth_expiry', String(Date.now() + 60 * 60 * 1000));

      // Log successful login
      await auditLog({
        action: 'login',
        resourceType: 'session',
        details: {
          userId: data.user.id,
          email: data.user.email,
          roles: roles.map(r => r.role),
        },
      });

      onLoginSuccess();
    } catch (err) {
      console.error('Login error:', err);
      recordRateLimitAttempt('login', normalizedEmail, false);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2D0A0A] via-[#4A1515] to-[#2D0A0A] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md border-[#C4A484]/30 bg-white/95 backdrop-blur shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_69487d2cd5b55089ee0d9113/ede5f8e54_image.png"
                alt="MiKO"
                className="h-16 object-contain mx-auto"
              />
            </div>
            <CardTitle className="text-2xl font-light text-[#2D0A0A]">Admin Login</CardTitle>
            <CardDescription className="text-[#6B5C4C]">
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              {!supabaseReady && !demoModeActive && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Authentication service not configured
                </motion.div>
              )}

              {demoModeActive && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm"
                >
                  <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Demo Mode Active</strong>
                    <br />
                    Use: <code className="bg-blue-100 px-1 rounded">demo@miko.com</code> / <code className="bg-blue-100 px-1 rounded">demo123</code>
                  </div>
                </motion.div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#2D0A0A]">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8B7355]" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="pl-10 h-12 border-[#E8E3DC] focus:border-[#C4A484] focus:ring-[#C4A484]"
                    required
                    autoComplete="email"
                    disabled={!supabaseReady}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#2D0A0A]">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8B7355]" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="pl-10 pr-10 h-12 border-[#E8E3DC] focus:border-[#C4A484] focus:ring-[#C4A484]"
                    required
                    autoComplete="current-password"
                    disabled={!supabaseReady}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B7355] hover:text-[#4A1515]"
                    disabled={!supabaseReady}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !supabaseReady}
                className="w-full h-12 bg-[#4A1515] hover:bg-[#3D1010] text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-[#E8E3DC]">
              <p className="text-xs text-center text-[#8B7355]">
                MiKO Plastic Surgery Admin Portal
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
