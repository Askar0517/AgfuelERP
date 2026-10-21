import React, { useState } from 'react';
import { RolePermission, UserRole } from '../../types';
import {
  ShieldCheck,
  Check,
  X,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { ConfirmationModal } from '../common/ConfirmationModal';

interface PrivilegeMatrixPanelProps {
  permissions: RolePermission[];
  currentRole: UserRole;
  onUpdatePermission: (
    id: string,
    perms: { canCreate: boolean; canRead: boolean; canUpdate: boolean; canDelete: boolean }
  ) => Promise<void>;
}

export const PrivilegeMatrixPanel: React.FC<PrivilegeMatrixPanelProps> = ({
  permissions,
  currentRole,
  onUpdatePermission,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('MANAGER');
  const [editingPerms, setEditingPerms] = useState<RolePermission[]>(permissions);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pendingChange, setPendingChange] = useState<{
    id: string;
    field: 'canCreate' | 'canRead' | 'canUpdate' | 'canDelete';
    role: string;
    module: string;
    nextVal: boolean;
  } | null>(null);

  // Sync with prop updates
  React.useEffect(() => {
    setEditingPerms(permissions);
  }, [permissions]);

  const filteredPerms = editingPerms.filter((p) => p.role === selectedRole);

  const handleRequestToggle = (
    id: string,
    field: 'canCreate' | 'canRead' | 'canUpdate' | 'canDelete'
  ) => {
    const target = editingPerms.find((p) => p.id === id);
    if (!target) return;
    setPendingChange({
      id,
      field,
      role: target.role,
      module: target.module,
      nextVal: !target[field],
    });
  };

  const handleConfirmToggle = async () => {
    if (!pendingChange) return;
    const { id, field, role, module, nextVal } = pendingChange;
    const target = editingPerms.find((p) => p.id === id);
    if (!target) return;

    const updated = {
      ...target,
      [field]: nextVal,
    };

    setEditingPerms((prev) => prev.map((p) => (p.id === id ? updated : p)));

    try {
      await onUpdatePermission(id, {
        canCreate: updated.canCreate,
        canRead: updated.canRead,
        canUpdate: updated.canUpdate,
        canDelete: updated.canDelete,
      });
      setSuccessMsg(`Updated ${field.replace('can', '')} privilege for ${role} on ${module}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Failed to update permission:', err);
    } finally {
      setPendingChange(null);
    }
  };

  const isOwner = currentRole === 'OWNER';

  return (
    <div className="space-y-6 pb-12 sm:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-5 shadow-2xs dark:shadow-sm transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Enterprise Access Control
            </span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Role-Based Access Control (RBAC) Matrix
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            PostgreSQL security policies & granular module-level authorization rules
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/90 px-3 py-1.5 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-sans">Active Persona:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{currentRole}</span>
          {!isOwner && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">(Read-Only)</span>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Role Switcher Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-gray-800 pb-3">
        {(['MANAGER', 'ATTENDANT', 'CASHIER', 'AUDITOR', 'OWNER'] as UserRole[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setSelectedRole(r)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition whitespace-nowrap ${
              selectedRole === r
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-gray-700'
            }`}
          >
            {r === 'OWNER' ? 'OWNER (Super Admin)' : r}
          </button>
        ))}
      </div>

      {/* RBAC Matrix Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-5 shadow-xs transition">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3 mb-4">
          <div>
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Privilege Grants for {selectedRole}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-gray-400">
              Toggle specific CRUD actions. OWNER persona holds master bypass authority.
            </p>
          </div>

          {!isOwner && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <Lock className="h-3.5 w-3.5" />
              <span>Owner authority required to edit</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="py-3 px-4">Forecourt Module</th>
                <th className="py-3 px-4 text-center">CREATE (Insert)</th>
                <th className="py-3 px-4 text-center">READ (Query)</th>
                <th className="py-3 px-4 text-center">UPDATE (Modify)</th>
                <th className="py-3 px-4 text-center">DELETE (Archive)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
              {filteredPerms.map((perm) => (
                <tr key={perm.id} className="hover:bg-slate-50 dark:hover:bg-gray-800/40 transition">
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 dark:text-white block">{perm.module}</span>
                    <span className="text-[11px] text-slate-500 dark:text-gray-400">
                      {perm.module === 'TANKS' && 'Underground storage tanks, dip rods & tanker decanting'}
                      {perm.module === 'METERS' && 'Dispenser electronic/mechanical totalizer logs'}
                      {perm.module === 'SHIFTS' && 'Cash handover, denominations & attendant shifts'}
                      {perm.module === 'EOD' && 'Automated midnight financial day closure & ledger lock'}
                      {perm.module === 'PRICING' && 'Fuel unit rates per liter & tax revisions'}
                      {perm.module === 'ROSTER' && 'Staff shift scheduling & duty rosters'}
                      {perm.module === 'PERMISSIONS' && 'RBAC policy configuration matrix'}
                    </span>
                  </td>

                  {/* Create */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      disabled={!isOwner}
                      onClick={() => handleRequestToggle(perm.id, 'canCreate')}
                      className={`h-7 w-7 rounded-lg inline-flex items-center justify-center transition ${
                        perm.canCreate
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-100 dark:bg-gray-800 text-slate-400 dark:text-gray-500'
                      } ${!isOwner ? 'cursor-not-allowed opacity-60' : 'hover:scale-105'}`}
                      title={isOwner ? 'Toggle create privilege' : 'Requires OWNER role'}
                    >
                      {perm.canCreate ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </button>
                  </td>

                  {/* Read */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      disabled={!isOwner}
                      onClick={() => handleRequestToggle(perm.id, 'canRead')}
                      className={`h-7 w-7 rounded-lg inline-flex items-center justify-center transition ${
                        perm.canRead
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-100 dark:bg-gray-800 text-slate-400 dark:text-gray-500'
                      } ${!isOwner ? 'cursor-not-allowed opacity-60' : 'hover:scale-105'}`}
                      title={isOwner ? 'Toggle read privilege' : 'Requires OWNER role'}
                    >
                      {perm.canRead ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </button>
                  </td>

                  {/* Update */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      disabled={!isOwner}
                      onClick={() => handleRequestToggle(perm.id, 'canUpdate')}
                      className={`h-7 w-7 rounded-lg inline-flex items-center justify-center transition ${
                        perm.canUpdate
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-100 dark:bg-gray-800 text-slate-400 dark:text-gray-500'
                      } ${!isOwner ? 'cursor-not-allowed opacity-60' : 'hover:scale-105'}`}
                      title={isOwner ? 'Toggle update privilege' : 'Requires OWNER role'}
                    >
                      {perm.canUpdate ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </button>
                  </td>

                  {/* Delete */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      disabled={!isOwner}
                      onClick={() => handleRequestToggle(perm.id, 'canDelete')}
                      className={`h-7 w-7 rounded-lg inline-flex items-center justify-center transition ${
                        perm.canDelete
                          ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                          : 'bg-slate-100 dark:bg-gray-800 text-slate-400 dark:text-gray-500'
                      } ${!isOwner ? 'cursor-not-allowed opacity-60' : 'hover:scale-105'}`}
                      title={isOwner ? 'Toggle delete privilege' : 'Requires OWNER role'}
                    >
                      {perm.canDelete ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog for Permission Changes */}
      <ConfirmationModal
        isOpen={!!pendingChange}
        onClose={() => setPendingChange(null)}
        onConfirm={handleConfirmToggle}
        title="Confirm Privilege Authorization Change"
        message={
          pendingChange ? (
            <div className="space-y-2 text-xs">
              <p>
                Are you sure you want to{' '}
                <strong className={pendingChange.nextVal ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                  {pendingChange.nextVal ? 'GRANT' : 'REVOKE'}
                </strong>{' '}
                the <strong className="font-semibold text-slate-900 dark:text-white">{pendingChange.field.replace('can', '').toUpperCase()}</strong> permission for role{' '}
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{pendingChange.role}</span> on module{' '}
                <span className="font-mono font-bold text-slate-900 dark:text-white">{pendingChange.module}</span>?
              </p>
              <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                This will immediately modify forecourt ERP authorization boundaries for all active users assigned to this role.
              </p>
            </div>
          ) : ''
        }
        confirmLabel={pendingChange?.nextVal ? 'Confirm & Grant' : 'Confirm & Revoke'}
        variant={pendingChange?.nextVal ? 'info' : 'warning'}
      />
    </div>
  );
};
