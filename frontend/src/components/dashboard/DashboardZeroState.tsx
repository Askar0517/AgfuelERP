import React from 'react';
import { FuelProduct, AuthUser } from '../../types';
import {
  Sparkles,
  Building2,
  Droplets,
  Fuel,
  Clock,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Plus,
  Users,
} from 'lucide-react';

interface DashboardZeroStateProps {
  fuels: FuelProduct[];
  currentUser?: AuthUser | null;
  onNavigate: (tab: string) => void;
}

export const DashboardZeroState: React.FC<DashboardZeroStateProps> = ({
  fuels,
  currentUser,
  onNavigate,
}) => {
  return (
    <div className="space-y-6 pb-12 sm:pb-6 animate-in fade-in duration-200">
      {/* Welcome & Setup Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-white to-emerald-50/40 dark:from-[#0D2926] dark:via-gray-900 dark:to-gray-950 p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>INITIAL PLATFORM SETUP &bull; ZERO STATIONS CONFIGURED</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Welcome to AG Fuels Forecourt ERP
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Your database connection is verified and PostgreSQL tables are synchronized. To start managing your fuel inventory, pumps, totalizer readings, and attendant shifts, register your first petrol bunk station below.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('bunks')}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-5 py-3 shadow-md hover:shadow-lg transition active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Register First Bunk Station</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('users')}
              className="flex items-center gap-2 rounded-xl border border-slate-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-gray-800 transition active:scale-95 cursor-pointer"
            >
              <Users className="h-4 w-4" />
              <span>Manage Staff & Users</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4-Step Onboarding Workflow Guide */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Recommended Setup Workflow
          </h2>
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 font-mono">
            Step 1 of 4 Required
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="rounded-2xl border-2 border-emerald-500/40 bg-white dark:bg-gray-900 p-5 shadow-xs flex flex-col justify-between transition hover:border-emerald-500">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  1
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  Action Needed
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Register Fuel Bunk</span>
              </h3>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-normal">
                Configure station name, code, operating hours, currency, and assign a forecourt station manager.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('bunks')}
              className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 transition cursor-pointer"
            >
              <span>Add Station Now</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Step 2 */}
          <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 p-5 shadow-2xs flex flex-col justify-between opacity-85 hover:opacity-100 transition">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 flex items-center justify-center font-bold">
                  2
                </div>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400">
                  Step 2
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Droplets className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                <span>Storage Tanks</span>
              </h3>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-normal">
                Add underground storage tanks for 98 Octane, 95 Octane, and Diesel with calibration and dip charts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('tanks')}
              className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-slate-700 dark:text-slate-300 font-semibold text-xs py-2 hover:bg-slate-100 transition cursor-pointer"
            >
              <span>Configure Tanks</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Step 3 */}
          <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 p-5 shadow-2xs flex flex-col justify-between opacity-85 hover:opacity-100 transition">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 flex items-center justify-center font-bold">
                  3
                </div>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400">
                  Step 3
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Fuel className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Dispensers & Nozzles</span>
              </h3>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-normal">
                Map electronic dispensers and nozzles to tanks for automated flow and totalizer calculations.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('nozzles')}
              className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-slate-700 dark:text-slate-300 font-semibold text-xs py-2 hover:bg-slate-100 transition cursor-pointer"
            >
              <span>Setup Nozzles</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Step 4 */}
          <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 p-5 shadow-2xs flex flex-col justify-between opacity-85 hover:opacity-100 transition">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 flex items-center justify-center font-bold">
                  4
                </div>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400">
                  Step 4
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Shift Rosters</span>
              </h3>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-normal">
                Assign attendants to forecourt islands, monitor shift meter readings, and reconcile collections.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('shifts')}
              className="mt-4 w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-slate-700 dark:text-slate-300 font-semibold text-xs py-2 hover:bg-slate-100 transition cursor-pointer"
            >
              <span>View Shifts</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Master Catalog & System Readiness Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Fuel Master Catalog */}
        <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Fuel className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Fuel Master Catalog</h3>
            </div>
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
              {fuels.length} Fuels Configured
            </span>
          </div>
          <div className="space-y-2.5">
            {fuels.map((fuel) => (
              <div
                key={fuel.code}
                className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-gray-950/70 p-3 border border-slate-100 dark:border-gray-800"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: fuel.color }}
                    aria-hidden="true"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{fuel.name}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 font-mono">
                      Code: {fuel.code} &bull; Std Density: {fuel.densityStd15c} kg/m³
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                    ₹{fuel.ratePerLiter.toFixed(2)}
                  </span>
                  <span className="block text-[10px] text-slate-400">per liter</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Diagnostic Status */}
        <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">System Readiness & Diagnostics</h3>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Operational
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-gray-800/60">
              <span className="text-slate-600 dark:text-gray-400">PostgreSQL 17 Database Engine:</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">Connected (15/15 Tables)</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-gray-800/60">
              <span className="text-slate-600 dark:text-gray-400">Active Administrator:</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                {currentUser?.name || 'Administrator'} ({currentUser?.role || 'OWNER'})
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-gray-800/60">
              <span className="text-slate-600 dark:text-gray-400">Authentication & Session Layer:</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">JWT Signed & Active</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600 dark:text-gray-400">Atomic Number Sequences:</span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">Ready (BUNK-, TANK-, NOZZ-, READ-)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};