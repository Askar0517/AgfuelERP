import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  Station,
  UserRole,
  AuthUser,
} from '../types';
import {
  User,
  Mail,
  Phone,
  Shield,
  Building2,
  Clock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  LogOut,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../api/client';
import { useNotification } from '../context/NotificationContext';
import { SelectDropdown } from '../components/common/SelectDropdown';
import { useTheme } from '../context/ThemeContext';
import { validateEmail, validatePhone } from '../utils/validation';
import { ImageUploadInput } from '../components/common/ImageUploadInput';
import { Breadcrumbs } from '../components/common/Breadcrumbs';

interface ProfileViewProps {
  user: AuthUser;
  profile: UserProfile | null;
  stations: Station[];
  onSaveProfile: (updated: Partial<UserProfile>) => Promise<void>;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  profile,
  stations,
  onSaveProfile,
  onLogout,
}) => {
  const { notifySuccess, notifyError, notifyValidation } = useNotification();
  const { theme, toggleTheme, isDark } = useTheme();

  // Profile Edit State
  const [name, setName] = useState(profile?.name || user.name || '');
  const [email] = useState(profile?.email || user.email || ''); // Readonly or admin only
  const [phone, setPhone] = useState(profile?.phone || user.phone || '');
  const [shiftSchedule, setShiftSchedule] = useState(profile?.shiftSchedule || user.shiftSchedule || 'MORNING');
  const [assignedIsland, setAssignedIsland] = useState<number>(profile?.assignedIsland || 1);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatarUrl || user.avatarUrl || null);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  // Synchronize internal state whenever profile or user updates
  useEffect(() => {
    if (profile?.name) setName(profile.name);
    else if (user?.name) setName(user.name);

    if (profile?.phone) setPhone(profile.phone);
    else if (user?.phone) setPhone(user.phone);

    if (profile?.shiftSchedule) setShiftSchedule(profile.shiftSchedule);
    else if (user?.shiftSchedule) setShiftSchedule(user.shiftSchedule);

    if (profile?.assignedIsland) setAssignedIsland(profile.assignedIsland);
    else if (user?.assignedIsland) setAssignedIsland(user.assignedIsland);

    if (profile?.avatarUrl !== undefined) setAvatarUrl(profile.avatarUrl);
    else if (user?.avatarUrl !== undefined) setAvatarUrl(user.avatarUrl || null);
  }, [profile, user]);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passErrors, setPassErrors] = useState<Record<string, string>>({});

  // Role display configs
  const roleLabels: Record<UserRole, { title: string; desc: string; badge: string }> = {
    OWNER: {
      title: 'Enterprise Owner & Administrator',
      desc: 'Full administrative authority across all bunks, rates, and configurations.',
      badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    },
    MANAGER: {
      title: 'Station Bunk Manager',
      desc: 'Authorized to oversee operational staff, dip records, decanting, and shifts for assigned bunks.',
      badge: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
    },
    ATTENDANT: {
      title: 'Forecourt Attendant',
      desc: 'Authorized to record manual dispenser meter readings and submit collected cash/digital funds.',
      badge: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30',
    },
    CASHIER: {
      title: 'Cashier & Cash Desk Controller',
      desc: 'Authorized to verify daily shift cash drops, payment gateways, and banking records.',
      badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
    },
    AUDITOR: {
      title: 'Compliance & EOD Financial Auditor',
      desc: 'Read-only audit privileges for books, EOD settlements, and variance reports.',
      badge: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
    },
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!name.trim()) errs.name = 'Full name is required.';
    const phoneErr = validatePhone(phone);
    if (phoneErr) errs.phone = phoneErr;

    if (Object.keys(errs).length > 0) {
      setProfileErrors(errs);
      notifyValidation('Profile Validation', 'Please fix the highlighted fields.', Object.values(errs));
      return;
    }

    setProfileErrors({});
    setIsSavingProfile(true);

    try {
      await onSaveProfile({
        id: user.id,
        name: name.trim(),
        phone: phone.trim(),
        shiftSchedule,
        assignedIsland,
        avatarUrl: avatarUrl || undefined,
      });
      notifySuccess('Profile Updated', 'Your contact details and shift schedule have been saved.');
    } catch (err: any) {
      notifyError('Failed to Save Profile', err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!currentPassword) errs.currentPassword = 'Enter your current password.';
    if (!newPassword || newPassword.length < 6) {
      errs.newPassword = 'New password must be at least 6 characters.';
    }
    if (newPassword !== confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(errs).length > 0) {
      setPassErrors(errs);
      return;
    }

    setPassErrors({});
    setIsChangingPass(true);

    try {
      await api.changePassword({
        userId: user.id,
        currentPassword,
        newPassword,
      });
      notifySuccess('Password Changed', 'Your account credentials have been successfully updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassErrors({ currentPassword: err.message });
      notifyError('Password Update Failed', err.message);
    } finally {
      setIsChangingPass(false);
    }
  };

  // Find permitted stations
  const permittedStations = stations.filter((s) => {
    if (user.role === 'OWNER') return true;
    if (user.assignedBunks && user.assignedBunks.length > 0) {
      return user.assignedBunks.includes(s.id);
    }
    return s.id === user.stationId;
  });

  const initials = (name || user.name || 'User')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="w-full space-y-6 pb-12 sm:pb-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        items={[
          { label: 'System' },
          { label: 'Profile', isCurrent: true, icon: User },
        ]}
      />

      {/* 1. Profile Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            {avatarUrl ? (
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-lg shadow-emerald-500/20 shrink-0 bg-slate-100 dark:bg-slate-800">
                <img src={avatarUrl} alt={name || user.name} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-extrabold text-2xl sm:text-3xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
                  {name || user.name}
                </h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${roleLabels[user.role]?.badge}`}>
                  {user.role}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Active Account
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                @{user.username} · {user.email || 'user@petropulse.io'}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                {roleLabels[user.role]?.desc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-4 py-2.5 text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 active:scale-95 transition cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full">
        {/* Left Column (8 Cols on XL): Personal Information & Permitted Bunks */}
        <div className="xl:col-span-8 space-y-6">
          {/* Card: Edit Personal Information */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Account & Contact Information
            </h2>

            <form onSubmit={handleUpdateProfile} className="mt-4 space-y-4 text-xs">
              {/* Profile Photo Uploader */}
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3 sm:p-4">
                <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Profile Photo & Identity Avatar
                </span>
                <ImageUploadInput
                  category="profile"
                  compactAvatar={true}
                  value={avatarUrl}
                  onChange={(newUrl) => setAvatarUrl(newUrl)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full rounded-xl border bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white transition focus:outline-none ${
                      profileErrors.name
                        ? 'border-rose-500'
                        : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                    }`}
                  />
                  {profileErrors.name && (
                    <p className="mt-1 text-[11px] text-rose-500 font-medium">{profileErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address (Official)
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    title="Email is locked to primary enterprise domain directory"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 px-3 py-2 text-xs text-slate-500 dark:text-slate-400 cursor-not-allowed font-mono"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">
                    Contact admin to alter master enterprise email.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98000 00000"
                    className={`w-full rounded-xl border bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white transition focus:outline-none ${
                      profileErrors.phone
                        ? 'border-rose-500'
                        : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                    }`}
                  />
                  {profileErrors.phone && (
                    <p className="mt-1 text-[11px] text-rose-500 font-medium">{profileErrors.phone}</p>
                  )}
                </div>

                <div>
                  <SelectDropdown
                    label="Assigned Shift Schedule"
                    value={shiftSchedule}
                    onChange={(val) => setShiftSchedule(val)}
                    options={[
                      { value: 'MORNING', label: 'Morning Shift (06:00 - 14:00)', description: '06:00 - 14:00' },
                      { value: 'EVENING', label: 'Evening Shift (14:00 - 22:00)', description: '14:00 - 22:00' },
                      { value: 'NIGHT', label: 'Night Shift (22:00 - 06:00)', description: '22:00 - 06:00' },
                      { value: 'GENERAL', label: 'General Office / Admin (09:00 - 18:00)', description: '09:00 - 18:00' },
                    ]}
                    searchable={false}
                  />
                </div>
              </div>

              {user.role === 'ATTENDANT' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Forecourt Island Assignment
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={assignedIsland}
                    onChange={(e) => setAssignedIsland(parseInt(e.target.value, 10) || 1)}
                    className="w-full sm:w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 font-bold shadow-xs active:scale-95 transition cursor-pointer disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>Save Profile Changes</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card: Assigned Role & Permitted Bunks (Strictly View-Only) */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Assigned Role & Permitted Bunks
              </h2>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                Privileges Managed by Administrator
              </span>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Active System Role:
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold border text-xs ${roleLabels[user.role]?.badge}`}>
                    {roleLabels[user.role]?.title}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  Users cannot modify their own security clearance or role assignments.
                </p>
              </div>

              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                  Permitted Fuel Bunks ({permittedStations.length}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {permittedStations.map((st) => (
                    <div
                      key={st.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Building2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {st.name}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {st.code} · {st.timezone}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold shrink-0">
                        Authorized
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Password Change & Security Session */}
        <div className="xl:col-span-4 space-y-6">
          {/* Card: Change Password */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <KeyRound className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Change Password
            </h2>

            <form onSubmit={handleChangePassword} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className={`w-full rounded-xl border bg-slate-50 dark:bg-slate-800 px-3 py-2 pr-9 text-xs text-slate-900 dark:text-white transition focus:outline-none ${
                      passErrors.currentPassword
                        ? 'border-rose-500'
                        : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {passErrors.currentPassword && (
                  <p className="mt-1 text-[11px] text-rose-500 font-medium">{passErrors.currentPassword}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password (min 6 chars)
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className={`w-full rounded-xl border bg-slate-50 dark:bg-slate-800 px-3 py-2 pr-9 text-xs text-slate-900 dark:text-white transition focus:outline-none ${
                      passErrors.newPassword
                        ? 'border-rose-500'
                        : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {passErrors.newPassword && (
                  <p className="mt-1 text-[11px] text-rose-500 font-medium">{passErrors.newPassword}</p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className={`w-full rounded-xl border bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white transition focus:outline-none ${
                    passErrors.confirmPassword
                      ? 'border-rose-500'
                      : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                  }`}
                />
                {passErrors.confirmPassword && (
                  <p className="mt-1 text-[11px] text-rose-500 font-medium">{passErrors.confirmPassword}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isChangingPass}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white py-2.5 font-bold hover:bg-slate-800 active:scale-95 transition cursor-pointer disabled:opacity-50"
              >
                {isChangingPass ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                <span>Update Credentials</span>
              </button>
            </form>
          </div>

          {/* Card: Account Preferences */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs text-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Interface Preferences
            </h2>

            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">Theme Mode</span>
                <span className="text-[11px] text-slate-500">Currently active: {theme.toUpperCase()}</span>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold hover:border-slate-300 cursor-pointer"
              >
                {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-500" />}
                <span>Toggle</span>
              </button>
            </div>
          </div>

          {/* Card: Session & Security Audit */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs text-xs space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Session & Security Audit
            </h2>

            <div className="space-y-2 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Account Identifier:</span>
                <span className="font-mono text-slate-900 dark:text-white">{user.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Login Timestamp:</span>
                <span className="text-slate-900 dark:text-white">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Active session'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Encryption Standard:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">PBKDF2 SHA-512</span>
              </div>
              <div className="flex justify-between">
                <span>Session Status:</span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Authenticated
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
