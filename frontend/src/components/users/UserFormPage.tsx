import React, { useState, useRef, useEffect } from 'react';
import {
  Station,
  Employee,
  UserRole,
  RoleDefinition,
  PermissionMatrix,
} from '../../types';
import {
  Users,
  ArrowLeft,
  Save,
  X,
  AlertCircle,
  Loader2,
  Building2,
  Shield,
  KeyRound,
  Clock,
} from 'lucide-react';
import { SelectDropdown } from '../common/SelectDropdown';
import { MultiSelectDropdown } from '../common/MultiSelectDropdown';
import { Breadcrumbs } from '../common/Breadcrumbs';
import { UserPermissionMatrix } from './UserPermissionMatrix';
import {
  SYSTEM_ROLES,
  getDefaultPermissionsForRole,
  resolveUserPermissions,
} from '../../utils/rolesAndPermissions';
import { validateUserForm, focusFirstInvalidField } from '../../utils/validation';

export interface UserFormPageProps {
  mode: 'ADD' | 'EDIT';
  initialUser?: Employee | null;
  stations: Station[];
  availableRoles: RoleDefinition[];
  currentRole: UserRole;
  currentStationId: string;
  onSave: (payload: any, userId?: string) => Promise<void>;
  onCancel: () => void;
}

const COUNTRY_PREFIX_OPTIONS = [
  { value: '+91', label: '+91 (India)' },
  { value: '+1', label: '+1 (USA/Canada)' },
  { value: '+44', label: '+44 (UK)' },
  { value: '+971', label: '+971 (UAE)' },
  { value: '+966', label: '+966 (Saudi Arabia)' },
  { value: '+65', label: '+65 (Singapore)' },
  { value: '+60', label: '+60 (Malaysia)' },
  { value: '+974', label: '+974 (Qatar)' },
  { value: '+968', label: '+968 (Oman)' },
  { value: '+965', label: '+965 (Kuwait)' },
  { value: '+973', label: '+973 (Bahrain)' },
];

const parseInitialPhone = (rawPhone?: string) => {
  if (!rawPhone) return { prefix: '+91', number: '' };
  const matched = rawPhone.trim().match(/^(\+\d{1,4})\s*(.*)$/);
  if (matched) {
    return { prefix: matched[1], number: matched[2].replace(/\D/g, '') };
  }
  return { prefix: '+91', number: rawPhone.replace(/\D/g, '') };
};

