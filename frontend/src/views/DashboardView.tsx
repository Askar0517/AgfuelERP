import React, { useState, useEffect } from 'react';
import {
  Station,
  FuelProduct,
  Tank,
  Dispenser,
  Shift,
  TankLoadDecanting,
  AnalyticsOverview,
  AuthUser,
} from '../types';
import {
  TrendingUp,
  Droplets,
  AlertTriangle,
  Fuel,
  ArrowDownToLine,
  Banknote,
  ShieldCheck,
  ChevronRight,
  Calculator,
  Layers,
  Ruler,
  CheckCircle2,
  Building2,
  ChevronDown,
  Globe,
} from 'lucide-react';
import { SelectDropdown } from '../components/common/SelectDropdown';

interface DashboardViewProps {
  station: Station;
  stations?: Station[];
  currentStationId?: string;
  onSelectStation?: (id: string) => void;
  fuels: FuelProduct[];
  tanks: Tank[];
  dispensers: Dispenser[];
  shifts: Shift[];
  tankLoads: TankLoadDecanting[];
  analytics: AnalyticsOverview | null;
  currentUser?: AuthUser | null;
  onOpenDipModal: (tank: Tank) => void;
  onOpenDecantModal: (tank: Tank) => void;
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  station,
  stations = [],
  currentStationId,
  onSelectStation,
  fuels,
  tanks,
  dispensers,
  shifts,
  tankLoads,
  currentUser,
  onOpenDipModal,
  onOpenDecantModal,
  onNavigate,
}) => {
  const [selectedBunkId, setSelectedBunkId] = useState<string>(
    currentStationId || station?.id || 'st-101'
  );

  // Sync with prop if it changes externally
  useEffect(() => {
    if (currentStationId && currentStationId !== selectedBunkId && selectedBunkId !== 'ALL') {
      setSelectedBunkId(currentStationId);
    }
  }, [currentStationId]);

  // Determine permitted stations
  const isMultiBunkAuthorized =
    !currentUser ||
    currentUser.role === 'OWNER' ||
    (currentUser.assignedBunks && currentUser.assignedBunks.length > 1);

  const fallbackStation: Station = {
    id: selectedBunkId || station?.id || 'st-101',
    name: 'Metro Central Forecourt',
    code: 'BUNK-000001',
    location: 'Connaught Place Outer Ring, New Delhi',
    managerName: 'Rajesh Sharma',
    timezone: 'Asia/Kolkata',
    status: 'ONLINE',
    operatingHours: '24_HOURS',
    eodCloseTime: '23:59',
  };

  const availableStations = (stations && stations.length > 0 ? stations : [station]).filter(
    (s): s is Station => Boolean(s && s.id)
  );

  const permittedStations = availableStations.filter((s) => {
    if (!currentUser || currentUser.role === 'OWNER') return true;
    if (currentUser.assignedBunks && currentUser.assignedBunks.length > 0) {
      return currentUser.assignedBunks.includes(s.id);
    }
    return s.id === currentUser.stationId;
  });

  const isAllBunks = selectedBunkId === 'ALL' && isMultiBunkAuthorized;
  const activeStation =
    permittedStations.find((s) => s.id === selectedBunkId) ||
    permittedStations[0] ||
    station ||
    fallbackStation;

  const currentTanks = tanks.filter((t) =>
    isAllBunks ? permittedStations.some((ps) => ps.id === t.stationId) : t.stationId === activeStation.id
  );
  const currentDispensers = dispensers.filter((d) =>
    isAllBunks ? permittedStations.some((ps) => ps.id === d.stationId) : d.stationId === activeStation.id
  );
  const currentLoads = tankLoads.filter((l) =>
    isAllBunks ? permittedStations.some((ps) => ps.id === l.stationId) : l.stationId === activeStation.id
  );
  const currentShifts = shifts.filter((s) =>
    isAllBunks ? permittedStations.some((ps) => ps.id === s.stationId) : s.stationId === activeStation.id
  );

  const activeShifts = currentShifts.filter((s) => s.status === 'ACTIVE');

  // Aggregated KPIs
  const totalCapacity = currentTanks.reduce((s, t) => s + t.capacityLiters, 0);
  const totalVolume = currentTanks.reduce((s, t) => s + t.currentVolumeLiters, 0);
  const occupancyPct = totalCapacity > 0 ? (totalVolume / totalCapacity) * 100 : 0;

  const totalFuelSoldToday = currentShifts.reduce((s, sh) => s + sh.totalFuelSoldLiters, 0);
  const totalRevenueToday = currentShifts.reduce((s, sh) => s + sh.totalExpectedRevenue, 0);
  const totalCashCollected = currentShifts.reduce((s, sh) => s + sh.cashSubmitted, 0);
  const totalDigitalCollected = currentShifts.reduce((s, sh) => s + sh.digitalSubmitted, 0);

  // Issues & Alerts
  const lowStockTanks = currentTanks.filter(
    (t) => t.currentVolumeLiters <= (t.lowAlertThresholdLiters ?? t.lowThresholdLiters ?? 3000)
  );
  const waterAlertTanks = currentTanks.filter((t) => (t.waterDipCm || 0) > 0);

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 pb-12 sm:pb-6">
      {/* 1. Page Header with Bunk Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 rounded-3xl border border-slate-200 dark:border-[#194C47] bg-white dark:bg-[#0D2926] p-5 sm:p-6 shadow-xs transition-colors">
        {/* Title Zone */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-[#12544F] animate-pulse" />
            <span className="font-semibold text-[#12544F] dark:text-[#2BA096] uppercase tracking-wider text-[11px]">
              Live Forecourt Operations
            </span>
            <span aria-hidden="true">·</span>
            <span>{todayFormatted}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
              {isAllBunks ? 'ALL-NETWORK' : activeStation?.code || 'BUNK-000001'}
            </span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
            {isAllBunks ? 'Consolidated Forecourt Network' : activeStation?.name || 'Forecourt Station'}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {isAllBunks ? (
              <span>Aggregated real-time metrics across {permittedStations.length} permitted fuel bunks.</span>
            ) : (
              <>
                {activeStation?.location || 'Central Forecourt'}
                <span className="mx-1.5" aria-hidden="true">·</span>
                Manager: <span className="font-medium text-slate-700 dark:text-slate-300">{activeStation?.managerName || 'Unassigned'}</span>
                <span className="mx-1.5" aria-hidden="true">·</span>
                Timezone: <span className="font-mono text-[#12544F] dark:text-[#2BA096]">{activeStation?.timezone || 'Asia/Kolkata'}</span>
              </>
            )}
          </p>
        </div>

        {/* Dashboard Bunk Selector & Navigation Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          {/* Bunk Selector */}
          <div className="min-w-[260px] sm:min-w-[300px]">
            <SelectDropdown
              label="Filter by Fuel Bunk"
              options={[
                ...(isMultiBunkAuthorized
                  ? [
                      {
                        value: 'ALL',
                        label: 'All Bunks (Consolidated Network)',
                        badge: 'NETWORK',
                        badgeClass: 'bg-[#12544F]/10 text-[#12544F] dark:text-[#2BA096]',
                      },
                    ]
                  : []),
                ...permittedStations.map((st) => ({
                  value: st.id,
                  label: `${st.name} (${st.code})`,
                  description: st.location,
                  badge: st.code,
                })),
              ]}
              value={selectedBunkId}
              onChange={(val) => {
                setSelectedBunkId(val);
                if (val !== 'ALL' && onSelectStation) {
                  onSelectStation(val);
                }
              }}
              searchable={permittedStations.length > 3}
            />
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto pt-4 sm:pt-4">
            <button
              type="button"
              onClick={() => onNavigate('bunks')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition cursor-pointer"
              title="Manage Bunks"
            >
              <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Bunk Master</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('nozzles')}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition cursor-pointer"
              title="Manage Nozzles"
            >
              <Fuel className="h-3.5 w-3.5 text-[#12544F] dark:text-[#2BA096]" />
              <span>Nozzles</span>
            </button>
            {currentTanks[0] && (
              <button
                type="button"
                onClick={() => onOpenDecantModal(currentTanks[0])}
                className="flex items-center gap-1.5 rounded-xl bg-[#12544F] hover:bg-[#0E433F] px-3.5 py-2 text-xs font-semibold text-white shadow-2xs active:scale-95 transition cursor-pointer"
              >
                <ArrowDownToLine className="h-3.5 w-3.5" />
                <span>Decant Load</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Key Metrics: 4 focused, meaningful KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Today's Revenue */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs dark:shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Today's Fuel Sales
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight tabular-nums truncate">
            ₹{totalRevenueToday.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
              {totalFuelSoldToday.toLocaleString()} L
            </span> dispensed today
          </div>
        </div>

        {/* KPI 2: Collections */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs dark:shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Collections Handover
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight tabular-nums truncate">
            ₹{(totalCashCollected + totalDigitalCollected).toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
            Cash: ₹{totalCashCollected.toLocaleString()} · POS: ₹{totalDigitalCollected.toLocaleString()}
          </div>
        </div>

        {/* KPI 3: Live Tank Storage */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs dark:shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Live Storage Stock
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Droplets className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight tabular-nums">
            {totalVolume.toLocaleString()} L
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-cyan-600 dark:text-cyan-400 font-mono">
              {occupancyPct.toFixed(1)}%
            </span> of {totalCapacity.toLocaleString()} L capacity
          </div>
        </div>

        {/* KPI 4: Forecourt Status */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs dark:shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Forecourt Operations
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Fuel className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {activeShifts.length} Active Shifts
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {currentDispensers.length} Dispensers Online · {currentTanks.length} Tanks
          </div>
        </div>
      </div>

      {/* 3. Actionable Insights: Priority notices only when relevant */}
      {lowStockTanks.length > 0 || waterAlertTanks.length > 0 ? (
        <div className="space-y-3">
          {lowStockTanks.map((tank) => {
            const fuel = fuels.find((f) => f.code === tank.fuelCode);
            return (
              <div
                key={`low-${tank.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 p-4 text-xs text-rose-800 dark:text-rose-200 transition"
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  <div>
                    <span className="font-bold">
                      Low Fuel Stock Alert: Tank #{tank.tankNumber} ({fuel?.name || tank.fuelCode})
                    </span>
                    <p className="text-rose-700/80 dark:text-rose-300/80 mt-0.5">
                      Current stock is at {tank.currentVolumeLiters.toLocaleString()} L (threshold: {(tank.lowAlertThresholdLiters ?? 3000).toLocaleString()} L). Replenishment order recommended.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDecantModal(tank)}
                  className="shrink-0 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold px-3 py-1.5 transition active:scale-95"
                >
                  Decant Load Now
                </button>
              </div>
            );
          })}

          {waterAlertTanks.map((tank) => (
            <div
              key={`water-${tank.id}`}
              className="flex items-center gap-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-4 text-xs text-amber-800 dark:text-amber-200"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <span className="font-bold">Water Bottom Warning on Tank #{tank.tankNumber}:</span>
                <span className="ml-1">
                  Water dip detected at {tank.waterDipCm} cm. Drain water bottom paste before next tanker receipt.
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 px-4 py-3 text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">
              Forecourt Status Nominal: Storage stock levels safe and all active dispensers operating within calibration tolerances.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('tanks')}
            className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold shrink-0 ml-2"
          >
            Review Tanks →
          </button>
        </div>
      )}

      {/* 4. Important Activity: Two-Column Operational Core */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column: Attendant Shifts & Handover Activity */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs dark:shadow-sm transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Forecourt Shift Activity</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Duty rosters, meter sales & cash pocket settlements
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('shifts')}
              className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition"
            >
              <span>View All Shifts</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {currentShifts.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500">
              No shifts recorded today. Click "Assign Shift" from the Shift Settlement tab.
            </div>
          ) : (
            <div className="space-y-3">
              {currentShifts.slice(0, 4).map((shift) => (
                <div
                  key={shift.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 p-3.5 text-xs transition"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white truncate">
                        {shift.attendantName}
                      </span>
                      <span className="text-slate-400" aria-hidden="true">·</span>
                      <span className="font-mono text-slate-600 dark:text-slate-400 font-medium">
                        Island #{shift.islandNumber}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                          shift.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {shift.status}
                      </span>
                    </div>
                    <div className="mt-1 text-slate-500 dark:text-slate-400 text-[11px] font-mono">
                      Shift: {shift.shiftCode}
                      <span className="mx-1" aria-hidden="true">·</span>
                      Started: {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-end justify-between font-mono text-right shrink-0">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Expected Sales</span>
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                        ₹{shift.totalExpectedRevenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums mt-0.5">
                      {shift.totalFuelSoldLiters.toLocaleString()} L Sold
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Tank Storage Status & Recent Decanting */}
        <div className="space-y-6">
          {/* Storage Tank Overview Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs dark:shadow-sm transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  <span>Tank Farm Storage Summary</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Subterranean fuel stock & safe ullage buffer
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('tanks')}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition"
              >
                <span>Full Farm Telemetry</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {currentTanks.map((tank) => {
                const fuel = fuels.find((f) => f.code === tank.fuelCode);
                const pct = tank.capacityLiters > 0 ? (tank.currentVolumeLiters / tank.capacityLiters) * 100 : 0;
                const safeUllage = Math.max(0, tank.safeCapacityLiters - tank.currentVolumeLiters);

                return (
                  <div
                    key={tank.id}
                    className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 p-3 text-xs transition"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: fuel?.color || '#10b981' }}
                          aria-hidden="true"
                        />
                        <span className="font-bold text-slate-900 dark:text-white">
                          Tank #{tank.tankNumber}
                        </span>
                        <span className="text-slate-400" aria-hidden="true">·</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {fuel?.name || tank.fuelCode}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenDipModal(tank)}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                      >
                        <Ruler className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Log Dip</span>
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden my-1.5">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(0, pct))}%`,
                          backgroundColor: fuel?.color || '#10b981',
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      <span>
                        Stock: <strong className="text-slate-900 dark:text-white">{tank.currentVolumeLiters.toLocaleString()} L</strong> ({pct.toFixed(0)}%)
                      </span>
                      <span>
                        Safe Ullage: <strong className="text-emerald-600 dark:text-emerald-400">{safeUllage.toLocaleString()} L</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Inbound Tanker Receipts Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xs dark:shadow-sm transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ArrowDownToLine className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Recent Tanker Decanting Receipts</span>
              </span>
              <button
                type="button"
                onClick={() => onNavigate('tanks')}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
              >
                All Receipts
              </button>
            </div>

            {currentLoads.length === 0 ? (
              <p className="text-center py-4 text-xs text-slate-400 dark:text-slate-500">
                No tanker decanting records yet.
              </p>
            ) : (
              <div className="space-y-2">
                {currentLoads.slice(0, 3).map((load) => (
                  <div
                    key={load.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-950/80 px-3.5 py-2.5 text-xs font-mono border border-slate-100 dark:border-slate-800"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white text-xs">{load.tankerNumber}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-sans">
                        Inv #{load.invoiceNo} · <span className="font-semibold text-slate-700 dark:text-slate-300">{load.fuelCode}</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        +{load.receivedVolumeLiters.toLocaleString()} L
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                        Density: {load.observedDensity} ({load.densityStatus})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
