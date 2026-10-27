import React, { useState, useEffect, useMemo } from 'react';
import {
  Dispenser,
  FuelProduct,
  ManualMeterReading,
  Station,
  Nozzle,
  UserRole,
  Tank,
  Shift,
  AuthUser,
} from '../../types';
import {
  Calculator,
  Save,
  CheckCircle2,
  AlertTriangle,
  History,
  ShieldCheck,
  Building2,
  Fuel,
  Search,
  Filter,
  Layers,
  ArrowRight,
  Clock,
  Sparkles,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  Lock,
  Eye,
  X,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { api } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import { SelectDropdown } from '../common/SelectDropdown';
import { Breadcrumbs } from '../common/Breadcrumbs';
import { ImageUploadInput } from '../common/ImageUploadInput';
import { ModalPortal } from '../common/ModalPortal';
import { getBunkCurrency, formatBunkAmount } from '../../utils/currency';
import { formatNozzleCleanName, getFuelBadgeClass } from '../../utils/fuelConfig';

export interface ManualMeterFormProps {
  station: Station;
  stations?: Station[];
  dispensers: Dispenser[];
  nozzles?: Nozzle[];
  tanks?: Tank[];
  shifts?: Shift[];
  currentUser?: AuthUser | null;
  fuels: FuelProduct[];
  readings: ManualMeterReading[];
  currentRole?: UserRole;
  onSelectStation?: (id: string) => void;
  onSubmitReading: (payload: {
    stationId: string;
    nozzleId: string;
    openingMeter: number;
    closingMeter: number;
    testingLiters: number;
    readingType?: string;
    isCorrection?: boolean;
    correctionReason?: string;
    remarks?: string;
    enteredBy: string;
    shiftCode?: string;
    recordedBy?: string;
    recordedByName?: string;
    meterPhotoUrl?: string;
  }) => Promise<void>;
}

export const ManualMeterForm: React.FC<ManualMeterFormProps> = ({
  station,
  stations = [],
  dispensers,
  nozzles = [],
  tanks = [],
  shifts = [],
  currentUser = null,
  fuels,
  readings,
  currentRole = 'OWNER',
  onSelectStation,
  onSubmitReading,
}) => {
  const { notifySuccess, notifyError, notifyWarning } = useNotification();

  // Workflow Step 1: Active selected bunk
  const [activeStationId, setActiveStationId] = useState<string>(station.id);
  const activeStation = (stations.length > 0 ? stations.find((s) => s.id === activeStationId) : station) || station;

  // Sync activeStationId when the globally selected station changes
  useEffect(() => {
    if (station?.id && station.id !== activeStationId) {
      setActiveStationId(station.id);
    }
  }, [station?.id]);

  const handleBunkChange = (newStationId: string) => {
    setActiveStationId(newStationId);
    if (onSelectStation) {
      onSelectStation(newStationId);
    }
  };

  // Filter dispensers & nozzles strictly for the selected bunk
  const stationDispensers = dispensers.filter((d) => d.stationId === activeStation.id);
  const stationNozzlesDirect = nozzles.filter((n) => n.stationId === activeStation.id);

  // Combine nozzles with dispenser details
  const availableNozzles = useMemo(() => {
    if (stationNozzlesDirect.length > 0) {
      return stationNozzlesDirect.map((n) => {
        const dp = stationDispensers.find((d) => d.id === n.dispenserId);
        return {
          ...n,
          dispenserNumber: dp?.dispenserNumber || 1,
          islandNumber: dp?.islandNumber || 1,
          brand: dp?.brand || 'Dispenser Unit',
        };
      });
    }
    return stationDispensers.flatMap((d) =>
      d.nozzles.map((n) => ({
        ...n,
        dispenserNumber: d.dispenserNumber,
        islandNumber: d.islandNumber,
        brand: d.brand,
      }))
    );
  }, [stationNozzlesDirect, stationDispensers]);

  // Workflow Step 2: Selected Nozzle
  const [selectedNozzleId, setSelectedNozzleId] = useState<string>(
    availableNozzles[0]?.id || ''
  );

  // Sync selected nozzle when station changes
  useEffect(() => {
    if (availableNozzles.length > 0) {
      if (!availableNozzles.some((n) => n.id === selectedNozzleId)) {
        setSelectedNozzleId(availableNozzles[0].id);
      }
    } else {
      setSelectedNozzleId('');
    }
  }, [activeStationId, availableNozzles]);

  const selectedNozzle = availableNozzles.find((n) => n.id === selectedNozzleId) || availableNozzles[0];
  const selectedFuel = fuels.find((f) => f.code === selectedNozzle?.fuelCode);
  const fuelRate = selectedFuel?.ratePerLiter || 100;

  // Authoritative previous recorded reading from backend
  const authoritativePreviousMeter = selectedNozzle?.electronicTotalizer ?? selectedNozzle?.mechanicalTotalizer ?? 0;

  // Authoritative Attendant Identity locked from active authenticated session
  const authoritativeAttendantName = currentUser?.name || 'Forecourt Attendant';

  // Authoritative Active Shift Code derived from open shift
  const activeShift = useMemo(() => {
    return (
      shifts.find((s) => s.stationId === activeStation.id && (s.status === 'ACTIVE' || s.status === 'OPEN')) ||
      shifts.find((s) => s.stationId === activeStation.id) ||
      null
    );
  }, [shifts, activeStation.id]);

  const authoritativeShiftCode = useMemo(() => {
    if (activeShift?.shiftCode) return activeShift.shiftCode;
    const prefix = activeStation.code ? activeStation.code.toUpperCase() : 'BUNK';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `SH-${prefix}-${dateStr}-01`;
  }, [activeShift, activeStation]);

  // Feeder Tank resolution for the selected nozzle
  const feederTank = useMemo(() => {
    if (!selectedNozzle) return null;
    if (selectedNozzle.tankId) {
      return tanks.find((t) => t.id === selectedNozzle.tankId) || null;
    }
    return (
      tanks.find(
        (t) => t.stationId === activeStation.id && t.fuelCode === selectedNozzle.fuelCode
      ) || null
    );
  }, [selectedNozzle, tanks, activeStation.id]);

  const availableTankStock = feederTank ? (feederTank.currentVolumeLiters ?? 0) : null;
  const bunkCurrency = getBunkCurrency(activeStation);

  // Reading Form States - Default Current Cumulative Reading to EXACT previous authoritative reading to prevent mistakes
  const [closingMeter, setClosingMeter] = useState<number>(authoritativePreviousMeter);
  const [meterPhotoUrl, setMeterPhotoUrl] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const [testingLiters, setTestingLiters] = useState<number>(0);
  const [readingType, setReadingType] = useState<string>('REGULAR_SHIFT');
  const [isCorrectionException, setIsCorrectionException] = useState<boolean>(false);
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [nextReadingCode, setNextReadingCode] = useState<string>('READ-AUTO');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Filters for Reading History
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Load next reading code series preview
  useEffect(() => {
    api.getNextReadingCode()
      .then((res) => setNextReadingCode(res.nextCode))
      .catch(() => setNextReadingCode('READ-000001'));
  }, [selectedNozzleId]);

  // Synchronize closingMeter with authoritativePreviousMeter whenever nozzle or previous reading updates
  useEffect(() => {
    setClosingMeter(authoritativePreviousMeter);
  }, [authoritativePreviousMeter, selectedNozzleId]);

  // When nozzle changes, initialize closing meter suggested value to the exact previous reading
  const handleSelectNozzle = (nozzleId: string) => {
    setSelectedNozzleId(nozzleId);
    const n = availableNozzles.find((noz) => noz.id === nozzleId);
    if (n) {
      const auth = n.electronicTotalizer || n.mechanicalTotalizer || 0;
      setClosingMeter(auth);
      setIsCorrectionException(false);
      setCorrectionReason('');
      setErrorMsg(null);
    }
  };

  // Calculations
  const isRolloverOrReset = closingMeter < authoritativePreviousMeter;
  const isExceptionRequired = isRolloverOrReset || isCorrectionException;

  const grossDispensed = isRolloverOrReset
    ? 0 // Meter replaced or rolled over
    : Math.max(0, Number((closingMeter - authoritativePreviousMeter).toFixed(2)));

  const netSoldLiters = Math.max(0, Number((grossDispensed - testingLiters).toFixed(2)));
  const netSalesAmount = Number((netSoldLiters * fuelRate).toFixed(2));

  // Feeder Tank stock validation check
  const isStockExceeded =
    availableTankStock !== null && !isRolloverOrReset && netSoldLiters > availableTankStock;

  // Current timestamp formatted
  const currentTimestampStr = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedNozzle) {
      setErrorMsg('Please select a valid dispenser nozzle.');
      return;
    }

    if (closingMeter < 0) {
      setErrorMsg('Closing meter reading must be a non-negative number.');
      return;
    }

    if (isRolloverOrReset && !correctionReason.trim()) {
      setErrorMsg(
        `Closing meter (${closingMeter.toFixed(2)}) is lower than authoritative opening meter (${authoritativePreviousMeter.toFixed(2)}). An authorized correction exception reason (e.g. meter replacement, rollover, recalibration) is strictly mandatory.`
      );
      return;
    }

    if (isStockExceeded && feederTank) {
      setErrorMsg(
        `Stock limit exceeded: Net dispensed volume (${netSoldLiters.toFixed(2)} L) exceeds available stock in feeder tank "${feederTank.tankNumber || feederTank.name || feederTank.id}" (${(availableTankStock || 0).toFixed(2)} L). Please decant fuel stock or verify meter reading.`
      );
      return;
    }

    if (!meterPhotoUrl || !meterPhotoUrl.trim()) {
      setErrorMsg(
        'Meter totalizer photograph is strictly mandatory for legal metrology and statutory audit compliance. Please capture or upload a clear photo of the meter display before saving.'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await onSubmitReading({
        stationId: activeStation.id,
        nozzleId: selectedNozzle.id,
        openingMeter: authoritativePreviousMeter,
        closingMeter,
        testingLiters,
        readingType: isExceptionRequired ? 'RESET_CORRECTION' : readingType,
        isCorrection: isExceptionRequired,
        correctionReason: isExceptionRequired ? correctionReason.trim() : undefined,
        remarks: remarks.trim() || undefined,
        enteredBy: authoritativeAttendantName,
        shiftCode: authoritativeShiftCode,
        recordedBy: currentUser?.role || currentRole,
        recordedByName: authoritativeAttendantName,
        meterPhotoUrl: meterPhotoUrl || undefined,
      });

      setSuccessMsg(
        `Meter reading recorded successfully! Record ID: ${nextReadingCode} · Dispensed: ${grossDispensed.toFixed(2)} L · Net Sold: ${netSoldLiters.toFixed(2)} L (${formatBunkAmount(netSalesAmount, activeStation)})`
      );

      // Refresh next reading sequence
      api.getNextReadingCode()
        .then((res) => setNextReadingCode(res.nextCode))
        .catch(() => {});

      // Set new suggested closing meter to the exact reading just recorded
      setClosingMeter(closingMeter);
      setMeterPhotoUrl(null);
      setTestingLiters(0);
      setIsCorrectionException(false);
      setCorrectionReason('');
      setRemarks('');
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit meter reading.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter history readings
  const filteredReadings = useMemo(() => {
    return readings
      .filter((r) => r.stationId === activeStation.id)
      .filter((r) => {
        if (historyTypeFilter === 'ALL') return true;
        if (historyTypeFilter === 'CORRECTIONS') return r.isCorrection;
        return r.readingType === historyTypeFilter;
      })
      .filter((r) => {
        if (!historySearch.trim()) return true;
        const q = historySearch.toLowerCase();
        return (
          r.id.toLowerCase().includes(q) ||
          r.nozzleId.toLowerCase().includes(q) ||
          r.enteredBy.toLowerCase().includes(q) ||
          (r.shiftCode && r.shiftCode.toLowerCase().includes(q)) ||
          r.fuelCode.toLowerCase().includes(q)
        );
      });
  }, [readings, activeStation.id, historyTypeFilter, historySearch]);

  // Reset to page 1 on filter or station change
  useEffect(() => {
    setCurrentPage(1);
  }, [historySearch, historyTypeFilter, activeStationId]);

  const totalPages = Math.ceil(filteredReadings.length / pageSize) || 1;
  const paginatedReadings = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredReadings.slice(startIndex, startIndex + pageSize);
  }, [filteredReadings, currentPage, pageSize]);

  return (
    <div className="space-y-3 pb-12 sm:pb-6 animate-fadeIn">
      {/* Unified Breadcrumb Navigation & Station Selector */}
      <Breadcrumbs
        items={[
          { label: 'Operations' },
          { label: 'Meter Readings', isCurrent: true, icon: Calculator },
        ]}
        badge={
          <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            {activeStation.name} ({activeStation.code})
          </span>
        }
        actions={
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 font-mono text-xs text-right hidden sm:block shadow-2xs">
              <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400 block font-sans">Series</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs tabular-nums">{nextReadingCode}</span>
            </div>
          </div>
        }
      />

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols): Form Entry */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-5 shadow-xs transition">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Step 1 & 2: Select Bunk and Select Nozzle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                {stations.length > 1 ? (
                  <SelectDropdown
                    label="1. Station"
                    required
                    value={activeStationId}
                    onChange={handleBunkChange}
                    options={stations.map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))}
                    searchable={stations.length > 3}
                  />
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                      1. Station:
                    </label>
                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/80 flex items-center gap-2 text-xs">
                      <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-900 dark:text-white block truncate">
                          {activeStation.name}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  2. Nozzle:
                </label>
                {availableNozzles.length === 0 ? (
                  <div className="p-2.5 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-300">
                    No nozzles configured for this station.
                  </div>
                ) : (
                  <SelectDropdown
                    options={availableNozzles.map((noz) => {
                      const f = fuels.find((fuel) => fuel.code === noz.fuelCode);
                      const cleanName = formatNozzleCleanName(noz.name, noz.nozzleNumber);
                      const fuelTag = f?.shortName || f?.name || noz.fuelCode;
                      return {
                        value: noz.id,
                        label: cleanName,
                        badge: fuelTag,
                        badgeClass: getFuelBadgeClass(noz.fuelCode),
                      };
                    })}
                    value={selectedNozzleId}
                    onChange={(val) => handleSelectNozzle(val)}
                    searchable={availableNozzles.length > 4}
                  />
                )}
              </div>
            </div>

            {/* Previous Recorded Reading vs Current Meter Reading */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Previous Reading (Liters):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    disabled
                    value={authoritativePreviousMeter}
                    className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-800/80 px-3 py-2.5 font-mono text-xs font-bold text-slate-700 dark:text-slate-300 cursor-not-allowed tabular-nums"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
                    LOCKED
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Current Reading (Liters):
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={closingMeter}
                  onChange={(e) => setClosingMeter(parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-xl border px-3 py-2.5 font-mono text-xs text-slate-900 dark:text-white focus:outline-none tabular-nums font-bold ${
                    isRolloverOrReset
                      ? 'border-amber-400 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-950/30'
                      : 'border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 focus:border-emerald-500'
                  }`}
                  required
                />
              </div>
            </div>

            {/* Meter Exception / Rollover Container */}
            {isRolloverOrReset && (
              <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 space-y-2 animate-fadeIn">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Meter Rollover or Replacement</span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-300/90">
                  Current reading ({closingMeter.toFixed(2)} L) is lower than previous reading ({authoritativePreviousMeter.toFixed(2)} L). Please provide a reason for the record.
                </p>

                <div>
                  <label className="block text-[11px] font-semibold text-amber-900 dark:text-amber-200 mb-1">
                    Reason for lower reading:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Totalizer unit replaced; rollover from 999999"
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    className="w-full rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>
            )}

            {/* Reading Type & Testing Deduction */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <SelectDropdown
                  label="Reading Type"
                  options={[
                    { value: 'REGULAR_SHIFT', label: 'Regular Shift End' },
                    { value: 'PERIODIC_CHECK', label: 'Mid-Shift Audit' },
                    { value: 'CALIBRATION', label: 'Testing Jar Calibration' },
                    { value: 'RESET_CORRECTION', label: 'Meter Rollover / Replacement' },
                  ]}
                  value={isExceptionRequired ? 'RESET_CORRECTION' : readingType}
                  onChange={(val) => setReadingType(val)}
                  disabled={isRolloverOrReset}
                  searchable={false}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-gray-300">
                    Testing Jar Deduction:
                  </label>
                  <div className="flex items-center gap-1 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => setTestingLiters(0)}
                      className={`px-1.5 py-0.5 rounded border text-[10px] cursor-pointer ${
                        testingLiters === 0
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      0 L
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestingLiters(5.0)}
                      className={`px-1.5 py-0.5 rounded border text-[10px] cursor-pointer ${
                        testingLiters === 5.0
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      5 L
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestingLiters(10.0)}
                      className={`px-1.5 py-0.5 rounded border text-[10px] cursor-pointer ${
                        testingLiters === 10.0
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      10 L
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  value={testingLiters}
                  onChange={(e) => setTestingLiters(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 px-3 py-2 font-mono text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none tabular-nums font-bold"
                  required
                />
              </div>
            </div>

            {/* Feeder Tank Stock Exceeded Error Warning */}
            {isStockExceeded && feederTank && (
              <div className="p-3.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 space-y-1.5 animate-fadeIn">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>Feeder Tank Stock Limit Exceeded</span>
                </div>
                <p className="text-[11px] text-rose-700 dark:text-rose-300/90 leading-relaxed">
                  Available stock in feeder tank <strong>{feederTank.tankNumber || feederTank.name || feederTank.id}</strong> is only <strong>{(availableTankStock || 0).toFixed(2)} L</strong>. Net sales volume (<strong>{netSoldLiters.toFixed(2)} L</strong>) cannot exceed available stock.
                </p>
              </div>
            )}

            {/* Shift & Attendant Details */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Attendant Name:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={authoritativeAttendantName}
                    disabled
                    readOnly
                    className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-800/80 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-not-allowed"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
                    LOCKED
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                  Shift Code:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={authoritativeShiftCode}
                    disabled
                    readOnly
                    className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-800/80 px-3 py-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 cursor-not-allowed tabular-nums"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
                    LOCKED
                  </div>
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                Remarks (Optional):
              </label>
              <input
                type="text"
                placeholder="Optional notes or remarks..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Dispenser Physical Meter Photo Evidence (Mandatory for Legal Metrology) */}
            <div className="rounded-xl border border-dashed border-amber-300 dark:border-amber-700/60 bg-amber-50/40 dark:bg-amber-950/20 p-3">
              <ImageUploadInput
                label="Meter Totalizer Photo (Mandatory): *"
                helperText="Upload clear photo of the totalizer counter (Required for legal metrology & audit compliance)"
                category="reading"
                value={meterPhotoUrl}
                onChange={(url) => {
                  setMeterPhotoUrl(url);
                  if (url && errorMsg?.includes('photograph')) setErrorMsg(null);
                }}
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !meterPhotoUrl || (isRolloverOrReset && !correctionReason.trim()) || isStockExceeded}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 px-4 py-3 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>
                  {isSubmitting
                    ? 'Saving Reading...'
                    : isStockExceeded
                    ? 'Stock Limit Exceeded'
                    : !meterPhotoUrl
                    ? 'Upload Meter Photo to Save *'
                    : 'Save Meter Reading'}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column (1 Col): Live Calculation Preview */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-5 shadow-2xs dark:shadow-sm flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Live Dispensed Audit Summary
              </h2>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Target Station:</span>
                <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">
                  {activeStation.name}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Feeder Tank:</span>
                <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">
                  {feederTank
                    ? `${feederTank.tankNumber || feederTank.name} (${(availableTankStock || 0).toFixed(0)} L avl)`
                    : 'Unassigned'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Selected Product:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedFuel?.name || 'Fuel'} ({selectedNozzle?.fuelCode})
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Unit Retail Rate:</span>
                <span className="font-mono text-slate-700 dark:text-slate-200 tabular-nums">
                  {bunkCurrency.symbol} {fuelRate.toFixed(2)} / L
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Opening Reading:</span>
                <span className="font-mono text-slate-700 dark:text-slate-200 tabular-nums">
                  {authoritativePreviousMeter.toFixed(2)} L
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Closing Reading:</span>
                <span className="font-mono text-slate-700 dark:text-slate-200 tabular-nums font-bold">
                  {closingMeter.toFixed(2)} L
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Gross Dispensed:</span>
                <span className="font-mono text-slate-700 dark:text-slate-200 tabular-nums">
                  {grossDispensed.toFixed(2)} L
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Testing Deduction:</span>
                <span className="font-mono text-rose-600 dark:text-rose-400 tabular-nums">
                  -{testingLiters.toFixed(2)} L
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Totalizer Photo:</span>
                {meterPhotoUrl ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Attached ✓
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 text-xs">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Mandatory *
                  </span>
                )}
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Net Billed Liters:</span>
                  <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {netSoldLiters.toFixed(2)} L
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-500/15 p-3 text-center">
                <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                  Net Expected Sales Revenue
                </span>
                <span className="font-mono text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                  {formatBunkAmount(netSalesAmount, activeStation)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Immutable record ID will be generated upon commit.</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Underground tank stock is decremented automatically.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Meter Reading Register (Searchable & Audited) */}
      <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-5 shadow-xs transition space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Nozzle Meter Reading Register & History
            </h2>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search history..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-8 pr-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>

            <div className="min-w-[160px]">
              <SelectDropdown
                options={[
                  { value: 'ALL', label: 'All Types' },
                  { value: 'REGULAR_SHIFT', label: 'Regular Shift' },
                  { value: 'PERIODIC_CHECK', label: 'Periodic' },
                  { value: 'CORRECTIONS', label: 'Exceptions / Corrections' },
                ]}
                value={historyTypeFilter}
                onChange={(val) => setHistoryTypeFilter(val)}
                searchable={false}
              />
            </div>

            <span className="font-mono text-xs text-slate-500 dark:text-gray-400 tabular-nums">
              {filteredReadings.length} Records
            </span>
          </div>
        </div>

        {filteredReadings.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 dark:text-gray-500">
            No meter readings recorded yet matching your filters for {activeStation.name}.
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#D4E8E5] dark:border-[#194C47] text-[11px] uppercase tracking-wider text-[#0E3D38] dark:text-[#5EEAD4] bg-[#EAF4F3] dark:bg-[#0A2623] font-bold">
                <tr>
                  <th className="py-2.5 px-3">Record ID & Date</th>
                  <th className="py-2.5 px-3">Nozzle</th>
                  <th className="py-2.5 px-3">Fuel</th>
                  <th className="py-2.5 px-3 text-right">Opening Meter</th>
                  <th className="py-2.5 px-3 text-right">Closing Meter</th>
                  <th className="py-2.5 px-3 text-right">Dispensed</th>
                  <th className="py-2.5 px-3 text-right">Testing Jar</th>
                  <th className="py-2.5 px-3 text-right font-bold text-emerald-400">Net Sold</th>
                  <th className="py-2.5 px-3 text-right">Revenue</th>
                  <th className="py-2.5 px-3">Type & Reason</th>
                  <th className="py-2.5 px-3">Attendant</th>
                  <th className="py-2.5 px-3 text-center">Meter Photo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800 font-mono">
                {paginatedReadings.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-gray-800/40 transition">
                    <td className="py-2.5 px-3 text-slate-600 dark:text-gray-300 font-sans">
                      <span className="font-mono font-bold text-slate-900 dark:text-white block">
                        {r.id}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-gray-500">
                        {new Date(r.readingTimestamp).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        {new Date(r.readingTimestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{r.nozzleId}</td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="rounded bg-slate-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-gray-300">
                        {r.fuelCode}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-gray-400">
                      {(r.openingMeter ?? (r as any).openingElectronic ?? 0).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-gray-400">
                      {(r.closingMeter ?? (r as any).closingElectronic ?? 0).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-gray-300">
                      {(
                        r.grossDispensedLiters ??
                        Math.max(
                          0,
                          (r.closingMeter ?? (r as any).closingElectronic ?? 0) -
                            (r.openingMeter ?? (r as any).openingElectronic ?? 0)
                        )
                      ).toFixed(2)}{' '}
                      L
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">
                      {(r.testingLiters ?? (r as any).testFuelVolumeLiters ?? 0) > 0
                        ? `-${(r.testingLiters ?? (r as any).testFuelVolumeLiters ?? 0).toFixed(2)} L`
                        : '0 L'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {(r.netSoldLiters ?? 0).toFixed(2)} L
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                      ₹{(r.netSalesAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      {r.isCorrection ? (
                        <div>
                          <span className="rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 block w-max">
                            Correction / Rollover
                          </span>
                          {r.correctionReason && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate max-w-[130px]" title={r.correctionReason}>
                              {r.correctionReason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-600 dark:text-slate-400">
                          {r.readingType === 'REGULAR_SHIFT' ? 'Regular Shift' : r.readingType || 'Standard'}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-gray-400">
                      {r.recordedByName || r.enteredBy}
                    </td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      {r.meterPhotoUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewImage({
                              url: r.meterPhotoUrl!,
                              title: `Nozzle Meter Reading Photo: ${r.nozzleId} (${r.id})`,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition cursor-pointer"
                          title="Click to view dispenser meter reading photo"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Photo</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-sans">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Ag-Grid styled pagination footer */}
        {filteredReadings.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/30 rounded-b-xl">
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>
                Showing <strong className="text-slate-800 dark:text-slate-200">{((currentPage - 1) * pageSize) + 1}</strong>–<strong className="text-slate-800 dark:text-slate-200">{Math.min(currentPage * pageSize, filteredReadings.length)}</strong> of <strong className="text-slate-800 dark:text-slate-200">{filteredReadings.length}</strong> records
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
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
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                First
              </button>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Prev
              </button>
              <span className="px-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Next
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox / Modal for Meter Photo Preview */}
      {previewImage && (
        <ModalPortal isOpen={Boolean(previewImage)} onClose={() => setPreviewImage(null)} ariaLabel={previewImage.title}>
          <div className="relative max-w-2xl w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-500" />
                {previewImage.title}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[70vh] flex items-center justify-center bg-slate-950">
              <img
                src={previewImage.url}
                alt="Meter Counter Photo"
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
