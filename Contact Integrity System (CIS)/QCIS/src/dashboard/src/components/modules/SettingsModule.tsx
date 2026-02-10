'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth, hasPermission } from '@/lib/auth';
import * as api from '@/lib/api';
import type { AdminUserData, RoleData, PermissionData } from '@/lib/api';

// ─── Role badge colors ───────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-800',
  trust_safety: 'bg-green-100 text-green-800',
  ops: 'bg-blue-100 text-blue-800',
  legal_compliance: 'bg-amber-100 text-amber-800',
  trust_safety_analyst: 'bg-teal-100 text-teal-800',
  enforcement_officer: 'bg-red-100 text-red-800',
  risk_intelligence: 'bg-indigo-100 text-indigo-800',
  ops_monitor: 'bg-cyan-100 text-cyan-800',
  auditor: 'bg-gray-100 text-gray-800',
  custom: 'bg-orange-100 text-orange-800',
};

const ROLE_OPTIONS = [
  'super_admin', 'trust_safety', 'ops', 'legal_compliance',
  'trust_safety_analyst', 'enforcement_officer', 'risk_intelligence',
  'ops_monitor', 'auditor', 'custom',
];

type ModalType = 'create' | 'edit' | 'reset' | 'roles' | null;

export default function SettingsModule() {
  const { auth } = useAuth();
  const token = auth.token!;
  const canManage = hasPermission(auth.user, 'settings.manage_admins');

  const [admins, setAdmins] = useState<AdminUserData[]>([]);
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalType>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUserData | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('trust_safety_analyst');
  const [formForcePassword, setFormForcePassword] = useState(true);
  const [formOverrides, setFormOverrides] = useState<Array<{ permission: string; granted: boolean }>>([]);
  const [formActive, setFormActive] = useState(true);
  const [overridesExpanded, setOverridesExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [adminResult, roleResult] = await Promise.all([
        canManage ? api.getAdminUsers(token) : Promise.resolve({ data: [] }),
        api.getAdminRoles(token),
      ]);
      setAdmins(adminResult.data);
      setRoles(roleResult.data.roles);
      setAllPermissions(roleResult.data.permissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [token, canManage]);

  useEffect(() => { loadData(); }, [loadData]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // ─── Create sub-admin ──────────────────────────────────────────
  const handleCreate = async () => {
    setSubmitting(true);
    setError('');
    try {
      await api.createAdminUser(token, {
        email: formEmail,
        name: formName,
        password: formPassword,
        role: formRole,
        force_password_change: formForcePassword,
        permission_overrides: formOverrides.length > 0 ? formOverrides : undefined,
      });
      setModal(null);
      resetForm();
      showSuccess('Admin created successfully');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create admin');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Update admin ─────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!selectedAdmin) return;
    setSubmitting(true);
    setError('');
    try {
      await api.updateAdminUser(token, selectedAdmin.id, {
        name: formName,
        role: formRole,
        active: formActive,
        permission_overrides: formOverrides,
      });
      setModal(null);
      setSelectedAdmin(null);
      resetForm();
      showSuccess('Admin updated successfully');
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update admin');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Reset password ───────────────────────────────────────────
  const handleResetPassword = async () => {
    if (!selectedAdmin) return;
    setSubmitting(true);
    setError('');
    try {
      await api.resetAdminPassword(token, selectedAdmin.id, formPassword);
      setModal(null);
      setSelectedAdmin(null);
      resetForm();
      showSuccess('Password reset successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Suspend/Reactivate admin ─────────────────────────────────
  const handleToggleActive = async (admin: AdminUserData) => {
    try {
      await api.updateAdminUser(token, admin.id, { active: !admin.active });
      showSuccess(admin.active ? 'Admin suspended' : 'Admin reactivated');
      setConfirmSuspend(false);
      setSelectedAdmin(null);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update admin');
    }
  };

  const resetForm = () => {
    setFormName(''); setFormEmail(''); setFormPassword('');
    setFormRole('trust_safety_analyst'); setFormForcePassword(true);
    setFormOverrides([]); setFormActive(true); setOverridesExpanded(false);
    setError('');
  };

  const openEdit = (admin: AdminUserData) => {
    setSelectedAdmin(admin);
    setFormName(admin.name);
    setFormRole(admin.role);
    setFormActive(admin.active);
    setFormOverrides(admin.permission_overrides || []);
    setModal('edit');
  };

  const openReset = (admin: AdminUserData) => {
    setSelectedAdmin(admin);
    setFormPassword('');
    setModal('reset');
  };

  // ─── Permission override toggle ───────────────────────────────
  const toggleOverride = (permKey: string, granted: boolean) => {
    setFormOverrides((prev) => {
      const existing = prev.find((o) => o.permission === permKey);
      if (existing) {
        if (existing.granted === granted) {
          // Remove override
          return prev.filter((o) => o.permission !== permKey);
        }
        return prev.map((o) => o.permission === permKey ? { ...o, granted } : o);
      }
      return [...prev, { permission: permKey, granted }];
    });
  };

  // ─── Group permissions by category ────────────────────────────
  const permsByCategory = allPermissions.reduce<Record<string, PermissionData[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  // Get default permissions for selected role
  const selectedRolePerms = roles.find((r) => r.role === formRole)?.permissions || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cis-green" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Settings</h2>
          <p className="text-sm text-gray-500">Manage admin accounts, roles, and permissions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModal('roles')}
            className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Role Reference
          </button>
          {canManage && (
            <button
              onClick={() => { resetForm(); setModal('create'); }}
              className="px-3 py-2 text-sm bg-cis-green text-white rounded-md hover:opacity-90"
            >
              + Create Sub-Admin
            </button>
          )}
        </div>
      </div>

      {/* Success / Error Messages */}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
          {successMsg}
        </div>
      )}
      {error && !modal && (
        <div className="bg-cis-red-soft border border-cis-red text-cis-red px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Admin Table */}
      {canManage && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Last Login</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions (30d)</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{admin.name}</td>
                  <td className="px-4 py-3 text-gray-600">{admin.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${ROLE_COLORS[admin.role] || 'bg-gray-100 text-gray-800'}`}>
                      {admin.role.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${admin.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {admin.active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {admin.last_login_at ? new Date(admin.last_login_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{admin.action_count_30d || 0}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(admin.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(admin)} className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded">
                        Edit
                      </button>
                      <button onClick={() => openReset(admin)} className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded">
                        Reset Pwd
                      </button>
                      {admin.id !== auth.user?.id && (
                        <button
                          onClick={() => { setSelectedAdmin(admin); setConfirmSuspend(true); }}
                          className={`text-xs px-2 py-1 rounded ${admin.active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                        >
                          {admin.active ? 'Suspend' : 'Reactivate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {admins.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">No admin accounts found</div>
          )}
        </div>
      )}

      {/* ─── Confirm Suspend Dialog ──────────────────────────────── */}
      {confirmSuspend && selectedAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {selectedAdmin.active ? 'Suspend Admin?' : 'Reactivate Admin?'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {selectedAdmin.active
                ? `This will immediately revoke ${selectedAdmin.name}'s access to the CIS dashboard.`
                : `This will restore ${selectedAdmin.name}'s access to the CIS dashboard.`}
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setConfirmSuspend(false); setSelectedAdmin(null); }} className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={() => handleToggleActive(selectedAdmin)}
                className={`px-3 py-2 text-sm text-white rounded-md ${selectedAdmin.active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {selectedAdmin.active ? 'Suspend' : 'Reactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Create / Edit Modal ──────────────────────────────────── */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {modal === 'create' ? 'Create Sub-Admin' : `Edit Admin: ${selectedAdmin?.name}`}
            </h3>

            {error && (
              <div className="bg-cis-red-soft border border-cis-red text-cis-red px-3 py-2 rounded text-sm mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {modal === 'create' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-cis-green focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-cis-green focus:outline-none"
                />
              </div>

              {modal === 'create' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
                  <input
                    type="text"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-cis-green focus:outline-none"
                    placeholder="Min 8 characters"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-cis-green focus:outline-none"
                >
                  {ROLE_OPTIONS.filter((r) => r !== 'super_admin' || auth.user?.role === 'super_admin').map((r) => (
                    <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              {modal === 'create' && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formForcePassword}
                    onChange={(e) => setFormForcePassword(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Force password change on first login
                </label>
              )}

              {/* Permission Overrides */}
              <div>
                <button
                  onClick={() => setOverridesExpanded(!overridesExpanded)}
                  className="text-sm font-medium text-gray-700 flex items-center gap-1"
                >
                  <svg className={`w-3.5 h-3.5 transition-transform ${overridesExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  Permission Overrides ({formOverrides.length})
                </button>

                {overridesExpanded && (
                  <div className="mt-2 border border-gray-200 rounded-md p-3 max-h-60 overflow-y-auto space-y-3">
                    {Object.entries(permsByCategory).map(([category, perms]) => (
                      <div key={category}>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">{category}</div>
                        {perms.map((perm) => {
                          const isDefault = selectedRolePerms.includes(perm.key);
                          const override = formOverrides.find((o) => o.permission === perm.key);
                          return (
                            <div key={perm.key} className="flex items-center justify-between py-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs ${isDefault ? 'text-gray-800' : 'text-gray-500'}`}>
                                  {perm.label}
                                </span>
                                {perm.is_critical && (
                                  <span className="text-xs text-amber-600" title="Critical permission — grants sensitive action capability">!</span>
                                )}
                                {isDefault && <span className="text-xs text-green-600">(default)</span>}
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => toggleOverride(perm.key, true)}
                                  className={`text-xs px-1.5 py-0.5 rounded ${override?.granted === true ? 'bg-green-100 text-green-700 font-medium' : 'text-gray-400 hover:bg-gray-100'}`}
                                >
                                  Grant
                                </button>
                                <button
                                  onClick={() => toggleOverride(perm.key, false)}
                                  className={`text-xs px-1.5 py-0.5 rounded ${override?.granted === false ? 'bg-red-100 text-red-700 font-medium' : 'text-gray-400 hover:bg-gray-100'}`}
                                >
                                  Revoke
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => { setModal(null); setSelectedAdmin(null); resetForm(); }} className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={modal === 'create' ? handleCreate : handleUpdate}
                disabled={submitting || (modal === 'create' && (!formEmail || !formName || !formPassword))}
                className="px-3 py-2 text-sm bg-cis-green text-white rounded-md hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : (modal === 'create' ? 'Create Admin' : 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Reset Password Modal ─────────────────────────────────── */}
      {modal === 'reset' && selectedAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Reset Password</h3>
            <p className="text-sm text-gray-600 mb-4">
              Set a new temporary password for <strong>{selectedAdmin.name}</strong>. They will be required to change it on next login.
            </p>

            {error && (
              <div className="bg-cis-red-soft border border-cis-red text-cis-red px-3 py-2 rounded text-sm mb-4">
                {error}
              </div>
            )}

            <input
              type="text"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-cis-green focus:outline-none mb-4"
              placeholder="New temporary password (min 8 chars)"
            />

            <div className="flex gap-2 justify-end">
              <button onClick={() => { setModal(null); setSelectedAdmin(null); resetForm(); }} className="px-3 py-2 text-sm border rounded-md hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={submitting || formPassword.length < 8}
                className="px-3 py-2 text-sm bg-cis-green text-white rounded-md hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Role Reference Panel ─────────────────────────────────── */}
      {modal === 'roles' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Role Reference</h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {roles.map((role) => (
                <div key={role.role} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${ROLE_COLORS[role.role] || 'bg-gray-100 text-gray-800'}`}>
                      {role.role.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-500">{role.permissions.length} permissions</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.map((p) => {
                      const permDef = allPermissions.find((ap) => ap.key === p);
                      return (
                        <span
                          key={p}
                          className={`text-xs px-1.5 py-0.5 rounded ${permDef?.is_critical ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-50 text-gray-600'}`}
                          title={permDef?.description}
                        >
                          {p}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
