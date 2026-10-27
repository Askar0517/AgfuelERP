import React, { useState, useEffect } from 'react';
import { FuelProduct, Tank } from '../types';
import { X, ArrowDownToLine, AlertTriangle, ShieldCheck, CheckCircle2, Truck, Droplets, Info } from 'lucide-react';
import { ModalPortal } from './common/ModalPortal';
import { ImageUploadInput } from './common/ImageUploadInput';

interface DecantingModalProps {
  tank: Tank;
  fuel: FuelProduct;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    stationId?: string;
    tankId?: string;
    tankerNumber: string;
    invoiceNo: string;
    invoiceVolumeLiters: number;
    invoiceDensity?: number;
    observedDensity: number;
    observedTemp?: number;
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
  const [tankerNumber, setTankerNumber] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceVolumeLiters, setInvoiceVolumeLiters] = useState<number | ''>('');
  const [invoiceImageUrl, setInvoiceImageUrl] = useState<string | null>(null);

  const defaultStandardDensity =
    fuel?.densityStandard15C || fuel?.densityStd15c || (fuel?.code === 'DIESEL' ? 830.0 : 745.0);
  const [invoiceDensity, setInvoiceDensity] = useState(defaultStandardDensity);
  const [observedDensity, setObservedDensity] = useState(
    fuel?.code === 'DIESEL' ? 828.5 : 742.0
  );
  const [temperatureC, setTemperatureC] = useState(28.5);
  const [preDipCm, setPreDipCm] = useState(tank.currentDipCm);
  const [postDipCm, setPostDipCm] = useState(() => {
    return preDipCm;
  });

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

  // Authoritative ASTM 53B petroleum temperature-density correction
  const coef = fuel?.code === 'DIESEL' ? 0.75 : 0.84;
  const deltaT = temperatureC - 15.0;
  const correctedDensity15C = Number((observedDensity + deltaT * coef).toFixed(1));

  const standard15C = fuel?.densityStandard15C || fuel?.densityStd15c || (fuel?.code === 'DIESEL' ? 830 : 745);
  const targetDensity = invoiceDensity || standard15C;
  const densityDiff = Math.abs(correctedDensity15C - targetDensity);
  const isDensityCompliant = densityDiff <= (fuel?.densityTolerance || 3.0);

  const safeUllageLiters = Math.max(0, tank.safeCapacityLiters - tank.currentVolumeLiters);
  const numericVolume = typeof invoiceVolumeLiters === 'number' ? invoiceVolumeLiters : 0;
  const isOverfillHazard = numericVolume > safeUllageLiters;

  const handleVolumeChange = (newVol: number) => {
    setInvoiceVolumeLiters(newVol);
    // Realistically estimate expected post dip from capacity geometry
    if (tank.capacityLiters > 0 && tank.maxDipCm > 0) {
      const estimatedTotalVol = Math.min(tank.capacityLiters, tank.currentVolumeLiters + newVol);
      const ratio = estimatedTotalVol / tank.capacityLiters;
      const calcDip = Math.round(ratio * tank.maxDipCm * 10) / 10;
      setPostDipCm(Math.min(tank.maxDipCm, Math.max(preDipCm, calcDip)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const vol = typeof invoiceVolumeLiters === 'number' ? invoiceVolumeLiters : 0;
    if (!tankerNumber.trim()) {
      setError('Tanker Truck Number is required.');
      return;
    }
    if (!invoiceNo.trim()) {
      setError('Invoice / Challan Number is required.');
      return;
    }
    if (!vol || vol <= 0) {
      setError('Invoiced Fuel Volume is required and must be greater than 0.');
      return;
    }
    if (!invoiceImageUrl) {
      setError('Invoice / Challan image copy is mandatory. Please upload the delivery invoice photo.');
      return;
    }
    if (isOverfillHazard) {
      setError(
        `Overfill Hazard! Invoiced quantity (${vol.toLocaleString()} L) exceeds available safe ullage (${safeUllageLiters.toLocaleString()} L). Decanting aborted to prevent tank rupture.`
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        stationId: tank.stationId,
        tankId: tank.id,
        tankerNumber: tankerNumber.trim(),
        invoiceNo: invoiceNo.trim(),
        invoiceVolumeLiters: vol,
        invoiceDensity: Number(invoiceDensity) || observedDensity,
        observedDensity,
        observedTemp: temperatureC,
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
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Tanker Load Decanting Inward"
      className="max-w-4xl w-full"
    >
      <div className="relative w-full max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden text-slate-900 dark:text-gray-100 transition animate-fadeIn">
        {/* Header - Fixed & High-Contrast with Flush Close Button */}
        <div className="shrink-0 relative flex items-center justify-between border-b border-slate-100 dark:border-gray-800 px-5 sm:px-6 py-4 bg-slate-50/80 dark:bg-gray-950/60">
          <div className="flex items-center gap-3 pr-12 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ArrowDownToLine className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Tanker Load Decanting Inward
                </h2>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Tank #{tank.tankNumber}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-2xs"
                  style={{ backgroundColor: fuel?.color || '#10B981' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                  {fuel.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 truncate">
                Subterranean Tank Intake Â· Available Safe Ullage:{' '}
                <strong
                  className={
                    isOverfillHazard
                      ? 'text-rose-600 dark:text-rose-400 font-bold'
                      : 'text-emerald-600 dark:text-emerald-400 font-bold'
                  }
                >
                  {safeUllageLiters.toLocaleString()} Liters
                </strong>
              </p>
            </div>
          </div>

          {/* Flush top-right close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-0 right-0 flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-tr-2xl rounded-bl-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white transition cursor-pointer z-10 shadow-sm"
            aria-label="Close modal"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5 text-white stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Body - Balanced 2-Column Desktop Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 animate-fadeIn">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form id="decanting-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {/* Left Column: Commercial Inward & Invoiced Quantity */}
              <div className="space-y-3.5">
                <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/40 p-3.5 space-y-3">
                  <div className="flex items-center gap-2 border-b border-slate-200/60 dark:border-gray-800 pb-2">
                    <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      1. Inbound Delivery Challan Details
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                        Tanker Truck Number:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. TN-22-BA-9104"
                        value={tankerNumber}
                        onChange={(e) => setTankerNumber(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                        Invoice / Challan No:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. INV-IOCL-88210"
                        value={invoiceNo}
                        onChange={(e) => setInvoiceNo(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-gray-300">
                        Invoiced Fuel Volume (Liters):
                      </label>
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        Safe Room: {safeUllageLiters.toLocaleString()} L
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        required
                        step="100"
                        min={500}
                        value={invoiceVolumeLiters === '' ? '' : invoiceVolumeLiters}
                        onChange={(e) => handleVolumeChange(e.target.value === '' ? 0 : Number(e.target.value))}
                        className={`w-full rounded-xl border px-3 py-2 font-mono text-xs font-bold tabular-nums focus:outline-none pr-14 ${
                          isOverfillHazard
                            ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                            : 'border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-900 dark:text-white focus:border-emerald-500'
                        }`}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        Liters
                      </span>
                    </div>

                    {/* Safe Ullage Capacity Meter */}
                    <div className="mt-2.5 p-2.5 rounded-lg border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400">Tank Volume After Decant:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {(tank.currentVolumeLiters + numericVolume).toLocaleString()} L /{' '}
                          {tank.safeCapacityLiters.toLocaleString()} L Safe Cap
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-gray-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isOverfillHazard ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              ((tank.currentVolumeLiters + numericVolume) /
                                (tank.safeCapacityLiters || 1)) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                      {isOverfillHazard ? (
                        <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                          Overfill hazard! Volume exceeds available safe ullage ({safeUllageLiters.toLocaleString()} L).
                        </p>
                      ) : (
                        <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                          <span>Current: {tank.currentVolumeLiters.toLocaleString()} L</span>
                          <span>Remaining Safe Room: {(safeUllageLiters - numericVolume).toLocaleString()} L</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delivery Challan Document Upload */}
                <div>
                  <ImageUploadInput
                    compact
                    label="Delivery Challan / Invoice Copy (Statutory Record):"
                    category="invoice"
                    helperText="Attach delivery challan or invoice photo"
                    value={invoiceImageUrl}
                    onChange={(url) => setInvoiceImageUrl(url)}
                  />
                </div>
              </div>

              {/* Right Column: ASTM 53B Quality & Physical Dip Check */}
              <div className="space-y-3.5">
                <div className="rounded-xl border border-slate-800 bg-slate-900 text-white p-3.5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        2. ASTM 53B Petroleum Quality Verification
                      </span>
                    </div>
                  </div>

                  {/* Section 2 Explanation */}
                  <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-1.5 leading-relaxed">
                    <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Why ASTM 53B?</strong> Petroleum expands/contracts with heat. Hydrometer & thermometer readings are converted to standard 15°C to verify fuel purity against refinery challan specs.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Challan Density:
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={invoiceDensity}
                        onChange={(e) => setInvoiceDensity(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-xs font-bold text-white focus:border-emerald-500 focus:outline-none tabular-nums"
                      />
                      <span className="text-[9px] text-slate-400 block mt-0.5">kg/m³ @ 15°C</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Observed Density:
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={observedDensity}
                        onChange={(e) => setObservedDensity(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-xs font-bold text-white focus:border-emerald-500 focus:outline-none tabular-nums"
                      />
                      <span className="text-[9px] text-slate-400 block mt-0.5">Hydrometer kg/m³</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Fuel Temperature:
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        required
                        value={temperatureC}
                        onChange={(e) => setTemperatureC(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-xs font-bold text-white focus:border-emerald-500 focus:outline-none tabular-nums"
                      />
                      <span className="text-[9px] text-slate-400 block mt-0.5">Thermometer °C</span>
                    </div>
                  </div>

                  {/* ASTM 53B Result Certificate Card */}
                  <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Corrected 15°C Density:</span>
                      <span className="font-bold text-base text-white tabular-nums">
                        {correctedDensity15C} <span className="text-xs text-slate-400">kg/m³</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono border-t border-slate-800/80 pt-1.5">
                      <span>Density Variance vs Challan:</span>
                      <span className="font-bold text-slate-200">
                        {densityDiff.toFixed(1)} kg/m³ (Tolerance: ±{fuel?.densityTolerance || 3.0} kg/m³)
                      </span>
                    </div>

                    <div className="pt-0.5">
                      <span
                        className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border ${
                          isDensityCompliant
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        {isDensityCompliant ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ASTM 53B Passed (Fuel Quality Compliant)</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Tolerance Warning (Density Discrepancy &gt; ±{fuel?.densityTolerance || 3.0})</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Physical Dip Levels */}
                <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/40 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-gray-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        3. Physical Tank Dip Verification (Centimeters)
                      </span>
                    </div>
                  </div>

                  {/* Section 3 Explanation */}
                  <div className="p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-1.5 leading-relaxed">
                    <Info className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Why Dip Verification?</strong> Compares physical underground tank dips (cm) before and after decanting against the calibration chart to accurately identify transit volume shortages or leaks.
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Pre-Decant Dip (Current):
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={preDipCm}
                        onChange={(e) => setPreDipCm(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-white tabular-nums focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">Tank Max: {tank.maxDipCm} cm</span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Expected Post-Decant Dip:
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={postDipCm}
                        onChange={(e) => setPostDipCm(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 font-mono text-xs font-semibold text-slate-900 dark:text-white tabular-nums focus:outline-none"
                      />
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 block font-medium">
                        Geometry Projected
                      </span>
                    </div>
                  </div>

                  {/* Transit Delivery Variance & Shortage Analysis */}
                  {(() => {
                    const estimatedReceivedLiters =
                      tank.capacityLiters > 0 && tank.maxDipCm > 0
                        ? Math.round(((postDipCm - preDipCm) / tank.maxDipCm) * tank.capacityLiters)
                        : numericVolume;
                    const transitVarianceLiters = estimatedReceivedLiters - numericVolume;
                    const permissibleShortageLiters = Math.round(numericVolume * 0.001);
                    const isExcessShortage = transitVarianceLiters < -permissibleShortageLiters;
                    const fuelRate = fuel?.ratePerLiter || 100;
                    const financialLoss = Math.abs(transitVarianceLiters) * fuelRate;

                    return (
                      <div
                        className={`mt-2 p-2.5 rounded-xl border text-xs font-mono transition-colors ${
                          isExcessShortage
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                            : transitVarianceLiters >= 0
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="flex items-center gap-1.5 font-sans">
                            {isExcessShortage ? (
                              <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            )}
                            <span>Transit Variance:</span>
                          </span>
                          <span className="tabular-nums">
                            {transitVarianceLiters >= 0 ? `+${transitVarianceLiters}` : transitVarianceLiters} L
                            ({((transitVarianceLiters / Math.max(1, numericVolume)) * 100).toFixed(2)}%)
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-sans mt-1 text-slate-400">
                          <span>
                            {isExcessShortage
                              ? `Exceeds 0.10% permissible loss (${permissibleShortageLiters} L). Loss value: ₹${financialLoss.toLocaleString()}`
                              : `Within standard 0.10% transit tolerance (limit: ${permissibleShortageLiters} L).`}
                          </span>
                          {isExcessShortage && (
                            <span className="font-bold text-rose-400 font-mono">
                              Endorse LR
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Fixed Footer - Always Visible & Responsive */}
        <div className="shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-gray-800 px-5 sm:px-6 py-3.5 bg-slate-50/80 dark:bg-gray-950/80">
          <div className="flex items-center gap-2 text-xs w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-slate-500 dark:text-slate-400">Total Receiving:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {numericVolume.toLocaleString()} L of {fuel.name}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isDensityCompliant
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800'
              }`}
            >
              {isDensityCompliant ? 'Quality Verified' : 'Tolerance Alert'}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="decanting-form"
              disabled={isSubmitting || isOverfillHazard}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 px-5 py-2 text-xs font-semibold text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSubmitting ? 'Recording Load...' : 'Certify & Decant Load'}</span>
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