export const UserFormPage: React.FC<UserFormPageProps> = ({
  mode,
  initialUser,
  stations,
  availableRoles,
  currentRole,
  currentStationId,
  onSave,
  onCancel,
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const isSuperAdmin = currentRole === 'OWNER';

  // Parse initial assigned bunks
  const parseInitialBunks = (): string[] => {
    if (!initialUser) return [currentStationId || stations[0]?.id || 'st-101'];
    try {
      if (initialUser.assignedBunks?.startsWith('[')) {
        return JSON.parse(initialUser.assignedBunks);
      } else if (initialUser.assignedBunks) {
        return initialUser.assignedBunks.split(',').map((s) => s.trim());
      }
    } catch {
      // fallback
    }
    return [initialUser.stationId || currentStationId || stations[0]?.id || 'st-101'];
  };

  const initialPhoneData = parseInitialPhone(initialUser?.phone);

  // Form Fields State
  const [name, setName] = useState(initialUser?.name || '');
  const [email, setEmail] = useState(initialUser?.email || '');
  const [username, setUsername] = useState(initialUser?.username || '');
  const [phonePrefix, setPhonePrefix] = useState<string>(initialPhoneData.prefix);
  const [phoneNumber, setPhoneNumber] = useState<string>(initialPhoneData.number);
  const [pin, setPin] = useState<string>(mode === 'ADD' ? '1234' : '');
  const [role, setRole] = useState<UserRole>(initialUser?.role || 'ATTENDANT');
  const [status, setStatus] = useState<string>(
    initialUser?.status || (initialUser?.isActive === false ? 'INACTIVE' : 'ACTIVE')
  );
  const [shiftSchedule, setShiftSchedule] = useState<string>(
    initialUser?.shiftSchedule || 'MORNING'
  );
  const [assignedBunks, setAssignedBunks] = useState<string[]>(parseInitialBunks);
  const [primaryStationId, setPrimaryStationId] = useState<string>(
    initialUser?.stationId || currentStationId || stations[0]?.id || 'st-101'
  );
  const [sendInvite, setSendInvite] = useState(true);

  // Permission Matrix State
  const [permissions, setPermissions] = useState<PermissionMatrix>(() => {
    if (initialUser) {
      return resolveUserPermissions(initialUser.role, initialUser.customPermissions);
    }
    return getDefaultPermissionsForRole('ATTENDANT');
  });

  // When role changes, if user is creating a new user or explicitly switching role, update default permissions
  const prevRoleRef = useRef<UserRole>(role);
  useEffect(() => {
    if (prevRoleRef.current !== role) {
      prevRoleRef.current = role;
      if (mode === 'ADD' || !initialUser?.customPermissions) {
        setPermissions(getDefaultPermissionsForRole(role));
      }
    }
  }, [role, mode, initialUser?.customPermissions]);

  // Keep primaryStationId in sync with assigned bunks
  useEffect(() => {
    if (assignedBunks.length > 0 && !assignedBunks.includes(primaryStationId)) {
      setPrimaryStationId(assignedBunks[0]);
    }
  }, [assignedBunks, primaryStationId]);

  // Prepare Role dropdown options
  const roleOptions = (availableRoles.length > 0 ? availableRoles : SYSTEM_ROLES).map((r) => {
    const isAssignable = isSuperAdmin || r.assignableBy.includes(currentRole);
    return {
      value: r.id,
      label: r.name,
      description: r.description,
      badge: r.id === 'OWNER' ? 'Super Admin' : r.id,
      badgeClass: r.id === 'OWNER' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700',
      disabled: !isAssignable,
      disabledReason: !isAssignable
        ? 'Requires Super Admin (Owner) authority to assign this role'
        : undefined,
    };
  });

  // Prepare Bunk options
  const bunkOptions = stations.map((s) => ({
    value: s.id,
    label: s.name,
    description: `Station Code: ${s.code} • ${s.location || s.cityState || 'Active Forecourt'}`,
    badge: s.code,
  }));

  // Status options
  const statusOptions = [
    {
      value: 'ACTIVE',
      label: 'Active (Full Access)',
      description: 'Account is fully functional and can authenticate into forecourt systems.',
      badge: 'Active',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    {
      value: 'INACTIVE',
      label: 'Inactive (Suspended)',
      description: 'Login disabled; historical shifts and audit trails remain preserved.',
      badge: 'Inactive',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    },
    {
      value: 'PENDING',
      label: 'Pending Activation',
      description: 'Awaiting initial credential verification or email invite confirmation.',
      badge: 'Pending',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    },
  ];

  // Shift schedule options
  const shiftOptions = [
    {
      value: 'MORNING',
      label: 'Morning Shift (06:00 - 14:00)',
      description: 'Forecourt daylight peak refueling & morning tanker decanting.',
    },
    {
      value: 'EVENING',
      label: 'Evening Shift (14:00 - 22:00)',
      description: 'Afternoon & evening commuter forecourt dispensing.',
    },
    {
      value: 'NIGHT',
      label: 'Night Shift (22:00 - 06:00)',
      description: 'Overnight commercial fleet fueling & automated midnight EOD closure.',
    },
    {
      value: 'GENERAL',
      label: 'General Shift (09:00 - 18:00)',
      description: 'Station administration, auditor compliance & management hours.',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim();
    const cleanUsername = (username || '').trim();
    const cleanLocalNumber = (phoneNumber || '').trim().replace(/\D/g, '');
    const fullPhone = cleanLocalNumber ? `${phonePrefix} ${cleanLocalNumber}` : '';

    const validation = validateUserForm({
      name: cleanName,
      email: cleanEmail || undefined,
      username: cleanUsername || undefined,
      role,
      stationId: primaryStationId,
      phone: cleanLocalNumber,
      phonePrefix,
      pin: pin ? pin.trim() : undefined,
    });

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setTimeout(() => focusFirstInvalidField(formRef.current), 50);
      return;
    }

    if (assignedBunks.length === 0 && role !== 'OWNER') {
      setFieldErrors((prev) => ({
        ...prev,
        assignedBunks: 'Please assign at least one bunk station to this user.',
      }));
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});

    const payload = {
      name: cleanName,
      email: cleanEmail || undefined,
      username: cleanUsername || (cleanLocalNumber ? `staff_${cleanLocalNumber.slice(-4)}` : undefined),
      phone: fullPhone,
      pin: pin ? pin.trim() : (mode === 'ADD' ? '1234' : undefined),
      password: pin ? pin.trim() : (mode === 'ADD' ? '1234' : undefined),
      role,
      status,
      shiftSchedule,
      stationId: primaryStationId || assignedBunks[0] || 'st-101',
      assignedBunks,
      customPermissions: JSON.stringify(permissions),
      sendInvite: mode === 'ADD' && cleanEmail ? sendInvite : false,
    };

    try {
      await onSave(payload, initialUser?.id);
    } catch (err: any) {
      setFieldErrors({ form: err.message || 'Failed to save user account.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3.5 animate-fadeIn pb-12">
      {/* Standard Unified Breadcrumbs & Actions Header */}
      <Breadcrumbs
        items={[
          { label: 'Management' },
          { label: 'Users', onClick: onCancel },
          {
            label: mode === 'ADD' ? 'Add User' : `Edit User (${name || initialUser?.name || initialUser?.id || ''})`,
            isCurrent: true,
          },
        ]}
        actions={
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer transition shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#12544F] hover:bg-[#0E433F] text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 transition"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {mode === 'ADD' ? 'Save & Create User' : 'Update User Account'}
            </button>
          </div>
        }
      />

      {/* Main Form Body */}
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        {/* Global Error Banner */}
        {fieldErrors.form && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-3 text-xs font-medium">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <div>
              <strong className="block font-semibold">Error Saving User</strong>
              <span>{fieldErrors.form}</span>
            </div>
          </div>
        )}

        {/* Section 1: User Identity & Credentials */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#0D2926] border border-slate-200 dark:border-[#194C47] shadow-2xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#194C47] pb-3">
            <Users className="w-5 h-5 text-[#12544F] dark:text-[#2BA096]" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                1. User Identity & Account Information
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Primary user profile data, username, email credentials, and contact number.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Full Name */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                Full Legal Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: '' }));
                }}
                placeholder="e.g. Vikramaditya Singh"
                className={`w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border text-slate-900 dark:text-slate-100 focus:outline-hidden ${
                  fieldErrors.name
                    ? 'border-rose-500 ring-2 ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/30'
                }`}
              />
              {fieldErrors.name && (
                <p className="mt-1 text-[11px] text-rose-500 font-medium">{fieldErrors.name}</p>
              )}
            </div>

            {/* Contact Phone (Mandatory with Country Prefix Dropdown) */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                Contact Mobile Number <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="w-32 shrink-0">
                  <select
                    value={phonePrefix}
                    onChange={(e) => {
                      setPhonePrefix(e.target.value);
                      if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: '' }));
                    }}
                    className="w-full px-2 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-hidden"
                  >
                    {COUNTRY_PREFIX_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative flex-1">
                  <input
                    type="tel"
                    name="phone"
                    value={phoneNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setPhoneNumber(val);
                      if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: '' }));
                    }}
                    maxLength={phonePrefix === '+91' || phonePrefix === '+1' || phonePrefix === '+44' ? 10 : 15}
                    placeholder={phonePrefix === '+91' ? '10-digit mobile number' : 'Mobile number'}
                    className={`w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden ${
                      fieldErrors.phone
                        ? 'border-rose-500 ring-2 ring-rose-500/20'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/30'
                    }`}
                  />
                </div>
              </div>
              {fieldErrors.phone ? (
                <p className="mt-1 text-[11px] text-rose-500 font-medium">{fieldErrors.phone}</p>
              ) : (
                <p className="mt-1 text-[10px] text-slate-400">
                  Mandatory contact number. Used for mobile attendant authentication & SMS alerts.
                </p>
              )}
            </div>

            {/* Email Address (Optional) */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                Email Address <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
                }}
                placeholder="e.g. vikram@petropulse.io (optional)"
                className={`w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border text-slate-900 dark:text-slate-100 focus:outline-hidden ${
                  fieldErrors.email
                    ? 'border-rose-500 ring-2 ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/30'
                }`}
              />
              {fieldErrors.email ? (
                <p className="mt-1 text-[11px] text-rose-500 font-medium">{fieldErrors.email}</p>
              ) : (
                <p className="mt-1 text-[10px] text-slate-400">
                  Optional. Staff without email can log in with Mobile Number & PIN.
                </p>
              )}
            </div>

            {/* Username */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                Username <span className="text-slate-400 font-normal">(Login Identifier)</span>
              </label>
              <input
                type="text"
                name="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (fieldErrors.username) setFieldErrors((p) => ({ ...p, username: '' }));
                }}
                placeholder="e.g. vsingh"
                className={`w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border text-slate-900 dark:text-slate-100 focus:outline-hidden ${
                  fieldErrors.username
                    ? 'border-rose-500 ring-2 ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/30'
                }`}
              />
              {fieldErrors.username && (
                <p className="mt-1 text-[11px] text-rose-500 font-medium">{fieldErrors.username}</p>
              )}
            </div>

            {/* Forecourt Security PIN (Default: 1234) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                  Forecourt Security PIN <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setPin('1234')}
                  className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                >
                  Set Default 1234
                </button>
              </div>
              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="pin"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPin(val);
                    if (fieldErrors.pin) setFieldErrors((p) => ({ ...p, pin: '' }));
                  }}
                  placeholder={mode === 'EDIT' ? 'Enter new 4-digit PIN (leave empty to keep current)' : '4-digit PIN (default 1234)'}
                  className={`w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-slate-800 border font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden ${
                    fieldErrors.pin
                      ? 'border-rose-500 ring-2 ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/30'
                  }`}
                />
              </div>
              {fieldErrors.pin ? (
                <p className="mt-1 text-[11px] text-rose-500 font-medium">{fieldErrors.pin}</p>
              ) : (
                <p className="mt-1 text-[10px] text-slate-400">
                  {mode === 'EDIT'
                    ? 'Leave empty to keep current PIN, or enter a new 4 to 6 digit numeric code.'
                    : 'Temporary PIN for forecourt mobile terminal access (Default: 1234).'}
                </p>
              )}
            </div>

            {/* Account Status Single-Select Dropdown */}
            <SelectDropdown
              label="Account Status"
              options={statusOptions}
              value={status}
              onChange={(val) => setStatus(val)}
              searchable={false}
              required
            />

            {/* Shift Schedule Single-Select Dropdown */}
            <SelectDropdown
              label="Standard Shift Schedule"
              options={shiftOptions}
              value={shiftSchedule}
              onChange={(val) => setShiftSchedule(val)}
              searchable={false}
            />
          </div>
        </div>

        {/* Section 2: Role Assignment & Station Access */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Shield className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                2. Role & Station Assignment
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Assign role and station access.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Role Dropdown */}
            <div>
              <SelectDropdown
                label="System Role"
                placeholder="Select role..."
                options={roleOptions}
                value={role}
                onChange={(val) => setRole(val as UserRole)}
                searchable={true}
                required
              />
            </div>

            {/* Assigned Bunks Multi-Select Dropdown */}
            <div>
              {role === 'OWNER' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Assigned Stations
                  </label>
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs">
                    <strong className="block font-semibold">Universal Access</strong>
                    Owners have access to all bunk stations and financial ledgers.
                  </div>
                </div>
              ) : (
                <MultiSelectDropdown
                  label="Assigned Stations"
                  placeholder="Select stations..."
                  options={bunkOptions}
                  value={assignedBunks}
                  onChange={(bunks) => {
                    setAssignedBunks(bunks);
                    if (fieldErrors.assignedBunks) {
                      setFieldErrors((p) => ({ ...p, assignedBunks: '' }));
                    }
                  }}
                  error={fieldErrors.assignedBunks}
                  required
                  searchable={true}
                />
              )}
            </div>
          </div>

          {/* Primary Station for Roster / Default View */}
          {role !== 'OWNER' && assignedBunks.length > 1 && (
            <div className="max-w-md pt-2">
              <SelectDropdown
                label="Default Station"
                placeholder="Select default station..."
                options={bunkOptions.filter((b) => assignedBunks.includes(b.value))}
                value={primaryStationId}
                onChange={(stId) => setPrimaryStationId(stId)}
                searchable={false}
              />
            </div>
          )}

          {/* Send Welcome Email Option */}
          {mode === 'ADD' && (
            <div className="pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={sendInvite}
                  onChange={(e) => setSendInvite(e.target.checked)}
                  className="w-4 h-4 rounded text-[#12544F] focus:ring-[#12544F] border-slate-300 dark:border-[#194C47] cursor-pointer"
                />
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  Dispatch email invitation with temporary credentials and onboarding instructions
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Section 3: Granular Permission Matrix */}
        <UserPermissionMatrix
          role={role}
          permissions={permissions}
          onChange={setPermissions}
          disabled={!isSuperAdmin && role === 'OWNER'}
          isAdmin={isSuperAdmin}
        />

        {/* Bottom Actions Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[#194C47]">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-[#194C47] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#123733] text-xs font-semibold cursor-pointer transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-[#12544F] hover:bg-[#0E433F] text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 transition"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {mode === 'ADD' ? 'Save & Create User' : 'Update User Account'}
          </button>
        </div>
      </form>
    </div>
  );
};
