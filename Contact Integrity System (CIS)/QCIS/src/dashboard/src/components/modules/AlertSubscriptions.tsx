'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import * as api from '@/lib/api';

interface AlertSubscription {
  id: string;
  admin_user_id: string;
  name: string;
  filter_criteria: {
    priority?: string[];
    source?: string[];
    category?: string[];
    user_type?: string[];
  };
  channels: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'critical'];
const SOURCE_OPTIONS = ['enforcement', 'threshold', 'trend', 'leakage', 'sla'];
const CHANNEL_OPTIONS = ['dashboard', 'email', 'slack'];

export default function AlertSubscriptions() {
  const { auth } = useAuth();
  const [subscriptions, setSubscriptions] = useState<AlertSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPriorities, setFormPriorities] = useState<string[]>([]);
  const [formSources, setFormSources] = useState<string[]>([]);
  const [formChannels, setFormChannels] = useState<string[]>(['dashboard']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSubscriptions();
  }, [auth.token]);

  async function loadSubscriptions() {
    if (!auth.token) return;
    setLoading(true);
    try {
      const result = await api.getAlertSubscriptions(auth.token);
      setSubscriptions(result.data as AlertSubscription[]);
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!auth.token || !formName.trim()) return;
    setSaving(true);
    try {
      await api.createAlertSubscription(auth.token, {
        name: formName,
        filter_criteria: {
          ...(formPriorities.length > 0 ? { priority: formPriorities } : {}),
          ...(formSources.length > 0 ? { source: formSources } : {}),
        },
        channels: formChannels.length > 0 ? formChannels : ['dashboard'],
        enabled: true,
      });
      setFormName('');
      setFormPriorities([]);
      setFormSources([]);
      setFormChannels(['dashboard']);
      setShowCreate(false);
      loadSubscriptions();
    } catch (err) {
      console.error('Failed to create subscription:', err);
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(sub: AlertSubscription) {
    if (!auth.token) return;
    try {
      await api.updateAlertSubscription(auth.token, sub.id, { enabled: !sub.enabled });
      loadSubscriptions();
    } catch (err) {
      console.error('Failed to toggle subscription:', err);
    }
  }

  async function deleteSub(id: string) {
    if (!auth.token) return;
    try {
      await api.deleteAlertSubscription(auth.token, id);
      loadSubscriptions();
    } catch (err) {
      console.error('Failed to delete subscription:', err);
    }
  }

  function toggleArrayItem(arr: string[], item: string): string[] {
    return arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item];
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-700">Alert Subscriptions</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-1 text-xs bg-cis-green text-white rounded hover:bg-cis-green/90 transition-colors"
        >
          {showCreate ? 'Cancel' : 'New Subscription'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-4 space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Name</label>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Critical alerts only"
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Priority Filter (optional)</label>
            <div className="flex gap-2 flex-wrap">
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => setFormPriorities(toggleArrayItem(formPriorities, p))}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    formPriorities.includes(p) ? 'bg-cis-green text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Source Filter (optional)</label>
            <div className="flex gap-2 flex-wrap">
              {SOURCE_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setFormSources(toggleArrayItem(formSources, s))}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    formSources.includes(s) ? 'bg-cis-green text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Channels</label>
            <div className="flex gap-2 flex-wrap">
              {CHANNEL_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setFormChannels(toggleArrayItem(formChannels, c))}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    formChannels.includes(c) ? 'bg-cis-green text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={!formName.trim() || saving}
            className="px-4 py-1.5 text-xs bg-cis-green text-white rounded-md hover:bg-cis-green/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Creating...' : 'Create Subscription'}
          </button>
        </div>
      )}

      {/* Subscription list */}
      {loading ? (
        <div className="text-gray-400 text-xs text-center py-4">Loading subscriptions...</div>
      ) : subscriptions.length === 0 ? (
        <div className="text-gray-400 text-xs text-center py-4">No subscriptions configured.</div>
      ) : (
        <div className="space-y-2">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${sub.enabled ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                    {sub.name}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${sub.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {sub.enabled ? 'active' : 'paused'}
                  </span>
                </div>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {sub.filter_criteria.priority?.map((p) => (
                    <span key={p} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{p}</span>
                  ))}
                  {sub.filter_criteria.source?.map((s) => (
                    <span key={s} className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">{s}</span>
                  ))}
                  {sub.channels.map((c) => (
                    <span key={c} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{c}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 ml-3">
                <button
                  onClick={() => toggleEnabled(sub)}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                >
                  {sub.enabled ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={() => deleteSub(sub.id)}
                  className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
