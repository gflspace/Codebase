'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import LoginPage from '@/components/LoginPage';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const { auth } = useAuth();
  const [debugLog, setDebugLog] = useState<string[]>(['Page mounted']);
  const [showDebug, setShowDebug] = useState(true);

  useEffect(() => {
    setDebugLog((prev) => [
      ...prev,
      `Auth state changed: isAuthenticated=${auth.isAuthenticated}, hasToken=${!!auth.token}, hasUser=${!!auth.user}, role=${auth.user?.role || 'none'}`,
    ]);
  }, [auth.isAuthenticated, auth.token, auth.user]);

  useEffect(() => {
    const token = localStorage.getItem('cis_token');
    const user = localStorage.getItem('cis_user');
    setDebugLog((prev) => [
      ...prev,
      `localStorage check: hasToken=${!!token}, hasUser=${!!user}`,
    ]);
  }, []);

  return (
    <>
      {showDebug && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
          background: '#111', color: '#0f0', fontFamily: 'monospace', fontSize: '11px',
          padding: '8px 12px', maxHeight: '150px', overflowY: 'auto', borderTop: '2px solid #0f0',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <strong>CIS DEBUG</strong>
            <button onClick={() => setShowDebug(false)} style={{ color: '#f00', background: 'none', border: 'none', cursor: 'pointer' }}>X</button>
          </div>
          {debugLog.map((msg, i) => (
            <div key={i}>{msg}</div>
          ))}
        </div>
      )}

      {auth.isAuthenticated ? <Dashboard /> : <LoginPage />}
    </>
  );
}
