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
  ChevronDown,
  X,
  Fuel,
  User,
  Bell,
  Truck,
  Droplets,
  PanelLeftClose,
  PanelLeftOpen,
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

  // Petroleum Business-Oriented Navigation Groups
  const navSections: NavSection[] = [
    {
      title: 'Operations',
      category: 'operations',
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

  // Render a Single Nav Item with sleek pill style in brand petrol/teal colors
  const renderItemButton = (
    item: { id: string; label: string; tooltip?: string; icon: React.ComponentType<{ className?: string }>; tag?: string },
    collapsed: boolean
  ) => {
    const ItemIcon = item.icon;
    const isActive = isItemActive(item.id);
    const isHovered = hoveredItem === item.id;

    return (
      <div key={item.id} className="relative flex items-center w-full px-3">
        {/* Left Activator: Flush on the outer left sidebar border (left: 0) with zero gap */}
        {isActive && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#5EEAD4] shadow-[0_0_10px_#5EEAD4] z-20 pointer-events-none" />
        )}

        <button
          type="button"
          onClick={() => handleNavClick(item.id)}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
          title={collapsed ? item.label : undefined}
          className={`group w-full flex items-center rounded-xl transition-all duration-150 cursor-pointer select-none ${
            collapsed ? 'justify-center h-10 w-10 mx-auto' : 'justify-start gap-3 px-3 py-2'
          } ${
            isActive
              ? 'bg-white/15 text-white font-medium border border-emerald-400/30 shadow-xs'
              : 'text-slate-300/80 hover:text-white hover:bg-white/[0.08] font-normal'
          }`}
        >
          {/* Direct Inline Icon with Brand Mint Accent on Active */}
          <ItemIcon
            className={`h-4.5 w-4.5 shrink-0 transition-colors ${
              isActive ? 'text-[#5EEAD4]' : 'text-teal-200/60 group-hover:text-white'
            }`}
          />

          {!collapsed && (
            <div className="flex items-center justify-between flex-1 min-w-0">
              <span
                className={`truncate text-sm ${
                  isActive ? 'font-medium text-white' : 'font-normal text-slate-300/80 group-hover:text-white'
                }`}
              >
                {item.label}
              </span>

              {/* Badges / Pill counters */}
              <div className="flex items-center gap-1.5 shrink-0">
                {item.id === 'notifications' && unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500 text-white shadow-xs">
                    {unreadCount}
                  </span>
                )}

                {item.tag && (
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-md transition-colors ${
                      isActive
                        ? 'bg-white/15 text-teal-200 border border-teal-300/30'
                        : 'bg-black/30 text-teal-200/80 group-hover:text-teal-100 border border-white/10'
                    }`}
                  >
                    {item.tag}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Floating Tooltip in Collapsed Mode */}
          {collapsed && isHovered && (
            <div className="absolute left-full ml-3 z-50 px-2.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-medium shadow-2xl border border-teal-500/40 whitespace-nowrap pointer-events-none animate-fadeIn flex items-center gap-2">
              <ItemIcon className={`h-3.5 w-3.5 ${isActive ? 'text-[#5EEAD4]' : 'text-teal-300'}`} />
              <span>{item.label}</span>
              {item.tag && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 text-teal-300 border border-white/10">
                  {item.tag}
                </span>
              )}
            </div>
          )}
        </button>

        {/* Right Activator: Flush on the outer right sidebar border (right: 0) with zero gap */}
        {isActive && (
          <span className="absolute right-0 top-1.5 bottom-1.5 w-1 rounded-l-full bg-[#5EEAD4] shadow-[0_0_10px_#5EEAD4] z-20 pointer-events-none" />
        )}
      </div>
    );
  };

  const renderNavContent = (collapsed: boolean) => (
    <div className="flex flex-col h-full justify-between">
      {/* Scrollable Navigation Items */}
      <nav className="space-y-1 flex-1 overflow-y-auto no-scrollbar py-1">
        {/* Top Section Header */}
        {!collapsed && (
          <div className="px-3 pt-1 pb-1.5 text-xs font-semibold text-teal-200/80 tracking-tight">
            Navigation
          </div>
        )}

        {/* 1. Standalone Top Item: Dashboard */}
        {renderItemButton(
          {
            id: 'dashboard',
            label: 'Dashboard',
            tooltip: 'Dashboard Overview',
            icon: LayoutDashboard,
          },
          collapsed
        )}

        {/* 2. Structured Sections: Operations, Management, Report (Accordion) */}
        {navSections.map((section) => {
          const visibleItems = section.items.filter(
            (item) => !item.allowedRoles || item.allowedRoles.includes(currentRole)
          );

          if (visibleItems.length === 0) return null;
          const isSectionOpen = !collapsed ? (openSections[section.category] ?? true) : true;

          return (
            <div key={section.title} className="space-y-0.5 pt-1.5">
              {/* Accordion Category Header Button */}
              {!collapsed ? (
                <div className="px-3">
                  <button
                    type="button"
                    onClick={() => toggleSection(section.category)}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/[0.06] transition-colors duration-150 group cursor-pointer text-left select-none"
                    aria-expanded={isSectionOpen}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-200/80 group-hover:text-white truncate">
                      {section.title}
                    </span>

                    <ChevronDown
                      className={`h-3.5 w-3.5 text-teal-300/60 group-hover:text-white transition-transform duration-200 ${
                        isSectionOpen ? 'rotate-0' : '-rotate-90'
                      }`}
                    />
                  </button>
                </div>
              ) : (
                <div className="py-2 flex justify-center">
                  <div className="h-[1px] w-6 bg-white/15" />
                </div>
              )}

              {/* Accordion Collapsible Items */}
              {isSectionOpen && (
                <div className="space-y-0.5">
                  {visibleItems.map((item) => renderItemButton(item, collapsed))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* 3. Bottom Profile & Action Controls */}
      <div className="pt-2 border-t border-white/15 space-y-1 shrink-0 px-3">
        {/* Profile Floating Card (Expanded) */}
        {!collapsed && onOpenProfile && (
          <div className="relative flex items-center w-full">
            {activeTab === 'profile' && (
              <span className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-[#5EEAD4] shadow-[0_0_10px_#5EEAD4] z-20 pointer-events-none" />
            )}
            <button
              type="button"
              onClick={() => {
                onCloseMobile();
                onOpenProfile();
              }}
              className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors duration-150 cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-white/15 text-white border border-emerald-400/30 shadow-xs'
                  : 'hover:bg-white/[0.08] text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative">
                  {profile?.avatarUrl ? (
                    <div className="h-7 w-7 shrink-0 rounded-full overflow-hidden border border-emerald-400/80 bg-slate-900 shadow-xs">
                      <img
                        src={profile.avatarUrl}
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-[11px] shadow-xs">
                      {initials}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#0B2E2A]" />
                </div>

                <div className="min-w-0">
                  <span className="text-xs font-semibold text-white block truncate leading-tight">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-teal-300 font-mono block truncate font-semibold">
                    {currentRole}
                  </span>
                </div>
              </div>
              <User className="h-4 w-4 text-teal-300/70 shrink-0" />
            </button>
            {activeTab === 'profile' && (
              <span className="absolute -right-3 top-2 bottom-2 w-1 rounded-l-full bg-[#5EEAD4] shadow-[0_0_10px_#5EEAD4] z-20 pointer-events-none" />
            )}
          </div>
        )}

        {/* Collapsed Profile Icon */}
        {collapsed && onOpenProfile && (
          <div className="relative flex items-center justify-center w-full py-1">
            {activeTab === 'profile' && (
              <span className="absolute -left-3 top-2 bottom-2 w-1 rounded-r-full bg-[#5EEAD4] shadow-[0_0_10px_#5EEAD4] z-20 pointer-events-none" />
            )}
            <button
              type="button"
              onClick={onOpenProfile}
              className="relative flex h-8 w-8 items-center justify-center rounded-full overflow-hidden border border-emerald-400/80 shadow-xs cursor-pointer hover:scale-105 transition"
              title={`My Profile (${displayName})`}
            >
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-[11px]">
                  {initials}
                </div>
              )}
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-[#0B2E2A]" />
            </button>
            {activeTab === 'profile' && (
              <span className="absolute -right-3 top-2 bottom-2 w-1 rounded-l-full bg-[#5EEAD4] shadow-[0_0_10px_#5EEAD4] z-20 pointer-events-none" />
            )}
          </div>
        )}

        {/* Collapse Sidebar Action Button (Desktop Only) */}
        {!collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="group flex w-full items-center gap-3 px-3 py-2 rounded-xl text-teal-200/70 hover:text-white hover:bg-white/[0.08] transition-colors duration-150 cursor-pointer text-sm font-normal"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4.5 w-4.5 shrink-0 text-teal-200/70 group-hover:text-white transition-colors" />
            <span>Collapse sidebar</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl text-teal-200/70 hover:text-white hover:bg-white/[0.08] transition-colors duration-150 cursor-pointer"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-4.5 w-4.5 text-teal-200/70 group-hover:text-white transition-colors" />
          </button>
        )}

        {/* Reverted Color (Rose / Alert), Preserved Style (Pill / Inline Icon) Logout Button */}
        <button
          type="button"
          onClick={handleLogoutClick}
          title="Sign Out of AG Fuels ERP"
          className={`group flex w-full items-center rounded-xl transition-all duration-150 cursor-pointer font-medium ${
            collapsed
              ? 'justify-center h-10 w-10 mx-auto text-rose-300 hover:bg-rose-500/20'
              : 'justify-start gap-3 px-3 py-2 border border-rose-400/30 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 text-sm'
          }`}
        >
          <LogOut className="h-4.5 w-4.5 shrink-0 transition-transform group-hover:-translate-x-0.5" />
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

        {/* Floating Slide Panel in Brand Petrol Teal Gradient */}
        <aside
          className={`absolute inset-y-3 left-3 w-76 max-w-[85vw] flex flex-col rounded-3xl border border-[#175C54]/70 bg-gradient-to-b from-[#0E3D38] via-[#0B332E] to-[#072421] text-white backdrop-blur-2xl shadow-2xl transition-transform duration-300 ease-out overflow-hidden ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-[110%]'
          }`}
        >
          <div className="flex h-full flex-col py-3 px-0 safe-area-pb text-white">
            {/* Header Brand */}
            <div className="flex items-center justify-between border-b border-white/15 pb-3 mb-2 px-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1 rounded-xl bg-white/10 border border-white/20">
                  <img
                    src="/logo.png"
                    alt="AG Fuels ERP Logo"
                    className="h-6 w-auto max-w-[24px] object-contain rounded"
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-sm font-bold tracking-tight text-white">
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
                className="flex h-7 w-7 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-teal-200 hover:text-white transition cursor-pointer"
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

      {/* 2. Desktop Persistent Sidebar in Brand Petrol Teal Gradient */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 py-3 pl-3 pr-1.5 transition-all duration-300 select-none ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Floating Shell Panel */}
        <div className="relative flex h-full flex-col py-3 px-0 rounded-3xl border border-[#175C54]/70 bg-gradient-to-b from-[#0E3D38] via-[#0B332E] to-[#072421] text-white backdrop-blur-2xl shadow-[0_20px_50px_-10px_rgba(11,46,42,0.45)] overflow-hidden">
          {/* Navigation Links and Logout in Bottom */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {renderNavContent(isCollapsed)}
          </div>
        </div>
      </aside>
    </>
  );
};
