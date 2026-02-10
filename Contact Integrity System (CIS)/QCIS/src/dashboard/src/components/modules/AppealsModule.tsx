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
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  user_type: string | null;
  service_category: string | null;
  user_trust_score: number | null;
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
  const [resolution, setResolution] = useState<{ status: string; notes: string }>({ status: 'approved', notes: '' });
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<{ recommendation: string; reasoning: string; confidence: number } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

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

  async function loadAiAnalysis(appealId: string) {
    if (!auth.token) return;
    setAiLoading(true);
    setAiAnalysis(null);
    try {
      const result = await api.analyzeAppealAI(auth.token, appealId);
      setAiAnalysis(result.data);
    } catch {
      setAiAnalysis({ recommendation: 'unavailable', reasoning: 'AI analysis unavailable.', confidence: 0 });
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Appeals</h2>

      <div className="flex gap-6">
        <div className={selectedAppeal ? 'w-1/2' : 'w-full'}>
          {loading ? (
            <div className="text-gray-400 text-center py-12">Loading...</div>
          ) : appeals.length === 0 ? (
            <div className="text-gray-400 text-center py-12">No appeals found.</div>
          ) : (
            <div className="space-y-3">
              {appeals.map((appeal) => (
                <div
                  key={appeal.id}
                  className={`bg-white rounded-lg border p-4 cursor-pointer transition-colors ${
                    selectedAppeal?.id === appeal.id ? 'border-cis-green ring-1 ring-cis-green' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => { setSelectedAppeal(appeal); setAiAnalysis(null); }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[appeal.status]}`}>
                          {appeal.status}
                        </span>
                        {appeal.action_type && (
                          <span className="text-xs text-gray-400">Against: {appeal.action_type.replace(/_/g, ' ')}</span>
                        )}
                        {appeal.service_category && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{appeal.service_category}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 mb-1">{appeal.reason}</p>
                      <p className="text-xs text-gray-500">
                        {appeal.user_name || appeal.user_id.slice(0, 8)} | {new Date(appeal.submitted_at).toLocaleString()}
                      </p>
                      {appeal.resolution_notes && (
                        <p className="text-xs text-gray-500 mt-2 italic">Resolution: {appeal.resolution_notes}</p>
                      )}
                    </div>
                    {['submitted', 'under_review'].includes(appeal.status) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setResolveModal(appeal); }}
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
        </div>

        {/* Detail panel */}
        {selectedAppeal && (
          <div className="w-1/2">
            <div className="bg-white rounded-lg border border-gray-200 p-5 sticky top-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900">Appeal Details</h3>
                <button onClick={() => setSelectedAppeal(null)} className="text-gray-400 hover:text-gray-600 text-sm">Close</button>
              </div>

              <div className="space-y-3 text-sm">
                {/* User details */}
                <div className="bg-gray-50 rounded-md p-3">
                  <p className="font-medium text-gray-700 mb-1 text-xs">User Details</p>
                  <div className="space-y-1 text-xs">
                    <p><span className="text-gray-400">Name:</span> {selectedAppeal.user_name || 'Unknown'}</p>
                    <p><span className="text-gray-400">Email:</span> {selectedAppeal.user_email || '-'}</p>
                    <p><span className="text-gray-400">Phone:</span> {selectedAppeal.user_phone || '-'}</p>
                    <p><span className="text-gray-400">Type:</span> {selectedAppeal.user_type || '-'}</p>
                    <p><span className="text-gray-400">Category:</span> {selectedAppeal.service_category || '-'}</p>
                    <p>
                      <span className="text-gray-400">Trust Score:</span>{' '}
                      <span className={`font-mono font-bold ${
                        (selectedAppeal.user_trust_score || 0) < 40 ? 'text-cis-red' :
                        (selectedAppeal.user_trust_score || 0) < 60 ? 'text-cis-orange' : 'text-cis-green'
                      }`}>{selectedAppeal.user_trust_score ?? '-'}</span>
                    </p>
                  </div>
                </div>

                {/* Enforcement context */}
                <div className="bg-orange-50 rounded-md p-3">
                  <p className="font-medium text-orange-700 mb-1 text-xs">Enforcement Context</p>
                  <div className="text-xs text-orange-600 space-y-1">
                    <p>Action: {selectedAppeal.action_type?.replace(/_/g, ' ') || '-'}</p>
                    <p>Reason: {selectedAppeal.enforcement_reason || '-'}</p>
                  </div>
                </div>

                {/* AI Analysis */}
                <div className="border-t border-gray-100 pt-3">
                  <button
                    onClick={() => loadAiAnalysis(selectedAppeal.id)}
                    disabled={aiLoading}
                    className="px-3 py-1.5 text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 disabled:opacity-50 transition-colors"
                  >
                    {aiLoading ? 'Analyzing...' : 'AI Appeal Analysis'}
                  </button>
                  {aiAnalysis && (
                    <div className="mt-3 bg-purple-50 rounded-md p-3 text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-purple-800">Recommendation:</span>
                        <span className={`px-2 py-0.5 rounded font-medium ${
                          aiAnalysis.recommendation === 'approve' ? 'bg-green-100 text-green-700' :
                          aiAnalysis.recommendation === 'deny' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {aiAnalysis.recommendation}
                        </span>
                        <span className="text-gray-400">(confidence: {(aiAnalysis.confidence * 100).toFixed(0)}%)</span>
                      </div>
                      <p className="text-purple-700">{aiAnalysis.reasoning}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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
              <button onClick={handleResolve} disabled={!resolution.notes.trim()} className="px-4 py-2 text-sm bg-cis-green text-white rounded-md disabled:opacity-50">
                Submit Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
