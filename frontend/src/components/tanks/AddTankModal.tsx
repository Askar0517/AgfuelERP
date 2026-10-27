import React, { useState, useEffect } from 'react';
import { Station, FuelProduct, FuelCode } from '../../types';
import {
  X,
  Plus,
  Loader2,
  AlertTriangle,
  Lock,
  ShieldCheck,
  TrendingDown,
  Info,
  Layers,
  Building2,
  Droplets,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import { SelectDropdown } from '../common/SelectDropdown';
import { ModalPortal } from '../common/ModalPortal';
import { FUEL_SELECT_OPTIONS } from '../../utils/fuelConfig';
import { validateTankForm } from '../../utils/validation';

export interface AddTankModalProps {
  isOpen: boolean;
  onClose: () => void;
  station: Station;
  fuels: FuelProduct[];
  existingTankCount?: number;
  existingTanks?: Array<{ tankNumber?: number | string; name?: string; id?: string }>;
  onTankCreated: (createdTank?: any) => Promise<void> | void;
}

export const AddTankModal: React.FC<AddTankModalProps> = ({
  isOpen,
  onClose,
  station,
  fuels,
  existingTankCount,
  existingTanks = [],
  onTankCreated,
}) => {
  const { notifySuccess, notifyError, notifyWarning } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveCount =
    typeof existingTankCount === 'number' && !isNaN(existingTankCount)
      ? existingTankCount
      : existingTanks.length;

  const defaultFuelCode = (fuels[0]?.code || 'OCTANE_95') as FuelCode;
  const initialIdentity = String(effectiveCount + 1);

  // Form State:
  // 1. Tank number, Tank Identifier, and Tank Name are synchronized
  // 2. Capacity = 0, Opening Stock = 0, Safe Filling = 0, Lower Stock = 0
  const [formData, setFormData] = useState({
    tankNumber: initialIdentity,
    tankIdentifier: initialIdentity,
    name: initialIdentity,
    fuelCode: defaultFuelCode,
    capacityLiters: '',
    openingStockLiters: '',
    lowThresholdLiters: '',
    safeCapacityLiters: '',
    location: '',
    description: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;

    const count =
      typeof existingTankCount === 'number' && !isNaN(existingTankCount)
        ? existingTankCount
        : existingTanks.length;
    const nextId = String(count + 1);
    const initialCode = (fuels[0]?.code || 'OCTANE_95') as FuelCode;

    setFormData({
      tankNumber: nextId,
      tankIdentifier: nextId,
      name: nextId,
      fuelCode: initialCode,
      capacityLiters: '',
      openingStockLiters: '',
      lowThresholdLiters: '',
      safeCapacityLiters: '',
      location: '',
      description: '',
    });
    setFieldErrors({});
  }, [isOpen, existingTankCount, existingTanks.length, fuels]);

  if (!isOpen) return null;

  // Handle synchronized identity: Tank number, Tank Identifier, and Tank Name must be the same
  const handleIdentityChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      tankNumber: value,
      tankIdentifier: value,
      name: value,
    }));
    if (fieldErrors.tankNumber || fieldErrors.tankIdentifier || fieldErrors.name) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.tankNumber;
        delete next.tankIdentifier;
        delete next.name;
        return next;
      });
    }
  };

  // Safe filling calculated based on capacity (95% safe capacity, 15% lower stock)
  const handleCapacityChange = (capStr: string) => {
    const cap = parseFloat(capStr) || 0;
    const safe = cap > 0 ? Math.round(cap * 0.95) : 0;
    const low = cap > 0 ? Math.round(cap * 0.15) : 0;
    setFormData((prev) => ({
      ...prev,
      capacityLiters: capStr,
      safeCapacityLiters: safe > 0 ? String(safe) : '',
      lowThresholdLiters: low > 0 ? String(low) : '',
    }));

    // Auto-clear capacity or safe capacity errors if resolved
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (cap > 0) delete next.capacityLiters;
      const stock = parseFloat(formData.openingStockLiters) || 0;
      if (stock <= safe) {
        delete next.safeCapacityLiters;
        if (next.openingStockLiters?.includes('exceeds safe filling')) {
          delete next.openingStockLiters;
        }
      }
      return next;
    });
  };

  const handleOpeningStockChange = (stockStr: string) => {
    setFormData((prev) => ({
      ...prev,
      openingStockLiters: stockStr,
    }));

    setFieldErrors((prev) => {
      const next = { ...prev };
      const stock = parseFloat(stockStr) || 0;
      const cap = parseFloat(formData.capacityLiters) || 0;
      const safe = parseFloat(formData.safeCapacityLiters) || Math.round(cap * 0.95);

      if (stock >= 0 && stock <= cap) {
        delete next.openingStockLiters;
      }
      if (stock <= safe) {
        delete next.safeCapacityLiters;
      }
      return next;
    });
  };

  const handleLowThresholdChange = (lowStr: string) => {
    setFormData((prev) => ({
      ...prev,
      lowThresholdLiters: lowStr,
    }));
    if (fieldErrors.lowThresholdLiters) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.lowThresholdLiters;
        return next;
      });
    }
  };

  // Dynamic calculations for Safe Filling based on lower stock, current stock, and capacity
  const capNum = parseFloat(formData.capacityLiters) || 0;
  const stockNum = parseFloat(formData.openingStockLiters) || 0;
  const safeCapNum = parseFloat(formData.safeCapacityLiters) || Math.round(capNum * 0.95);
  const lowThresholdNum = parseFloat(formData.lowThresholdLiters) || Math.round(capNum * 0.15);

  const safeFillingAvailable = Math.max(0, safeCapNum - stockNum);
  const isOverfillHazard = stockNum > safeCapNum;
  const isCapacityExceeded = stockNum > capNum;
  const isLowStock = stockNum <= lowThresholdNum && stockNum > 0;
  const isEmptyTank = stockNum === 0;
  const fillPercentage = capNum > 0 ? (stockNum / capNum) * 100 : 0;

  const validate = () => {
    const result = validateTankForm({
      tankNumber: formData.tankNumber,
      tankIdentifier: formData.tankIdentifier,
      name: formData.name,
      fuelCode: formData.fuelCode,
      capacityLiters: formData.capacityLiters,
      openingStockLiters: formData.openingStockLiters,
      safeCapacityLiters: formData.safeCapacityLiters,
      lowThresholdLiters: formData.lowThresholdLiters,
      existingTanks,
    });

    setFieldErrors(result.errors);
    return result.isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      notifyWarning('Validation Error', 'Please correct the highlighted fields before proceeding.');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedNumber = parseInt(formData.tankNumber, 10);
      const finalTankNumber =
        !isNaN(parsedNumber) && parsedNumber > 0 ? parsedNumber : effectiveCount + 1;
      const uniformIdentity = formData.tankIdentifier.trim();

      const createdTank = await api.createTank({
        stationId: station.id,
        id: uniformIdentity,
        tankNumber: finalTankNumber,
        name: uniformIdentity,
        fuelCode: formData.fuelCode,
        capacityLiters: capNum,
        openingStockLiters: stockNum,
        currentVolumeLiters: stockNum,
        safeCapacityLiters: safeCapNum,
        lowThresholdLiters: lowThresholdNum,
        location: formData.location.trim(),
        description: formData.description.trim(),
      });

      notifySuccess('Tank Created', `Tank "${uniformIdentity}" added to ${station.name}.`);
      await onTankCreated(createdTank);
      onClose();
    } catch (err: any) {
      notifyError('Failed to Create Tank', err.message || 'Database error creating tank.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} ariaLabel="Add Tank to Bunk" className="max-w-2xl w-full">
      <div className="relative w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden transition-colors">
        {/* Flush top-right close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-0 right-0 flex h-9 w-9 shrink-0 items-center justify-center rounded-tr-2xl rounded-bl-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white transition cursor-pointer z-20 shadow-xs"
          aria-label="Close modal"
        >
          <X className="h-4 w-4 text-white stroke-[2.5]" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50/80 dark:bg-slate-950/50 pr-12 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <Plus className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                  Add Tank to Bunk
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-semibold shrink-0">
                  New Asset
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Assigning to <span className="font-semibold text-slate-700 dark:text-slate-300">{station.name}</span> ({station.code})
              </p>
            </div>
          </div>
        </div>

        {/* Form Body - Scrollable Container */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4.5 text-xs">
            {/* Tank Identity Tag */}
            <div className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Assigned Tank Number:</span>
              <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-emerald-600 text-white shadow-xs">
                Tank #{formData.tankNumber || '—'}
              </span>
            </div>

            {/* 2-Column Form Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5 text-xs">
              {/* Row 1 - Left: Tank Number & Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tank Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.tankNumber}
                  onChange={(e) => handleIdentityChange(e.target.value)}
                  required
                  placeholder="e.g. 1"
                  aria-invalid={Boolean(fieldErrors.tankNumber)}
                  className={`w-full h-10 px-3.5 py-2 rounded-xl border text-xs font-mono font-bold transition-all ${
                    fieldErrors.tankNumber
                      ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 focus:ring-2 focus:ring-rose-500'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                  }`}
                />
                {fieldErrors.tankNumber && (
                  <p className="mt-1 text-[11px] font-medium text-rose-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.tankNumber}
                  </p>
                )}
              </div>

              {/* Row 1 - Right: Fuel Product Grade */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Fuel Grade <span className="text-rose-500">*</span>
                </label>
                <SelectDropdown
                  value={formData.fuelCode}
                  onChange={(val) => {
                    setFormData({ ...formData, fuelCode: val as FuelCode });
                    if (fieldErrors.fuelCode) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.fuelCode;
                        return next;
                      });
                    }
                  }}
                  options={FUEL_SELECT_OPTIONS}
                  searchable={false}
                  placeholder="Select fuel grade..."
                  error={fieldErrors.fuelCode}
                />
              </div>

              {/* Row 2 - Left: Total Physical Capacity */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Total Capacity (Litres) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step="any"
                    value={formData.capacityLiters}
                    onChange={(e) => handleCapacityChange(e.target.value)}
                    required
                    placeholder="e.g. 20000"
                    aria-invalid={Boolean(fieldErrors.capacityLiters)}
                    className={`w-full h-10 pl-3.5 pr-8 py-2 rounded-xl border text-xs font-mono font-semibold transition-all ${
                      fieldErrors.capacityLiters
                        ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 focus:ring-2 focus:ring-rose-500'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                    L
                  </span>
                </div>
                {fieldErrors.capacityLiters && (
                  <p className="mt-1 text-[11px] font-medium text-rose-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.capacityLiters}
                  </p>
                )}
              </div>

              {/* Row 2 - Right: Opening Stock */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Opening Stock (Litres) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step="any"
                    value={formData.openingStockLiters}
                    onChange={(e) => handleOpeningStockChange(e.target.value)}
                    required
                    placeholder="0"
                    aria-invalid={Boolean(fieldErrors.openingStockLiters)}
                    className={`w-full h-10 pl-3.5 pr-8 py-2 rounded-xl border text-xs font-mono font-semibold transition-all ${
                      fieldErrors.openingStockLiters
                        ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 focus:ring-2 focus:ring-rose-500'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                    L
                  </span>
                </div>
                {fieldErrors.openingStockLiters && (
                  <p className="mt-1 text-[11px] font-medium text-rose-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.openingStockLiters}
                  </p>
                )}
              </div>

              {/* Row 3 - Left: Safe Filling Capacity (95%) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Safe Capacity (95%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    readOnly
                    disabled
                    value={formData.safeCapacityLiters}
                    className="w-full h-10 pl-3.5 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 font-mono font-bold cursor-not-allowed select-none opacity-85"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                    L
                  </span>
                </div>
                {fieldErrors.safeCapacityLiters && (
                  <p className="mt-1 text-[11px] font-medium text-rose-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.safeCapacityLiters}
                  </p>
                )}
              </div>

              {/* Row 3 - Right: Lower Stock Alert Threshold (15%) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Low Stock Alert (15%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step="any"
                    value={formData.lowThresholdLiters}
                    onChange={(e) => handleLowThresholdChange(e.target.value)}
                    aria-invalid={Boolean(fieldErrors.lowThresholdLiters)}
                    className={`w-full h-10 pl-3.5 pr-8 py-2 rounded-xl border text-xs font-mono font-medium transition-all ${
                      fieldErrors.lowThresholdLiters
                        ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 text-rose-900 dark:text-rose-100 focus:ring-2 focus:ring-rose-500'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                    L
                  </span>
                </div>
                {fieldErrors.lowThresholdLiters && (
                  <p className="mt-1 text-[11px] font-medium text-rose-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {fieldErrors.lowThresholdLiters}
                  </p>
                )}
              </div>

              {/* Row 4: Full-Width Location / Chamber Description */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Location / Chamber Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Forecourt East Pit, Chamber #1"
                  className="w-full h-10 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>

            {/* Safe Filling & Stock Dynamic Analysis Card */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 space-y-3 transition-all">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Safe Filling & Stock Analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300">
                    {capNum > 0 ? `${fillPercentage.toFixed(1)}% Fill` : '0.0% Fill'}
                  </span>
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      isOverfillHazard
                        ? 'bg-rose-500 animate-pulse'
                        : isLowStock
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                </div>
              </div>

              {/* Visual Fill Gauge */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    isOverfillHazard
                      ? 'bg-rose-500'
                      : isLowStock
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, fillPercentage))}%` }}
                />
              </div>

              {/* Calculations Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Capacity</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                    {capNum.toLocaleString()} L
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Current Stock</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                    {stockNum.toLocaleString()} L
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Lower Stock</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
                    {lowThresholdNum.toLocaleString()} L
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Safe Headroom</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">
                    {safeFillingAvailable.toLocaleString()} L
                  </span>
                </div>
              </div>

              {/* Dynamic Status / Hazard Notifications */}
              {isOverfillHazard && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>
                    <strong>Safe Filling Blocked!</strong> Opening stock ({stockNum.toLocaleString()} L) exceeds safe filling capacity ({safeCapNum.toLocaleString()} L) by {(stockNum - safeCapNum).toLocaleString()} L. Reduce stock to proceed safely.
                  </span>
                </div>
              )}

              {!isOverfillHazard && isCapacityExceeded && (
                <div className="flex items-center gap-2.5 p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>
                    <strong>Capacity Exceeded!</strong> Opening stock cannot be greater than total tank capacity ({capNum.toLocaleString()} L).
                  </span>
                </div>
              )}

              {!isOverfillHazard && !isCapacityExceeded && isLowStock && (
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300">
                  <TrendingDown className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    <strong>Lower Stock Alert:</strong> Current stock is at or below the lower threshold ({lowThresholdNum.toLocaleString()} L).
                  </span>
                </div>
              )}

              {!isOverfillHazard && !isCapacityExceeded && isEmptyTank && (
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-xs text-blue-800 dark:text-blue-300">
                  <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>
                    <strong>Empty Tank Initialized:</strong> Tank starts at 0 L. Total available safe decanting buffer: {safeFillingAvailable.toLocaleString()} L.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Fixed Sticky Footer - Always Visible */}
          <div className="px-6 py-3.5 bg-slate-50/90 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Overfill prevention & synchronized identity enforced</span>
            </div>
            <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isOverfillHazard || isCapacityExceeded}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-xs cursor-pointer"
              >
                {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Create Tank</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
};
