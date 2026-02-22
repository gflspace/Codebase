'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-cis-orange-soft text-cis-orange',
  converted: 'bg-cis-green-soft text-cis-green',
  archived: 'bg-gray-100 text-gray-600',
};

export default function IntakeFormsModule() {
  const { auth } = useAuth();
  const [forms, setForms] = useState<api.IntakeForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<api.IntakeForm | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ total: number; pages: number } | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.token) return;
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: '20' };
    if (statusFilter) params.status = statusFilter;

    api.getIntakeForms(auth.token, params)
      .then((res) => {
        setForms(res.data);
        setPagination({ total: res.pagination.total, pages: res.pagination.pages });
      })
      .catch(() => setForms([]))
      .finally(() => setLoading(false));
  }, [auth.token, statusFilter, page]);

  async function updateStatus(id: string, status: string) {
    if (!auth.token) return;
    setSaving(true);
    try {
      const res = await api.updateIntakeForm(auth.token, id, { status });
      setForms((prev) => prev.map((f) => (f.id === id ? { ...f, ...res.data } : f)));
      if (selectedForm?.id === id) setSelectedForm({ ...selectedForm, ...res.data });
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  async function saveNotes(id: string) {
    if (!auth.token || !editNotes.trim()) return;
    setSaving(true);
    try {
      const res = await api.updateIntakeForm(auth.token, id, { notes: editNotes });
      setForms((prev) => prev.map((f) => (f.id === id ? { ...f, ...res.data } : f)));
      if (selectedForm?.id === id) setSelectedForm({ ...selectedForm, ...res.data });
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  function selectForm(form: api.IntakeForm) {
    setSelectedForm(form);
    setEditNotes(form.notes || '');
  }

  if (loading && forms.length === 0) {
    return <div className="text-gray-400 dark:text-slate-500 text-center mt-12">Loading intake forms...</div>;
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-6rem)]">
      {/* List */}
      <div className={`${selectedForm ? 'w-1/2' : 'w-full'} flex flex-col`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Intake Forms</h2>
          <span className="text-xs text-gray-400">{pagination?.total || 0} total</span>
        </div>

        {/* Status filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {['', 'new', 'contacted', 'converted', 'archived'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                statusFilter === s
                  ? 'bg-cis-green text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              {s || 'all'}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-slate-400">Name</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-slate-400">Email</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-slate-400">Service</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-slate-400">Status</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-slate-400">Date</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((form) => (
                <tr
                  key={form.id}
                  onClick={() => selectForm(form)}
                  className={`border-b border-gray-100 dark:border-slate-800 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-800 ${
                    selectedForm?.id === form.id ? 'bg-cis-green-soft dark:bg-emerald-900/20' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {form.first_name} {form.last_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-300 text-xs">{form.email}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-300 text-xs">{form.service_category || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[form.status] || 'bg-gray-100 text-gray-600'}`}>
                      {form.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(form.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {form.status === 'new' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); updateStatus(form.id, 'contacted'); }}
                        className="text-xs text-cis-green hover:underline"
                        disabled={saving}
                      >
                        Mark Contacted
                      </button>
                    )}
                    {form.status === 'contacted' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); updateStatus(form.id, 'converted'); }}
                        className="text-xs text-cis-green hover:underline"
                        disabled={saving}
                      >
                        Convert
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {forms.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400 dark:text-slate-500">No intake forms found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="text-xs px-3 py-1 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 disabled:opacity-30"
            >
              Previous
            </button>
            <span className="text-xs text-gray-400">Page {page} of {pagination.pages}</span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page >= pagination.pages}
              className="text-xs px-3 py-1 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedForm && (
        <div className="w-1/2 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700 p-5 overflow-y-auto">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white">
              {selectedForm.first_name} {selectedForm.last_name}
            </h3>
            <button onClick={() => setSelectedForm(null)} className="text-gray-400 hover:text-gray-600 text-sm">Close</button>
          </div>

          <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[selectedForm.status] || ''}`}>
            {selectedForm.status}
          </span>

          {/* Contact Info */}
          <div className="bg-gray-50 dark:bg-slate-800 rounded-md p-3 mt-4 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-400">Email:</span> <span className="text-gray-900 dark:text-white">{selectedForm.email}</span></div>
              <div><span className="text-gray-400">Phone:</span> <span className="text-gray-900 dark:text-white">{selectedForm.phone || '-'}</span></div>
              <div><span className="text-gray-400">Service:</span> <span className="text-gray-900 dark:text-white">{selectedForm.service_category || '-'}</span></div>
              <div><span className="text-gray-400">Referral:</span> <span className="text-gray-900 dark:text-white">{selectedForm.referral_source || '-'}</span></div>
              <div><span className="text-gray-400">Preferred Date:</span> <span className="text-gray-900 dark:text-white">{selectedForm.preferred_date || '-'}</span></div>
              <div><span className="text-gray-400">Preferred Time:</span> <span className="text-gray-900 dark:text-white">{selectedForm.preferred_time || '-'}</span></div>
            </div>
          </div>

          {/* Service Description */}
          {selectedForm.service_description && (
            <div className="mt-4">
              <h4 className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Service Description</h4>
              <p className="text-sm text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-800 rounded p-3">{selectedForm.service_description}</p>
            </div>
          )}

          {/* Status Actions */}
          <div className="mt-4">
            <h4 className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Update Status</h4>
            <div className="flex gap-2 flex-wrap">
              {(['new', 'contacted', 'converted', 'archived'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(selectedForm.id, s)}
                  disabled={selectedForm.status === s || saving}
                  className="px-3 py-1 rounded bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 text-xs disabled:opacity-30"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4">
            <h4 className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Notes</h4>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Add notes..."
              className="w-full border border-gray-200 dark:border-slate-700 rounded-md p-2 text-sm bg-white dark:bg-slate-800 dark:text-white resize-none h-24"
            />
            <button
              onClick={() => saveNotes(selectedForm.id)}
              disabled={saving || editNotes === (selectedForm.notes || '')}
              className="mt-2 px-3 py-1 rounded bg-cis-green text-white text-xs disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Notes'}
            </button>
          </div>

          {/* Tracking Info */}
          <div className="mt-4 border-t border-gray-200 dark:border-slate-700 pt-3">
            <h4 className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Tracking</h4>
            <div className="text-xs text-gray-400 space-y-1">
              <div>IP: {selectedForm.ip_address || '-'}</div>
              <div className="truncate">User-Agent: {selectedForm.user_agent || '-'}</div>
              <div>Submitted: {new Date(selectedForm.created_at).toLocaleString()}</div>
              <div>Updated: {new Date(selectedForm.updated_at).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
