/**
 * Login Page
 * Authentication entry point for the VIOE application
 */

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ShieldAlert,
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  Info
} from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get redirect path from location state or default to dashboard
  const from = location.state?.from?.pathname || '/Dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate(from, { replace: true });
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (role) => {
    const demoAccounts = {
      admin: 'admin@vioe.demo',
      analyst: 'analyst@vioe.demo',
      manager: 'manager@vioe.demo',
      viewer: 'viewer@vioe.demo',
    };

    setEmail(demoAccounts[role]);
    setPassword('demo');
    setError('');
    setIsSubmitting(true);

    try {
      const result = await login(demoAccounts[role], 'demo');
      if (result.success) {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDemoMode = import.meta.env.VITE_API_MODE === 'mock';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">VIOE</h1>
          <p className="text-slate-400 mt-1">Vulnerability Intelligence & Ownership Engine</p>
        </div>

        {/* Demo Mode Banner */}
        {isDemoMode && (
          <div className="mb-6 p-4 rounded-xl bg-cyan-950/30 border border-cyan-900/50">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-cyan-400">Demo Mode Active</p>
                <p className="text-xs text-slate-400 mt-1">
                  Use any email with password "demo" or click a quick login button below.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Login Form */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-slate-950 border-slate-700 text-white placeholder:text-slate-500"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-slate-950 border-slate-700 text-white placeholder:text-slate-500"
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-950/30 border border-red-900/50 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Forgot Password Link */}
          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-sm text-cyan-400 hover:text-cyan-300"
              onClick={() => {
                if (isDemoMode) {
                  setError('Password reset is not available in demo mode');
                }
              }}
            >
              Forgot your password?
            </button>
          </div>
        </div>

        {/* Demo Quick Login Buttons */}
        {isDemoMode && (
          <div className="mt-6">
            <p className="text-xs text-slate-500 text-center mb-3">Quick Demo Login</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin('admin')}
                disabled={isSubmitting}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Admin
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin('manager')}
                disabled={isSubmitting}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Manager
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin('analyst')}
                disabled={isSubmitting}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Analyst
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin('viewer')}
                disabled={isSubmitting}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Viewer
              </Button>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-600">
          VIOE - Vulnerability Intelligence & Ownership Engine
        </p>
      </div>
    </div>
  );
}
