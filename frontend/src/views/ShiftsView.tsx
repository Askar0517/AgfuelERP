import React, { useState, useEffect } from 'react';
import { Shift, Employee, Station, FuelProduct } from '../types';
import { ShiftSettleModal } from '../components/ShiftSettleModal';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { SelectDropdown } from '../components/common/SelectDropdown';
import { getBunkCurrency } from '../utils/currency';
import {
  Users,
  Clock,
  Plus,
  Calculator,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';

interface ShiftsViewProps {
  station: Station;
  stations?: Station[];
  shifts: Shift[];
  employees: Employee[];
  fuels: FuelProduct[];
  onSelectStation?: (stationId: string) => void;
  onSettleShift: (shiftId: string, payload: any) => Promise<void>;
  onOpenShiftModal: () => void;
}

export const ShiftsView: React.FC<ShiftsViewProps> = ({
  station,
  stations = [],
  shifts,
  fuels,
  onSelectStation,
  onSettleShift,
  onOpenShiftModal,
}) => {
  const [activeStationId, setActiveStationId] = useState<string>(station.id);
  const activeStation =
    (stations.length > 0 ? stations.find((s) => s.id === activeStationId) : station) || station;

  useEffect(() => {
    if (station?.id && station.id !== activeStationId) {
      setActiveStationId(station.id);
    }
  }, [station?.id]);

  const handleStationChange = (id: string) => {
    setActiveStationId(id);
    if (onSelectStation) onSelectStation(id);
  };

  const currentShifts = shifts.filter((s) => s.stationId === activeStation.id);
  const [settlingShift, setSettlingShift] = useState<Shift | null>(null);
  const currency = getBunkCurrency(activeStation);

  const activeShifts = currentShifts.filter((s) => s.status === 'ACTIVE');
  const settledShifts = currentShifts.filter((s) => s.status !== 'ACTIVE');

  if (stations.length === 0 && !station) {
    return (
      <div className="space-y-3 pb-12 sm:pb-6 animate-fadeIn">
        <Breadcrumbs
          items={[
            { label: 'Management' },
            { label: 'Shifts', isCurrent: true, icon: Users },
          ]}
        />
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <Users className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No Petrol Bunks Registered
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Please create a petrol bunk station and assign forecourt staff before opening duty shifts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-12 sm:pb-6">
      {/* Breadcrumb Navigation & Action Bar */}
      <Breadcrumbs
        items={[
          { label: 'Management' },
          { label: 'Shifts', isCurrent: true, icon: Users },
        ]}
        badge={
          <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/20">
            {station.name} ({station.code})
          </span>
        }
        actions={
          <button
            type="button"
            onClick={onOpenShiftModal}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#12544F] hover:bg-[#0E433F] px-3.5 py-1.5 text-xs font-semibold text-white active:scale-95 transition shadow-sm cursor-pointer shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Assign New Shift</span>
          </button>
        }
      />

      {/* Active Shifts In Progress */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-gray-200 flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Active Forecourt Shifts ({activeShifts.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {activeShifts.map((shift) => (
            <div
              key={shift.id}
              className="rounded-2xl border border-emerald-500/30 bg-white dark:bg-gray-900/70 p-4 sm:p-5 shadow-xs relative overflow-hidden transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{shift.attendantName}</h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400">
                      Island #{shift.islandNumber} · Shift #{shift.shiftCode}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-gray-400 font-mono">
                      Started: {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  Active
                </span>
              </div>

              {/* Nozzle Totalizer Summary */}
              <div className="mt-3.5 space-y-1.5 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950/70 p-3 font-mono text-xs">
                {(shift.nozzleReadings || []).map((nr: any) => {
                  const fuel = fuels.find((f) => f.code === nr.fuelCode);
                  return (
                    <div key={nr.nozzleId} className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-gray-400">
                        {nr.nozzleId} ({fuel?.shortName || nr.fuelCode}):
                      </span>
                      <span className="text-slate-900 dark:text-white font-bold tabular-nums">
                        Start: {(nr.openingElectronic ?? nr.startMeter ?? 0).toFixed(1)} L
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Settlement Action Button */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-gray-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSettlingShift(shift)}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-semibold text-white active:scale-95 transition shadow-sm"
                >
                  <Calculator className="h-4 w-4" />
                  <span>Close & Reconcile Shift</span>
                </button>
              </div>
            </div>
          ))}
          {activeShifts.length === 0 && (
            <div className="col-span-2 rounded-2xl border border-dashed border-slate-300 dark:border-gray-800 p-8 text-center text-xs text-slate-400 dark:text-gray-500 flex flex-col items-center justify-center gap-3">
              <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  No active duty shifts currently running for {station.name}.
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Assign forecourt staff to an island to begin fuel dispensing and meter tracking.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenShiftModal}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Assign New Shift Now</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Historical Settled Shifts Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-5 shadow-xs transition">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Settled Shifts Audit Trail
            </h2>
          </div>
          <span className="font-mono text-xs text-slate-500 dark:text-gray-400">
            {settledShifts.length} Handover Settlements
          </span>
        </div>

        {settledShifts.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 dark:text-gray-500">
            No settled shifts recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#D4E8E5] dark:border-[#194C47] text-[11px] uppercase tracking-wider text-[#0E3D38] dark:text-[#5EEAD4] bg-[#EAF4F3] dark:bg-[#0A2623] font-bold">
                <tr>
                  <th className="py-2.5 px-3">Date / Start</th>
                  <th className="py-2.5 px-3">Shift Code</th>
                  <th className="py-2.5 px-3">Attendant</th>
                  <th className="py-2.5 px-3">Island</th>
                  <th className="py-2.5 px-3 text-right">Fuel Dispensed</th>
                  <th className="py-2.5 px-3 text-right">Expected Rev</th>
                  <th className="py-2.5 px-3 text-right">Cash Handover</th>
                  <th className="py-2.5 px-3 text-right">Digital / POS</th>
                  <th className="py-2.5 px-3 text-right">Variance</th>
                  <th className="py-2.5 px-3">Auditor Certified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800 font-mono">
                {settledShifts.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-gray-800/40 transition">
                    <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-gray-300">
                      {new Date(s.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                      <span className="text-[10px] text-slate-400 dark:text-gray-500">
                        {new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{s.shiftCode}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-900 dark:text-white font-medium">{s.attendantName}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-gray-400">Island #{s.islandNumber}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white">
                      {s.totalFuelSoldLiters.toLocaleString()} L
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 dark:text-gray-400">
                      {currency.symbol}{s.totalExpectedRevenue.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {currency.symbol}{s.cashSubmitted.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-gray-300">
                      {currency.symbol}{s.digitalSubmitted.toLocaleString()}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        s.shortageExcess < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {s.shortageExcess === 0
                        ? `${currency.symbol}0 (Balanced)`
                        : s.shortageExcess > 0
                        ? `+${currency.symbol}${s.shortageExcess}`
                        : `-${currency.symbol}${Math.abs(s.shortageExcess)}`}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-gray-400">
                      {s.managerSignOff || 'Signed Off'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Settle Shift Modal */}
      {settlingShift && (
        <ShiftSettleModal
          shift={settlingShift}
          station={station}
          fuels={fuels}
          isOpen={!!settlingShift}
          onClose={() => setSettlingShift(null)}
          onSubmit={async (payload) => {
            await onSettleShift(settlingShift.id, payload);
            setSettlingShift(null);
          }}
        />
      )}
    </div>
  );
};
