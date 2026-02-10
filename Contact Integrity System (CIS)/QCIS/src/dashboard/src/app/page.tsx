'use client';

import { useAuth } from '@/lib/auth';
import LoginPage from '@/components/LoginPage';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const { auth } = useAuth();

  return auth.isAuthenticated ? <Dashboard /> : <LoginPage />;
}
