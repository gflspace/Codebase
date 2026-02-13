'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import {
  getAdminRules, getAdminRule, createAdminRule, updateAdminRule, deleteAdminRule,
  testAdminRule, getAdminRuleHistory, getAdminRuleMatches,
  DetectionRule, RuleMatchLog, RuleTestResult,
} from '@/lib/api';
import ConditionBuilder from './ConditionBuilder';

const RULE_TYPES = ['enforcement_trigger', 'alert_threshold', 'scoring_adjustment', 'detection'] as const;

const EVENT_TYPES = [
  'message.created', 'message.edited',
  'transaction.initiated', 'transaction.completed', 'transaction.failed',
  'booking.created', 'booking.updated', 'booking.completed', 'booking.cancelled', 'booking.no_show',
  'wallet.deposit', 'wallet.withdrawal', 'wallet.transfer',
  'provider.registered', 'provider.updated',
  'user.contact_field_changed', 'rating.submitted',
];

const ACTION_TYPES = [
  { value: 'create_enforcement', label: 'Create Enforcement' },
  { value: 'create_alert', label: 'Create Alert' },
  { value: 'adjust_score', label: 'Adjust Score' },
  { value: 'create_signal', label: 'Create Signal' },
];

interface RuleFormData {
  name: string;
  description: string;
  rule_type: string;
  trigger_event_types: string[];
  conditions: string;
  actions: Array<{ type: string; action_type?: string; priority?: string; delta?: number; signal_type?: string }>;
  priority: number;
  enabled: boolean;
  dry_run: boolean;
}

const EMPTY_FORM: RuleFormData = {
  name: '',
  description: '',
  rule_type: 'enforcement_trigger',
  trigger_event_types: [],
  conditions: '{\n  "all": [\n    { "field": "score", "operator": "gte", "value": 75 }\n  ]\n}',
  actions: [{ type: 'create_enforcement', action_type: 'temporary_restriction' }],
  priority: 100,
  enabled: true,
  dry_run: false,
};

