'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Force password change state
  const [pendingUser, setPendingUser] = useState<{
    token: string;
    user: { id: string; email: string; name: string; role: string; permissions: string[]; force_password_change: boolean };
  } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await api.login(email, password);

      if (result.user.force_password_change) {
        setPendingUser(result);
      } else {
        login(result.token, result.user);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      // Use the pending token to reset own password
      await api.resetAdminPassword(pendingUser!.token, pendingUser!.user.id, newPassword);
      // Now login with the new password
      const result = await api.login(pendingUser!.user.email, newPassword);
      login(result.token, result.user);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Password change failed';
      setError(msg);
    } finally {
      setChangingPassword(false);
    }
  }

  // Force password change form
  if (pendingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Change Password</h1>
            <p className="text-gray-500 mt-1">You must set a new password before continuing</p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            {error && (
              <div className="bg-cis-red-soft border border-cis-red text-cis-red px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cis-green"
                required
                minLength={8}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cis-green"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              className="w-full bg-cis-green text-white py-2 rounded-md hover:opacity-90 disabled:opacity-50 font-medium"
            >
              {changingPassword ? 'Changing Password...' : 'Set New Password'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">QwickServices CIS</h1>
          <p className="text-gray-500 mt-1">Trust & Safety Admin Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-cis-red-soft border border-cis-red text-cis-red px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cis-green"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cis-green"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cis-green text-white py-2 rounded-md hover:opacity-90 disabled:opacity-50 font-medium"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
