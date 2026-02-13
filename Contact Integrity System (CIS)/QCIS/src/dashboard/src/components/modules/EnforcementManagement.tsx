'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';
import EvaluationStats from './EvaluationStats';

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
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  user_type: string | null;
  service_category: string | null;
  user_trust_score: number | null;
}

const ACTION_COLORS: Record<string, string> = {
  soft_warning: 'bg-yellow-100 text-yellow-700',
  hard_warning: 'bg-cis-orange-soft text-cis-orange',
  temporary_restriction: 'bg-cis-red-soft text-cis-red',
  account_suspension: 'bg-red-100 text-red-800',
  permanent_ban: 'bg-red-900 text-white',
  // Phase 3B — Context-aware action types
  booking_blocked: 'bg-red-100 text-red-700',
  booking_flagged: 'bg-amber-100 text-amber-700',
  payment_held: 'bg-orange-100 text-orange-700',
  payment_blocked: 'bg-red-200 text-red-800',
  provider_demoted: 'bg-amber-100 text-amber-800',
  provider_suspended: 'bg-red-100 text-red-800',
  message_throttled: 'bg-blue-100 text-blue-700',
};

const SERVICE_CATEGORIES = ['', 'Cleaning', 'Plumbing', 'Electrical', 'Moving', 'Tutoring', 'Handyman', 'Landscaping', 'Pet Care', 'Auto Repair', 'Personal Training'];

export default function EnforcementManagement() {
  const { auth } = useAuth();
  const [actions, setActions] = useState<EnforcementAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [reverseModal, setReverseModal] = useState<string | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedAction, setSelectedAction] = useState<EnforcementAction | null>(null);

  useEffect(() => { loadActions(); }, [auth.token, actionTypeFilter, categoryFilter]);

  async function loadActions() {
    if (!auth.token) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (actionTypeFilter) params.action_type = actionTypeFilter;
      if (categoryFilter) params.category = categoryFilter;
      const result = await api.getEnforcementActions(auth.token, params);
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
      <h2 className="text-xl font-bold text-gray-900 mb-4">Enforcement Management</h2>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select value={actionTypeFilter} onChange={(e) => setActionTypeFilter(e.target.value)} className="text-xs border border-gray-300 rounded-md px-2 py-1">
          <option value="">All action types</option>
          <option value="soft_warning">Soft Warning</option>
          <option value="hard_warning">Hard Warning</option>
          <option value="temporary_restriction">Temporary Restriction</option>
          <option value="account_suspension">Account Suspension</option>
          <option value="permanent_ban">Permanent Ban</option>
          <option value="booking_blocked">Booking Blocked</option>
          <option value="booking_flagged">Booking Flagged</option>
          <option value="payment_held">Payment Held</option>
          <option value="payment_blocked">Payment Blocked</option>
          <option value="provider_demoted">Provider Demoted</option>
          <option value="provider_suspended">Provider Suspended</option>
          <option value="message_throttled">Message Throttled</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="text-xs border border-gray-300 rounded-md px-2 py-1">
          <option value="">All categories</option>
          {SERVICE_CATEGORIES.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="flex gap-6">
        <div className={selectedAction ? 'w-2/3' : 'w-full'}>
          {loading ? (
            <div className="text-gray-400 text-center py-12">Loading...</div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">User</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Action</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Category</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Reason</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Date</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {actions.map((action) => (
                    <tr
                      key={action.id}
                      className={`hover:bg-gray-50 cursor-pointer ${selectedAction?.id === action.id ? 'bg-cis-green-soft' : ''}`}
                      onClick={() => setSelectedAction(action)}
                    >
                      <td className="px-4 py-3 text-gray-900 font-medium">{action.user_name || action.user_id.slice(0, 8)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${ACTION_COLORS[action.action_type] || 'bg-gray-100'}`}>
                          {action.action_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{action.service_category || '-'}</td>
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
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(action.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {!action.reversed_at && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setReverseModal(action.id); }}
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
        </div>

        {/* Detail panel */}
        {selectedAction && (
          <div className="w-1/3">
            <div className="bg-white rounded-lg border border-gray-200 p-5 sticky top-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-sm">User Details</h3>
                <button onClick={() => setSelectedAction(null)} className="text-gray-400 hover:text-gray-600 text-xs">Close</button>
              </div>
              <div className="space-y-2 text-xs">
                <p><span className="text-gray-400">Name:</span> {selectedAction.user_name || 'Unknown'}</p>
                <p><span className="text-gray-400">Email:</span> {selectedAction.user_email || '-'}</p>
                <p><span className="text-gray-400">Phone:</span> {selectedAction.user_phone || '-'}</p>
                <p><span className="text-gray-400">Type:</span> {selectedAction.user_type || '-'}</p>
                <p><span className="text-gray-400">Category:</span> {selectedAction.service_category || '-'}</p>
                <p>
                  <span className="text-gray-400">Trust Score:</span>{' '}
                  <span className={`font-mono font-bold ${
                    (selectedAction.user_trust_score || 0) < 40 ? 'text-cis-red' :
                    (selectedAction.user_trust_score || 0) < 60 ? 'text-cis-orange' : 'text-cis-green'
                  }`}>{selectedAction.user_trust_score ?? '-'}</span>
                </p>
              </div>

              {/* Enforcement Timeline */}
              <div className="border-t border-gray-100 pt-3 mt-3">
                <p className="text-xs text-gray-500 font-medium mb-2">Timeline</p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cis-red" />
                    <span>Created: {new Date(selectedAction.created_at).toLocaleString()}</span>
                  </div>
                  {selectedAction.effective_until && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cis-orange" />
                      <span>Expires: {new Date(selectedAction.effective_until).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedAction.reversed_at && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-cis-green" />
                      <span>Reversed: {new Date(selectedAction.reversed_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pre-Transaction Evaluation Stats */}
      <EvaluationStats />

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
              <button onClick={() => { setReverseModal(null); setReverseReason(''); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button onClick={handleReverse} disabled={!reverseReason.trim()} className="px-4 py-2 text-sm bg-cis-orange text-white rounded-md hover:opacity-90 disabled:opacity-50">
                Confirm Reversal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