export default function RulesEngine() {
  const { auth } = useAuth();
  const token = auth.token!;

  const [rules, setRules] = useState<DetectionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [selectedRule, setSelectedRule] = useState<DetectionRule | null>(null);
  const [ruleHistory, setRuleHistory] = useState<DetectionRule[]>([]);
  const [ruleMatches, setRuleMatches] = useState<RuleMatchLog[]>([]);
  const [testResult, setTestResult] = useState<RuleTestResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<string>('');
  const [filterEnabled, setFilterEnabled] = useState<string>('');

  // Form state
  const [form, setForm] = useState<RuleFormData>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (filterType) params.rule_type = filterType;
      if (filterEnabled) params.enabled = filterEnabled;
      const result = await getAdminRules(token, params);
      setRules(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  }, [token, filterType, filterEnabled]);

  useEffect(() => { loadRules(); }, [loadRules]);

  const openDetail = async (rule: DetectionRule) => {
    setSelectedRule(rule);
    setView('detail');
    setTestResult(null);
    try {
      const [histRes, matchRes] = await Promise.all([
        getAdminRuleHistory(token, rule.id),
        getAdminRuleMatches(token, rule.id),
      ]);
      setRuleHistory(histRes.data);
      setRuleMatches(matchRes.data);
    } catch {
      // Non-fatal
    }
  };

  const openEdit = (rule: DetectionRule) => {
    setSelectedRule(rule);
    setForm({
      name: rule.name,
      description: rule.description || '',
      rule_type: rule.rule_type,
      trigger_event_types: rule.trigger_event_types,
      conditions: JSON.stringify(rule.conditions, null, 2),
      actions: rule.actions as RuleFormData['actions'],
      priority: rule.priority,
      enabled: rule.enabled,
      dry_run: rule.dry_run,
    });
    setView('edit');
    setFormError(null);
  };

  const openCreate = () => {
    setSelectedRule(null);
    setForm({ ...EMPTY_FORM });
    setView('create');
    setFormError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);

    let parsedConditions: unknown;
    try {
      parsedConditions = JSON.parse(form.conditions);
    } catch {
      setFormError('Invalid JSON in conditions field');
      setSaving(false);
      return;
    }

    if (form.trigger_event_types.length === 0) {
      setFormError('At least one trigger event type is required');
      setSaving(false);
      return;
    }

    if (form.actions.length === 0) {
      setFormError('At least one action is required');
      setSaving(false);
      return;
    }

    const payload = {
      name: form.name,
      description: form.description || undefined,
      rule_type: form.rule_type,
      trigger_event_types: form.trigger_event_types,
      conditions: parsedConditions,
      actions: form.actions,
      priority: form.priority,
      enabled: form.enabled,
      dry_run: form.dry_run,
    };

    try {
      if (view === 'edit' && selectedRule) {
        await updateAdminRule(token, selectedRule.id, payload);
      } else {
        await createAdminRule(token, payload);
      }
      setView('list');
      loadRules();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Disable this rule?')) return;
    try {
      await deleteAdminRule(token, id);
      loadRules();
      if (view === 'detail') setView('list');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable rule');
    }
  };

  const handleTest = async (id: string) => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const result = await testAdminRule(token, id);
      setTestResult(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setTestLoading(false);
    }
  };

  const toggleEventType = (et: string) => {
    setForm((prev) => ({
      ...prev,
      trigger_event_types: prev.trigger_event_types.includes(et)
        ? prev.trigger_event_types.filter((t) => t !== et)
        : [...prev.trigger_event_types, et],
    }));
  };

  const updateAction = (index: number, field: string, value: unknown) => {
    setForm((prev) => {
      const actions = [...prev.actions];
      actions[index] = { ...actions[index], [field]: value };
      return { ...prev, actions };
    });
  };

  const addAction = () => {
    setForm((prev) => ({
      ...prev,
      actions: [...prev.actions, { type: 'create_alert', priority: 'medium' }],
    }));
  };

  const removeAction = (index: number) => {
    setForm((prev) => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index),
    }));
  };

  // ─── Status badge helper ────────────────────────────────────

  const statusBadge = (rule: DetectionRule) => {
    if (!rule.enabled) return <span className="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400">Disabled</span>;
    if (rule.dry_run) return <span className="px-2 py-0.5 text-xs rounded bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200">Dry Run</span>;
    return <span className="px-2 py-0.5 text-xs rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200">Active</span>;
  };

  const typeBadge = (type: string) => {
    const colors: Record<string, string> = {
      enforcement_trigger: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200',
      alert_threshold: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200',
      scoring_adjustment: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200',
      detection: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200',
    };
    return <span className={`px-2 py-0.5 text-xs rounded ${colors[type] || 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}`}>{type.replace('_', ' ')}</span>;
  };

  // ─── List View ──────────────────────────────────────────────

  if (view === 'list') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100">Rules Engine</h2>
          <button onClick={openCreate} className="px-4 py-2 text-sm bg-cis-green text-white rounded-md hover:bg-cis-green/90">
            Create Rule
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 dark:border-slate-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
          >
            <option value="">All Types</option>
            {RULE_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
          <select
            value={filterEnabled}
            onChange={(e) => setFilterEnabled(e.target.value)}
            className="border border-gray-300 dark:border-slate-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
          >
            <option value="">All Status</option>
            <option value="true">Enabled</option>
            <option value="false">Disabled</option>
          </select>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded mb-4 text-sm">{error}</div>}

        {loading ? (
          <div className="text-gray-500 dark:text-slate-400 text-sm">Loading rules...</div>
        ) : rules.length === 0 ? (
          <div className="text-gray-400 dark:text-slate-500 text-sm py-12 text-center">No rules configured. Create one to get started.</div>
        ) : (
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-slate-300">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Priority</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Version</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer" onClick={() => openDetail(rule)}>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-slate-100">{rule.name}</td>
                    <td className="px-4 py-3">{typeBadge(rule.rule_type)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{rule.priority}</td>
                    <td className="px-4 py-3">{statusBadge(rule)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-300">v{rule.version}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400">{new Date(rule.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEdit(rule)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs mr-3">Edit</button>
                      <button onClick={() => handleDelete(rule.id)} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-xs">Disable</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ─── Detail View ────────────────────────────────────────────

  if (view === 'detail' && selectedRule) {
    return (
      <div>
        <button onClick={() => setView('list')} className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 mb-4">&larr; Back to Rules</button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100">{selectedRule.name}</h2>
            <div className="flex gap-2 mt-1">{typeBadge(selectedRule.rule_type)} {statusBadge(selectedRule)}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleTest(selectedRule.id)} disabled={testLoading}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 text-gray-700 dark:text-slate-200">
              {testLoading ? 'Testing...' : 'Test Rule'}
            </button>
            <button onClick={() => openEdit(selectedRule)} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">Edit</button>
            <button onClick={() => handleDelete(selectedRule.id)} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">Disable</button>
          </div>
        </div>

        {/* Rule Details */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <h3 className="font-medium text-gray-700 dark:text-slate-200 mb-3">Details</h3>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-gray-500 dark:text-slate-400">Description</dt><dd className="text-gray-800 dark:text-slate-200">{selectedRule.description || 'None'}</dd></div>
              <div><dt className="text-gray-500 dark:text-slate-400">Priority</dt><dd className="text-gray-800 dark:text-slate-200">{selectedRule.priority}</dd></div>
              <div><dt className="text-gray-500 dark:text-slate-400">Version</dt><dd className="text-gray-800 dark:text-slate-200">v{selectedRule.version}</dd></div>
              <div><dt className="text-gray-500 dark:text-slate-400">Event Types</dt><dd className="text-gray-800 dark:text-slate-200">{selectedRule.trigger_event_types.join(', ')}</dd></div>
            </dl>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
            <h3 className="font-medium text-gray-700 dark:text-slate-200 mb-3">Conditions</h3>
            <pre className="text-xs bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200 p-3 rounded overflow-auto max-h-48">{JSON.stringify(selectedRule.conditions, null, 2)}</pre>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-700 dark:text-slate-200 mb-3">Actions</h3>
          <pre className="text-xs bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200 p-3 rounded overflow-auto max-h-32">{JSON.stringify(selectedRule.actions, null, 2)}</pre>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-700 dark:text-slate-200 mb-3">Test Result</h3>
            <p className="text-sm text-gray-600 dark:text-slate-300 mb-2">Matched {testResult.matches} out of {testResult.total} recent users.</p>
            {testResult.sample_matches.length > 0 && (
              <table className="w-full text-xs mt-2">
                <thead><tr className="text-gray-500 dark:text-slate-400"><th className="text-left py-1">User ID</th><th className="text-left py-1">Score</th><th className="text-left py-1">Tier</th></tr></thead>
                <tbody className="text-gray-800 dark:text-slate-200">{testResult.sample_matches.map((m, i) => (
                  <tr key={i}><td className="py-1 font-mono">{m.user_id.slice(0, 8)}...</td><td className="py-1">{m.score}</td><td className="py-1">{m.tier}</td></tr>
                ))}</tbody>
              </table>
            )}
          </div>
        )}

        {/* Version History */}
        {ruleHistory.length > 1 && (
          <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-700 dark:text-slate-200 mb-3">Version History</h3>
            <div className="space-y-2">
              {ruleHistory.map((v) => (
                <div key={v.id} className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-gray-500 dark:text-slate-400">v{v.version}</span>
                  <span className="text-gray-800 dark:text-slate-200">{v.name}</span>
                  {statusBadge(v)}
                  <span className="text-gray-400 dark:text-slate-500 text-xs">{new Date(v.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Matches */}
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
          <h3 className="font-medium text-gray-700 dark:text-slate-200 mb-3">Recent Matches ({ruleMatches.length})</h3>
          {ruleMatches.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500">No matches yet.</p>
          ) : (
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 dark:text-slate-400"><th className="text-left py-1">Time</th><th className="text-left py-1">User</th><th className="text-left py-1">Event</th><th className="text-left py-1">Matched</th><th className="text-left py-1">Dry Run</th></tr></thead>
              <tbody className="text-gray-800 dark:text-slate-200">{ruleMatches.slice(0, 20).map((m) => (
                <tr key={m.id} className="border-t border-gray-50 dark:border-slate-700">
                  <td className="py-1.5">{new Date(m.created_at).toLocaleString()}</td>
                  <td className="py-1.5 font-mono">{m.user_id.slice(0, 8)}...</td>
                  <td className="py-1.5">{m.event_type}</td>
                  <td className="py-1.5">{m.matched ? 'Yes' : 'No'}</td>
                  <td className="py-1.5">{m.dry_run ? 'Yes' : 'No'}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // ─── Create/Edit Form ───────────────────────────────────────

  return (
    <div>
      <button onClick={() => setView('list')} className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 mb-4">&larr; Back to Rules</button>

      <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100 mb-6">
        {view === 'edit' ? `Edit Rule: ${selectedRule?.name}` : 'Create New Rule'}
      </h2>

      {formError && <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded mb-4 text-sm">{formError}</div>}

      <div className="space-y-5 max-w-3xl">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Name</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100" placeholder="e.g., High score enforcement" />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100" rows={2} placeholder="What this rule does..." />
        </div>

        {/* Rule Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Rule Type</label>
          <select value={form.rule_type} onChange={(e) => setForm({ ...form, rule_type: e.target.value })}
            className="border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100">
            {RULE_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
        </div>

        {/* Event Types */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Trigger Event Types</label>
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map((et) => (
              <button key={et} type="button" onClick={() => toggleEventType(et)}
                className={`px-2 py-1 text-xs rounded border ${
                  form.trigger_event_types.includes(et) ? 'bg-cis-green text-white border-cis-green' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500'
                }`}>{et}</button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Priority (lower = evaluated first)</label>
          <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 100 })}
            className="w-32 border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100" min={0} max={1000} />
        </div>

        {/* Conditions (Visual Builder) */}
        <ConditionBuilder
          value={form.conditions}
          onChange={(json) => setForm({ ...form, conditions: json })}
        />

        {/* Actions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Actions</label>
          <div className="space-y-3">
            {form.actions.map((action, i) => (
              <div key={i} className="flex items-start gap-3 p-3 border border-gray-200 dark:border-slate-600 rounded-md bg-gray-50 dark:bg-slate-800/50">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 dark:text-slate-400 w-16">Type:</label>
                    <select
                      value={action.type}
                      onChange={(e) => updateAction(i, 'type', e.target.value)}
                      className="flex-1 border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                    >
                      {ACTION_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                    </select>
                  </div>

                  {action.type === 'create_enforcement' && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 dark:text-slate-400 w-16">Action:</label>
                      <select
                        value={action.action_type || ''}
                        onChange={(e) => updateAction(i, 'action_type', e.target.value)}
                        className="flex-1 border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                      >
                        <option value="">Select action type...</option>
                        <option value="soft_warning">Soft Warning</option>
                        <option value="hard_warning">Hard Warning</option>
                        <option value="temporary_restriction">Temporary Restriction</option>
                        <option value="permanent_restriction">Permanent Restriction</option>
                        <option value="account_suspension">Account Suspension</option>
                      </select>
                    </div>
                  )}

                  {action.type === 'create_alert' && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 dark:text-slate-400 w-16">Priority:</label>
                      <select
                        value={action.priority || 'medium'}
                        onChange={(e) => updateAction(i, 'priority', e.target.value)}
                        className="flex-1 border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  )}

                  {action.type === 'adjust_score' && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 dark:text-slate-400 w-16">Delta:</label>
                      <input
                        type="number"
                        value={action.delta || 0}
                        onChange={(e) => updateAction(i, 'delta', parseFloat(e.target.value) || 0)}
                        className="flex-1 border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                        placeholder="e.g., 10 or -5"
                      />
                    </div>
                  )}

                  {action.type === 'create_signal' && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 dark:text-slate-400 w-16">Signal:</label>
                      <input
                        type="text"
                        value={action.signal_type || ''}
                        onChange={(e) => updateAction(i, 'signal_type', e.target.value)}
                        className="flex-1 border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                        placeholder="e.g., suspicious_pattern"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeAction(i)}
                  className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 mt-1"
                  title="Remove action"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addAction} className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">+ Add Action</button>
        </div>

        {/* Toggles */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="rounded border-gray-300 dark:border-slate-600" />
            Enabled
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
            <input type="checkbox" checked={form.dry_run} onChange={(e) => setForm({ ...form, dry_run: e.target.checked })} className="rounded border-gray-300 dark:border-slate-600" />
            Dry Run (log matches without executing)
          </label>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} disabled={saving || !form.name}
            className="px-6 py-2 bg-cis-green text-white rounded-md hover:bg-cis-green/90 disabled:opacity-50 text-sm">
            {saving ? 'Saving...' : (view === 'edit' ? 'Update Rule' : 'Create Rule')}
          </button>
          <button onClick={() => setView('list')} className="px-6 py-2 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 text-sm text-gray-700 dark:text-slate-200">Cancel</button>
        </div>
      </div>
    </div>
  );
}
