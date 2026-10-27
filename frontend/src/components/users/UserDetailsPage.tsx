import React from 'react';
import { Employee, Station, UserRole } from '../../types';
import {
  Users,
  ArrowLeft,
  Edit2,
  Phone,
  Mail,
  Building2,
  Clock,
  Shield,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { UserPermissionMatrix } from './UserPermissionMatrix';
import { resolveUserPermissions, SYSTEM_ROLES } from '../../utils/rolesAndPermissions';
import { Breadcrumbs } from '../common/Breadcrumbs';

interface UserDetailsPageProps {
  user: Employee;
  stations: Station[];
  currentRole: UserRole;
  onEdit: () => void;
  onBack: () => void;
  onToggleStatus: () => void;
}

export const UserDetailsPage: React.FC<UserDetailsPageProps> = ({
  user,
  stations,
  currentRole,
  onEdit,
  onBack,
  onToggleStatus,
}) => {
  const isSuperAdmin = currentRole === 'OWNER';
  const canEdit = isSuperAdmin || (currentRole === 'MANAGER' && user.role !== 'OWNER');
  const permissions = resolveUserPermissions(user.role, user.customPermissions);
  const isUserActive = user.status === 'ACTIVE' || (user.isActive && user.status !== 'INACTIVE');

  // Parse bunks
  let assignedBunkNames: string[] = [];
  try {
    if (user.assignedBunks?.startsWith('[')) {
      const ids: string[] = JSON.parse(user.assignedBunks);
      assignedBunkNames = ids.map((id) => stations.find((s) => s.id === id)?.name || id);
    } else if (user.stationId) {
      const st = stations.find((s) => s.id === user.stationId);
      assignedBunkNames = [st ? st.name : user.stationId];
    }
  } catch {
    assignedBunkNames = [user.stationId];
  }

  const roleDef = SYSTEM_ROLES.find((r) => r.id === user.role);

  return (
    <div className="space-y-3.5 animate-fadeIn pb-12">
      {/* Standard Unified Breadcrumbs & Actions Header */}
      <Breadcrumbs
        items={[
          { label: 'Management' },
          { label: 'Users', onClick: onBack },
          { label: user.name, isCurrent: true },
        ]}
        badge={
          <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            ID: {user.id}
          </span>
        }
        actions={
          <div className="flex items-center gap-2 shrink-0">
            {canEdit && (
              <button
                type="button"
                onClick={onToggleStatus}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition ${
                  isUserActive
                    ? 'border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                    : 'border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
              >
                {isUserActive ? 'Deactivate User' : 'Activate User'}
              </button>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="px-4 py-1.5 rounded-xl bg-[#12544F] hover:bg-[#0E433F] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit User</span>
              </button>
            )}
          </div>
        }
      />

      {/* Profile Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Identity Tile */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex items-center gap-3">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-12 h-12 rounded-2xl object-cover border border-emerald-200 dark:border-emerald-800 shrink-0 shadow-xs"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                  const sibling = e.currentTarget.nextElementSibling as HTMLElement;
                  if (sibling) sibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={`w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-lg flex items-center justify-center shrink-0 ${
                user.avatarUrl ? 'hidden' : ''
              }`}
            >
              {user.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{user.name}</h3>
              <span className="text-xs text-slate-400 font-mono block">@{user.username || user.id}</span>
            </div>
          </div>

          <div className="space-y-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">{user.email || 'No email provided'}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-mono">{user.phone || 'No phone provided'}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{user.shiftSchedule || 'MORNING'} Shift</span>
            </div>
          </div>
        </div>

        {/* Role & Access Tile */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              Assigned Role
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${
                  roleDef?.badgeBg || 'bg-slate-100'
                } ${roleDef?.badgeText || 'text-slate-800 border-slate-200'}`}
              >
                <Shield className="w-3.5 h-3.5 mr-1.5" />
                {roleDef?.name || user.role}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {roleDef?.description || 'Forecourt system user'}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 block mb-1">
              Account Status
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                isUserActive
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                  isUserActive ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              {isUserActive ? 'Active (Operational)' : 'Inactive (Suspended)'}
            </span>
          </div>
        </div>

        {/* Assigned Stations Tile */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Forecourt Station Assignment
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {user.role === 'OWNER' ? (
                <span className="inline-flex px-2 py-1 rounded-md text-xs font-semibold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Universal Forecourt Access (All Bunks)
                </span>
              ) : assignedBunkNames.length > 0 ? (
                assignedBunkNames.map((name, i) => (
                  <span
                    key={i}
                    className="inline-flex px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                  >
                    {name}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 text-xs">No stations assigned</span>
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800">
            {user.lastLogin && (
              <div>Last Activity: {new Date(user.lastLogin).toLocaleString()}</div>
            )}
            {user.createdAt && (
              <div>Created: {new Date(user.createdAt).toLocaleDateString()}</div>
            )}
          </div>
        </div>
      </div>

      {/* Permission Matrix (Read-Only) */}
      <UserPermissionMatrix
        role={user.role}
        permissions={permissions}
        onChange={() => {}}
        disabled={true}
      />
    </div>
  );
};
