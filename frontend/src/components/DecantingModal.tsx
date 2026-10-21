import React, { useState, useEffect } from 'react';
import { FuelProduct, Tank } from '../types';
import { X, ArrowDownToLine, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ModalPortal } from './common/ModalPortal';
import { ImageUploadInput } from './common/ImageUploadInput';

interface DecantingModalProps {
  tank: Tank;
  fuel: FuelProduct;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    tankerNumber: string;
    invoiceNo: string;
    invoiceVolumeLiters: number;
    observedDensity: number;
    temperatureC: number;
    preDipCm: number;
    postDipCm: number;
    invoiceImageUrl?: string;
  }) => Promise<void>;
}

export const DecantingModal: React.FC<DecantingModalProps> = ({
  tank,
  fuel,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [tankerNumber, setTankerNumber] = useState('TN-22-BA-9104');
  const [invoiceNo, setInvoiceNo] = useState('INV-IOCL-88210');
  const [invoiceVolumeLiters, setInvoiceVolumeLiters] = useState(12000);
  const [invoiceImageUrl, setInvoiceImageUrl] = useState<string | null>(null);
  const [observedDensity, setObservedDensity] = useState(
    fuel.code === 'DIESEL' ? 828.5 : 742.0
  );
  const [temperatureC, setTemperatureC] = useState(28.5);
  const [preDipCm, setPreDipCm] = useState(tank.currentDipCm);
  const [postDipCm, setPostDipCm] = useState(
    Math.min(tank.maxDipCm, tank.currentDipCm + 110)
  );

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

  // ASTM 53B Correction calculation
  const correctionFactor = 0.0007;
  const tempDiff = temperatureC - 15.0;
  const correctedDensity15C = Number(
    (observedDensity * (1 + correctionFactor * tempDiff)).toFixed(1)
  );

  const standard15C = fuel.densityStandard15C || fuel.densityStd15c || (fuel.code === 'DIESEL' ? 830 : 745);
  const densityDiff = Math.abs(correctedDensity15C - standard15C);
  const isDensityCompliant = densityDiff <= fuel.densityTolerance;

  const safeUllageLiters = Math.max(0, tank.safeCapacityLiters - tank.currentVolumeLiters);
  const isOverfillHazard = invoiceVolumeLiters > safeUllageLiters;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOverfillHazard) {
      setError(`Overfill Hazard! Invoice volume (${invoiceVolumeLiters} L) exceeds available safe ullage (${safeUllageLiters} L).`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        tankerNumber,
        invoiceNo,
        invoiceVolumeLiters,
        observedDensity,
        temperatureC,
        preDipCm,
        postDipCm,
        invoiceImageUrl: invoiceImageUrl || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to process tanker decanting');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} ariaLabel="Tanker Load Decanting Inward" className="max-w-xl">
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
              <ArrowDownToLine className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                Tanker Load Decanting Inward
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
                Receiving into Tank #{tank.tankNumber} ({fuel.name})
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
                Tanker Truck Number:
              </label>
              <input
                type="text"
                required
                value={tankerNumber}
                onChange={(e) => setTankerNumber(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
                Invoice / Challan No:
              </label>
              <input
                type="text"
                required
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
              Invoice Quantity (Liters):
            </label>
            <input
              type="number"
              required
              step="100"
              min={500}
              value={invoiceVolumeLiters}
              onChange={(e) => setInvoiceVolumeLiters(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 px-3 py-2 font-mono text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none tabular-nums"
            />
            {isOverfillHazard && (
              <span className="mt-1 block text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                Warning: Safe ullage is only {safeUllageLiters.toLocaleString()} L!
              </span>
            )}
          </div>

          {/* Decant Load Invoice / Challan Copy */}
          <div>
            <ImageUploadInput
              label="Decant Load Invoice / Delivery Challan Copy:"
              category="invoice"
              helperText="Attach oil company delivery challan / invoice photo (stored in uploads folder)"
              value={invoiceImageUrl}
              onChange={(url) => setInvoiceImageUrl(url)}
            />
          </div>

          {/* ASTM 53B Density Testing Section */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 text-white p-4 shadow-inner">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                ASTM 53B Density & Quality Check
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-400">
                  Observed Hydrometer Density (kg/m³):
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={observedDensity}
                  onChange={(e) => setObservedDensity(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400">
                  Fuel Temperature (°C):
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={temperatureC}
                  onChange={(e) => setTemperatureC(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none tabular-nums"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-950 px-3 py-2 text-xs font-mono border border-slate-800">
              <span className="text-slate-400">Corrected 15°C Density:</span>
              <span className="font-bold text-white tabular-nums">
                {correctedDensity15C} kg/m³
              </span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  isDensityCompliant
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {isDensityCompliant ? 'Passed Quality Check' : 'Tolerance Alert'}
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
              disabled={isSubmitting || isOverfillHazard}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 px-5 py-2 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSubmitting ? 'Recording Load...' : 'Certify & Decant Load'}</span>
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};
