import React, { useState, useMemo } from 'react';
import { UserRole, PermissionMatrix, ModulePermission } from '../../types';
import {
  APP_MODULES,
  AppModuleInfo,
  getDefaultPermissionsForRole,
  summarizePermissions,
} from '../../utils/rolesAndPermissions';
import {
  ShieldCheck,
  RotateCcw,
  CheckSquare,
  Square,
  Eye,
  Check,
  Minus,
  Lock,
  Search,
  Sparkles,
  LayoutGrid,
  Building2,
  Users,
  Layers,
  Calculator,
  Smartphone,
  Clock,
  Bell,
  FileSpreadsheet,
  TrendingUp,
  Fuel,
  Disc,
  DollarSign,
  Settings,
  Sliders,
  FileText,
} from 'lucide-react';

interface UserPermissionMatrixProps {
  role: UserRole;
  permissions: PermissionMatrix;
  onChange: (updated: PermissionMatrix) => void;
  disabled?: boolean;
  isAdmin?: boolean;
}

// Map each module to a recognizable forecourt icon
const MODULE_ICONS: Record<string, React.ElementType> = {
  DASHBOARD: LayoutGrid,
  BUNKS: Building2,
  USERS: Users,
  SHIFTS: Layers,
  METERS: Calculator,
  POS: Smartphone,
  DAY_CLOSE: Clock,
  NOTIFICATIONS: Bell,
  DAILY_SALES: FileSpreadsheet,
  SALES_EFFICIENCY: TrendingUp,
  TANKS: Fuel,
  NOZZLES: Disc,
  PRICING: DollarSign,
  CONFIGURATION: Settings,
  AUDIT: ShieldCheck,
  REPORTS: FileText,
};

// Accessible custom permission checkbox meeting WCAG contrast & state requirements
interface AccessiblePermissionCheckboxProps {
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
  ariaLabel: string;
  action: 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete';
}

const AccessiblePermissionCheckbox: React.FC<AccessiblePermissionCheckboxProps> = ({
  checked,
  disabled,
  onChange,
  ariaLabel,
  action,
}) => {
  const isDelete = action === 'canDelete';

  let stateClasses = '';
  let icon = null;

  if (!disabled) {
    if (checked) {
      stateClasses = isDelete
        ? 'bg-rose-600 border-rose-600 text-white shadow-xs hover:bg-rose-700 hover:border-rose-700'
        : 'bg-[#12544F] border-[#12544F] text-white shadow-xs hover:bg-[#0E433F] hover:border-[#0E433F]';
      icon = <Check className="w-3.5 h-3.5 stroke-[3]" />;
    } else {
      stateClasses =
        'bg-white dark:bg-slate-900 border-[#D1D5DB] dark:border-slate-600 text-transparent hover:border-[#12544F] dark:hover:border-[#2BA096] hover:bg-[#FFF7EB]/30';
      icon = null;
    }
  } else {
    // Disabled states
    if (checked) {
      stateClasses = isDelete
        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700 text-rose-800 dark:text-rose-300'
        : 'bg-[#E6F0EF] dark:bg-[#123733]/60 border-[#12544F]/50 dark:border-[#2BA096]/60 text-[#0F3D39] dark:text-[#5EEAD4]';
      icon = <Check className="w-3.5 h-3.5 stroke-[2.75]" />;
    } else {
      stateClasses =
        'bg-[#F1F5F9] dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500';
      icon = <Minus className="w-2.5 h-2.5 stroke-[2] opacity-30" />;
    }
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      className={`relative w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-150 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#12544F]/50 focus-visible:ring-offset-1 select-none ${
        disabled ? 'cursor-not-allowed' : 'cursor-pointer'
      } ${stateClasses}`}
    >
      {icon}
    </button>
  );
};

