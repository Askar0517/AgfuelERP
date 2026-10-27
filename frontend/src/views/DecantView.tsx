import React, { useState, useEffect, useMemo } from 'react';
import {
  Station,
  Tank,
  FuelProduct,
  TankLoadDecanting,
  UserRole,
  AuthUser,
} from '../types';
import {
  Truck,
  ArrowDownToLine,
  Droplets,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  History,
  Search,
  Filter,
  Building2,
  Fuel,
  Eye,
  X,
  Image as ImageIcon,
  Calculator,
  RefreshCw,
  Sparkles,
  Clock,
  ArrowRight,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SelectDropdown } from '../components/common/SelectDropdown';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { ModalPortal } from '../components/common/ModalPortal';
import { getFuelDefinition, formatNozzleCleanName } from '../utils/fuelConfig';
import { getBunkCurrency } from '../utils/currency';

export interface DecantViewProps {
  station: Station;
  stations?: Station[];
  tanks: Tank[];
  fuels: FuelProduct[];
  tankLoads: TankLoadDecanting[];
  currentRole?: UserRole;
  currentUser?: AuthUser | null;
  onSelectStation?: (id: string) => void;
  onOpenDecantModal: (tank: Tank) => void;
  onOpenDipModal?: (tank: Tank) => void;
  onRefresh?: () => void;
}

