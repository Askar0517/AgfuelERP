import React, { useState, useEffect, useMemo } from 'react';
import { Dispenser, FuelProduct, Shift, Nozzle } from '../types';
import {
  Smartphone,
  Banknote,
  Fuel,
  Calculator,
  ShieldCheck,
  AlertCircle,
  Save,
  CheckCircle2,
  Clock,
  ArrowRight,
  Layers,
  Check,
} from 'lucide-react';
import { ShiftSettleModal } from './ShiftSettleModal';
import { ImageUploadInput } from './common/ImageUploadInput';

interface AttendantMobileViewProps {
  shifts: Shift[];
  dispensers: Dispenser[];
  nozzles?: Nozzle[];
  fuels: FuelProduct[];
  onSettleShift: (shiftId: string, payload: any) => Promise<void>;
  onSubmitMeterReading?: (payload: any) => Promise<void>;
}

export const AttendantMobileView: React.FC<AttendantMobileViewProps> = ({
  shifts,
  dispensers,
  nozzles = [],
  fuels,
  onSettleShift,
  onSubmitMeterReading,
}) => {
  const activeShift = shifts.find((s) => s.status === 'ACTIVE') || shifts[0];
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);

  // Combine nozzles from dispensers or direct nozzles prop
  const allNozzles = useMemo(() => {
    const fromDispensers = dispensers.flatMap((d) =>
      (d.nozzles || []).map((n) => ({
        ...n,
        dispenserNumber: d.dispenserNumber,
        islandNumber: d.islandNumber,
        stationId: n.stationId || d.stationId,
      }))
    );
    if (fromDispensers.length > 0) return fromDispensers;

    // Fallback to nozzles prop directly if dispensers don't have nested items
    return nozzles.map((n) => {
      const parentDisp = dispensers.find((d) => d.id === n.dispenserId);
      return {
        ...n,
        dispenserNumber: parentDisp?.dispenserNumber || n.dispenserNumber || 1,
        islandNumber: parentDisp?.islandNumber || 1,
        stationId: n.stationId,
      };
    });
  }, [dispensers, nozzles]);

  const [selectedNozzleId, setSelectedNozzleId] = useState<string>('');

  // Meter Readings State
  const [openingMeter, setOpeningMeter] = useState<number>(0);
  const [closingMeter, setClosingMeter] = useState<number>(100);
  const [testingLiters, setTestingLiters] = useState<number>(0);
  const [meterPhotoUrl, setMeterPhotoUrl] = useState<string | null>(null);
  const [correctionReason, setCorrectionReason] = useState<string>('');

  // Cash Denominations
  const [denominations, setDenominations] = useState<{ [denom: string]: number }>({
    '500': 0,
    '200': 0,
    '100': 0,
    '50': 0,
    'coins': 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reactive synchronization: update selected nozzle and totalizers when allNozzles loads or updates
  useEffect(() => {
    if (allNozzles.length > 0) {
      const current = allNozzles.find((n) => n.id === selectedNozzleId);
      if (!current) {
        const first = allNozzles[0];
        setSelectedNozzleId(first.id);
        const authMeter = first.electronicTotalizer ?? first.mechanicalTotalizer ?? 0;
        setOpeningMeter(authMeter);
        setClosingMeter(Number((authMeter + 80.0).toFixed(1)));
      } else {
        const authMeter = current.electronicTotalizer ?? current.mechanicalTotalizer ?? 0;
        // If opening meter was 0 or out of sync with nozzle, align it
        if (openingMeter === 0 && authMeter > 0) {
          setOpeningMeter(authMeter);
          setClosingMeter(Number((authMeter + 80.0).toFixed(1)));
        }
      }
    }
  }, [allNozzles, selectedNozzleId, openingMeter]);

  const selectedNozzle = allNozzles.find((n) => n.id === selectedNozzleId) || allNozzles[0];
  const selectedFuel = fuels.find((f) => f.code === selectedNozzle?.fuelCode);
  const fuelRate = selectedFuel?.ratePerLiter || 100;

  // Calculations
  const isRolloverOrReset = closingMeter < openingMeter;
  const grossLiters = isRolloverOrReset
    ? 0
    : Math.max(0, Number((closingMeter - openingMeter).toFixed(2)));
  const netSoldLiters = Math.max(0, Number((grossLiters - testingLiters).toFixed(2)));
  const calculatedSales = Number((netSoldLiters * fuelRate).toFixed(2));

  const totalCashCounted =
    (denominations['500'] || 0) * 500 +
    (denominations['200'] || 0) * 200 +
    (denominations['100'] || 0) * 100 +
    (denominations['50'] || 0) * 50 +
    (denominations['coins'] || 0);

  const handleNozzleChange = (id: string) => {
    setSelectedNozzleId(id);
    const n = allNozzles.find((noz) => noz.id === id);
    if (n) {
      const auth = n.electronicTotalizer ?? n.mechanicalTotalizer ?? 0;
      setOpeningMeter(auth);
      setClosingMeter(Number((auth + 80.0).toFixed(1)));
      setCorrectionReason('');
      setErrorMsg(null);
    }
  };

  const handleSubmitReading = async () => {
    if (!onSubmitMeterReading || !selectedNozzle) return;
    if (isRolloverOrReset && !correctionReason.trim()) {
      setErrorMsg('Closing meter is lower than opening meter. A valid rollover or replacement reason is required.');
      return;
    }

    if (!meterPhotoUrl || !meterPhotoUrl.trim()) {
      setErrorMsg('Meter totalizer photograph is strictly mandatory for legal metrology and audit compliance.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await onSubmitMeterReading({
        stationId: selectedNozzle.stationId || activeShift?.stationId || 'st-101',
        nozzleId: selectedNozzle.id,
        openingMeter,
        closingMeter,
        testingLiters,
        readingType: isRolloverOrReset ? 'RESET_CORRECTION' : 'REGULAR_SHIFT',
        isCorrection: isRolloverOrReset,
        correctionReason: isRolloverOrReset ? correctionReason.trim() : undefined,
        enteredBy: activeShift?.attendantName || 'Forecourt Attendant',
        shiftCode: activeShift?.shiftCode || 'MOBILE-SHIFT',
        meterPhotoUrl: meterPhotoUrl.trim(),
      });
      setSuccessMsg(`Logged ${netSoldLiters}L sold (₹${calculatedSales.toLocaleString(undefined, { minimumFractionDigits: 2 })})!`);
      setOpeningMeter(closingMeter);
      setClosingMeter(Number((closingMeter + 75.0).toFixed(1)));
      setMeterPhotoUrl(null);
      setTestingLiters(0);
      setCorrectionReason('');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit meter reading to forecourt ledger');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4 pb-12 sm:pb-6">
      {/* Handheld Device Header */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 shadow-2xs dark:shadow-sm transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#12544F]/10 text-[#12544F] dark:text-[#5EEAD4] border border-[#12544F]/20">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">Forecourt POS Handheld</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Attendant: {activeShift ? activeShift.attendantName : 'Not Assigned'}
                {activeShift && ` · Shift #${activeShift.shiftCode}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Online</span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Nozzle Segmented Selection */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs transition">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
          Select Pump Nozzle ({allNozzles.length} Available)
        </span>
        {allNozzles.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
            No active nozzles detected on current island.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {allNozzles.map((n) => {
              const f = fuels.find((fuel) => fuel.code === n.fuelCode);
              const isSelected = selectedNozzleId === n.id;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleNozzleChange(n.id)}
                  className={`min-h-[48px] rounded-xl border p-2.5 text-left transition cursor-pointer ${
                    isSelected
                      ? 'border-[#12544F] bg-[#12544F]/10 text-[#12544F] dark:text-[#5EEAD4] font-bold shadow-2xs'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span>{n.name || n.id}</span>
                    <span className="font-mono text-[10px]">P#{n.dispenserNumber}</span>
                  </div>
                  <div className="mt-1 text-[11px] font-semibold">
                    {f?.shortName || n.fuelCode} · ₹{f?.ratePerLiter.toFixed(2) || '100.00'}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Touch-Friendly Meter Entry Form */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3 transition">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
            <Calculator className="h-3.5 w-3.5 text-[#12544F] dark:text-[#5EEAD4]" />
            Live Meter Tap Entry
          </span>
          <span className="font-mono text-xs text-[#12544F] dark:text-[#5EEAD4] font-semibold">
            ₹{fuelRate.toFixed(2)}/L
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">Opening Meter (L):</label>
            <input
              type="number"
              step="0.1"
              value={openingMeter}
              onChange={(e) => setOpeningMeter(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 font-mono text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">Closing Meter (L):</label>
            <input
              type="number"
              step="0.1"
              value={closingMeter}
              onChange={(e) => setClosingMeter(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 font-mono text-xs text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {isRolloverOrReset && (
          <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-2.5 space-y-1">
            <label className="text-[11px] font-bold text-amber-800 dark:text-amber-300 block">
              Rollover / Replacement Reason (Required):
            </label>
            <input
              type="text"
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="e.g. Totalizer rollover, mechanical replacement, calibration"
              className="w-full text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 p-1.5"
            />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Testing Jar Deduction:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">{testingLiters} Liters</span>
          </div>
          <div className="mt-1 flex gap-2">
            {[0, 5, 10].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTestingLiters(t)}
                className={`flex-1 rounded-xl border py-1 text-xs font-semibold cursor-pointer transition ${
                  testingLiters === t
                    ? 'border-[#12544F] bg-[#12544F]/10 text-[#12544F] dark:text-[#5EEAD4] font-bold'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
                }`}
              >
                {t} L
              </button>
            ))}
          </div>
        </div>

        {/* Calculated Totals Box */}
        <div className="rounded-xl border border-[#12544F]/20 bg-[#12544F]/5 dark:bg-[#12544F]/15 p-3 text-center">
          <span className="text-[10px] text-[#12544F] dark:text-[#5EEAD4] uppercase font-bold block">
            Net Quantity Dispensed
          </span>
          <div className="font-mono text-xl font-bold text-slate-900 dark:text-white tabular-nums">
            {netSoldLiters.toFixed(2)} Liters
          </div>
          <span className="text-xs font-bold text-[#12544F] dark:text-[#5EEAD4] font-mono block mt-0.5">
            Bill Total: ₹{calculatedSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Dispenser Physical Meter Photo Evidence (Mandatory) */}
        <div className="rounded-xl border border-dashed border-amber-300 dark:border-amber-700/60 bg-amber-50/40 dark:bg-amber-950/20 p-2.5">
          <ImageUploadInput
            label="Meter Totalizer Photo (Mandatory): *"
            helperText="Capture or upload photo of the totalizer counter"
            category="reading"
            value={meterPhotoUrl}
            onChange={(url) => {
              setMeterPhotoUrl(url);
              if (url && errorMsg?.includes('photograph')) setErrorMsg(null);
            }}
            compact
          />
        </div>

        <button
          type="button"
          onClick={handleSubmitReading}
          disabled={isSubmitting || !selectedNozzle || !meterPhotoUrl || (isRolloverOrReset && !correctionReason.trim())}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#12544F] hover:bg-[#0E433F] active:scale-95 py-2.5 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          <span>
            {isSubmitting
              ? 'Recording to Forecourt Ledger...'
              : !meterPhotoUrl
              ? 'Attach Meter Photo to Submit *'
              : 'Submit Nozzle Reading'}
          </span>
        </button>
      </div>

      {/* Fast Cash Pocket & Shift Handover Reconciliation */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3 transition">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
            <Banknote className="h-3.5 w-3.5 text-[#12544F] dark:text-[#5EEAD4]" />
            Attendant Cash Pocket
          </span>
          <span className="font-mono text-xs font-bold text-[#12544F] dark:text-[#5EEAD4]">
            ₹{totalCashCounted.toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          {[
            { denom: '500', label: '₹500 Notes' },
            { denom: '200', label: '₹200 Notes' },
            { denom: '100', label: '₹100 Notes' },
            { denom: '50', label: '₹50 Notes' },
          ].map(({ denom, label }) => (
            <div key={denom} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">{label}</span>
              <input
                type="number"
                min={0}
                value={denominations[denom] || 0}
                onChange={(e) =>
                  setDenominations({ ...denominations, [denom]: Number(e.target.value) })
                }
                className="w-12 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 text-center text-xs text-slate-900 dark:text-white font-mono"
              />
            </div>
          ))}
        </div>

        {/* Handover & Reconcile Shift Action Button */}
        {activeShift && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsSettleModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 py-2.5 text-xs font-semibold text-white shadow-xs transition cursor-pointer"
            >
              <Clock className="h-4 w-4" />
              <span>Reconcile & Settle Shift #{activeShift.shiftCode}</span>
            </button>
          </div>
        )}
      </div>

      {/* Settle Shift Modal Portal from POS screen */}
      {isSettleModalOpen && activeShift && (
        <ShiftSettleModal
          shift={activeShift}
          fuels={fuels}
          isOpen={isSettleModalOpen}
          onClose={() => setIsSettleModalOpen(false)}
          onSubmit={async (payload) => {
            await onSettleShift(activeShift.id, payload);
            setIsSettleModalOpen(false);
            setSuccessMsg('Shift successfully reconciled and handed over to Cashier!');
            setTimeout(() => setSuccessMsg(null), 4000);
          }}
        />
      )}
    </div>
  );
};
