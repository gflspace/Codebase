'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';

interface EnforcementAction {
  id: string;
  user_id: string;
  action_type: string;
  reason: string;
  reason_code: string;
  effective_until: string | null;
  reversed_at: string | null;
  automated: boolean;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  soft_warning: 'bg-yellow-100 text-yellow-700',
  hard_warning: 'bg-cis-orange-soft text-cis-orange',
  temporary_restriction: 'bg-cis-red-soft text-cis-red',
  account_suspension: 'bg-red-100 text-red-800',
  permanent_ban: 'bg-red-900 text-white',
};

export default function EnforcementManagement() {
  const { auth } = useAuth();
  const [actions, setActions] = useState<EnforcementAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [reverseModal, setReverseModal] = useState<string | null>(null);
  const [reverseReason, setReverseReason] = useState('');

  useEffect(() => { loadActions(); }, []);

  async function loadActions() {
    if (!auth.token) return;
    setLoading(true);
    try {
      const result = await api.getEnforcementActions(auth.token);
      setActions(result.data as EnforcementAction[]);
    } catch (err) {
      console.error('Failed to load enforcement actions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleReverse() {
    if (!auth.token || !reverseModal || !reverseReason.trim()) return;
    try {
      await api.reverseEnforcementAction(auth.token, reverseModal, reverseReason);
      setReverseModal(null);
      setReverseReason('');
      loadActions();
    } catch (err) {
      console.error('Failed to reverse action:', err);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Enforcement Management</h2>

      {loading ? (
        <div className="text-gray-400 text-center py-12">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">User</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Action</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Reason</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Date</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {actions.map((action) => (
                <tr key={action.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{action.user_id.slice(0, 8)}...</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${ACTION_COLORS[action.action_type] || 'bg-gray-100'}`}>
                      {action.action_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{action.reason}</td>
                  <td className="px-4 py-3">
                    {action.reversed_at ? (
                      <span className="text-xs text-gray-400">Reversed</span>
                    ) : action.effective_until && new Date(action.effective_until) < new Date() ? (
                      <span className="text-xs text-gray-400">Expired</span>
                    ) : (
                      <span className="text-xs text-cis-red font-medium">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(action.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {!action.reversed_at && (
                      <button
                        onClick={() => setReverseModal(action.id)}
                        className="text-xs text-cis-orange hover:text-cis-red transition-colors"
                      >
                        Reverse
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reverse confirmation modal */}
      {reverseModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Reverse Enforcement Action</h3>
            <p className="text-sm text-gray-500 mb-4">
              This will reverse the enforcement action. You must provide a justification.
            </p>
            <textarea
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
              placeholder="Justification for reversal (required)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-4 h-24 focus:outline-none focus:ring-2 focus:ring-cis-green"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setReverseModal(null); setReverseReason(''); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleReverse}
                disabled={!reverseReason.trim()}
                className="px-4 py-2 text-sm bg-cis-orange text-white rounded-md hover:opacity-90 disabled:opacity-50"
              >
                Confirm Reversal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
