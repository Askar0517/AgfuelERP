import React, { useEffect, useState } from 'react';
import { Station, UserRole, UserProfile } from '../../types';
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
  ChevronDown,
  X,
  Fuel,
  User,
  Bell,
  Truck,
  Droplets,
  ArrowDownToLine,
  Sparkles,
  ShieldCheck,
  Activity,
} from 'lucide-react';

interface SidebarProps {
  stations?: Station[];
  currentStationId?: string;
  activeStation?: Station | null;
  onSelectStation?: (id: string) => void;
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
  tag?: string;
}

interface NavSection {
  title: string;
  category: 'operations' | 'management' | 'report';
  color: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  stations = [],
  currentStationId,
  activeStation,
  onSelectStation,
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
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Accordion open/collapsed state per category
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {
      operations: true,
      management: false,
      report: false,
    };
    if (['bunks', 'tanks', 'nozzles', 'users'].includes(activeTab)) {
      initial.management = true;
      initial.operations = false;
    } else if (['dsr', 'efficiency'].includes(activeTab)) {
      initial.report = true;
      initial.operations = false;
    }
    return initial;
  });

  // Keep active category expanded whenever activeTab changes
  useEffect(() => {
    if (['meters', 'decant', 'shifts', 'mobile', 'scheduler', 'notifications'].includes(activeTab)) {
      setOpenSections((prev) => ({ ...prev, operations: true }));
    } else if (['bunks', 'tanks', 'nozzles', 'users'].includes(activeTab)) {
      setOpenSections((prev) => ({ ...prev, management: true }));
    } else if (['dsr', 'efficiency'].includes(activeTab)) {
      setOpenSections((prev) => ({ ...prev, report: true }));
    }
  }, [activeTab]);

  const toggleSection = (category: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

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

  // Petroleum Business-Oriented Navigation Groups:
  // 1. Operations (Daily Routine: Meters, Decant, Shifts, POS, Day Close)
  // 2. Management (Asset Masters: Bunk, Tanks, Nozzles, Users)
  // 3. Report (Statutory & Velocity: Daily Sales DSR, Sale Efficiency)
  const navSections: NavSection[] = [
    {
      title: 'Operations',
      category: 'operations',
      color: 'emerald',
      items: [
        {
          id: 'meters',
          label: 'Meters',
          tooltip: 'Shift Nozzle Readings & Totalizers',
          icon: Calculator,
          allowedRoles: ['OWNER', 'MANAGER', 'ATTENDANT', 'CASHIER'],
          tag: 'Daily',
        },
        {
          id: 'decant',
          label: 'Decant',
          tooltip: 'Tanker Fuel Decanting & Inward Delivery',
          icon: Truck,
          allowedRoles: ['OWNER', 'MANAGER', 'ATTENDANT'],
          tag: 'Tanker',
        },
        {
          id: 'shifts',
          label: 'Shifts',
          tooltip: 'Staff Shifts & Cash Handover Settlements',
          icon: Layers,
          allowedRoles: ['OWNER', 'MANAGER', 'ATTENDANT', 'CASHIER'],
          tag: 'Handover',
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
          tooltip: 'Forecourt Security Alerts & Alarms',
          icon: Bell,
          allowedRoles: ['OWNER', 'MANAGER', 'ATTENDANT', 'CASHIER', 'AUDITOR'],
        },
      ],
    },
    {
      title: 'Management',
      category: 'management',
      color: 'teal',
      items: [
        {
          id: 'bunks',
          label: 'Bunk',
          tooltip: 'Bunk Master Hub & Forecourt Overview',
          icon: Building2,
          allowedRoles: ['OWNER', 'MANAGER'],
          tag: 'Master',
        },
        {
          id: 'tanks',
          label: 'Tanks',
          tooltip: 'Underground Fuel Storage Tanks & Dip',
          icon: Droplets,
          allowedRoles: ['OWNER', 'MANAGER', 'AUDITOR'],
        },
        {
          id: 'nozzles',
          label: 'Nozzles',
          tooltip: 'Forecourt Dispenser MPDs & Nozzle Lines',
          icon: Fuel,
          allowedRoles: ['OWNER', 'MANAGER', 'AUDITOR'],
        },
        {
          id: 'users',
          label: 'Users',
          tooltip: 'Staff Directory & Role Assignments',
          icon: Users,
          allowedRoles: ['OWNER', 'MANAGER'],
        },
      ],
    },
    {
      title: 'Report',
      category: 'report',
      color: 'amber',
      items: [
        {
          id: 'dsr',
          label: 'Daily sales',
          tooltip: 'Statutory Daily Sales Report & Form VIII',
          icon: FileSpreadsheet,
          allowedRoles: ['OWNER', 'MANAGER', 'AUDITOR'],
          tag: 'Statutory',
        },
        {
          id: 'efficiency',
          label: 'Sale efficiency',
          tooltip: 'Dispenser Throughput & Attendant Velocity',
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

  const isItemActive = (itemId: string) => activeTab === itemId;

  // Category themes for accordion section headers
  const categoryHeaderThemes = {
    operations: {
      icon: Activity,
      iconColor: 'text-emerald-400',
      activeBg: 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300',
      badge: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300',
      glow: 'shadow-[0_0_12px_rgba(16,185,129,0.25)]',
    },
    management: {
      icon: ShieldCheck,
      iconColor: 'text-teal-400',
      activeBg: 'bg-teal-500/20 border-teal-400/40 text-teal-300',
      badge: 'bg-teal-500/15 border-teal-400/30 text-teal-300',
      glow: 'shadow-[0_0_12px_rgba(20,184,166,0.25)]',
    },
    report: {
      icon: TrendingUp,
      iconColor: 'text-amber-400',
      activeBg: 'bg-amber-500/20 border-amber-400/40 text-amber-300',
      badge: 'bg-amber-500/15 border-amber-400/30 text-amber-300',
      glow: 'shadow-[0_0_12px_rgba(245,158,11,0.25)]',
    },
  };

  const renderNavContent = (collapsed: boolean) => (
    <div className="flex flex-col h-full justify-between">
      {/* Scrollable Navigation Items */}
      <nav className="space-y-3 flex-1 overflow-y-auto no-scrollbar py-1 pr-1">
        {/* 1. Standalone Top Item: Dashboard */}
        <div className="relative">
          <button
            type="button"
            onClick={() => handleNavClick('dashboard')}
            onMouseEnter={() => setHoveredItem('dashboard')}
            onMouseLeave={() => setHoveredItem(null)}
            title="Dashboard Overview"
            className={`group relative flex w-full items-center rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden ${
              collapsed ? 'justify-center p-2.5' : 'justify-start gap-3 px-3 py-2.5'
            } ${
              isItemActive('dashboard')
                ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/15 text-white shadow-[0_2px_12px_rgba(16,185,129,0.25)] border border-emerald-400/60 font-bold'
                : 'text-slate-300/80 hover:text-white hover:bg-white/[0.08] hover:translate-x-0.5 font-medium'
            }`}
          >
            {/* Active Left Mint Indicator Bar */}
            {isItemActive('dashboard') && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-1.5 rounded-r-full bg-[#5EEAD4] shadow-[0_0_10px_#5EEAD4]" />
            )}

            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                isItemActive('dashboard')
                  ? 'bg-[#5EEAD4] text-slate-950 border border-teal-300 font-extrabold shadow-[0_0_12px_rgba(94,234,212,0.6)]'
                  : 'bg-white/10 text-slate-400 group-hover:scale-105 group-hover:bg-white/20 group-hover:text-white'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
            </div>

            {!collapsed && (
              <div className="flex items-center justify-between flex-1 min-w-0">
                <span className="truncate text-xs font-bold">Dashboard</span>
                {isItemActive('dashboard') ? (
                  <span className="h-2 w-2 rounded-full bg-[#5EEAD4] shadow-[0_0_8px_#5EEAD4] animate-pulse" />
                ) : (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-black/30 border border-white/10 text-teal-200/90">
                    Live
                  </span>
                )}
              </div>
            )}

            {/* Floating Tooltip in Collapsed Mode */}
            {collapsed && hoveredItem === 'dashboard' && (
              <div className="absolute left-full ml-3.5 z-50 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xl border border-slate-700/80 whitespace-nowrap pointer-events-none animate-fadeIn flex items-center gap-1.5">
                <LayoutDashboard className="h-3.5 w-3.5 text-emerald-400" />
                <span>Dashboard Overview</span>
              </div>
            )}
          </button>
        </div>

        {/* 2. Structured Sections: Operations, Management, Report (Accordion) */}
        {navSections.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.allowedRoles || item.allowedRoles.includes(currentRole)
          );

          if (visibleItems.length === 0) return null;
          const isSectionOpen = !collapsed ? (openSections[section.category] ?? true) : true;

          const theme = categoryHeaderThemes[section.category];
          const CategoryIcon = theme.icon;

          return (
            <div key={section.title} className="space-y-1">
              {/* Accordion Category Header Button - Crisp White & No Number Badge */}
              {!collapsed ? (
                <button
                  type="button"
                  onClick={() => toggleSection(section.category)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 mt-2.5 rounded-xl hover:bg-white/8 transition-all duration-200 group cursor-pointer text-left select-none"
                  aria-expanded={isSectionOpen}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 ${
                        isSectionOpen
                          ? `${theme.activeBg} ${theme.glow}`
                          : 'bg-white/5 border-white/10 text-teal-300/60 group-hover:text-white group-hover:bg-white/10 group-hover:border-white/20'
                      }`}
                    >
                      <CategoryIcon className={`h-3 w-3 ${isSectionOpen ? theme.iconColor : 'currentColor'}`} />
                    </div>

                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-white truncate">
                      {section.title}
                    </span>
                  </div>

                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-all duration-200 ${
                      isSectionOpen
                        ? 'text-teal-200 bg-white/10 rotate-180'
                        : 'text-teal-300/40 group-hover:text-white group-hover:bg-white/5'
                    }`}
                  >
                    <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200" />
                  </div>
                </button>
              ) : (
                <div className="py-1.5 flex justify-center">
                  <div className="h-[1px] w-8 bg-white/15" />
                </div>
              )}

              {/* Accordion Collapsible Items */}
              {isSectionOpen && (
                <div className="space-y-1 animate-fadeIn">
                  {visibleItems.map((item) => {
                    const ItemIcon = item.icon;
                    const isActive = isItemActive(item.id);
                    const isHovered = hoveredItem === item.id;

                    return (
                      <div key={item.id} className="relative">
                        <button
                          type="button"
                          onClick={() => handleNavClick(item.id)}
                          onMouseEnter={() => setHoveredItem(item.id)}
                          onMouseLeave={() => setHoveredItem(null)}
                          title={collapsed ? item.label : undefined}
                          className={`group relative flex w-full items-center rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden ${
                            collapsed ? 'justify-center p-2' : 'justify-start gap-2.5 px-3 py-2'
                          } ${
                            isActive
                              ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/15 text-white shadow-[0_2px_12px_rgba(16,185,129,0.25)] border border-emerald-400/60 font-bold'
                              : 'text-slate-300/80 hover:text-white hover:bg-white/[0.08] hover:translate-x-0.5 font-medium'
                          }`}
                        >
                          {/* Active Left Mint Indicator Bar */}
                          {isActive && (
                            <span className="absolute left-0 top-1.5 bottom-1.5 w-1.5 rounded-r-full bg-[#5EEAD4] shadow-[0_0_10px_#5EEAD4]" />
                          )}

                          {/* Icon Box */}
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                              isActive
                                ? 'bg-[#5EEAD4] text-slate-950 border border-teal-300 font-extrabold shadow-[0_0_12px_rgba(94,234,212,0.6)]'
                                : 'bg-white/10 text-slate-400 group-hover:text-white group-hover:bg-white/20 group-hover:scale-105'
                            }`}
                          >
                            <ItemIcon className="h-4 w-4" />
                          </div>

                          {!collapsed && (
                            <div className="flex items-center justify-between flex-1 min-w-0">
                              <span
                                className={`truncate text-xs ${
                                  isActive ? 'font-bold text-white' : 'font-normal text-slate-300 group-hover:text-white'
                                }`}
                              >
                                {item.label}
                              </span>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {item.id === 'notifications' && unreadCount > 0 && (
                                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-xs animate-pulse">
                                    {unreadCount}
                                  </span>
                                )}

                                {item.tag && !isActive && (
                                  <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-black/30 border border-white/10 text-teal-200/90">
                                    {item.tag}
                                  </span>
                                )}

                                {isActive && (
                                  <span className="h-2 w-2 rounded-full bg-[#5EEAD4] shadow-[0_0_8px_#5EEAD4] animate-pulse" />
                                )}
                              </div>
                            </div>
                          )}

                          {/* Floating Tooltip in Collapsed Mode */}
                          {collapsed && isHovered && (
                            <div className="absolute left-full ml-3.5 z-50 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xl border border-slate-700/80 whitespace-nowrap pointer-events-none animate-fadeIn flex items-center gap-2">
                              <ItemIcon className="h-3.5 w-3.5 text-emerald-400" />
                              <span>{item.label}</span>
                              {item.tag && (
                                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-800 text-emerald-300 border border-slate-700">
                                  {item.tag}
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* 3. Bottom Floating Profile & Logout Zone */}
      <div className="pt-3 border-t border-white/15 space-y-2 shrink-0">
        {/* Profile Floating Card (Expanded) */}
        {!collapsed && onOpenProfile && (
          <button
            type="button"
            onClick={() => {
              onCloseMobile();
              onOpenProfile();
            }}
            className={`w-full flex items-center justify-between rounded-2xl p-2.5 text-left transition border cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white/15 border-emerald-400/50 shadow-xs'
                : 'border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/25 text-white'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                {profile?.avatarUrl ? (
                  <div className="h-8 w-8 shrink-0 rounded-xl overflow-hidden border border-emerald-400/80 shadow-xs bg-slate-900">
                    <img
                      src={profile.avatarUrl}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-extrabold text-xs shadow-xs">
                    {initials}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0B2E2A]" />
              </div>

              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate leading-tight">
                  {displayName}
                </span>
                <span className="text-[10px] text-teal-300 font-mono block truncate font-semibold">
                  {currentRole}
                </span>
              </div>
            </div>
            <User className="h-4 w-4 text-teal-300/70 shrink-0" />
          </button>
        )}

        {/* Collapsed Profile Icon */}
        {collapsed && onOpenProfile && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onOpenProfile}
              className="relative flex h-9 w-9 items-center justify-center rounded-2xl overflow-hidden border border-emerald-400/80 shadow-xs cursor-pointer hover:scale-105 transition"
              title={`My Profile (${displayName})`}
            >
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-xs">
                  {initials}
                </div>
              )}
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-[#0B2E2A]" />
            </button>
          </div>
        )}

        {/* Floating Logout Button */}
        <button
          type="button"
          onClick={handleLogoutClick}
          title="Sign Out of AG Fuels ERP"
          className={`group flex w-full items-center rounded-2xl transition cursor-pointer font-bold ${
            collapsed
              ? 'justify-center p-2 text-rose-300 hover:bg-rose-500/20'
              : 'justify-start gap-2.5 px-3 py-2 border border-rose-400/30 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 text-xs'
          }`}
        >
          <LogOut className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Mobile Floating Slide-Over Drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-300 ${
          isMobileOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
        }`}
      >
        {/* Backdrop Glass */}
        <div
          className={`absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 ${
            isMobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onCloseMobile}
          aria-hidden="true"
        />

        {/* Floating Slide Panel */}
        <aside
          className={`absolute inset-y-3 left-3 w-76 max-w-[85vw] flex flex-col rounded-3xl border border-[#175C54]/70 bg-gradient-to-b from-[#0E3D38] via-[#0B332E] to-[#072421] text-white backdrop-blur-2xl shadow-2xl transition-transform duration-300 ease-out overflow-hidden ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-[110%]'
          }`}
        >
          <div className="flex h-full flex-col p-4 safe-area-pb text-white">
            {/* Header Brand */}
            <div className="flex items-center justify-between border-b border-white/15 pb-3 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1 rounded-xl bg-white/10 border border-white/20">
                  <img
                    src="/logo.png"
                    alt="AG Fuels ERP Logo"
                    className="h-7 w-auto max-w-[28px] object-contain rounded-lg"
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-sm font-extrabold tracking-tight text-white">
                    AG Fuels ERP
                  </h1>
                  <p className="truncate text-[10px] text-teal-300 font-mono font-semibold">
                    Forecourt Operations
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={onCloseMobile}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-teal-200 hover:text-white transition cursor-pointer"
                aria-label="Close Navigation Menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Navigation List & Profile */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {renderNavContent(false)}
            </div>
          </div>
        </aside>
      </div>

      {/* 2. Desktop Floating Persistent Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 py-3 pl-3 pr-1.5 transition-all duration-300 select-none ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Floating Shell Panel */}
        <div className="relative flex h-full flex-col p-3 rounded-3xl border border-[#175C54]/70 bg-gradient-to-b from-[#0E3D38] via-[#0B332E] to-[#072421] text-white backdrop-blur-2xl shadow-[0_20px_50px_-10px_rgba(11,46,42,0.45)] overflow-hidden">
          {/* Top Collapse Toggle Rail */}
          <div
            className={`flex items-center border-b border-white/10 pb-2 mb-2 ${
              isCollapsed ? 'justify-center' : 'justify-end px-1'
            }`}
          >
            {/* Floating Collapse / Expand Toggle Button */}
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`flex items-center justify-center rounded-xl border border-white/15 bg-white/10 text-teal-200 hover:text-white hover:bg-white/20 transition cursor-pointer shadow-2xs ${
                isCollapsed ? 'h-8 w-8' : 'h-7 w-7'
              }`}
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Navigation Links and Logout in Bottom */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {renderNavContent(isCollapsed)}
          </div>
        </div>
      </aside>
    </>
  );
};
