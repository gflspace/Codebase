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
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-cis-orange-soft text-cis-orange',
  investigating: 'bg-blue-100 text-blue-700',
  pending_action: 'bg-cis-red-soft text-cis-red',
  resolved: 'bg-cis-green-soft text-cis-green',
  closed: 'bg-gray-100 text-gray-500',
};

export default function CaseInvestigation() {
  const { auth } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCases(); }, []);

  async function loadCases() {
    if (!auth.token) return;
    setLoading(true);
    try {
      const result = await api.getCases(auth.token);
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

  return (
    <div className="flex gap-6 h-full">
      {/* Case list */}
      <div className="w-1/3">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Cases</h2>
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
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
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

            <p className="text-sm text-gray-600 mb-4">{selectedCase.description}</p>
            <p className="text-xs text-gray-400 mb-4">User ID: {selectedCase.user_id}</p>

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
                <button
                  onClick={addNote}
                  className="px-4 py-2 bg-cis-green text-white rounded-md text-sm hover:opacity-90"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-400 text-center py-20">Select a case to view details.</div>
        )}
      </div>
    </div>
  );
}
