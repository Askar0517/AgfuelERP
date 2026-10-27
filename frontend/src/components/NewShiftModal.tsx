import React, { useState, useEffect } from 'react';
import { Dispenser, Employee, FuelProduct, Station, Shift, Nozzle } from '../types';
import { X, UserCheck, CheckCircle2, AlertTriangle, Coins, ShieldAlert, Plus } from 'lucide-react';
import { SelectDropdown } from './common/SelectDropdown';
import { ModalPortal } from './common/ModalPortal';
import { getBunkCurrency } from '../utils/currency';
import { formatNozzleCleanName } from '../utils/fuelConfig';

interface NewShiftModalProps {
  station: Station;
  employees: Employee[];
  dispensers: Dispenser[];
  nozzles?: Nozzle[];
  fuels: FuelProduct[];
  shifts?: Shift[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
}

export const NewShiftModal: React.FC<NewShiftModalProps> = ({
  station,
  employees,
  dispensers,
  nozzles = [],
  fuels,
  shifts = [],
  isOpen,
  onClose,
  onSubmit,
}) => {
  // Business Rule: Identify eligible forecourt attendants and staff
  const isAssignedToStation = (e: Employee) => {
    if (e.stationId === station.id) return true;
    if (Array.isArray(e.assignedBunks) && e.assignedBunks.includes(station.id)) return true;
    if (typeof e.assignedBunks === 'string') {
      try {
        const parsed = JSON.parse(e.assignedBunks);
        if (Array.isArray(parsed) && parsed.includes(station.id)) return true;
      } catch {
        if (e.assignedBunks.includes(station.id)) return true;
      }
    }
    // Global staff or unassigned station (e.g. administrator/manager/roving staff)
    if (!e.stationId && (!e.assignedBunks || e.assignedBunks === '[]' || (Array.isArray(e.assignedBunks) && e.assignedBunks.length === 0))) {
      return true;
    }
    return false;
  };

  const stationStaff = employees.filter((e) => isAssignedToStation(e) && e.status !== 'INACTIVE');
  const eligibleAttendants = (stationStaff.length > 0 ? stationStaff : employees.filter((e) => e.status !== 'INACTIVE'))
    .sort((a, b) => {
      const score = (role: string) => (role === 'ATTENDANT' ? 1 : role === 'OPERATOR' ? 2 : role === 'CASHIER' ? 3 : 4);
      return score(a.role) - score(b.role) || a.name.localeCompare(b.name);
    });

  const stationDispensers = dispensers.filter((d) => d.stationId === station.id);
  const currency = getBunkCurrency(station);

  // Business Rule: Identify active shifts running at this bunk
  const activeStationShifts = shifts.filter(
    (s) => s.stationId === station.id && s.status === 'ACTIVE'
  );
  const activeAttendantMap = new Map(
    activeStationShifts.map((s) => [s.attendantId, s])
  );
  const activeIslandMap = new Map(
    activeStationShifts.map((s) => [s.islandNumber, s])
  );

  // Dynamic Island detection from dispensers
  const detectedIslands = Array.from(new Set(stationDispensers.map((d) => d.islandNumber).filter(Boolean))).sort((a, b) => a - b);
  const availableIslands = detectedIslands.length > 0 ? detectedIslands : [1, 2];

  // Pick first available attendant without an active shift
  const firstAvailableAttendant = eligibleAttendants.find((a) => !activeAttendantMap.has(a.id));

  const [selectedAttendantId, setSelectedAttendantId] = useState(
    firstAvailableAttendant?.id || eligibleAttendants[0]?.id || ''
  );
  const [selectedIsland, setSelectedIsland] = useState<number>(availableIslands[0] || 1);
  const [openingCashFloat, setOpeningCashFloat] = useState<string>('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      if (firstAvailableAttendant) {
        setSelectedAttendantId(firstAvailableAttendant.id);
      } else if (eligibleAttendants.length > 0) {
        setSelectedAttendantId(eligibleAttendants[0].id);
      }
      // Pick first unoccupied island if possible
      const freeIsland = availableIslands.find((num) => !activeIslandMap.has(num)) || availableIslands[0] || 1;
      setSelectedIsland(freeIsland);
      setOpeningCashFloat('0');
    }
  }, [isOpen, station.id, eligibleAttendants.length]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Get nozzles for selected island
  const islandDispensers = stationDispensers.filter((d) => d.islandNumber === selectedIsland);
  let islandNozzles = islandDispensers.flatMap((d) => d.nozzles || []);
  if (islandNozzles.length === 0 && nozzles.length > 0) {
    islandNozzles = nozzles.filter(
      (n) => n.stationId === station.id && (islandDispensers.length === 0 || islandDispensers.some((d) => d.id === n.dispenserId))
    );
  }

  // Conflicts check based on shift business rules
  const attendantConflictShift = activeAttendantMap.get(selectedAttendantId);
  const islandConflictShift = activeIslandMap.get(selectedIsland);
  const hasConflict = Boolean(attendantConflictShift || islandConflictShift);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasConflict || !selectedAttendantId) return;

    setIsSubmitting(true);
    try {
      const initialReadings = islandNozzles.map((n) => ({
        nozzleId: n.id,
        fuelCode: n.fuelCode,
        startMeter: n.electronicTotalizer || 0,
        openingElectronic: n.electronicTotalizer || 0,
        endMeter: n.electronicTotalizer || 0,
        testingLiters: 0,
        rate: fuels.find((f) => f.code === n.fuelCode)?.ratePerLiter || 100,
      }));

      const chosenStaff = eligibleAttendants.find((e) => e.id === selectedAttendantId);

      await onSubmit({
        stationId: station.id,
        attendantId: selectedAttendantId,
        attendantName: chosenStaff?.name || 'Forecourt Attendant',
        islandNumber: selectedIsland,
        openingCashFloat: parseFloat(openingCashFloat) || 0,
        shiftCode: `SHF-${Date.now().toString().slice(-4)}`,
        nozzleReadings: initialReadings,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Open New Forecourt Shift"
      className="max-w-lg"
    >
      <div className="relative w-full rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-slate-900 dark:text-gray-100 shadow-2xl transition">
        {/* Flush top-right close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-0 right-0 flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-tr-2xl rounded-bl-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white transition cursor-pointer z-10"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4 text-white stroke-[2.5]" />
        </button>

        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-gray-800 pb-3 pr-10">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                Open New Forecourt Shift
              </h2>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {station.name} · Currency: {currency.code} ({currency.symbol})
              </span>
            </div>
          </div>
        </div>

        {/* Business Rule Conflict Banner */}
        {attendantConflictShift && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <span className="font-bold block">Attendant Shift Conflict</span>
              <span>
                Selected attendant is already actively operating Island #{attendantConflictShift.islandNumber} (Shift #{attendantConflictShift.shiftCode}). Under petroleum safety & fiscal compliance rules, concurrent active shifts are prohibited.
              </span>
            </div>
          </div>
        )}

        {islandConflictShift && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <span className="font-bold block">Island In Use</span>
              <span>
                Island #{selectedIsland} is already running active Shift #{islandConflictShift.shiftCode} under {islandConflictShift.attendantName}. Close or reconcile that shift first.
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Attendant Selector */}
          <div>
            <SelectDropdown
              label="Assign Forecourt Staff / Attendant"
              required
              placeholder="Select an attendant or staff member..."
              options={eligibleAttendants.map((att) => {
                const busyShift = activeAttendantMap.get(att.id);
                return {
                  value: att.id,
                  label: `${att.name} (${att.role})`,
                  description: busyShift
                    ? `Currently active on Island #${busyShift.islandNumber} (Shift #${busyShift.shiftCode})`
                    : `${att.shiftSchedule || 'General'} Shift · ${att.stationId === station.id ? 'Assigned to Bunk' : 'All-Bunks Staff'}`,
                  badge: busyShift ? 'BUSY' : att.role,
                  badgeClass: busyShift
                    ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
                };
              })}
              value={selectedAttendantId}
              onChange={(val) => setSelectedAttendantId(val)}
              searchable={eligibleAttendants.length > 4}
            />
            {eligibleAttendants.length === 0 && (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                No active staff found for this bunk. You can create or assign attendants in Management &gt; Users.
              </p>
            )}
          </div>

          {/* Island Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
              Select Operating Forecourt Island:
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-3">
              {availableIslands.map((islandNum) => {
                const activeShift = activeIslandMap.get(islandNum);
                const isSelected = selectedIsland === islandNum;
                return (
                  <button
                    key={islandNum}
                    type="button"
                    onClick={() => setSelectedIsland(islandNum)}
                    className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                      isSelected
                        ? activeShift
                          ? 'border-amber-500/80 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-bold'
                          : 'border-emerald-500/80 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold'
                        : 'border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 text-slate-600 dark:text-gray-400 hover:border-slate-300 dark:hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="block text-xs font-bold">Island #{islandNum}</span>
                      {activeShift && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] opacity-75 font-normal block mt-0.5">
                      {stationDispensers.filter((d) => d.islandNumber === islandNum).length} Dispenser Units
                    </span>
                    {activeShift && (
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 block mt-1 truncate">
                        Attendant: {activeShift.attendantName}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Opening Cash Float */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
              Opening Cash Float ({currency.symbol})
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400">
                {currency.symbol}
              </span>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={openingCashFloat}
                onChange={(e) => setOpeningCashFloat(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Cash float issued to attendant at start of shift for change dispensing.
            </span>
          </div>

          {/* Initial Electronic Meter Reading Preview */}
          <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 p-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 block mb-2">
              Opening Nozzle Meter Locks (Snapshot from Hardware Totalizers)
            </span>
            {islandNozzles.length === 0 ? (
              <div className="py-2 text-slate-400 text-center text-xs">
                No nozzles provisioned on Island #{selectedIsland}.
              </div>
            ) : (
              <div className="space-y-1 font-mono text-xs max-h-32 overflow-y-auto no-scrollbar">
                {islandNozzles.map((noz) => (
                  <div
                    key={noz.id}
                    className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-gray-900 last:border-0"
                  >
                    <span className="text-slate-600 dark:text-gray-400">
                      {formatNozzleCleanName(noz.name, noz.nozzleNumber)} ({noz.fuelCode}):
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {(noz.electronicTotalizer || 0).toFixed(2)} L
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || hasConflict}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 px-5 py-2 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSubmitting ? 'Opening Shift...' : 'Activate Shift & Lock Island'}</span>
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};
