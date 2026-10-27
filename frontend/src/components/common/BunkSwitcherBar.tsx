import React from 'react';
import { Station } from '../../types';
import { Building2, MapPin, CheckCircle2, ChevronRight, Layers } from 'lucide-react';
import { SelectDropdown } from './SelectDropdown';

export interface BunkSwitcherBarProps {
  stations: Station[];
  currentStationId: string;
  onSelectStation: (stationId: string) => void;
  title?: string;
  allowAllBunks?: boolean;
  allBunksLabel?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  showDetails?: boolean;
}

export const BunkSwitcherBar: React.FC<BunkSwitcherBarProps> = ({
  stations = [],
  currentStationId,
  onSelectStation,
  title = 'Active Forecourt Bunk',
  allowAllBunks = false,
  allBunksLabel = 'All Bunks (Consolidated Network)',
  badge,
  actions,
  className = '',
  showDetails = true,
}) => {
  const isAll = allowAllBunks && currentStationId === 'ALL';
  const activeStation =
    stations.find((s) => s.id === currentStationId) || stations[0];

  const dropdownOptions = [
    ...(allowAllBunks
      ? [
          {
            value: 'ALL',
            label: allBunksLabel,
            badge: 'NETWORK',
            badgeClass: 'bg-[#12544F]/10 text-[#12544F] dark:text-[#2BA096]',
          },
        ]
      : []),
    ...stations.map((s) => ({
      value: s.id,
      label: s.name.replace(/\s*\([A-Z0-9-]+\)\s*$/i, '').trim() || s.name,
      badge: s.code,
    })),
  ];

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#194C47] bg-white dark:bg-[#0D2926] shadow-2xs transition-colors ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        {/* Left Side: Station Identity & Details */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-[#12544F]/10 dark:bg-[#12544F]/30 text-[#12544F] dark:text-[#2BA096] border border-[#12544F]/20 shadow-2xs">
            {isAll ? <Layers className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {title}
              </span>
              {badge}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate max-w-[220px] sm:max-w-[320px] md:max-w-[420px]">
                {isAll ? allBunksLabel : activeStation ? activeStation.name : 'Select Station'}
              </span>
              {!isAll && activeStation && (
                <span className="font-mono text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shrink-0">
                  {activeStation.code}
                </span>
              )}
            </div>
            {showDetails && !isAll && activeStation && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1.5">
                {activeStation.location && (
                  <span className="truncate max-w-[280px] sm:max-w-[400px]">
                    {activeStation.location}
                  </span>
                )}
                {activeStation.managerName && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="hidden sm:inline text-slate-600 dark:text-slate-300">
                      Mgr: {activeStation.managerName}
                    </span>
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Switcher Dropdown & Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 shrink-0">
          {stations.length > 1 && (
            <div className="w-full sm:w-64 md:w-72">
              <SelectDropdown
                value={currentStationId || (activeStation?.id ?? '')}
                onChange={onSelectStation}
                options={dropdownOptions}
                placeholder="Switch fuel bunk..."
                searchable={stations.length > 4}
                className="w-full"
              />
            </div>
          )}

          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      </div>
    </div>
  );
};
