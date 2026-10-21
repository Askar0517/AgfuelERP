import React from 'react';
import { Dispenser, FuelProduct } from '../types';
import { Fuel, Calculator } from 'lucide-react';
import { getFuelDefinition } from '../utils/fuelConfig';

interface DispenserCardProps {
  dispenser: Dispenser;
  fuels: FuelProduct[];
  onOpenMeterEntry?: (nozzleId?: string) => void;
}

export const DispenserCard: React.FC<DispenserCardProps> = ({
  dispenser,
  fuels,
  onOpenMeterEntry,
}) => {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-4 sm:p-5 shadow-xs transition hover:border-slate-300 dark:hover:border-gray-700">
      {/* Dispenser Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Fuel className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-sans text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Dispenser #{dispenser.dispenserNumber}
              </h3>
              <span className="font-mono text-xs text-slate-500 dark:text-gray-400">
                · Island {dispenser.islandNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-gray-400">{dispenser.brand} Multi-Product Dispenser</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Active</span>
        </div>
      </div>

      {/* Nozzles List */}
      <div className="my-3 space-y-3">
        {dispenser.nozzles.map((nozzle) => {
          const fuel = fuels.find((f) => f.code === nozzle.fuelCode);
          const fuelDef = getFuelDefinition(nozzle.fuelCode);

          const fuelTheme = {
            OCTANE_98: {
              border: 'border-rose-500/30',
              bg: 'bg-rose-500/5',
              dot: 'bg-[#DC2626]',
            },
            OCTANE_95: {
              border: 'border-emerald-500/30',
              bg: 'bg-emerald-500/5',
              dot: 'bg-[#16A34A]',
            },
            DIESEL: {
              border: 'border-amber-500/30',
              bg: 'bg-amber-500/5',
              dot: 'bg-[#EAB308]',
            },
            PETROL: {
              border: 'border-emerald-500/30',
              bg: 'bg-emerald-500/5',
              dot: 'bg-[#16A34A]',
            },
            PREMIUM: {
              border: 'border-rose-500/30',
              bg: 'bg-rose-500/5',
              dot: 'bg-[#DC2626]',
            },
          }[fuelDef.code] || {
            border: 'border-slate-200 dark:border-gray-800',
            bg: 'bg-slate-50 dark:bg-gray-900/40',
            dot: 'bg-[#16A34A]',
          };

          return (
            <div
              key={nozzle.id}
              className={`rounded-xl border p-3 transition ${fuelTheme.border} ${fuelTheme.bg}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${fuelTheme.dot}`} />
                  <span className="font-sans text-xs font-bold text-slate-900 dark:text-white">
                    Nozzle #{nozzle.nozzleNumber} · {fuelDef.name}
                  </span>
                </div>
                <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  ₹{fuel?.ratePerLiter.toFixed(2) ?? '0.00'}/L
                </span>
              </div>

              {/* Totalizers */}
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-slate-800 dark:text-white">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-sans">Mechanical</span>
                  <span className="font-bold text-slate-900 dark:text-white tabular-nums text-xs">
                    {nozzle.mechanicalTotalizer.toLocaleString(undefined, {
                      minimumFractionDigits: 1,
                    })}{' '}
                    L
                  </span>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-slate-800 dark:text-white">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-sans">Electronic</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums text-xs">
                    {nozzle.electronicTotalizer.toLocaleString(undefined, {
                      minimumFractionDigits: 1,
                    })}{' '}
                    L
                  </span>
                </div>
              </div>

              {onOpenMeterEntry && (
                <button
                  type="button"
                  onClick={() => onOpenMeterEntry(nozzle.id)}
                  className="mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition shadow-2xs"
                >
                  <Calculator className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Log Meter Reading</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
