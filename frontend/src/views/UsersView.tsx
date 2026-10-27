import React, { useState, useEffect, useMemo } from 'react';
import {
  Station,
  Employee,
  UserRole,
  RoleDefinition,
} from '../types';
import {
  Users,
  Plus,
  Search,
  ShieldCheck,
  Shield,
  Building2,
  Clock,
  Edit2,
  Eye,
  CheckCircle2,
  Filter,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  RotateCcw,
  X,
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { UserFormPage } from '../components/users/UserFormPage';
import { UserDetailsPage } from '../components/users/UserDetailsPage';
import { SelectDropdown } from '../components/common/SelectDropdown';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import {
  SYSTEM_ROLES,
  resolveUserPermissions,
  summarizePermissions,
} from '../utils/rolesAndPermissions';
import { api } from '../api/client';

export type UserViewMode = 'LIST' | 'ADD' | 'EDIT' | 'VIEW';

interface UsersViewProps {
  stations: Station[];
  employees: Employee[];
  currentRole: UserRole;
  currentStationId: string;
  onCreateUser: (payload: any) => Promise<void>;
  onUpdateUser: (id: string, payload: any) => Promise<void>;
  onUpdateUserStatus: (id: string, status: string) => Promise<void>;
}

export const UsersView: React.FC<UsersViewProps> = ({
  stations,
  employees,
  currentRole,
  currentStationId,
  onCreateUser,
  onUpdateUser,
  onUpdateUserStatus,
}) => {
  const { notifySuccess, notifyError, notifyWarning } = useNotification();

  // Navigation / View Mode state (No modals/popups for Add/Edit!)
  const [viewMode, setViewMode] = useState<UserViewMode>('LIST');
  const [selectedUser, setSelectedUser] = useState<Employee | null>(null);

  // Authoritative roles fetched from backend
  const [availableRoles, setAvailableRoles] = useState<RoleDefinition[]>(SYSTEM_ROLES);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [bunkFilter, setBunkFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Confirmation Modal for Deactivation/Activation
  const [statusTargetEmployee, setStatusTargetEmployee] = useState<Employee | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const canManageUsers = currentRole === 'OWNER' || currentRole === 'MANAGER';
  const isSuperAdmin = currentRole === 'OWNER';

  // Fetch Authoritative Roles from Backend on Mount
  useEffect(() => {
    let isMounted = true;
    api
      .getRoles()
      .then((roles) => {
        if (isMounted && Array.isArray(roles) && roles.length > 0) {
          setAvailableRoles(roles);
        }
      })
      .catch(() => {
        // Fall back to SYSTEM_ROLES defaults
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter accessible employees based on persona
  const accessibleEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (isSuperAdmin) return true;
      if (currentRole === 'MANAGER') {
        // Bunk Manager can view staff assigned to their station, but cannot manage Super Admin
        let bunksArr: string[] = [];
        try {
          if (e.assignedBunks?.startsWith('[')) bunksArr = JSON.parse(e.assignedBunks);
          else if (e.assignedBunks) bunksArr = e.assignedBunks.split(',').map((s) => s.trim());
        } catch {
          bunksArr = [e.stationId];
        }
        const matchesStation = e.stationId === currentStationId || bunksArr.includes(currentStationId);
        return matchesStation && e.role !== 'OWNER';
      }
      return false;
    });
  }, [employees, isSuperAdmin, currentRole, currentStationId]);

  // Filter based on search & filter controls
  const filteredEmployees = useMemo(() => {
    return accessibleEmployees.filter((e) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm.trim() ||
        e.name.toLowerCase().includes(q) ||
        (e.email || '').toLowerCase().includes(q) ||
        (e.username || '').toLowerCase().includes(q) ||
        (e.phone || '').includes(q) ||
        e.id.toLowerCase().includes(q);

      const matchesRole = roleFilter === 'ALL' || e.role === roleFilter;

      let bunksArr: string[] = [];
      try {
        if (e.assignedBunks?.startsWith('[')) bunksArr = JSON.parse(e.assignedBunks);
        else if (e.assignedBunks) bunksArr = e.assignedBunks.split(',').map((s) => s.trim());
      } catch {
        bunksArr = [e.stationId];
      }
      const matchesBunk =
        bunkFilter === 'ALL' || e.stationId === bunkFilter || bunksArr.includes(bunkFilter);

      const userStatus = e.status || (e.isActive ? 'ACTIVE' : 'INACTIVE');
      const matchesStatus = statusFilter === 'ALL' || userStatus === statusFilter;

      return matchesSearch && matchesRole && matchesBunk && matchesStatus;
    });
  }, [accessibleEmployees, searchTerm, roleFilter, bunkFilter, statusFilter]);

  // Paginated records
  const totalPages = Math.ceil(filteredEmployees.length / pageSize) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, bunkFilter, statusFilter]);

  // Full-Page Navigation Handlers
  const handleOpenAddPage = () => {
    setSelectedUser(null);
    setViewMode('ADD');
  };

  const handleOpenEditPage = (emp: Employee) => {
    setSelectedUser(emp);
    setViewMode('EDIT');
  };

  const handleOpenViewPage = (emp: Employee) => {
    setSelectedUser(emp);
    setViewMode('VIEW');
  };

  const handleCancelForm = () => {
    setSelectedUser(null);
    setViewMode('LIST');
  };

  const handleSaveUser = async (payload: any, userId?: string) => {
    if (viewMode === 'EDIT' && userId) {
      await onUpdateUser(userId, payload);
      notifySuccess('User Updated', `Account details and permissions for "${payload.name}" updated successfully.`);
    } else {
      await onCreateUser(payload);
      notifySuccess('User Created', `User account "${payload.name}" (${payload.role}) created successfully.`);
    }
    // Return to the user grid
    setViewMode('LIST');
    setSelectedUser(null);
  };

  const handleConfirmToggleStatus = async () => {
    if (!statusTargetEmployee) return;
    const targetStatus =
      statusTargetEmployee.status === 'INACTIVE' || statusTargetEmployee.isActive === false
        ? 'ACTIVE'
        : 'INACTIVE';

    setIsUpdatingStatus(true);
    try {
      await onUpdateUserStatus(statusTargetEmployee.id, targetStatus);
      notifyWarning(
        'Account Status Changed',
        `User "${statusTargetEmployee.name}" has been marked as ${targetStatus}. Historical operational records are preserved.`
      );
      setStatusTargetEmployee(null);
    } catch (err: any) {
      notifyError('Status Update Failed', err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getRoleBadge = (userRole: UserRole) => {
    switch (userRole) {
      case 'OWNER':
        return {
          label: 'Super Admin',
          bg: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        };
      case 'MANAGER':
        return {
          label: 'Bunk Manager',
          bg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        };
      case 'ATTENDANT':
        return {
          label: 'Staff / Operator',
          bg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case 'CASHIER':
        return {
          label: 'Cashier',
          bg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      case 'AUDITOR':
        return {
          label: 'Auditor',
          bg: 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
        };
      default:
        return {
          label: userRole,
          bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };
    }
  };

  // Filter options for dropdowns
  const roleFilterOptions = [
    { value: 'ALL', label: 'All Roles' },
    { value: 'OWNER', label: 'Super Admin (Owner)' },
    { value: 'MANAGER', label: 'Bunk Manager' },
    { value: 'ATTENDANT', label: 'Staff / Operator' },
    { value: 'CASHIER', label: 'Cashier' },
    { value: 'AUDITOR', label: 'Auditor' },
  ];

  const bunkFilterOptions = [
    { value: 'ALL', label: 'All Forecourt Bunks' },
    ...stations.map((s) => ({
      value: s.id,
      label: `${s.name} (${s.code})`,
      badge: s.code,
    })),
  ];

  const statusFilterOptions = [
    { value: 'ALL', label: 'All Account Statuses' },
    { value: 'ACTIVE', label: 'Active Only' },
    { value: 'INACTIVE', label: 'Inactive / Suspended' },
    { value: 'PENDING', label: 'Pending Activation' },
  ];

  // If in Add or Edit full-page form mode, render the dedicated full-page form!
  if (viewMode === 'ADD' || viewMode === 'EDIT') {
    return (
      <UserFormPage
        mode={viewMode}
        initialUser={selectedUser}
        stations={stations}
        availableRoles={availableRoles}
        currentRole={currentRole}
        currentStationId={currentStationId}
        onSave={handleSaveUser}
        onCancel={handleCancelForm}
      />
    );
  }

  // If in View full-page details mode, render the dedicated inspect view!
  if (viewMode === 'VIEW' && selectedUser) {
    return (
      <UserDetailsPage
        user={selectedUser}
        stations={stations}
        currentRole={currentRole}
        onEdit={() => handleOpenEditPage(selectedUser)}
        onBack={() => {
          setSelectedUser(null);
          setViewMode('LIST');
        }}
        onToggleStatus={() => setStatusTargetEmployee(selectedUser)}
      />
    );
  }

  // Default view: Full User Grid / Table
  return (
    <div className="space-y-3.5 animate-fadeIn pb-12">
      {/* Breadcrumb Navigation & Action Bar */}
      <Breadcrumbs
        items={[
          { label: 'Management' },
          { label: 'Users', isCurrent: true, icon: Users },
        ]}
        actions={
          canManageUsers && (
            <button
              type="button"
              onClick={handleOpenAddPage}
              className="px-4 py-2 rounded-xl bg-[#12544F] hover:bg-[#0E433F] text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs transition shrink-0 self-start sm:self-center"
            >
              <Plus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          )
        }
      />

      {/* Filter and Search Bar using polished dropdowns */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0D2926] border border-slate-200 dark:border-[#194C47] shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 text-xs">
          {/* Search Box */}
          <div className="col-span-12 sm:col-span-6 lg:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Search Users
            </label>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-[38px] min-h-[38px] pl-9 pr-8 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-[#194C47] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-[#12544F]/30 focus:border-[#12544F] text-xs transition-all shadow-2xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Role Filter */}
          <div className="col-span-6 sm:col-span-3 lg:col-span-3">
            <SelectDropdown
              label="Filter by Role"
              options={roleFilterOptions}
              value={roleFilter}
              onChange={(val) => setRoleFilter(val)}
              searchable={false}
            />
          </div>

          {/* Bunk Station Filter */}
          <div className="col-span-6 sm:col-span-3 lg:col-span-3">
            <SelectDropdown
              label="Filter by Assigned Station"
              options={bunkFilterOptions}
              value={bunkFilter}
              onChange={(val) => setBunkFilter(val)}
              searchable={stations.length > 4}
            />
          </div>

          {/* Status Filter */}
          <div className="col-span-12 sm:col-span-6 lg:col-span-2">
            <SelectDropdown
              label="Filter by Status"
              options={statusFilterOptions}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              searchable={false}
            />
          </div>
        </div>

        {/* Filter Summary & Quick Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-[#194C47]/50 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">
              Showing <strong className="text-slate-900 dark:text-slate-100 font-bold">{filteredEmployees.length}</strong> of{' '}
              {accessibleEmployees.length} accessible user accounts
            </span>
            {(searchTerm || roleFilter !== 'ALL' || bunkFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Filtered Active
              </span>
            )}
          </div>

          {(searchTerm || roleFilter !== 'ALL' || bunkFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('ALL');
                setBunkFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-[#D4E8E5] dark:border-[#194C47] overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#EAF4F3] dark:bg-[#0A2623] text-[#0E3D38] dark:text-[#5EEAD4] uppercase tracking-wider font-bold text-[11px] border-b border-[#D4E8E5] dark:border-[#194C47]">
              <tr>
                <th className="px-4 py-3 min-w-[200px]">User & Identity</th>
                <th className="px-4 py-3 min-w-[140px]">Assigned Role</th>
                <th className="px-4 py-3 min-w-[160px]">Assigned Bunk(s)</th>
                <th className="px-4 py-3 min-w-[130px]">Status</th>
                <th className="px-4 py-3 min-w-[170px]">Privileges Summary</th>
                <th className="px-4 py-3 min-w-[120px]">Phone</th>
                <th className="px-4 py-3 text-right min-w-[160px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Users className="w-8 h-8 text-slate-400 stroke-1" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">No users found</p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        No user accounts matched your search terms or active filters. Try adjusting your search query or reset filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => {
                  const roleBadge = getRoleBadge(emp.role);
                  const isUserActive = emp.status === 'ACTIVE' || (emp.isActive && emp.status !== 'INACTIVE');
                  const canEditThisUser =
                    isSuperAdmin || (currentRole === 'MANAGER' && emp.role !== 'OWNER');

                  // Extract assigned bunks
                  let assignedBunkNames: string[] = [];
                  try {
                    if (emp.assignedBunks?.startsWith('[')) {
                      const ids: string[] = JSON.parse(emp.assignedBunks);
                      assignedBunkNames = ids.map((id) => stations.find((s) => s.id === id)?.name || id);
                    } else if (emp.stationId) {
                      const st = stations.find((s) => s.id === emp.stationId);
                      assignedBunkNames = [st ? st.name : emp.stationId];
                    }
                  } catch {
                    assignedBunkNames = [emp.stationId];
                  }

                  // Compute permission summary
                  const perms = resolveUserPermissions(emp.role, emp.customPermissions);
                  const permSummary = summarizePermissions(perms);
                  const hasCustomOverrides = Boolean(emp.customPermissions);

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Name & Identity */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          {emp.avatarUrl ? (
                            <img
                              src={emp.avatarUrl}
                              alt={emp.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                                const sibling = e.currentTarget.nextElementSibling as HTMLElement;
                                if (sibling) sibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div
                            className={`w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 shrink-0 ${
                              emp.avatarUrl ? 'hidden' : ''
                            }`}
                          >
                            {emp.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate">
                              {emp.name}
                            </span>
                            <span className="text-[11px] text-slate-400 block font-mono truncate">
                              {emp.email || emp.username || emp.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${roleBadge.bg}`}
                        >
                          {roleBadge.label}
                        </span>
                      </td>

                      {/* Assigned Bunk(s) */}
                      <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                        {emp.role === 'OWNER' ? (
                          <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            Universal (All Bunks)
                          </span>
                        ) : assignedBunkNames.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {assignedBunkNames.slice(0, 2).map((bName, i) => (
                              <span
                                key={i}
                                className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                              >
                                {bName}
                              </span>
                            ))}
                            {assignedBunkNames.length > 2 && (
                              <span className="text-[10px] text-slate-400 font-semibold">
                                +{assignedBunkNames.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
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
                          {isUserActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Permissions Summary */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                            {emp.role === 'OWNER'
                              ? 'Full Universal Access'
                              : `${permSummary.totalGrants} of ${permSummary.maxPossible} Privileges`}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {hasCustomOverrides ? (
                              <span className="text-[#12544F] dark:text-[#2BA096] font-medium">
                                • Custom CRUD Override
                              </span>
                            ) : (
                              '• Standard Role Defaults'
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Contact Phone */}
                      <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {emp.phone || '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Action */}
                          <button
                            type="button"
                            onClick={() => handleOpenViewPage(emp)}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#123733] cursor-pointer flex items-center gap-1 transition"
                            title="Inspect complete user details & permissions"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#12544F] dark:text-[#2BA096]" />
                            View
                          </button>

                          {/* Edit Action - switches to dedicated full-page form */}
                          {canEditThisUser && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditPage(emp)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-1 transition"
                              title="Edit user details and custom privileges"
                            >
                              <Edit2 className="w-3 h-3 text-slate-500" />
                              Edit
                            </button>
                          )}

                          {/* Activate / Deactivate Toggle */}
                          {canEditThisUser && (
                            <button
                              type="button"
                              onClick={() => setStatusTargetEmployee(emp)}
                              className={`px-2 py-1 text-[11px] rounded-lg font-semibold cursor-pointer transition ${
                                isUserActive
                                  ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              }`}
                              title={isUserActive ? 'Deactivate user account' : 'Reactivate user account'}
                            >
                              {isUserActive ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredEmployees.length > pageSize && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
            <div>
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, filteredEmployees.length)} of{' '}
              {filteredEmployees.length} users
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-semibold text-slate-700 dark:text-slate-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for User Status Toggle */}
      <ConfirmationModal
        isOpen={Boolean(statusTargetEmployee)}
        onClose={() => setStatusTargetEmployee(null)}
        onConfirm={handleConfirmToggleStatus}
        title={`Confirm User ${
          statusTargetEmployee?.status === 'INACTIVE' || statusTargetEmployee?.isActive === false
            ? 'Activation'
            : 'Deactivation'
        }`}
        message={
          <div>
            <p>
              Are you sure you want to{' '}
              <strong>
                {statusTargetEmployee?.status === 'INACTIVE' ||
                statusTargetEmployee?.isActive === false
                  ? 'activate'
                  : 'deactivate'}
              </strong>{' '}
              the user account for{' '}
              <strong className="text-slate-900 dark:text-slate-100">
                {statusTargetEmployee?.name}
              </strong>
              ?
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Operational records, past shift logs, cash settlement audits, and meter readings will remain completely preserved in the database.
            </p>
          </div>
        }
        variant={
          statusTargetEmployee?.status === 'INACTIVE' || statusTargetEmployee?.isActive === false
            ? 'info'
            : 'danger'
        }
        confirmLabel={
          statusTargetEmployee?.status === 'INACTIVE' || statusTargetEmployee?.isActive === false
            ? 'Activate Account'
            : 'Deactivate Account'
        }
        requiredText={
          statusTargetEmployee?.status === 'INACTIVE' || statusTargetEmployee?.isActive === false
            ? undefined
            : 'DEACTIVATE'
        }
        requiredTextPlaceholder="Type DEACTIVATE to confirm"
        isLoading={isUpdatingStatus}
      />
    </div>
  );
};
