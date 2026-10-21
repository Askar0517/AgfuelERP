import React, { useState, useEffect } from 'react';
import { FuelProduct, Tank } from '../types';
import { X, Ruler, AlertTriangle } from 'lucide-react';
import { ModalPortal } from './common/ModalPortal';

interface DipLogModalProps {
  tank: Tank;
  fuel: FuelProduct;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tankId: string, dipCm: number, waterDipCm: number) => Promise<void>;
}

export const DipLogModal: React.FC<DipLogModalProps> = ({
  tank,
  fuel,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [dipCm, setDipCm] = useState<number>(tank.currentDipCm);
  const [waterDipCm, setWaterDipCm] = useState<number>(tank.waterDipCm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Approximate volume calculation based on dipCm
  const h = Math.min(1, Math.max(0, dipCm / tank.maxDipCm));
  const theta = 2 * Math.acos(1 - 2 * h);
  const areaRatio = (theta - Math.sin(theta)) / (2 * Math.PI);
  const calculatedVolume = isNaN(areaRatio) ? 0 : Math.round(tank.capacityLiters * areaRatio);
  const ullageLiters = Math.max(0, tank.safeCapacityLiters - calculatedVolume);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(tank.id, dipCm, waterDipCm);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update dip');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} ariaLabel="Log Dip Rod Reading" className="max-w-md">
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
              <Ruler className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                Log Dip Rod Reading
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
                Tank #{tank.tankNumber} ({fuel.name})
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="my-3 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
              Product Fuel Dip (cm):
            </label>
            <input
              type="number"
              step="0.1"
              required
              min={0}
              max={tank.maxDipCm}
              value={dipCm}
              onChange={(e) => setDipCm(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 px-3 py-2 font-mono text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none tabular-nums"
            />
            <span className="mt-1 block text-[11px] text-slate-500 dark:text-gray-400">
              Maximum calibration dip height: {tank.maxDipCm} cm
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
              Water Bottom Paste Dip (cm):
            </label>
            <input
              type="number"
              step="0.1"
              required
              min={0}
              max={50}
              value={waterDipCm}
              onChange={(e) => setWaterDipCm(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 px-3 py-2 font-mono text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none tabular-nums"
            />
            {waterDipCm > 1.0 && (
              <span className="mt-1 block text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                Warning: Water bottom exceeds 1.0 cm threshold! Desludging needed.
              </span>
            )}
          </div>

          {/* Real-time calculated telemetry summary */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 text-white p-3.5 space-y-1.5 font-mono text-xs shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans">Estimated Stock Volume:</span>
              <span className="font-bold text-emerald-400 tabular-nums">
                {calculatedVolume.toLocaleString()} Liters
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans">Safe Ullage Room:</span>
              <span className="font-bold text-white tabular-nums">
                {ullageLiters.toLocaleString()} Liters
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans">Tank Fill Ratio:</span>
              <span className="font-bold text-cyan-400 tabular-nums">
                {((calculatedVolume / tank.capacityLiters) * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 px-5 py-2 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Commit Dip Reading'}
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};