export const DecantView: React.FC<DecantViewProps> = ({
  station,
  stations = [],
  tanks,
  fuels,
  tankLoads,
  currentRole = 'OWNER',
  currentUser,
  onSelectStation,
  onOpenDecantModal,
  onOpenDipModal,
  onRefresh,
}) => {
  // 1. Station / Bunk Selection (defaults to passed station, easily switchable like Meters)
  const [activeStationId, setActiveStationId] = useState<string>(station.id);
  const activeStation =
    (stations.length > 0 ? stations.find((s) => s.id === activeStationId) : station) || station;

  const handleBunkChange = (newStationId: string) => {
    setActiveStationId(newStationId);
    if (onSelectStation) {
      onSelectStation(newStationId);
    }
  };

  // Sync activeStationId when station prop changes
  useEffect(() => {
    if (station?.id && station.id !== activeStationId) {
      setActiveStationId(station.id);
    }
  }, [station?.id]);

  // Filter tanks & decant loads strictly for the active bunk
  const stationTanks = useMemo(
    () => tanks.filter((t) => t.stationId === activeStation.id),
    [tanks, activeStation.id]
  );

  const stationLoads = useMemo(
    () => tankLoads.filter((l) => l.stationId === activeStation.id),
    [tankLoads, activeStation.id]
  );

  // 2. Pre-Decant Safe Ullage Verification Calculator state
  const [selectedCalcTankId, setSelectedCalcTankId] = useState<string>(
    stationTanks[0]?.id || ''
  );
  const [testDecantLiters, setTestDecantLiters] = useState<number>(12000);
  const [isUllageVerifierOpen, setIsUllageVerifierOpen] = useState<boolean>(false);

  // Sync selectedCalcTankId if active station changes and tank is not in station
  const calcTank = useMemo(() => {
    return stationTanks.find((t) => t.id === selectedCalcTankId) || stationTanks[0];
  }, [stationTanks, selectedCalcTankId]);

  const calcSafeUllage = calcTank
    ? Math.max(0, (calcTank.safeCapacityLiters || calcTank.capacityLiters * 0.95) - calcTank.currentVolumeLiters)
    : 0;

  const canSafelyDecant = testDecantLiters <= calcSafeUllage;

  // 3. Search & Filter for Historical Decanting Audit Log
  const [searchTerm, setSearchTerm] = useState('');
  const [fuelFilter, setFuelFilter] = useState<string>('ALL');
  const [selectedInvoicePreview, setSelectedInvoicePreview] = useState<{
    url: string;
    title: string;
  } | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredLoads = useMemo(() => {
    return stationLoads.filter((load) => {
      const matchesSearch =
        searchTerm === '' ||
        load.tankerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        load.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (load.operatorName && load.operatorName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesFuel =
        fuelFilter === 'ALL' ||
        load.fuelCode === fuelFilter ||
        (stationTanks.find((t) => t.id === load.tankId)?.fuelCode === fuelFilter);

      return matchesSearch && matchesFuel;
    });
  }, [stationLoads, searchTerm, fuelFilter, stationTanks]);

  // Reset page on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fuelFilter, activeStationId]);

  // Paginated data
  const totalPages = Math.max(1, Math.ceil(filteredLoads.length / pageSize));
  const paginatedLoads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLoads.slice(start, start + pageSize);
  }, [filteredLoads, currentPage, pageSize]);

  // Overall KPI statistics
  const totalSafeUllage = useMemo(() => {
    return stationTanks.reduce((acc, t) => {
      const safe = (t.safeCapacityLiters || t.capacityLiters * 0.95) - t.currentVolumeLiters;
      return acc + Math.max(0, safe);
    }, 0);
  }, [stationTanks]);

  const totalDecantedVolume = useMemo(() => {
    return stationLoads.reduce((acc, l) => acc + (l.receivedVolumeLiters || 0), 0);
  }, [stationLoads]);

  const latestLoad = stationLoads[0];

  return (
    <div className="space-y-3.5 pb-12 sm:pb-8 animate-fadeIn text-slate-800 dark:text-slate-100">
      {/* 1. Breadcrumbs & Top Action Bar */}
      <Breadcrumbs
        items={[
          { label: 'Operations' },
          { label: 'Decant', isCurrent: true, icon: Truck },
        ]}
        badge={
          <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-semibold flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {activeStation.name} ({activeStation.code})
          </span>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold shadow-2xs active:scale-95 transition cursor-pointer"
                title="Refresh Forecourt Tank Telemetry"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}

            {onOpenDipModal && stationTanks.length > 0 && (
              <button
                type="button"
                onClick={() => onOpenDipModal(calcTank || stationTanks[0])}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold shadow-2xs active:scale-95 transition cursor-pointer"
                title="Log Daily Tank Dip Measurement"
              >
                <Droplets className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Log Tank Dip</span>
              </button>
            )}

            {stationTanks.length > 0 && (
              <button
                type="button"
                onClick={() => onOpenDecantModal(calcTank || stationTanks[0])}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition cursor-pointer"
                title="Initiate Tanker Fuel Decanting"
              >
                <ArrowDownToLine className="h-4 w-4" />
                <span>Decant Inward Tanker</span>
              </button>
            )}
          </div>
        }
      />

      {/* 2. Operational KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Room For Decanting</span>
            <Droplets className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums block">
            {totalSafeUllage.toLocaleString()} L
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            Available safe ullage capacity
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active Tanks</span>
            <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums block">
            {stationTanks.length} Units
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            {stationTanks.filter((t) => t.status === 'ACTIVE').length} ready for intake
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Received</span>
            <Truck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums block">
            {totalDecantedVolume.toLocaleString()} L
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            Across {stationLoads.length} tanker deliveries
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Last Delivery</span>
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-mono truncate block">
            {latestLoad ? latestLoad.tankerNumber : 'None'}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
            {latestLoad ? `${latestLoad.receivedVolumeLiters.toLocaleString()} L received` : 'Awaiting tanker'}
          </span>
        </div>
      </div>

      {/* 4. Target Tank Decanting Selector Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowDownToLine className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Underground Storage Tanks at {activeStation.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select any tank to immediately decant tanker fuel or verify safe ullage before pumping.
            </p>
          </div>
        </div>

        {stationTanks.length === 0 ? (
          <div className="p-10 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <Droplets className="w-10 h-10 text-slate-400 mx-auto mb-2.5 opacity-60" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No tanks configured for this bunk
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Please configure an underground tank under Bunk Management before decanting tanker loads.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stationTanks.map((tank) => {
              const fuel = fuels.find((f) => f.code === tank.fuelCode) || {
                code: tank.fuelCode,
                name: tank.fuelCode,
                shortName: tank.fuelCode,
                ratePerLiter: 100,
                densityStd15c: 0.74,
                densityTolerance: 0.005,
                color: '#12544F',
              };

              const fillPct = Math.min(
                100,
                Math.round((tank.currentVolumeLiters / Math.max(1, tank.capacityLiters)) * 100)
              );
              const safeCap = tank.safeCapacityLiters || tank.capacityLiters * 0.95;
              const safeUllage = Math.max(0, safeCap - tank.currentVolumeLiters);
              const isLowStock =
                tank.currentVolumeLiters <= (tank.lowAlertThresholdLiters ?? 3000);

              const isSelected = calcTank?.id === tank.id;

              return (
                <div
                  key={tank.id}
                  className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 dark:ring-emerald-500/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-emerald-400/50'
                  }`}
                >
                  <div>
                    {/* Header: Tank # & Fuel Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          Tank #{tank.tankNumber}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {tank.name || `Tank ${tank.tankNumber}`}
                        </h4>
                      </div>

                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-2xs"
                        style={{ backgroundColor: fuel.color || '#10B981' }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                        {fuel.shortName || fuel.name}
                      </span>
                    </div>

                    {/* Tank Level Gauge */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-500 dark:text-slate-400">Current Volume:</span>
                        <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                          {tank.currentVolumeLiters.toLocaleString()} L / {tank.capacityLiters.toLocaleString()} L
                        </span>
                      </div>

                      <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700/80">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${fillPct}%`,
                            backgroundColor: fuel.color || '#10B981',
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-500 dark:text-slate-400">
                          {fillPct}% Full
                        </span>
                        {isLowStock ? (
                          <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Low Stock Alert
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            Stock Normal
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Available Safe Ullage Callout */}
                    <div className="p-3 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-800 dark:text-emerald-300 font-medium">
                          Available Safe Ullage:
                        </span>
                        <span className="font-bold font-mono text-emerald-700 dark:text-emerald-300 text-sm tabular-nums">
                          {safeUllage.toLocaleString()} L
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 block mt-0.5">
                        Capacity headroom up to 95% safety line ({safeCap.toLocaleString()} L)
                      </span>
                    </div>
                  </div>

                  {/* Actions for Tank */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => onOpenDecantModal(tank)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
                    >
                      <ArrowDownToLine className="h-3.5 w-3.5" />
                      <span>Decant into Tank</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedCalcTankId(tank.id)}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold active:scale-95 transition cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                      title="Test delivery volume against this tank"
                    >
                      <Calculator className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Pre-Decanting Safe Ullage Verification Calculator (Collapsible Safety Tool) */}
      {stationTanks.length > 0 && calcTank && (
        <div className="rounded-2xl border border-slate-200 dark:border-[#194C47] bg-white dark:bg-[#0D2926] shadow-2xs transition-colors overflow-hidden">
          {/* Header & Toggle Bar */}
          <div
            onClick={() => setIsUllageVerifierOpen((prev) => !prev)}
            className="p-4 sm:px-6 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-[#123733]/40 transition select-none"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Pre-Decanting Safe Ullage Verification
                  </h3>
                  <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    OISD-117 Safety Buffer
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  Statutory rule: Verify subterranean 95% ullage headspace before connecting tanker decanting hose.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hidden md:inline">
                {isUllageVerifierOpen ? 'Collapse' : 'Verify Tanker Load'}
              </span>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                aria-label={isUllageVerifierOpen ? 'Collapse Verifier' : 'Expand Verifier'}
              >
                {isUllageVerifierOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Collapsible Calculator Content */}
          {isUllageVerifierOpen && (
            <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 dark:border-slate-800/80 animate-fadeIn">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
                {/* Calculator Inputs */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Target Tank:
                      </label>
                      <SelectDropdown
                        value={calcTank.id}
                        onChange={(id) => setSelectedCalcTankId(id)}
                        options={stationTanks.map((t) => {
                          const fuelObj = fuels.find((f) => f.code === t.fuelCode);
                          const fuelName = fuelObj?.name || t.fuelCode;
                          const safeRoom = Math.max(
                            0,
                            (t.safeCapacityLiters || t.capacityLiters * 0.95) - t.currentVolumeLiters
                          );
                          return {
                            value: t.id,
                            label: `Tank #${t.tankNumber} · ${fuelName}`,
                            description: `Safe Headroom: ${safeRoom.toLocaleString()} L`,
                          };
                        })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Tanker Invoice Volume (Liters):
                      </label>
                      <input
                        type="number"
                        min="500"
                        max="50000"
                        step="100"
                        value={testDecantLiters}
                        onChange={(e) => setTestDecantLiters(Math.max(0, Number(e.target.value)))}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 font-mono text-sm font-bold text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Quick Volume Preset Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Quick Presets:
                    </span>
                    {[6000, 10000, 12000, 15000, 20000].map((liters) => (
                      <button
                        key={liters}
                        type="button"
                        onClick={() => setTestDecantLiters(liters)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold active:scale-95 transition cursor-pointer ${
                          testDecantLiters === liters
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {liters.toLocaleString()} L
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Verification Result Box */}
                <div
                  className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between transition-colors ${
                    canSafelyDecant
                      ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10'
                      : 'border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {canSafelyDecant ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
                      )}
                      <span
                        className={`font-bold text-xs uppercase tracking-wider ${
                          canSafelyDecant
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {canSafelyDecant ? 'Safe To Decant' : 'Overfill Hazard!'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {canSafelyDecant ? (
                        <>
                          Tank #{calcTank.tankNumber} has{' '}
                          <strong className="text-emerald-700 dark:text-emerald-300">
                            {calcSafeUllage.toLocaleString()} L
                          </strong>{' '}
                          safe room. After receiving {testDecantLiters.toLocaleString()} L,{' '}
                          <strong>{(calcSafeUllage - testDecantLiters).toLocaleString()} L</strong> buffer remains.
                        </>
                      ) : (
                        <>
                          Invoiced delivery exceeds safe capacity by{' '}
                          <strong className="text-rose-700 dark:text-rose-300">
                            {(testDecantLiters - calcSafeUllage).toLocaleString()} L
                          </strong>
                          . Decanting aborted to prevent tank spill and rupture.
                        </>
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenDecantModal(calcTank)}
                    disabled={!canSafelyDecant}
                    className={`w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer ${
                      canSafelyDecant
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                    <span>Open Decanting for Tank #{calcTank.tankNumber}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. Historical Tanker Decanting Audit Log Register */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden transition-colors">
        {/* Table Top Header with Search and Fuel Filter */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <History className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Tanker Decanting Delivery Audit Log
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Permanent statutory record of tanker receipts, ASTM-53B density checks, and dips for {activeStation.name}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Box */}
            <div className="relative min-w-[200px]">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tanker, invoice, operator..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            {/* Fuel Filter */}
            <select
              value={fuelFilter}
              onChange={(e) => setFuelFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="ALL">All Fuel Types</option>
              {fuels.map((fuel) => (
                <option key={fuel.code} value={fuel.code}>
                  {fuel.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Content */}
        {filteredLoads.length === 0 ? (
          <div className="p-12 text-center">
            <Truck className="h-10 w-10 text-slate-400 mx-auto mb-2 opacity-60" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No Decanting Records Found
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {stationLoads.length === 0
                ? 'No tanker fuel has been received for this bunk yet. Click "Decant Inward Tanker" to record your first delivery.'
                : 'No delivery records match your current search or fuel filter criteria.'}
            </p>
            {stationTanks.length > 0 && stationLoads.length === 0 && (
              <button
                type="button"
                onClick={() => onOpenDecantModal(stationTanks[0])}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <ArrowDownToLine className="h-4 w-4" />
                <span>Log First Tanker Delivery</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#EAF4F3] dark:bg-[#0A2623] text-[#0E3D38] dark:text-[#5EEAD4] font-bold uppercase tracking-wider text-[10px] border-b border-[#D4E8E5] dark:border-[#194C47]">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Tanker Number</th>
                  <th className="py-3 px-4">Invoice / STN #</th>
                  <th className="py-3 px-4">Tank & Product</th>
                  <th className="py-3 px-4 text-right">Received Qty</th>
                  <th className="py-3 px-4">Density @ 15°C</th>
                  <th className="py-3 px-4">Dip Verification</th>
                  <th className="py-3 px-4">Decanted By</th>
                  <th className="py-3 px-4 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {paginatedLoads.map((load) => {
                  const targetTank = stationTanks.find((t) => t.id === load.tankId);
                  const fuel = fuels.find(
                    (f) => f.code === (load.fuelCode || targetTank?.fuelCode)
                  ) || {
                    code: load.fuelCode || 'OCTANE_95',
                    name: load.fuelCode || 'Fuel',
                    shortName: load.fuelCode || 'Fuel',
                    color: '#10B981',
                  };

                  const isCompliant = load.densityStatus === 'COMPLIANT' || load.densityStatus === 'VERIFIED';
                  const dipBefore = (load as any).preDipCm ?? load.dipBeforeCm;
                  const dipAfter = (load as any).postDipCm ?? load.dipAfterCm;
                  const dipDiff =
                    dipAfter !== undefined && dipBefore !== undefined
                      ? (dipAfter - dipBefore).toFixed(1)
                      : null;
                  const decantedDate = (load as any).decantedAt || load.timestamp || Date.now();

                  return (
                    <tr
                      key={load.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {new Date(decantedDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(decantedDate).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {load.tankerNumber}
                      </td>

                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {load.invoiceNo}
                      </td>

                      <td className="py-3 px-4 font-sans">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: fuel.color }}
                          />
                          <span className="font-semibold text-slate-900 dark:text-white text-xs">
                            {targetTank ? `Tank #${targetTank.tankNumber}` : 'Tank'}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            ({fuel.shortName})
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                        {load.receivedVolumeLiters.toLocaleString()} L
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                            {load.correctedDensity15C || load.observedDensity}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isCompliant
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {isCompliant ? 'ASTM Passed' : 'Discrepancy'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-xs">
                        {dipBefore !== undefined && dipAfter !== undefined ? (
                          <span>
                            {dipBefore}cm &rarr; {dipAfter}cm{' '}
                            {dipDiff && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                (+{dipDiff}cm)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-sans text-slate-700 dark:text-slate-300 text-xs">
                        {load.operatorName || 'Forecourt Attendant'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {load.invoiceImageUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedInvoicePreview({
                                url: load.invoiceImageUrl!,
                                title: `Invoice Receipt: ${load.invoiceNo} (${load.tankerNumber})`,
                              })
                            }
                            className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition cursor-pointer"
                            title="View Attached Invoice Image"
                          >
                            <ImageIcon className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {filteredLoads.length > 0 && (
          <div className="px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/30">
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>
                Showing <strong className="text-slate-800 dark:text-slate-200">{((currentPage - 1) * pageSize) + 1}</strong>–<strong className="text-slate-800 dark:text-slate-200">{Math.min(currentPage * pageSize, filteredLoads.length)}</strong> of <strong className="text-slate-800 dark:text-slate-200">{filteredLoads.length}</strong> records
              </span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(1)}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                First
              </button>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                ‹ Prev
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition cursor-pointer ${
                      pageNum === currentPage
                        ? 'bg-[#12544F] text-white shadow-sm'
                        : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                Next ›
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 7. Invoice Photo Preview Modal */}
      {selectedInvoicePreview && (
        <ModalPortal
          isOpen={!!selectedInvoicePreview}
          onClose={() => setSelectedInvoicePreview(null)}
          ariaLabel="Invoice Receipt Preview"
          className="max-w-2xl w-full"
        >
          <div className="relative rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedInvoicePreview.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoicePreview(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 max-h-[70vh] flex items-center justify-center p-2 border border-slate-200 dark:border-slate-800">
              <img
                src={selectedInvoicePreview.url}
                alt="Tanker Delivery Invoice"
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
