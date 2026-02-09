'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';

interface Appeal {
  id: string;
  enforcement_action_id: string;
  user_id: string;
  status: string;
  reason: string;
  resolution_notes: string | null;
  action_type?: string;
  enforcement_reason?: string;
  submitted_at: string;
  resolved_at: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-cis-orange-soft text-cis-orange',
  under_review: 'bg-blue-100 text-blue-700',
  approved: 'bg-cis-green-soft text-cis-green',
  denied: 'bg-cis-red-soft text-cis-red',
};

export default function AppealsModule() {
  const { auth } = useAuth();
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveModal, setResolveModal] = useState<Appeal | null>(null);
  const [resolution, setResolution] = useState<{ status: string; notes: string }>({
    status: 'approved', notes: '',
  });

  useEffect(() => { loadAppeals(); }, [auth.token]);

  async function loadAppeals() {
    if (!auth.token) return;
    setLoading(true);
    try {
      const result = await api.getAppeals(auth.token);
      setAppeals(result.data as Appeal[]);
    } catch (err) {
      console.error('Failed to load appeals:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve() {
    if (!auth.token || !resolveModal || !resolution.notes.trim()) return;
    try {
      await api.resolveAppeal(auth.token, resolveModal.id, {
        status: resolution.status,
        resolution_notes: resolution.notes,
      });
      setResolveModal(null);
      setResolution({ status: 'approved', notes: '' });
      loadAppeals();
    } catch (err) {
      console.error('Failed to resolve appeal:', err);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Appeals</h2>

      {loading ? (
        <div className="text-gray-400 text-center py-12">Loading...</div>
      ) : appeals.length === 0 ? (
        <div className="text-gray-400 text-center py-12">No appeals found.</div>
      ) : (
        <div className="space-y-3">
          {appeals.map((appeal) => (
            <div key={appeal.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[appeal.status]}`}>
                      {appeal.status}
                    </span>
                    {appeal.action_type && (
                      <span className="text-xs text-gray-400">Against: {appeal.action_type}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-900 mb-1">{appeal.reason}</p>
                  <p className="text-xs text-gray-400">
                    User: {appeal.user_id.slice(0, 8)}... | Submitted: {new Date(appeal.submitted_at).toLocaleString()}
                  </p>
                  {appeal.resolution_notes && (
                    <p className="text-xs text-gray-500 mt-2 italic">Resolution: {appeal.resolution_notes}</p>
                  )}
                </div>
                {['submitted', 'under_review'].includes(appeal.status) && (
                  <button
                    onClick={() => setResolveModal(appeal)}
                    className="px-3 py-1 text-xs bg-cis-green-soft text-cis-green rounded hover:bg-cis-green hover:text-white transition-colors"
                  >
                    Review
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolve modal */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Resolve Appeal</h3>
            <p className="text-sm text-gray-500 mb-4">Appeal reason: {resolveModal.reason}</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Decision</label>
              <select
                value={resolution.status}
                onChange={(e) => setResolution((r) => ({ ...r, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="approved">Approve (reverse enforcement)</option>
                <option value="denied">Deny</option>
              </select>
            </div>

            <textarea
              value={resolution.notes}
              onChange={(e) => setResolution((r) => ({ ...r, notes: e.target.value }))}
              placeholder="Resolution notes (required)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-4 h-24"
            />

            <div className="flex justify-end gap-3">
              <button onClick={() => setResolveModal(null)} className="px-4 py-2 text-sm text-gray-600">
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolution.notes.trim()}
                className="px-4 py-2 text-sm bg-cis-green text-white rounded-md disabled:opacity-50"
              >
                Submit Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
