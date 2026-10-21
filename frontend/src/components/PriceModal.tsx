import React, { useState, useEffect } from 'react';
import { FuelProduct } from '../types';
import { X, Tag, Save, CheckCircle2 } from 'lucide-react';
import { ConfirmationModal } from './common/ConfirmationModal';
import { ModalPortal } from './common/ModalPortal';
import { getFuelDefinition } from '../utils/fuelConfig';

interface PriceModalProps {
  fuels: FuelProduct[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rates: Record<string, number>) => Promise<void>;
}

export const PriceModal: React.FC<PriceModalProps> = ({
  fuels,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [rates, setRates] = useState<{ [code: string]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    const initial: { [code: string]: number } = {};
    fuels.forEach((f) => {
      initial[f.code] = f.ratePerLiter;
    });
    setRates(initial);
    setIsConfirming(false);
  }, [fuels, isOpen]);

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
      await onSubmit(rates);
      setIsConfirming(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update rates');
      setIsConfirming(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ModalPortal isOpen={isOpen} onClose={onClose} ariaLabel="Daily Fuel Price Revision" className="max-w-md">
        <div className="relative w-full max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 shadow-2xl my-auto text-slate-900 dark:text-gray-100 transition">
          {/* Flush top-right close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-0 right-0 flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-tr-2xl rounded-bl-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white transition cursor-pointer z-10"
            aria-label="Close modal"
          >
            <X className="h-4 w-4 text-white stroke-[2.5]" />
          </button>
          <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-gray-800 pb-3.5 pr-10">
            <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Tag className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  Daily Fuel Price Revision
                </h2>
                <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
                  Synchronize rates with OMC billing and POS meters
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="my-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handlePreSubmit} className="mt-4 space-y-4">
            {fuels.map((fuel) => {
              const def = getFuelDefinition(fuel.code);
              return (
                <div key={fuel.code} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-gray-300">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: def.colorHex }}
                      />
                      <span>{def.displayName}</span>
                    </label>
                    <span className="font-mono text-xs text-slate-500 dark:text-gray-400">
                      Current: \u20B9{fuel.ratePerLiter.toFixed(2)}
                    </span>
                  </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-2.5 text-xs text-slate-400 dark:text-gray-500 font-mono">
                    \u20B9
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min={1}
                    value={rates[fuel.code] || ''}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        [fuel.code]: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 py-2 pl-7 pr-3 font-mono text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-hidden tabular-nums"
                  />
                </div>
              </div>
            );
          })}

            <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 p-3 text-xs text-slate-500 dark:text-gray-400">
              <span className="font-semibold text-slate-700 dark:text-gray-300 block mb-1">
                Legal Metrology Compliance Note:
              </span>
              Price changes take effect immediately across all connected nozzle totalizers and sales ledger calculations.
            </div>

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
                disabled={isSubmitting}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 px-5 py-2 text-xs font-semibold text-white shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>Review & Publish</span>
              </button>
            </div>
          </form>
        </div>
      </ModalPortal>

      {/* Common Confirmation Modal for Sensitive Price Updates */}
      <ConfirmationModal
        isOpen={isConfirming}
        onClose={() => setIsConfirming(false)}
        onConfirm={handleExecutePriceUpdate}
        title="Confirm Daily Fuel Rate Revision"
        message={
          <div>
            <p>
              Are you sure you want to broadcast these revised rates to all forecourt nozzles and POS meters?
            </p>
            <div className="mt-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-800 space-y-1.5 font-mono text-xs">
              {fuels.map((f) => (
                <div key={f.code} className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">{getFuelDefinition(f.code).displayName}:</span>
                  <span>
                    \u20B9{f.ratePerLiter.toFixed(2)} &rarr; <strong className="text-emerald-600 dark:text-emerald-400">\u20B9{(rates[f.code] || f.ratePerLiter).toFixed(2)}</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>
        }
        variant="warning"
        confirmLabel="Publish Revised Rates"
        isLoading={isSubmitting}
      />
    </>
  );
};
