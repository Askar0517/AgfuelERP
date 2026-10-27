import React, { useState, useEffect } from 'react';
import { FuelProduct, Station } from '../types';
import { X, Tag, Save, Building2, Globe, RotateCcw, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { ConfirmationModal } from './common/ConfirmationModal';
import { ModalPortal } from './common/ModalPortal';
import { getFuelDefinition } from '../utils/fuelConfig';
import { getBunkCurrency, formatBunkAmount } from '../utils/currency';
import { api } from '../api/client';

interface PriceModalProps {
  fuels: FuelProduct[];
  stations?: Station[];
  activeStation?: Station;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rates: Record<string, number>, targetStationId?: string | null) => Promise<void>;
  onResetStationRate?: (fuelCode: string, stationId: string) => Promise<void>;
}

export const PriceModal: React.FC<PriceModalProps> = ({
  fuels,
  stations = [],
  activeStation,
  isOpen,
  onClose,
  onSubmit,
  onResetStationRate,
}) => {
  const [scope, setScope] = useState<'STATION' | 'GLOBAL'>(activeStation ? 'STATION' : 'GLOBAL');
  const [selectedStationId, setSelectedStationId] = useState<string>(activeStation?.id || stations[0]?.id || '');
  const [targetFuels, setTargetFuels] = useState<FuelProduct[]>(fuels);
  const [rates, setRates] = useState<{ [code: string]: number }>({});
  const [isLoadingStation, setIsLoadingStation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingCode, setIsResettingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Active station entity based on selectedStationId
  const currentTargetStation = stations.find((s) => s.id === selectedStationId) || activeStation || stations[0];
  const currencyCfg = getBunkCurrency(scope === 'STATION' ? currentTargetStation : null);

  // Sync initial targetStationId when modal opens
  useEffect(() => {
    if (isOpen) {
      if (activeStation) {
        setSelectedStationId(activeStation.id);
        setScope('STATION');
      } else if (stations.length > 0) {
        setSelectedStationId(stations[0].id);
      }
      setIsConfirming(false);
      setError(null);
    }
  }, [isOpen, activeStation, stations]);

  // Fetch or resolve fuels whenever scope or selectedStationId changes
  useEffect(() => {
    if (!isOpen) return;

    if (scope === 'GLOBAL') {
      // Fetch global base fuels
      setIsLoadingStation(true);
      api.getFuels()
        .then((res) => {
          setTargetFuels(res);
          const initialRates: { [code: string]: number } = {};
          res.forEach((f) => {
            initialRates[f.code] = f.ratePerLiter;
          });
          setRates(initialRates);
        })
        .catch(() => {
          setTargetFuels(fuels);
          const initialRates: { [code: string]: number } = {};
          fuels.forEach((f) => {
            initialRates[f.code] = f.globalRatePerLiter || f.ratePerLiter;
          });
          setRates(initialRates);
        })
        .finally(() => setIsLoadingStation(false));
    } else if (selectedStationId) {
      // Fetch station-specific fuels
      setIsLoadingStation(true);
      api.getFuels(selectedStationId)
        .then((res) => {
          setTargetFuels(res);
          const initialRates: { [code: string]: number } = {};
          res.forEach((f) => {
            initialRates[f.code] = f.ratePerLiter;
          });
          setRates(initialRates);
        })
        .catch(() => {
          setTargetFuels(fuels);
          const initialRates: { [code: string]: number } = {};
          fuels.forEach((f) => {
            initialRates[f.code] = f.ratePerLiter;
          });
          setRates(initialRates);
        })
        .finally(() => setIsLoadingStation(false));
    }
  }, [isOpen, scope, selectedStationId]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isConfirming) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isConfirming, onClose]);

  if (!isOpen) return null;

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfirming(true);
  };

  const handleExecutePriceUpdate = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const stationTarget = scope === 'STATION' ? selectedStationId : null;
      await onSubmit(rates, stationTarget);
      setIsConfirming(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update rates');
      setIsConfirming(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetToGlobal = async (fuelCode: string) => {
    if (!selectedStationId || scope !== 'STATION') return;
    setIsResettingCode(fuelCode);
    setError(null);
    try {
      if (onResetStationRate) {
        await onResetStationRate(fuelCode, selectedStationId);
      } else {
        await api.resetFuelRate(fuelCode, selectedStationId);
      }
      // Re-fetch fuels for station
      const refreshed = await api.getFuels(selectedStationId);
      setTargetFuels(refreshed);
      setRates((prev) => {
        const matching = refreshed.find((f) => f.code === fuelCode);
        return {
          ...prev,
          [fuelCode]: matching ? matching.ratePerLiter : prev[fuelCode],
        };
      });
    } catch (err: any) {
      setError(err.message || `Failed to revert ${fuelCode} to global base rate`);
    } finally {
      setIsResettingCode(null);
    }
  };

  return (
    <>
      <ModalPortal isOpen={isOpen} onClose={onClose} ariaLabel="Fuel Price Revision Console" className="max-w-lg">
        <div className="relative w-full max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 shadow-2xl my-auto text-slate-900 dark:text-gray-100 transition">
          {/* Top-right close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-0 right-0 flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-tr-2xl rounded-bl-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white transition cursor-pointer z-10"
            aria-label="Close modal"
          >
            <X className="h-4 w-4 text-white stroke-[2.5]" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-gray-800 pb-3.5 pr-10">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Tag className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                Fuel Price Revision Console
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
                Configure station-specific pump rates or global base pricing
              </p>
            </div>
          </div>

          {error && (
            <div className="my-3 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Scope Selector: Station Specific vs Global */}
          <div className="mt-4">
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-gray-800/80 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setScope('STATION')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition cursor-pointer ${
                  scope === 'STATION'
                    ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Station Specific</span>
              </button>
              <button
                type="button"
                onClick={() => setScope('GLOBAL')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg transition cursor-pointer ${
                  scope === 'GLOBAL'
                    ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                <span>Global Base (All Bunks)</span>
              </button>
            </div>

            {/* Station dropdown when in station-specific mode */}
            {scope === 'STATION' && stations.length > 0 && (
              <div className="mt-3 p-3 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950/60 space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-gray-400 uppercase tracking-wider block">
                  Select Target Petrol Bunk
                </label>
                <select
                  value={selectedStationId}
                  onChange={(e) => setSelectedStationId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-2 px-3 text-xs font-semibold text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden"
                >
                  {stations.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.code}) — {st.location || 'Central Forecourt'}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 dark:text-gray-400">
                  Custom rates applied here override global base rates only for{' '}
                  <strong className="text-slate-700 dark:text-gray-300">
                    {currentTargetStation?.name || selectedStationId}
                  </strong>
                  .
                </p>
              </div>
            )}

            {scope === 'GLOBAL' && (
              <div className="mt-3 p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs text-blue-700 dark:text-blue-300">
                <p>
                  <strong>Global Default Rates:</strong> Changing prices in this mode applies to all bunks that do not have custom overrides.
                </p>
              </div>
            )}
          </div>

          {/* Fuel Rates Input Form */}
          <form onSubmit={handlePreSubmit} className="mt-4 space-y-4">
            {isLoadingStation ? (
              <div className="py-8 text-center text-xs text-slate-500 dark:text-gray-400">
                Loading fuel rate matrix...
              </div>
            ) : (
              targetFuels.map((fuel) => {
                const def = getFuelDefinition(fuel.code);
                const currentInputRate = rates[fuel.code] || fuel.ratePerLiter || 0;
                const globalBase = fuel.globalRatePerLiter ?? fuel.ratePerLiter;
                const isCustom = scope === 'STATION' && Boolean(fuel.isStationCustom);

                return (
                  <div
                    key={fuel.code}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/40 space-y-2.5 transition hover:border-emerald-500/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: def.colorHex }}
                        />
                        <span className="text-xs font-bold text-slate-800 dark:text-white">
                          {def.displayName}
                        </span>
                        <span className="font-mono text-[10px] font-semibold text-slate-400 dark:text-gray-500">
                          ({def.shortName})
                        </span>
                      </div>

                      {/* Status Tag */}
                      <div className="flex items-center gap-1.5">
                        {scope === 'STATION' && (
                          isCustom ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                              Custom Override
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-gray-800 text-slate-600 dark:text-gray-400">
                              Base Inherited
                            </span>
                          )
                        )}
                        <span className="font-mono text-xs text-slate-500 dark:text-gray-400">
                          Active: {currencyCfg.symbol}{fuel.ratePerLiter.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Reference and Action Row */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-gray-400">
                      <span>
                        Global Base:{' '}
                        <strong className="font-mono text-slate-700 dark:text-gray-300">
                          {currencyCfg.symbol}{globalBase.toFixed(2)}
                        </strong>
                      </span>

                      {/* Revert to Global Button if custom override is set */}
                      {scope === 'STATION' && isCustom && (
                        <button
                          type="button"
                          onClick={() => handleResetToGlobal(fuel.code)}
                          disabled={isResettingCode === fuel.code}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:underline cursor-pointer disabled:opacity-50"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>{isResettingCode === fuel.code ? 'Reverting...' : 'Revert to Base'}</span>
                        </button>
                      )}
                    </div>

                    {/* Numeric Input */}
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-2.5 text-xs text-slate-400 dark:text-gray-500 font-mono font-semibold">
                        {currencyCfg.symbol}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        min={1}
                        value={rates[fuel.code] ?? ''}
                        onChange={(e) =>
                          setRates({
                            ...rates,
                            [fuel.code]: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-2 pl-8 pr-3 font-mono text-sm font-semibold text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden tabular-nums shadow-xs"
                      />
                    </div>

                    {/* Live Dispense Preview Calculation */}
                    <div className="text-[10px] font-mono text-slate-400 dark:text-gray-500 flex justify-between">
                      <span>Calculation Preview:</span>
                      <span>
                        100 Liters ={' '}
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          {currencyCfg.symbol}{(currentInputRate * 100).toFixed(2)}
                        </strong>
                      </span>
                    </div>
                  </div>
                );
              })
            )}

            {/* Metrology & Compliance Note */}
            <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 p-3 text-xs text-slate-500 dark:text-gray-400">
              <span className="font-semibold text-slate-700 dark:text-gray-300 block mb-0.5">
                Legal Metrology Compliance:
              </span>
              Revised rates are immediately registered in the immutable audit ledger. Subsequent meter logs and shift settlements will compute net sales using these rates.
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-gray-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isLoadingStation}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 px-5 py-2 text-xs font-semibold text-white shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>Review & Publish</span>
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirming}
        onClose={() => setIsConfirming(false)}
        onConfirm={handleExecutePriceUpdate}
        title={
          scope === 'STATION'
            ? `Confirm Rate Revision for ${currentTargetStation?.name || selectedStationId}`
            : 'Confirm Global Daily Fuel Rate Revision'
        }
        message={
          <div>
            <p className="text-xs text-slate-600 dark:text-gray-300">
              {scope === 'STATION' ? (
                <>
                  You are publishing station-specific retail rates for{' '}
                  <strong>{currentTargetStation?.name} ({currentTargetStation?.code})</strong>. Other petrol bunks will continue using their respective rates.
                </>
              ) : (
                <>
                  You are publishing <strong>global base rates</strong> across all forecourts. Any station without a custom price override will immediately inherit these new rates.
                </>
              )}
            </p>
            <div className="mt-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-800 space-y-1.5 font-mono text-xs">
              {targetFuels.map((f) => {
                const newRate = rates[f.code] ?? f.ratePerLiter;
                return (
                  <div key={f.code} className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400 font-sans font-medium">
                      {getFuelDefinition(f.code).displayName}:
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span>{currencyCfg.symbol}{f.ratePerLiter.toFixed(2)}</span>
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {currencyCfg.symbol}{newRate.toFixed(2)}
                      </strong>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        }
        variant="warning"
        confirmLabel="Publish Rates"
        isLoading={isSubmitting}
      />
    </>
  );
};
