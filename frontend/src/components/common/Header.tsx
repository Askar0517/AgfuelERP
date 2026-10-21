import React, { useState, useEffect, useRef } from 'react';
import { Station, FuelProduct, UserRole, UserProfile } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useNotification } from '../../context/NotificationContext';
import { NotificationDropdown } from './NotificationDropdown';
import {
  Building2,
  Clock,
  ChevronDown,
  UserCheck,
  Tag,
  Zap,
  Menu,
  Sun,
  Moon,
  User,
  Shield,
  Check,
  LogOut,
  Fuel,
  QrCode,
  Bell,
  Database,
} from 'lucide-react';
import DbSyncModal from './DbSyncModal';

interface HeaderProps {
  stations?: Station[];
  currentStationId?: string;
  activeStation?: Station | null;
  onSelectStation?: (id: string) => void;
  fuels: FuelProduct[];
  currentRole: UserRole;
  onSelectRole?: (role: UserRole) => void;
  onOpenPriceModal: () => void;
  onOpenProfile: () => void;
  onLogout?: () => void;
  onOpenQRScanner?: () => void;
  profile: UserProfile | null;
  onToggleMobileSidebar?: () => void;
  onToggleDesktopSidebar?: () => void;
  onNavigate?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  stations = [],
  currentStationId,
  activeStation,
  onSelectStation,
  fuels,
  currentRole,
  onSelectRole,
  onOpenPriceModal,
  onOpenProfile,
  onLogout,
  onOpenQRScanner,
  profile,
  onToggleMobileSidebar,
  onToggleDesktopSidebar,
  onNavigate,
}) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const { unreadCount } = useNotification();
  const currentStation = activeStation || stations.find((s) => s.id === currentStationId) || stations[0];

  // User dropdown menu state
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Notification dropdown menu state
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Database Connection & Table Sync Diagnostics modal state
  const [isDbSyncModalOpen, setIsDbSyncModalOpen] = useState(false);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live ticking clock in station timezone
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [timeUntilEOD, setTimeUntilEOD] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const tz = currentStation?.timezone || 'Asia/Kolkata';
      try {
        const timeStr = now.toLocaleTimeString('en-US', {
          timeZone: tz,
          hour12: true,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        const dateStr = now.toLocaleDateString('en-US', {
          timeZone: tz,
          month: 'short',
          day: 'numeric',
        });
        setCurrentTime(timeStr);
        setCurrentDate(dateStr);

        // Calculate time until next midnight
        const midnight = new Date(now);
        midnight.setHours(23, 59, 59, 999);
        const diffMs = midnight.getTime() - now.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        setTimeUntilEOD(`${hours}h ${minutes}m`);
      } catch {
        setCurrentTime(now.toLocaleTimeString());
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [currentStation?.timezone]);

  const roleConfigs: Record<
    UserRole,
    { title: string; shortTitle: string; badgeClass: string }
  > = {
    OWNER: {
      title: 'Admin (Owner)',
      shortTitle: 'Admin',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    },
    MANAGER: {
      title: 'Station Manager',
      shortTitle: 'Manager',
      badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
    },
    ATTENDANT: {
      title: 'Forecourt Attendant',
      shortTitle: 'Attendant',
      badgeClass: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30',
    },
    CASHIER: {
      title: 'Cashier & Accounts',
      shortTitle: 'Cashier',
      badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
    },
    AUDITOR: {
      title: 'Compliance Auditor',
      shortTitle: 'Auditor',
      badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30',
    },
  };

  const handleToggleMenu = () => {
    if (window.innerWidth >= 1024) {
      if (onToggleDesktopSidebar) onToggleDesktopSidebar();
    } else {
      if (onToggleMobileSidebar) onToggleMobileSidebar();
    }
  };

  const displayName = profile?.name || 'AG Fuels Forecourt';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="shrink-0 z-30 w-full border-b border-slate-200 dark:border-[#194C47] bg-white/95 dark:bg-[#0D2926]/95 backdrop-blur-md text-slate-800 dark:text-slate-100 shadow-2xs dark:shadow-md transition-colors">
      {/* Top Bar */}
      <div className="px-3 sm:px-5 py-2.5">
        <div className="flex items-center justify-between gap-3">
          {/* Left Zone: Menu Toggle + Brand Logo */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1 sm:flex-none">
            <button
              type="button"
              onClick={handleToggleMenu}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-[#194C47] bg-slate-50 dark:bg-[#123733] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-[#12544F] dark:hover:border-[#2BA096] active:scale-95 transition cursor-pointer"
              title="Toggle Navigation Menu"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 font-bold text-xs sm:text-sm tracking-tight text-[#12544F] dark:text-[#F3F8F7]">
              <img
                src="/logo.png"
                alt="AG Fuels ERP Logo"
                className="h-7 w-auto max-h-7 object-contain rounded-md"
              />
              <span className="font-extrabold tracking-tight">AG Fuels</span>
              <span className="hidden sm:inline text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                ERP
              </span>
            </div>
          </div>

          {/* Middle Zone: Station Timezone Clock & Day Close Countdown */}
          <div className="hidden md:flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{currentTime || '...'}</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans hidden lg:inline">
                · {currentDate} ({currentStation?.timezone || 'IST'})
              </span>
            </div>

            <div className="h-3.5 w-[1px] bg-slate-200 dark:bg-slate-700" />

            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-slate-500 dark:text-slate-400 font-sans text-[11px]">EOD Close:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{timeUntilEOD}</span>
            </div>
          </div>

          {/* Right Zone: QR Scanner, Theme Switcher & User Profile Menu */}
          <div className="flex items-center gap-2 shrink-0">
            {onOpenQRScanner && (
              <button
                type="button"
                onClick={onOpenQRScanner}
                className="flex h-9 items-center gap-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-700 active:scale-95 transition text-xs font-semibold cursor-pointer"
                title="Scan QR Code (Bunk, Tank, or Nozzle)"
                aria-label="Scan QR Code"
              >
                <QrCode className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Scan QR</span>
              </button>
            )}

            {/* Quick 1-Click Theme Switcher Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 active:scale-95 transition"
              title={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
              aria-label={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-indigo-500" />
              )}
            </button>

            {/* Database Connection & Table Sync Diagnostics Button */}
            <button
              type="button"
              onClick={() => setIsDbSyncModalOpen(true)}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-700 active:scale-95 transition cursor-pointer"
              title="Database Connection & Table Sync Diagnostics"
              aria-label="Database Connection & Table Sync Diagnostics"
            >
              <Database className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </button>

            {/* Forecourt Notification Module Bell Button */}
            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                onClick={() => setIsNotificationOpen((prev) => !prev)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 active:scale-95 transition cursor-pointer"
                title="Forecourt Notifications & Alerts"
                aria-label="Forecourt Notifications"
                aria-expanded={isNotificationOpen}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <NotificationDropdown
                isOpen={isNotificationOpen}
                onClose={() => setIsNotificationOpen(false)}
                onNavigate={onNavigate}
              />
            </div>

            {/* User Avatar & Menu Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-[#194C47] bg-slate-50 dark:bg-[#123733] p-1 sm:px-2.5 sm:py-1 text-xs font-semibold transition active:scale-95 text-slate-800 dark:text-white hover:border-[#12544F] dark:hover:border-[#2BA096] cursor-pointer"
                aria-haspopup="true"
                aria-expanded={isUserMenuOpen}
                aria-label="User account and profile menu"
              >
                {profile?.avatarUrl ? (
                  <div className="h-7 w-7 shrink-0 rounded-lg overflow-hidden border border-emerald-500/80 shadow-2xs bg-slate-100 dark:bg-slate-800">
                    <img
                      src={profile.avatarUrl}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#12544F] text-white font-bold text-xs shadow-2xs">
                    {initials}
                  </div>
                )}
                <div className="hidden sm:flex flex-col text-left leading-tight">
                  <span className="font-bold text-slate-900 dark:text-white truncate max-w-[110px]">
                    {displayName.split(' ')[0]}
                  </span>
                  <span className="text-[10px] text-[#12544F] dark:text-[#2BA096] font-mono">
                    {roleConfigs[currentRole]?.shortTitle || currentRole}
                  </span>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 dark:text-slate-500 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-slate-900 dark:text-gray-100 shadow-xl z-50 overflow-hidden animate-fadeIn"
                  role="menu"
                >
                  {/* User Profile Header in Dropdown */}
                  <div className="p-3.5 border-b border-slate-100 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-950/70">
                    <div className="flex items-center gap-3">
                      {profile?.avatarUrl ? (
                        <div className="h-10 w-10 shrink-0 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-sm bg-slate-100 dark:bg-slate-800">
                          <img
                            src={profile.avatarUrl}
                            alt={displayName}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold text-sm shadow-sm">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {displayName}
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate">
                          {profile?.email || 'user@petropulse.io'}
                        </p>
                        <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${roleConfigs[currentRole]?.badgeClass}`}>
                          {roleConfigs[currentRole]?.title}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Menu Options */}
                  <div className="p-1.5 space-y-0.5">
                    {/* My Profile Action */}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800/80 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span>My Profile</span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400 dark:text-gray-500 bg-slate-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        View / Edit
                      </span>
                    </button>

                    {/* Theme Switcher in Dropdown */}
                    <div className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800/80 transition">
                      <div className="flex items-center gap-2.5">
                        {isDark ? (
                          <Moon className="h-4 w-4 text-blue-400" />
                        ) : (
                          <Sun className="h-4 w-4 text-amber-500" />
                        )}
                        <span>Theme</span>
                      </div>
                      <div className="flex items-center rounded-lg bg-slate-200/80 dark:bg-gray-800 p-0.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            if (isDark) toggleTheme();
                          }}
                          className={`flex items-center gap-1 rounded-md px-2 py-0.5 transition ${
                            !isDark
                              ? 'bg-white text-slate-900 shadow-xs font-bold'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <Sun className="h-3 w-3" />
                          <span>Light</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isDark) toggleTheme();
                          }}
                          className={`flex items-center gap-1 rounded-md px-2 py-0.5 transition ${
                            isDark
                              ? 'bg-gray-700 text-white shadow-xs font-bold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Moon className="h-3 w-3" />
                          <span>Dark</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sign Out Action */}
                  <div className="p-1.5 border-t border-slate-100 dark:border-gray-800">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        if (onLogout) onLogout();
                      }}
                      className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </div>
                      <span className="text-[10px] opacity-75 font-mono">End Session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fuel Rate Ticker Strip */}
      <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-2 bg-slate-50 dark:bg-[#081D1B] border-t border-slate-200 dark:border-[#194C47] text-xs shadow-2xs dark:shadow-inner transition-colors">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-0.5 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold shrink-0">
            <Tag className="h-3.5 w-3.5 text-[#12544F] dark:text-[#2BA096]" />
            <span className="text-[11px] uppercase tracking-wider font-mono">Live Forecourt Rates</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {fuels.map((fuel) => (
              <div
                key={fuel.code}
                className="flex items-center gap-1.5 shrink-0 rounded-lg border border-slate-200 dark:border-[#194C47] bg-white dark:bg-[#0D2926] px-2.5 py-1 font-mono text-[11px] shadow-2xs"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: fuel.color }}
                  aria-hidden="true"
                />
                <span className="font-sans font-medium text-slate-600 dark:text-slate-400 text-[11px]">{fuel.shortName}</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">₹{fuel.ratePerLiter.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {(currentRole === 'OWNER' || currentRole === 'MANAGER') && (
          <button
            type="button"
            onClick={onOpenPriceModal}
            className="shrink-0 rounded-lg border border-[#12544F]/30 dark:border-[#2BA096]/40 bg-[#12544F]/10 dark:bg-[#12544F]/25 px-2.5 py-1 text-[11px] font-semibold text-[#12544F] dark:text-[#2BA096] hover:bg-[#12544F]/20 dark:hover:bg-[#12544F]/35 active:scale-95 transition shadow-2xs whitespace-nowrap cursor-pointer"
          >
            Update Rates
          </button>
        )}
      </div>

      {/* Database Connection & Table Sync Diagnostics Modal */}
      <DbSyncModal
        isOpen={isDbSyncModalOpen}
        onClose={() => setIsDbSyncModalOpen(false)}
      />
    </header>
  );
};
