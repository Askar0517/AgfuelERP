import React, { useState, useEffect } from 'react';
import { Shift, FuelProduct, Station } from '../types';
import { X, AlertCircle, Banknote, CreditCard, Receipt, Calculator, ShieldCheck } from 'lucide-react';
import { ModalPortal } from './common/ModalPortal';
import { ImageUploadInput } from './common/ImageUploadInput';
import { getBunkCurrency } from '../utils/currency';

interface ShiftSettleModalProps {
  shift: Shift;
  station?: Station;
  fuels: FuelProduct[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
}

export const ShiftSettleModal: React.FC<ShiftSettleModalProps> = ({
  shift,
  station,
  fuels,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const currency = getBunkCurrency(station);
  const isAED = currency.code === 'AED';

  // Local state for closing readings
  const [closingReadings, setClosingReadings] = useState(() =>
    (shift.nozzleReadings || []).map((nr: any) => ({
      nozzleId: nr.nozzleId,
      fuelCode: nr.fuelCode,
      startMeter: nr.startMeter || nr.openingElectronic || 0,
      endMeter: (nr.endMeter || 0) > (nr.startMeter || nr.openingElectronic || 0)
        ? nr.endMeter
        : Number(((nr.startMeter || nr.openingElectronic || 0) + 250.0).toFixed(1)),
      testingLiters: nr.testingLiters || 5.0,
      rate: nr.rate || fuels.find((f) => f.code === nr.fuelCode)?.ratePerLiter || (isAED ? 3.15 : 100),
    }))
  );

  // Cash Denominations
  const [denominations, setDenominations] = useState<{ [denom: string]: number }>(() => {
    if (shift.denominationsJson) {
      try {
        return JSON.parse(shift.denominationsJson);
      } catch {}
    }
    if (isAED) {
      return {
        '1000': 0,
        '500': 0,
        '200': 0,
        '100': 0,
        '50': 0,
        '20': 0,
        '10': 0,
        '5': 0,
        'coins': 0,
      };
    }
    return {
      '500': 0,
      '200': 0,
      '100': 0,
      '50': 0,
      '20': 0,
      '10': 0,
      '2000': 0,
      'coins': 0,
    };
  });

  const [digitalSubmitted, setDigitalSubmitted] = useState<number>(shift.digitalSubmitted || 0);
  const [creditSubmitted, setCreditSubmitted] = useState<number>(shift.creditSubmitted || 0);
  const [notes, setNotes] = useState(shift.notes || 'Shift closed at forecourt desk. All card slips reconciled.');
  const [managerSignOff, setManagerSignOff] = useState(shift.managerSignOff || 'Rajesh Sharma (Duty Mgr)');
  const [closingPhotoUrl, setClosingPhotoUrl] = useState<string | null>(shift.closingPhotoUrl || null);
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

  // Calculate Cash Total from denominations
  const totalCashCalculated =
    (denominations['2000'] || 0) * 2000 +
    (denominations['500'] || 0) * 500 +
    (denominations['200'] || 0) * 200 +
    (denominations['100'] || 0) * 100 +
    (denominations['50'] || 0) * 50 +
    (denominations['20'] || 0) * 20 +
    (denominations['10'] || 0) * 10 +
    (denominations['coins'] || 0);

  // Calculate expected sales from nozzle meters
  let totalSoldLiters = 0;
  let totalExpectedSales = 0;

  const calculatedReadings = closingReadings.map((r: any) => {
    const grossLiters = Math.max(0, r.endMeter - r.startMeter);
    const netLiters = Math.max(0, grossLiters - (r.testingLiters || 0));
    const amount = netLiters * r.rate;
    totalSoldLiters += netLiters;
    totalExpectedSales += amount;
    return {
      ...r,
      grossLiters,
      netLiters,
      amount,
    };
  });

  const totalCollected = totalCashCalculated + digitalSubmitted + creditSubmitted;
  const shortageExcess = Number((totalCollected - totalExpectedSales).toFixed(2));

  const handleUpdateReading = (nozzleId: string, field: string, val: number) => {
    setClosingReadings((prev) =>
      prev.map((r) => (r.nozzleId === nozzleId ? { ...r, [field]: val } : r))
    );
  };

  const handleUpdateDenom = (denom: string, count: number) => {
    setDenominations((prev) => ({
      ...prev,
      [denom]: Math.max(0, count),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validation
    for (const r of closingReadings) {
      if (r.endMeter < r.startMeter) {
        setError(`Closing meter for nozzle ${r.nozzleId} cannot be lower than opening reading!`);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      await onSubmit({
        totalFuelSoldLiters: totalSoldLiters,
        totalExpectedRevenue: totalExpectedSales,
        cashSubmitted: totalCashCalculated,
        digitalSubmitted,
        creditSubmitted,
        denominationsJson: JSON.stringify(denominations),
        notes,
        managerSignOff,
        closingPhotoUrl: closingPhotoUrl || undefined,
        nozzleReadings: calculatedReadings,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to settle shift.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={`Reconcile & Settle Shift ${shift.shiftCode}`}
      className="max-w-4xl"
    >
      <div
        className="relative w-full max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 text-slate-900 dark:text-gray-100 shadow-2xl overflow-y-auto no-scrollbar transition"
      >
        {/* Flush top-right close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-0 right-0 flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-tr-2xl rounded-bl-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white transition cursor-pointer z-10"
          aria-label="Close modal"
        >
          <X className="h-4 w-4 text-white stroke-[2.5]" />
        </button>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-gray-800 pb-3 pr-10">
          <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Calculator className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                Reconcile & Settle Shift: {shift.shiftCode}
              </h2>
              <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
                Attendant: <strong className="text-slate-900 dark:text-white">{shift.attendantName}</strong> · Island #{shift.islandNumber}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="my-3 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-5">
          {/* Section 1: Nozzle Totalizers */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
              1. Dispenser Closing Meters & Testing Deductions
            </h3>
            <div className="mt-2 divide-y divide-slate-100 dark:divide-gray-800 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950/70">
              {calculatedReadings.map((r: any) => {
                const fuel = fuels.find((f) => f.code === r.fuelCode);
                return (
                  <div key={r.nozzleId} className="p-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: fuel?.color || '#10b981' }}
                        />
                        <span className="font-semibold text-slate-900 dark:text-white">
                          Nozzle ({fuel?.shortName || r.fuelCode})
                        </span>
                        <span className="font-mono text-slate-500 dark:text-gray-400">@ {currency.symbol}{(r.rate ?? 0).toFixed(2)}/L</span>
                      </div>
                      <div className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        Net: {r.netLiters.toLocaleString()} L = {currency.symbol}{r.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-gray-400">Opening (L):</span>
                        <div className="mt-0.5 rounded-lg border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-2 py-1.5 font-mono text-xs text-slate-700 dark:text-gray-300 tabular-nums">
                          {(r.startMeter ?? 0).toFixed(1)}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-gray-400">Closing (L):</span>
                        <input
                          type="number"
                          step="0.1"
                          required
                          min={r.startMeter}
                          value={r.endMeter}
                          onChange={(e) =>
                            handleUpdateReading(r.nozzleId, 'endMeter', Number(e.target.value))
                          }
                          className="mt-0.5 w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 font-mono text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none tabular-nums"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-gray-400">Test Jar Deduction (L):</span>
                        <input
                          type="number"
                          step="1"
                          min={0}
                          max={50}
                          value={r.testingLiters}
                          onChange={(e) =>
                            handleUpdateReading(r.nozzleId, 'testingLiters', Number(e.target.value))
                          }
                          className="mt-0.5 w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 font-mono text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none tabular-nums"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-100 dark:bg-gray-950/80 px-3 py-2 text-xs border border-slate-200 dark:border-gray-800/80">
              <span className="text-slate-500 dark:text-gray-400">Total Fuel Dispensed:</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                {totalSoldLiters.toLocaleString()} L · Expected Revenue: {currency.symbol}{totalExpectedSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Closing Meter Reading Photo Proof */}
            <div className="mt-3">
              <ImageUploadInput
                label="Pump Closing Meter Totalizer Photo Proof:"
                category="reading"
                helperText="Upload camera photo of dispenser totalizer screen at shift close"
                value={closingPhotoUrl}
                onChange={(url) => setClosingPhotoUrl(url)}
              />
            </div>
          </div>

          {/* Section 2: Cash Denomination Breakdown */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                2. Physical Cash Pocket Denominations ({currency.code})
              </h3>
              <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Total Cash: {currency.symbol}{totalCashCalculated.toLocaleString()}
              </span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 font-mono text-xs">
              {(isAED
                ? [
                    { denom: '1000', label: '1000 AED Notes' },
                    { denom: '500', label: '500 AED Notes' },
                    { denom: '200', label: '200 AED Notes' },
                    { denom: '100', label: '100 AED Notes' },
                    { denom: '50', label: '50 AED Notes' },
                    { denom: '20', label: '20 AED Notes' },
                    { denom: '10', label: '10 AED Notes' },
                    { denom: '5', label: '5 AED Notes' },
                    { denom: 'coins', label: 'Dirham Coins' },
                  ]
                : [
                    { denom: '500', label: '₹500 Notes' },
                    { denom: '200', label: '₹200 Notes' },
                    { denom: '100', label: '₹100 Notes' },
                    { denom: '50', label: '₹50 Notes' },
                    { denom: '20', label: '₹20 Notes' },
                    { denom: '10', label: '₹10 Notes' },
                    { denom: '2000', label: '₹2000 Notes' },
                    { denom: 'coins', label: 'Coins Tally' },
                  ]
              ).map(({ denom, label }) => (
                <div
                  key={denom}
                  className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 p-2 flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-gray-400 block">{label}</span>
                    <span className="text-[11px] text-slate-700 dark:text-gray-300 tabular-nums">
                      = {currency.symbol}{((denominations[denom] || 0) * (denom === 'coins' ? 1 : Number(denom))).toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={denominations[denom] || 0}
                    onChange={(e) => handleUpdateDenom(denom, Number(e.target.value))}
                    className="w-14 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-1.5 py-1 text-center font-mono text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none tabular-nums"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Digital Payments & Credits */}
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
              <CreditCard className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              3. Digital Cards, UPI & Fleet Credits ({currency.code})
            </h3>

            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
                  POS Cards & Digital Settlement ({currency.symbol}):
                </label>
                <input
                  type="number"
                  step="1"
                  value={digitalSubmitted}
                  onChange={(e) => setDigitalSubmitted(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 font-mono text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none tabular-nums"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
                  Fleet Indents & Credit Slips ({currency.symbol}):
                </label>
                <input
                  type="number"
                  step="1"
                  value={creditSubmitted}
                  onChange={(e) => setCreditSubmitted(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 font-mono text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none tabular-nums"
                  required
                />
              </div>
            </div>
          </div>

          {/* Reconciliation Grand Total Balance Bar */}
          <div className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs font-mono">
              <div className="rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-2.5">
                <span className="text-[10px] uppercase text-slate-500 dark:text-gray-400 block font-sans">
                  Expected Sales Total
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                  {currency.symbol}{totalExpectedSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="rounded-xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 p-2.5">
                <span className="text-[10px] uppercase text-slate-500 dark:text-gray-400 block font-sans">
                  Total Handover Submitted
                </span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {currency.symbol}{totalCollected.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-gray-400 block font-sans">
                  (Cash: {currency.symbol}{totalCashCalculated.toLocaleString()} + Other)
                </span>
              </div>

              <div
                className={`rounded-xl border p-2.5 ${
                  shortageExcess === 0
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                    : shortageExcess > 0
                    ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-800 dark:text-cyan-300'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300'
                }`}
              >
                <span className="text-[10px] uppercase block font-sans font-semibold">
                  {shortageExcess === 0
                    ? 'Variance: Balanced (Zero Error)'
                    : shortageExcess > 0
                    ? 'Excess Cash Surplus'
                    : 'Cash Shortage Deficit'}
                </span>
                <span className="text-sm font-bold tabular-nums">
                  {shortageExcess === 0
                    ? `${currency.symbol}0.00`
                    : shortageExcess > 0
                    ? `+${currency.symbol}${shortageExcess.toLocaleString()}`
                    : `-${currency.symbol}${Math.abs(shortageExcess).toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>

          {/* Notes & Manager Sign-Off */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
                Shift Handover Notes:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
                Manager / Supervisor Certified Sign-off:
              </label>
              <input
                type="text"
                value={managerSignOff}
                onChange={(e) => setManagerSignOff(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Submit Actions */}
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
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 px-5 py-2 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{isSubmitting ? 'Finalizing Handover...' : 'Certify & Close Shift Handover'}</span>
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};
