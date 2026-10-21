import React, { useEffect } from 'react';
import { UserRole, UserProfile } from '../../types';
import { useNotification } from '../../context/NotificationContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  Layers,
  Calculator,
  Smartphone,
  Clock,
  FileSpreadsheet,
  TrendingUp,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Fuel,
  User,
  Bell,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  currentRole: UserRole;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  profile?: UserProfile | null;
  onOpenProfile?: () => void;
  onLogout?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  tooltip: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles?: UserRole[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentRole,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  profile,
  onOpenProfile,
  onLogout,
}) => {
  const { unreadCount } = useNotification();

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
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
  }, [isMobileOpen]);

  // Close drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

  // Normal Sidebar Navigation Groups:
  // Dashboard
  // Management (Bunk, Users, Shifts)
  // Operations (Meters, POS, Day close)
  // Report (Daily sales, Sale efficiency)
  const navSections: NavSection[] = [
    {
      title: 'Management',
      items: [
        {
          id: 'bunks',
          label: 'Bunk',
          tooltip: 'Bunk Master & Forecourt Stations',
          icon: Building2,
          allowedRoles: ['OWNER', 'MANAGER'],
        },
        {
          id: 'users',
          label: 'Users',
          tooltip: 'User Master & Role Assignments',
          icon: Users,
          allowedRoles: ['OWNER', 'MANAGER'],
        },
        {
          id: 'shifts',
          label: 'Shifts',
          tooltip: 'Staff Shifts & Handover Settlements',
          icon: Layers,
          allowedRoles: ['OWNER', 'MANAGER', 'ATTENDANT', 'CASHIER'],
        },
      ],
    },
    {
      title: 'Operations',
      items: [
        {
          id: 'meters',
          label: 'Meters',
          tooltip: 'Manual Meter Entry & Nozzle Readings',
          icon: Calculator,
          allowedRoles: ['OWNER', 'MANAGER', 'ATTENDANT', 'CASHIER'],
        },
        {
          id: 'mobile',
          label: 'POS',
          tooltip: 'Forecourt Mobile POS Handheld Screen',
          icon: Smartphone,
          allowedRoles: ['OWNER', 'MANAGER', 'ATTENDANT', 'CASHIER'],
        },
        {
          id: 'scheduler',
          label: 'Day close',
          tooltip: 'Automated EOD Midnight Day-Close Scheduler',
          icon: Clock,
          allowedRoles: ['OWNER', 'MANAGER', 'AUDITOR'],
        },
        {
          id: 'notifications',
          label: 'Notifications',
          tooltip: 'Forecourt Activity & Security Alerts',
          icon: Bell,
          allowedRoles: ['OWNER', 'MANAGER', 'ATTENDANT', 'CASHIER', 'AUDITOR'],
        },
      ],
    },
    {
      title: 'Report',
      items: [
        {
          id: 'dsr',
          label: 'Daily sales',
          tooltip: 'Daily Sales Report (DSR) & Form VIII',
          icon: FileSpreadsheet,
          allowedRoles: ['OWNER', 'MANAGER', 'AUDITOR'],
        },
        {
          id: 'efficiency',
          label: 'Sale efficiency',
          tooltip: 'Forecourt Sales Efficiency & Nozzle Velocity',
          icon: TrendingUp,
          allowedRoles: ['OWNER', 'MANAGER', 'AUDITOR'],
        },
      ],
    },
  ];

  const handleNavClick = (id: string) => {
    onSelectTab(id);
    onCloseMobile();
  };

  const handleLogoutClick = () => {
    onCloseMobile();
    if (onLogout) {
      onLogout();
    }
  };

  const displayName = profile?.name || 'AG Fuels Forecourt';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const isItemActive = (itemId: string) => {
    if (activeTab === itemId) return true;
    if (itemId === 'bunks' && (activeTab === 'tanks' || activeTab === 'nozzles')) return true;
    return false;
  };

  const renderNavContent = (collapsed: boolean) => (
    <div className="flex flex-col h-full justify-between">
      <nav className="space-y-4 flex-1 overflow-y-auto no-scrollbar py-1">
        {/* 1. Standalone Top Item: Dashboard */}
        <div>
          <button
            type="button"
            onClick={() => handleNavClick('dashboard')}
            title="Dashboard Overview"
            className={`group flex w-full items-center rounded-xl py-2.5 text-xs font-semibold transition-all duration-150 cursor-pointer border-l-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#12544F] dark:focus-visible:ring-[#2BA096] ${
              collapsed ? 'justify-center px-2' : 'justify-start gap-3 px-3'
            } ${
              isItemActive('dashboard')
                ? 'bg-[#12544F] text-white shadow-xs hover:bg-[#0E433F] border-l-emerald-400 pl-2.5'
                : 'border-l-transparent text-slate-700 hover:text-[#0E433F] hover:bg-[#EBF5F4] dark:text-slate-300 dark:hover:text-white dark:hover:bg-[#123733]'
            }`}
          >
            <LayoutDashboard
              className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-105 ${
                isItemActive('dashboard')
                  ? 'text-white'
                  : 'text-[#12544F] dark:text-[#2BA096]'
              }`}
            />
            {!collapsed && <span className="truncate">Dashboard</span>}
            {!collapsed && isItemActive('dashboard') && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white shrink-0" />
            )}
          </button>
        </div>

        {/* 2. Normal Category Sections: Management, Operations, Report */}
        {navSections.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.allowedRoles || item.allowedRoles.includes(currentRole)
          );

          if (visibleItems.length === 0) return null;

          if (collapsed) {
            return (
              <div
                key={section.title}
                className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800"
              >
                {visibleItems.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = isItemActive(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      title={`${section.title}: ${item.label} - ${item.tooltip}`}
                      className={`flex w-full items-center justify-center rounded-xl p-2.5 transition-all duration-150 cursor-pointer border-l-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#12544F] dark:focus-visible:ring-[#2BA096] ${
                        isActive
                          ? 'bg-[#12544F] text-white shadow-xs hover:bg-[#0E433F] border-l-emerald-400 pl-1.5'
                          : 'border-l-transparent text-slate-500 hover:text-[#0E433F] hover:bg-[#EBF5F4] dark:text-slate-400 dark:hover:text-white dark:hover:bg-[#123733]'
                      }`}
                    >
                      <ItemIcon className="h-4 w-4 shrink-0" />
                    </button>
                  );
                })}
              </div>
            );
          }

          return (
            <div key={section.title} className="space-y-1">
              {/* Category Header Label */}
              <div className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {section.title}
              </div>

              {/* Normal Sidebar Navigation Items */}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = isItemActive(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      title={item.tooltip}
                      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs transition-all duration-150 cursor-pointer border-l-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#12544F] dark:focus-visible:ring-[#2BA096] ${
                        isActive
                          ? 'bg-[#12544F] text-white font-semibold shadow-xs hover:bg-[#0E433F] border-l-emerald-400 pl-2.5'
                          : 'border-l-transparent text-slate-600 hover:text-[#0E433F] hover:bg-[#EBF5F4] font-medium dark:text-slate-300 dark:hover:text-white dark:hover:bg-[#123733]'
                      }`}
                    >
                      <ItemIcon
                        className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-105 ${
                          isActive
                            ? 'text-white'
                            : 'text-slate-400 group-hover:text-[#12544F] dark:text-slate-400 dark:group-hover:text-slate-200'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                      {item.id === 'notifications' && unreadCount > 0 && (
                        <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                          {unreadCount}
                        </span>
                      )}
                      {isActive && item.id !== 'notifications' && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* 3. Bottom Section: My Profile & Logout */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
        {/* Profile Card if not collapsed */}
        {!collapsed && onOpenProfile && (
          <button
            type="button"
            onClick={() => {
              onCloseMobile();
              onOpenProfile();
            }}
            className={`w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-left transition border cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#12544F]/10 border-[#12544F]/40 dark:bg-[#12544F]/25 dark:border-[#2BA096]/50'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 hover:bg-[#EBF5F4] dark:hover:bg-[#123733]'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
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
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-white block truncate leading-tight">
                  {displayName}
                </span>
                <span className="text-[10px] text-[#12544F] dark:text-[#2BA096] font-mono block truncate">
                  {currentRole}
                </span>
              </div>
            </div>
            <User className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
          </button>
        )}

        {/* Collapsed Profile Icon */}
        {collapsed && onOpenProfile && (
          profile?.avatarUrl ? (
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden border border-emerald-500/80 shadow-2xs mx-auto cursor-pointer"
              title="My Profile"
              aria-label="My Profile"
            >
              <img
                src={profile.avatarUrl}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#12544F] text-white font-bold text-xs hover:bg-[#0E433F] transition mx-auto shadow-2xs cursor-pointer"
              title="My Profile"
              aria-label="My Profile"
            >
              {initials}
            </button>
          )
        )}

        {/* Logout at the Bottom */}
        <button
          type="button"
          onClick={handleLogoutClick}
          title="Sign Out of AG Fuels ERP"
          className={`group flex w-full items-center rounded-xl py-2 px-3 text-xs font-bold transition cursor-pointer ${
            collapsed
              ? 'justify-center p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
              : 'justify-start gap-2.5 border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 hover:text-rose-800 dark:hover:text-rose-200'
          }`}
        >
          <LogOut className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Overlay Container */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${
          isMobileOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 ${
            isMobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onCloseMobile}
          aria-hidden="true"
        />

        {/* Slide-over Panel */}
        <aside
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 dark:border-[#194C47] bg-white dark:bg-[#0D2926] shadow-2xl transition-transform duration-300 ease-in-out ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col p-4 safe-area-pb text-slate-800 dark:text-slate-100">
            {/* Header / Brand in Mobile Drawer */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#194C47] pb-3 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src="/logo.png"
                  alt="AG Fuels ERP Logo"
                  className="h-8 w-auto max-w-[32px] object-contain rounded-lg"
                />
                <div className="min-w-0">
                  <h1 className="truncate text-sm font-bold tracking-tight text-[#12544F] dark:text-[#F3F8F7]">
                    AG Fuels ERP
                  </h1>
                  <p className="truncate text-[11px] text-[#12544F]/80 dark:text-[#2BA096] font-mono">
                    Forecourt Operations
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onCloseMobile}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-[#194C47] bg-slate-50 dark:bg-[#123733] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                aria-label="Close Navigation Menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Navigation List & Logout */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {renderNavContent(false)}
            </div>
          </div>
        </aside>
      </div>

      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-slate-200 dark:border-[#194C47] bg-white dark:bg-[#0D2926] text-slate-800 dark:text-slate-100 transition-all duration-300 relative ${
          isCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className="flex h-full flex-col p-3">
          {/* Top Brand Wordmark */}
          <div
            className={`flex items-center border-b border-slate-200 dark:border-[#194C47] pb-3 mb-2.5 ${
              isCollapsed ? 'justify-center' : 'justify-between px-1'
            }`}
          >
            {!isCollapsed && (
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src="/logo.png"
                  alt="AG Fuels ERP Logo"
                  className="h-8 w-auto max-w-[32px] object-contain rounded-lg"
                />
                <div className="min-w-0">
                  <span className="text-sm font-bold tracking-tight text-[#12544F] dark:text-[#F3F8F7] block truncate">
                    AG Fuels
                  </span>
                  <span className="text-[10px] text-[#12544F]/80 dark:text-[#2BA096] font-mono block truncate uppercase tracking-wider">
                    Forecourt ERP
                  </span>
                </div>
              </div>
            )}

            {isCollapsed && (
              <img
                src="/logo.png"
                alt="AG Fuels ERP Logo"
                className="h-8 w-auto max-w-[32px] object-contain rounded-lg"
              />
            )}

            {/* Collapse toggle button */}
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer ${
                isCollapsed ? 'hidden' : ''
              }`}
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation Links and Logout in Bottom */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {renderNavContent(isCollapsed)}
          </div>

          {/* Expand button when collapsed */}
          {isCollapsed && (
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={onToggleCollapse}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Expand Sidebar"
                aria-label="Expand Sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
