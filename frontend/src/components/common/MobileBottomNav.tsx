import React from 'react';
import { LayoutDashboard, Droplets, Calculator, Layers, Menu } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onToggleMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onToggleMenu,
}) => {
  const primaryTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tanks', label: 'Tanks', icon: Droplets },
    { id: 'meters', label: 'Meters', icon: Calculator },
    { id: 'shifts', label: 'Shifts', icon: Layers },
  ];

  const isMoreActive = ['bunks', 'tanks', 'nozzles', 'decant', 'users', 'scheduler', 'dsr', 'efficiency', 'permissions', 'mobile', 'profile'].includes(activeTab);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 text-slate-700 dark:text-slate-300 backdrop-blur-md px-2 py-1 shadow-lg dark:shadow-2xl safe-area-pb transition-colors touch-none select-none overscroll-none">
      <div className="flex items-center justify-around gap-1">
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-[10px] leading-tight mt-1 truncate">
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* More / Menu Drawer Toggle */}
        <button
          type="button"
          onClick={onToggleMenu}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors active:scale-95 ${
            isMoreActive
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
          }`}
          aria-label="All features menu"
        >
          <Menu className="h-4 w-4" />
          <span className="text-[10px] leading-tight mt-1 truncate">
            More
          </span>
        </button>
      </div>
    </nav>
  );
};
