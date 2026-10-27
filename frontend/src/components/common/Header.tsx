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
  Truck,
  Search,
  X,
  ChevronRight,
} from 'lucide-react';
import DbSyncModal from './DbSyncModal';
import { ModalPortal } from './ModalPortal';
import { getBunkCurrency } from '../../utils/currency';

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
  const bunkCurrency = getBunkCurrency(currentStation);

  // User dropdown menu state
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Notification dropdown menu state
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Database Connection & Table Sync Diagnostics modal state
  const [isDbSyncModalOpen, setIsDbSyncModalOpen] = useState(false);

  // Bunk Switcher dropdown menu state (Desktop)
  const [isBunkMenuOpen, setIsBunkMenuOpen] = useState(false);
  const bunkMenuRef = useRef<HTMLDivElement>(null);

  // Mobile Forecourt Switcher Sheet state
  const [isMobileBunkSheetOpen, setIsMobileBunkSheetOpen] = useState(false);
  const [bunkSearchQuery, setBunkSearchQuery] = useState('');

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
      if (bunkMenuRef.current && !bunkMenuRef.current.contains(target)) {
        setIsBunkMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock body scroll when mobile bunk sheet is open
  useEffect(() => {
    if (isMobileBunkSheetOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isMobileBunkSheetOpen]);

  // Close menus on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsBunkMenuOpen(false);
        setIsMobileBunkSheetOpen(false);
        setIsUserMenuOpen(false);
        setIsNotificationOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredStations = stations.filter((st) => {
    if (!bunkSearchQuery.trim()) return true;
    const q = bunkSearchQuery.toLowerCase();
    return (
      st.name.toLowerCase().includes(q) ||
      st.code.toLowerCase().includes(q) ||
      (st.location && st.location.toLowerCase().includes(q)) ||
      (st.managerName && st.managerName.toLowerCase().includes(q))
    );
  });

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
    <header className="shrink-0 z-30 w-full border-b border-slate-200 dark:border-[#194C47] bg-white/95 dark:bg-[#0D2926]/95 backdrop-blur-md text-slate-800 dark:text-slate-100 shadow-2xs dark:shadow-md transition-colors select-none overscroll-none">
      {/* Top Bar */}
      <div className="px-3 sm:px-5 py-2.5">
        <div className="flex items-center justify-between gap-3">
          {/* Left Zone: Brand Logo & Station Switcher Context */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={handleToggleMenu}
              className="lg:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-[#194C47] bg-slate-50 dark:bg-[#123733] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-[#12544F] dark:hover:border-[#2BA096] active:scale-95 transition cursor-pointer"
              title="Toggle Navigation Menu"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="h-4 w-4" />
            </button>

            {/* Primary Global Brand */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="p-1 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/25 shrink-0">
                <img
                  src="/logo.png"
                  alt="AG Fuels ERP Logo"
                  className="h-7 sm:h-8 w-auto max-h-8 object-contain rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-lg tracking-tight text-[#12544F] dark:text-[#F3F8F7]">
                  AG Fuels
                </span>
                <span className="hidden xl:inline-flex items-center text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#12544F]/10 text-[#12544F] dark:bg-emerald-500/20 dark:text-emerald-300 border border-[#12544F]/20 dark:border-emerald-500/30">
                  Forecourt ERP
                </span>
              </div>
            </div>

            {/* Mobile Bunk Switcher Pill (Opens Bottom Sheet) */}
            {currentStation && (
              <button
                type="button"
                onClick={() => stations.length > 1 && setIsMobileBunkSheetOpen(true)}
                className={`sm:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-[#123733] border border-slate-200/90 dark:border-[#194C47] text-xs font-bold text-slate-800 dark:text-slate-100 max-w-[130px] xs:max-w-[170px] truncate transition active:scale-95 shadow-2xs ${
                  stations.length > 1 ? 'cursor-pointer hover:border-[#12544F] active:bg-slate-100 dark:active:bg-[#1a4a45]' : 'cursor-default'
                }`}
                title={stations.length > 1 ? 'Tap to switch petrol bunk' : `Active Bunk: ${currentStation.name}`}
                aria-label="Switch active petrol bunk"
              >
                <Building2 className="h-3.5 w-3.5 text-[#12544F] dark:text-[#2BA096] shrink-0" />
                <span className="truncate text-xs font-bold">
                  {currentStation.name}
                </span>
                {stations.length > 1 && (
                  <ChevronDown className="h-3 w-3 text-slate-400 dark:text-slate-500 shrink-0" />
                )}
              </button>
            )}

            {/* Active Petrol Bunk / Station Switcher Dropdown (Desktop) */}
            {currentStation && (
              <div className="hidden sm:relative sm:block" ref={bunkMenuRef}>
                <button
                  type="button"
                  onClick={() => stations.length > 1 && setIsBunkMenuOpen((prev) => !prev)}
                  className={`flex items-center gap-1.5 pl-2 sm:pl-2.5 sm:border-l border-slate-200 dark:border-[#194C47] text-xs ${
                    stations.length > 1 ? 'cursor-pointer group' : 'cursor-default'
                  }`}
                  title={stations.length > 1 ? 'Switch Active Petrol Bunk' : `Active Bunk: ${currentStation.name}`}
                  aria-expanded={isBunkMenuOpen}
                >
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-[#123733] border border-slate-200/90 dark:border-[#194C47] group-hover:border-[#12544F] dark:group-hover:border-[#2BA096] group-hover:shadow-2xs transition active:scale-95">
                    <Building2 className="h-3.5 w-3.5 text-[#12544F] dark:text-[#2BA096] shrink-0" />
                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[150px] sm:max-w-[220px] md:max-w-[280px] lg:max-w-[360px]">
                      {currentStation.name}
                    </span>
                    {stations.length > 1 && (
                      <ChevronDown
                        className={`h-3 w-3 text-slate-400 dark:text-slate-500 transition-transform ${
                          isBunkMenuOpen ? 'rotate-180 text-[#12544F] dark:text-[#2BA096]' : ''
                        }`}
                      />
                    )}
                  </div>
                </button>

                {/* Bunk Switcher Dropdown Menu */}
                {isBunkMenuOpen && stations.length > 1 && (
                  <div className="absolute left-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 dark:border-[#194C47] bg-white dark:bg-[#0D2926] p-2 shadow-2xl z-50 animate-fadeIn">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-[#194C47] flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                        <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Select Active Forecourt</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold">
                        {stations.length} Bunks
                      </span>
                    </div>

                    {stations.length > 3 && (
                      <div className="p-2 border-b border-slate-100 dark:border-[#194C47]">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={bunkSearchQuery}
                            onChange={(e) => setBunkSearchQuery(e.target.value)}
                            placeholder="Filter stations..."
                            className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-[#194C47] bg-slate-50 dark:bg-[#123733] text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    )}

                    <div className="py-1 max-h-64 overflow-y-auto space-y-1">
                      {filteredStations.map((st) => {
                        const isSelected = st.id === (currentStationId || currentStation.id);
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => {
                              if (onSelectStation) onSelectStation(st.id);
                              setIsBunkMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30'
                                : 'hover:bg-slate-50 dark:hover:bg-[#123733]/60 border border-transparent'
                            }`}
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {st.name}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {st.location || 'Central Forecourt'} · {st.managerName || 'Unassigned'}
                              </p>
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Middle Zone: Station Timezone Clock & Day Close Countdown */}
          <div className="hidden lg:flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold text-slate-900 dark:text-white tabular-nums">{currentTime || '...'}</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans hidden xl:inline">
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

          {/* Right Zone: Essential Global Controls & User Profile Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onOpenQRScanner && (
              <button
                type="button"
                onClick={onOpenQRScanner}
                className="flex h-9 w-9 sm:w-auto items-center justify-center gap-1.5 sm:px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-700 active:scale-95 transition text-xs font-semibold cursor-pointer shrink-0"
                title="Scan QR Code (Bunk, Tank, or Nozzle)"
                aria-label="Scan QR Code"
              >
                <QrCode className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="hidden md:inline">Scan QR</span>
              </button>
            )}

            {/* Quick 1-Click Theme Switcher Button - Hidden on mobile, accessible in user profile dropdown */}
            <button
              type="button"
              onClick={toggleTheme}
              className="hidden sm:flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 active:scale-95 transition shrink-0"
              title={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
              aria-label={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-indigo-500" />
              )}
            </button>

            {/* Database Connection & Table Sync Diagnostics Button - Hidden on mobile */}
            <button
              type="button"
              onClick={() => setIsDbSyncModalOpen(true)}
              className="hidden md:flex relative h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-700 active:scale-95 transition cursor-pointer shrink-0"
              title="Database Connection & Table Sync Diagnostics"
              aria-label="Database Connection & Table Sync Diagnostics"
            >
              <Database className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </button>

            {/* Forecourt Notification Module Bell Button */}
            <div className="relative shrink-0" ref={notificationRef}>
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
                <div className="hidden md:flex flex-col text-left leading-tight">
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

                    {/* Update Fuel Rates (Owner & Manager) */}
                    {(currentRole === 'OWNER' || currentRole === 'MANAGER') && onOpenPriceModal && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenPriceModal();
                        }}
                        className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800/80 transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <Tag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Update Fuel Rates</span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-semibold">
                          Prices
                        </span>
                      </button>
                    )}

                    {/* Database Connection & Table Sync (for Mobile Viewports) */}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsDbSyncModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800/80 transition md:hidden"
                    >
                      <div className="flex items-center gap-2.5">
                        <Database className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Database Diagnostics</span>
                      </div>
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
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

      {/* Mobile Dedicated Operating Forecourt Context Bar (Visible ONLY on Mobile < sm) */}
      {currentStation && (
        <div className="sm:hidden border-t border-slate-200/90 dark:border-[#194C47] bg-gradient-to-r from-[#0C3530] via-[#092B27] to-[#072421] px-3 py-1.5 flex items-center justify-between text-white shadow-xs">
          <button
            type="button"
            onClick={() => stations.length > 1 && setIsMobileBunkSheetOpen(true)}
            className={`flex items-center gap-2 min-w-0 text-left flex-1 mr-2 ${
              stations.length > 1 ? 'cursor-pointer active:opacity-80' : 'cursor-default'
            }`}
            title={stations.length > 1 ? 'Tap to switch petrol bunk' : `Current Bunk: ${currentStation.name}`}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shrink-0">
              <Building2 className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1 flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-teal-300/90 shrink-0">
                Bunk:
              </span>
              <span className="font-bold text-xs text-white truncate max-w-[200px] xs:max-w-[250px]">
                {currentStation.name}
              </span>
            </div>
          </button>

          {stations.length > 1 ? (
            <button
              type="button"
              onClick={() => setIsMobileBunkSheetOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-600/40 to-teal-600/40 hover:from-emerald-600/60 hover:to-teal-600/60 text-emerald-200 border border-emerald-400/40 active:scale-95 transition text-[11px] font-bold shrink-0 cursor-pointer shadow-xs"
              aria-label="Switch active petrol bunk"
            >
              <span>Switch</span>
              <ChevronDown className="h-3 w-3 text-emerald-300" />
            </button>
          ) : (
            <span className="text-[10px] font-mono text-emerald-300/80 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
              Active
            </span>
          )}
        </div>
      )}

      {/* Mobile Forecourt Switcher Bottom Sheet / Modal (Slide-Up Native Mobile Drawer) */}
      {isMobileBunkSheetOpen && (
        <ModalPortal
          isOpen={isMobileBunkSheetOpen}
          onClose={() => setIsMobileBunkSheetOpen(false)}
          className="fixed inset-0 z-[9999] flex flex-col justify-end p-0 sm:hidden"
          backdropClassName="bg-slate-950/75 backdrop-blur-sm"
          zIndex={9999}
        >
          {/* Bottom Sheet Card Container */}
          <div
            className="w-full max-h-[85vh] flex flex-col rounded-t-3xl border-t border-[#1F6E65] bg-gradient-to-b from-[#0E3D38] via-[#0B332E] to-[#072421] text-white shadow-2xl overflow-hidden animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <div className="pt-3 pb-1 flex justify-center">
              <div className="h-1.5 w-12 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">Select Operating Forecourt</h3>
                  <p className="text-[11px] text-teal-200/80 font-mono">
                    {stations.length} Bunks Configured
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileBunkSheetOpen(false)}
                className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 text-teal-200 hover:text-white flex items-center justify-center transition cursor-pointer"
                aria-label="Close station switcher"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Filter Search if more than 2 bunks */}
            {stations.length > 2 && (
              <div className="px-5 pt-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-300/60" />
                  <input
                    type="text"
                    value={bunkSearchQuery}
                    onChange={(e) => setBunkSearchQuery(e.target.value)}
                    placeholder="Search bunk by name or code..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/30 border border-white/15 text-xs text-white placeholder-teal-200/40 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
              </div>
            )}

            {/* Stations List */}
            <div className="px-5 py-3 space-y-2.5 overflow-y-auto max-h-[55vh] safe-area-pb">
              {filteredStations.map((st) => {
                const isSelected = st.id === (currentStationId || currentStation.id);
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      if (onSelectStation) onSelectStation(st.id);
                      setIsMobileBunkSheetOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left transition active:scale-[0.98] cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/20 border-2 border-emerald-400 shadow-[0_4px_20px_rgba(16,185,129,0.25)]'
                        : 'bg-white/5 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-extrabold text-sm text-white truncate">
                          {st.name}
                        </span>
                      </div>
                      <p className="text-xs text-teal-100/70 truncate flex items-center gap-1.5">
                        <span>{st.location || 'Central Forecourt'}</span>
                        {st.managerName && (
                          <>
                            <span>·</span>
                            <span>Mgr: {st.managerName}</span>
                          </>
                        )}
                      </p>
                      {st.operatingHours && (
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {st.operatingHours === '24_HOURS' ? '24/7 Operations' : 'Day Operations'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center">
                      {isSelected ? (
                        <div className="h-7 w-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                          <Check className="h-4 w-4 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="h-7 w-7 rounded-full border border-white/20 flex items-center justify-center text-white/40">
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </ModalPortal>
      )}



      {/* Database Connection & Table Sync Diagnostics Modal */}
      <DbSyncModal
        isOpen={isDbSyncModalOpen}
        onClose={() => setIsDbSyncModalOpen(false)}
      />
    </header>
  );
};