export const UserPermissionMatrix: React.FC<UserPermissionMatrixProps> = ({
  role,
  permissions,
  onChange,
  disabled = false,
}) => {
  const summary = summarizePermissions(permissions);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Categories list
  const categoryNames = useMemo(() => {
    const set = new Set<string>();
    APP_MODULES.forEach((m) => set.add(m.category || 'General'));
    return Array.from(set);
  }, []);

  // Filter modules based on search query and category filter
  const filteredModules = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return APP_MODULES.filter((m) => {
      const matchesCategory = selectedCategory === 'ALL' || m.category === selectedCategory;
      const matchesQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [searchQuery, selectedCategory]);

  const handleCellToggle = (
    moduleId: string,
    action: 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete'
  ) => {
    if (disabled) return;
    const currentModule = permissions[moduleId] || {
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
    };
    const nextVal = !currentModule[action];

    const updated: PermissionMatrix = {
      ...permissions,
      [moduleId]: {
        ...currentModule,
        [action]: nextVal,
        // If Write, Update, or Delete is turned on, automatically ensure Read is on
        ...(nextVal && action !== 'canRead' ? { canRead: true } : {}),
      },
    };
    onChange(updated);
  };

  const handleRowToggle = (moduleId: string) => {
    if (disabled) return;
    const current = permissions[moduleId] || {
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
    };
    const allChecked =
      current.canRead && current.canCreate && current.canUpdate && current.canDelete;

    const nextState: ModulePermission = allChecked
      ? { canRead: false, canCreate: false, canUpdate: false, canDelete: false }
      : { canRead: true, canCreate: true, canUpdate: true, canDelete: true };

    onChange({
      ...permissions,
      [moduleId]: nextState,
    });
  };

  const handleColumnToggle = (action: 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete') => {
    if (disabled) return;
    const allChecked = filteredModules.every((m) => permissions[m.id]?.[action]);
    const nextVal = !allChecked;

    const nextMatrix = { ...permissions };
    for (const mod of filteredModules) {
      const current = nextMatrix[mod.id] || {
        canRead: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
      };
      nextMatrix[mod.id] = {
        ...current,
        [action]: nextVal,
        ...(nextVal && action !== 'canRead' ? { canRead: true } : {}),
      };
    }
    onChange(nextMatrix);
  };

  const handleResetToRoleDefaults = () => {
    if (disabled) return;
    const defaults = getDefaultPermissionsForRole(role);
    onChange(defaults);
  };

  const handleSelectAll = () => {
    if (disabled) return;
    const all: PermissionMatrix = {};
    for (const mod of APP_MODULES) {
      all[mod.id] = { canRead: true, canCreate: true, canUpdate: true, canDelete: true };
    }
    onChange(all);
  };

  const handleClearAll = () => {
    if (disabled) return;
    const none: PermissionMatrix = {};
    for (const mod of APP_MODULES) {
      none[mod.id] = { canRead: false, canCreate: false, canUpdate: false, canDelete: false };
    }
    onChange(none);
  };

  const handleReadOnlyPreset = () => {
    if (disabled) return;
    const readOnly: PermissionMatrix = {};
    for (const mod of APP_MODULES) {
      readOnly[mod.id] = { canRead: true, canCreate: false, canUpdate: false, canDelete: false };
    }
    onChange(readOnly);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xs">
      {/* Header & Role Context */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#12544F]/10 dark:bg-[#12544F]/30 text-[#12544F] dark:text-[#5EEAD4] border border-[#12544F]/25">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              User Access & Permission Matrix
            </h3>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#12544F]/10 dark:bg-[#12544F]/30 text-[#12544F] dark:text-[#A1DDD7] border border-[#12544F]/25">
              {summary.totalGrants} of {summary.maxPossible} Privileges Active
            </span>
            {disabled && (
              <span className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                <Lock className="w-3 h-3" />
                Read-Only View
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
            Granular Create, Read, Update, and Delete capabilities for all sidebar and forecourt operational modules. Checkboxes remain clearly distinguishable in both enabled and disabled states.
          </p>
        </div>

        {/* Quick Presets Toolbar */}
        {!disabled && (
          <div className="flex flex-wrap items-center gap-1.5 shrink-0 text-xs">
            <button
              type="button"
              onClick={handleResetToRoleDefaults}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#194C47] hover:bg-slate-50 dark:hover:bg-[#123733] text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer font-medium transition shadow-2xs"
              title="Reset matrix to standard defaults for this role"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              Role Defaults
            </button>

            <button
              type="button"
              onClick={handleReadOnlyPreset}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#194C47] hover:bg-slate-50 dark:hover:bg-[#123733] text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer font-medium transition shadow-2xs"
              title="Grant Read-Only permissions on all modules"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              Read Only
            </button>

            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3 py-1.5 rounded-xl bg-[#12544F]/10 dark:bg-[#12544F]/30 hover:bg-[#12544F]/20 border border-[#12544F]/30 text-[#12544F] dark:text-[#A1DDD7] flex items-center gap-1.5 cursor-pointer font-medium transition shadow-2xs"
              title="Grant full CRUD permissions across all modules"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              Grant All
            </button>

            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center gap-1 cursor-pointer font-medium transition"
              title="Revoke all privileges"
            >
              <Square className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Visual State Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#FFF7EB]/70 dark:bg-slate-800/50 border border-amber-200/60 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-[#12544F] dark:text-[#5EEAD4]" />
          Visual State Guide:
        </span>
        <div className="flex flex-wrap items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-md bg-[#12544F] border border-[#12544F] flex items-center justify-center text-white shadow-2xs">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
            <span>Enabled + Granted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-md bg-white dark:bg-slate-900 border border-[#D1D5DB] dark:border-slate-600" />
            <span>Enabled + Unchecked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-md bg-[#E6F0EF] dark:bg-[#123733]/60 border border-[#12544F]/50 flex items-center justify-center text-[#0F3D39] dark:text-[#5EEAD4]">
              <Check className="w-3 h-3 stroke-[2.75]" />
            </div>
            <span className="font-medium text-slate-800 dark:text-slate-200">Disabled + Granted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-md bg-[#F1F5F9] dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400">
              <Minus className="w-2.5 h-2.5 stroke-[2] opacity-30" />
            </div>
            <span>Disabled + Unchecked</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search module name or resource..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#12544F]/30"
          />
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer whitespace-nowrap text-[11px] ${
              selectedCategory === 'ALL'
                ? 'bg-[#12544F] text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Modules ({APP_MODULES.length})
          </button>
          {categoryNames.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer whitespace-nowrap text-[11px] ${
                selectedCategory === cat
                  ? 'bg-[#12544F] text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Single Unified Forecourt Permission Matrix Table (Reverted from accordion) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/90 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold text-[11px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 min-w-[240px]">Module & Forecourt Resource</th>
                <th className="py-3 px-3 text-center min-w-[85px]">
                  <div className="flex flex-col items-center">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Read</span>
                    {!disabled ? (
                      <button
                        type="button"
                        onClick={() => handleColumnToggle('canRead')}
                        className="text-[9px] text-[#12544F] dark:text-[#5EEAD4] hover:underline cursor-pointer"
                        title="Toggle Read for all visible modules"
                      >
                        Query/View
                      </button>
                    ) : (
                      <span className="text-[9px] font-normal text-slate-400">Query/View</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-3 text-center min-w-[85px]">
                  <div className="flex flex-col items-center">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Create</span>
                    {!disabled ? (
                      <button
                        type="button"
                        onClick={() => handleColumnToggle('canCreate')}
                        className="text-[9px] text-[#12544F] dark:text-[#5EEAD4] hover:underline cursor-pointer"
                        title="Toggle Create for all visible modules"
                      >
                        Insert/Add
                      </button>
                    ) : (
                      <span className="text-[9px] font-normal text-slate-400">Insert/Add</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-3 text-center min-w-[85px]">
                  <div className="flex flex-col items-center">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Update</span>
                    {!disabled ? (
                      <button
                        type="button"
                        onClick={() => handleColumnToggle('canUpdate')}
                        className="text-[9px] text-[#12544F] dark:text-[#5EEAD4] hover:underline cursor-pointer"
                        title="Toggle Update for all visible modules"
                      >
                        Edit/Modify
                      </button>
                    ) : (
                      <span className="text-[9px] font-normal text-slate-400">Edit/Modify</span>
                    )}
                  </div>
                </th>
                <th className="py-3 px-3 text-center min-w-[85px]">
                  <div className="flex flex-col items-center">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Delete</span>
                    {!disabled ? (
                      <button
                        type="button"
                        onClick={() => handleColumnToggle('canDelete')}
                        className="text-[9px] text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                        title="Toggle Delete for all visible modules"
                      >
                        Archive/Del
                      </button>
                    ) : (
                      <span className="text-[9px] font-normal text-slate-400">Archive/Del</span>
                    )}
                  </div>
                </th>
                {!disabled && (
                  <th className="py-3 px-3 text-center min-w-[70px]">
                    <span className="text-[10px] text-slate-400 uppercase">Row</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
              {filteredModules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500">
                    No matching modules found for "{searchQuery}".
                  </td>
                </tr>
              ) : (
                filteredModules.map((mod) => {
                  const perms = permissions[mod.id] || {
                    canRead: false,
                    canCreate: false,
                    canUpdate: false,
                    canDelete: false,
                  };
                  const allChecked =
                    perms.canRead && perms.canCreate && perms.canUpdate && perms.canDelete;
                  const Icon = MODULE_ICONS[mod.id] || LayoutGrid;

                  return (
                    <tr
                      key={mod.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Module Name, Category, Icon & Description */}
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0 mt-0.5">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {mod.name}
                              </span>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                {mod.category}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block line-clamp-1 leading-snug mt-0.5">
                              {mod.description}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Read Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center">
                          <AccessiblePermissionCheckbox
                            checked={Boolean(perms.canRead)}
                            disabled={disabled}
                            onChange={() => handleCellToggle(mod.id, 'canRead')}
                            ariaLabel={`Toggle Read for ${mod.name}`}
                            action="canRead"
                          />
                        </div>
                      </td>

                      {/* Create Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center">
                          <AccessiblePermissionCheckbox
                            checked={Boolean(perms.canCreate)}
                            disabled={disabled}
                            onChange={() => handleCellToggle(mod.id, 'canCreate')}
                            ariaLabel={`Toggle Create for ${mod.name}`}
                            action="canCreate"
                          />
                        </div>
                      </td>

                      {/* Update Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center">
                          <AccessiblePermissionCheckbox
                            checked={Boolean(perms.canUpdate)}
                            disabled={disabled}
                            onChange={() => handleCellToggle(mod.id, 'canUpdate')}
                            ariaLabel={`Toggle Update for ${mod.name}`}
                            action="canUpdate"
                          />
                        </div>
                      </td>

                      {/* Delete Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center">
                          <AccessiblePermissionCheckbox
                            checked={Boolean(perms.canDelete)}
                            disabled={disabled}
                            onChange={() => handleCellToggle(mod.id, 'canDelete')}
                            ariaLabel={`Toggle Delete for ${mod.name}`}
                            action="canDelete"
                          />
                        </div>
                      </td>

                      {/* Quick Row Toggle */}
                      {!disabled && (
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => handleRowToggle(mod.id)}
                              className={`p-1 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                                allChecked
                                  ? 'bg-[#12544F]/10 dark:bg-[#12544F]/30 text-[#12544F] dark:text-[#5EEAD4] hover:bg-[#12544F]/20'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                              }`}
                              title="Toggle all 4 permissions for this module"
                            >
                              {allChecked ? 'All ON' : 'Toggle'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info notice about custom permissions */}
      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
        <span>
          Custom permissions saved here override default role capabilities for this specific user.
        </span>
        <span className="font-mono text-slate-400">
          Role Base: <span className="font-bold text-slate-700 dark:text-slate-300">{role}</span>
        </span>
      </div>
    </div>
  );
};
