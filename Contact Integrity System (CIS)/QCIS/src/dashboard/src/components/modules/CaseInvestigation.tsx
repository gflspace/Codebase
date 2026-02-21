'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';

interface Case {
  id: string;
  user_id: string;
  status: string;
  title: string;
  description: string;
  assigned_to: string | null;
  notes?: Array<{ id: string; author: string; content: string; created_at: string }>;
  created_at: string;
  updated_at: string;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  user_type: string | null;
  service_category: string | null;
  user_trust_score: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-cis-orange-soft text-cis-orange',
  investigating: 'bg-blue-100 text-blue-700',
  pending_action: 'bg-cis-red-soft text-cis-red',
  resolved: 'bg-cis-green-soft text-cis-green',
  closed: 'bg-gray-100 text-gray-500',
};

const SERVICE_CATEGORIES = ['', 'Cleaning', 'Plumbing', 'Electrical', 'Moving', 'Tutoring', 'Handyman', 'Landscaping', 'Pet Care', 'Auto Repair', 'Personal Training'];

export default function CaseInvestigation() {
  const { auth } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'ai'>('details');
  const [aiRiskSummary, setAiRiskSummary] = useState<{ summary: string; risk_level: string; recommendations: string[] } | null>(null);
  const [aiPrediction, setAiPrediction] = useState<{ likelihood: number; predicted_violation: string; timeframe: string; reasoning: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => { loadCases(); }, [auth.token, statusFilter, categoryFilter, userTypeFilter]);

  async function loadCases() {
    if (!auth.token) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (userTypeFilter) params.user_type = userTypeFilter;
      const result = await api.getCases(auth.token, params);
      setCases(result.data as Case[]);
    } catch (err) {
      console.error('Failed to load cases:', err);
    } finally {
      setLoading(false);
    }
  }

  async function selectCase(caseId: string) {
    if (!auth.token) return;
    try {
      const result = await api.getCase(auth.token, caseId);
      setSelectedCase(result.data as Case);
    } catch (err) {
      console.error('Failed to load case:', err);
    }
  }

  async function addNote() {
    if (!auth.token || !selectedCase || !newNote.trim()) return;
    try {
      await api.addCaseNote(auth.token, selectedCase.id, newNote);
      setNewNote('');
      selectCase(selectedCase.id);
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  }

  async function updateStatus(status: string) {
    if (!auth.token || !selectedCase) return;
    try {
      await api.updateCase(auth.token, selectedCase.id, { status });
      selectCase(selectedCase.id);
      loadCases();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  }

  async function loadAiAnalysis() {
    if (!auth.token || !selectedCase) return;
    setAiLoading(true);
    setAiRiskSummary(null);
    setAiPrediction(null);
    try {
      const [riskResult, predResult] = await Promise.all([
        api.getRiskSummary(auth.token, selectedCase.user_id),
        api.getPredictiveAlert(auth.token, selectedCase.user_id),
      ]);
      setAiRiskSummary(riskResult.data);
      setAiPrediction(predResult.data);
    } catch {
      setAiRiskSummary({ summary: 'AI analysis unavailable.', risk_level: 'unknown', recommendations: [] });
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Cases</h2>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs border border-gray-300 rounded-md px-2 py-1">
          <option value="">All statuses</option>
          {['open', 'investigating', 'pending_action', 'resolved', 'closed'].map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="text-xs border border-gray-300 rounded-md px-2 py-1">
          <option value="">All categories</option>
          {SERVICE_CATEGORIES.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={userTypeFilter} onChange={(e) => setUserTypeFilter(e.target.value)} className="text-xs border border-gray-300 rounded-md px-2 py-1">
          <option value="">All user types</option>
          <option value="customer">Customer</option>
          <option value="provider">Provider</option>
        </select>
      </div>

      <div className="flex gap-6 h-full">
        {/* Case list */}
        <div className="w-1/3">
          {loading ? (
            <div className="text-gray-400 text-center py-8">Loading...</div>
          ) : (
            <div className="space-y-2">
              {cases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCase(c.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedCase?.id === c.id
                      ? 'border-cis-green bg-cis-green-soft'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[c.status] || ''}`}>
                      {c.status}
                    </span>
                    {c.service_category && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{c.service_category}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                  <p className="text-xs text-gray-500">{c.user_name || c.user_id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Case detail */}
        <div className="flex-1">
          {selectedCase ? (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">{selectedCase.title}</h3>
                <span className={`px-3 py-1 rounded text-sm font-medium ${STATUS_COLORS[selectedCase.status] || ''}`}>
                  {selectedCase.status}
                </span>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-4 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-cis-green text-cis-green' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  Details
                </button>
                <button
                  onClick={() => { setActiveTab('ai'); if (!aiRiskSummary && !aiLoading) loadAiAnalysis(); }}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === 'ai' ? 'border-purple-500 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  AI Analysis
                </button>
              </div>

              {activeTab === 'details' ? (
                <>
                  <p className="text-sm text-gray-600 mb-4">{selectedCase.description}</p>

                  {/* User Details */}
                  <div className="bg-gray-50 rounded-md p-3 mb-4 text-sm">
                    <p className="font-medium text-gray-700 mb-1">User Details</p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <p><span className="text-gray-400">Name:</span> {selectedCase.user_name || 'Unknown'}</p>
                      <p><span className="text-gray-400">Email:</span> {selectedCase.user_email || '-'}</p>
                      <p><span className="text-gray-400">Phone:</span> {selectedCase.user_phone || '-'}</p>
                      <p><span className="text-gray-400">Type:</span> {selectedCase.user_type || '-'}</p>
                      <p><span className="text-gray-400">Category:</span> {selectedCase.service_category || '-'}</p>
                      <p>
                        <span className="text-gray-400">Trust Score:</span>{' '}
                        <span className={`font-mono font-bold ${
                          (selectedCase.user_trust_score || 0) < 40 ? 'text-cis-red' :
                          (selectedCase.user_trust_score || 0) < 60 ? 'text-cis-orange' : 'text-cis-green'
                        }`}>{selectedCase.user_trust_score ?? '-'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Status actions */}
                  <div className="flex gap-2 mb-6">
                    {['investigating', 'pending_action', 'resolved', 'closed'].map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(s)}
                        disabled={selectedCase.status === s}
                        className="px-3 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 transition-colors"
                      >
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  {/* Notes timeline */}
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Internal Notes</h4>
                    <div className="space-y-3 mb-4 max-h-64 overflow-auto">
                      {(selectedCase.notes || []).map((note) => (
                        <div key={note.id} className="bg-gray-50 rounded p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-700">{note.author}</span>
                            <span className="text-xs text-gray-400">{new Date(note.created_at).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-gray-600">{note.content}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add a note..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cis-green"
                        onKeyDown={(e) => e.key === 'Enter' && addNote()}
                      />
                      <button onClick={addNote} className="px-4 py-2 bg-cis-green text-white rounded-md text-sm hover:opacity-90">
                        Add
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* AI Analysis Tab */
                <div className="space-y-4">
                  {aiLoading ? (
                    <div className="text-center py-8 text-gray-400">Generating AI analysis...</div>
                  ) : (
                    <>
                      {/* Risk Summary */}
                      {aiRiskSummary && (
                        <div className="bg-purple-50 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-sm font-semibold text-purple-800">Risk Summary</h4>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              aiRiskSummary.risk_level === 'critical' ? 'bg-red-100 text-red-700' :
                              aiRiskSummary.risk_level === 'high' ? 'bg-orange-100 text-orange-700' :
                              aiRiskSummary.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>{aiRiskSummary.risk_level}</span>
                          </div>
                          <p className="text-sm text-purple-700 mb-2">{aiRiskSummary.summary}</p>
                          {aiRiskSummary.recommendations.length > 0 && (
                            <ul className="list-disc list-inside text-xs text-purple-600 space-y-0.5">
                              {aiRiskSummary.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                          )}
                        </div>
                      )}

                      {/* Predictive Alert */}
                      {aiPrediction && (
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-blue-800 mb-2">Predictive Analysis</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                            <div>
                              <span className="text-blue-500">Violation likelihood:</span>
                              <span className={`ml-1 font-bold ${aiPrediction.likelihood > 0.7 ? 'text-red-600' : aiPrediction.likelihood > 0.4 ? 'text-amber-600' : 'text-green-600'}`}>
                                {(aiPrediction.likelihood * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-blue-500">Timeframe:</span>
                              <span className="ml-1 text-blue-800">{aiPrediction.timeframe}</span>
                            </div>
                          </div>
                          <p className="text-xs text-blue-600 mb-1"><span className="font-medium">Predicted:</span> {aiPrediction.predicted_violation}</p>
                          <p className="text-xs text-blue-600">{aiPrediction.reasoning}</p>
                        </div>
                      )}

                      <button
                        onClick={loadAiAnalysis}
                        className="px-3 py-1.5 text-xs bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
                      >
                        Refresh AI Analysis
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-400 text-center py-20">Select a case to view details.</div>
          )}
        </div>
      </div>
    </div>
  );
}
