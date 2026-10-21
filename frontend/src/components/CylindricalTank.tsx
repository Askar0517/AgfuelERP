import React from 'react';
import { FuelProduct, Tank } from '../types';
import { Droplet, AlertTriangle, ArrowDownToLine, Ruler, Eye, Check, Edit2 } from 'lucide-react';
import { getFuelDefinition } from '../utils/fuelConfig';

interface CylindricalTankProps {
  tank: Tank;
  fuel: FuelProduct;
  onOpenDipModal?: (tank: Tank) => void;
  onOpenDecantModal?: (tank: Tank) => void;
  onViewDetails?: (tank: Tank) => void;
  onEditTank?: (tank: Tank) => void;
  onSelect?: (tank: Tank) => void;
  isSelected?: boolean;
}

export const CylindricalTank: React.FC<CylindricalTankProps> = ({
  tank,
  fuel,
  onOpenDipModal,
  onOpenDecantModal,
  onViewDetails,
  onEditTank,
  onSelect,
  isSelected = false,
}) => {
  const fillPercentage = Math.min(
    100,
    Math.max(0, (tank.currentVolumeLiters / Math.max(1, tank.capacityLiters)) * 100)
  );

  const safeUllageLiters = Math.max(0, tank.safeCapacityLiters - tank.currentVolumeLiters);
  const isLowStock =
    tank.currentVolumeLiters <= (tank.lowAlertThresholdLiters ?? tank.lowThresholdLiters ?? 3000);
  const isWaterAlert = tank.waterDipCm > 1.0;

  const fuelDef = getFuelDefinition(tank.fuelCode);

  // Standardized Forecourt Fuel Theme
  const fuelTheme =
    {
      OCTANE_98: {
        liquid: 'from-rose-500 to-rose-600',
        liquidBorder: 'border-rose-400',
        badge:
          'text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60',
        cardTop: 'border-t-4 border-t-[#DC2626]',
        dot: 'bg-[#DC2626]',
      },
      OCTANE_95: {
        liquid: 'from-emerald-500 to-emerald-600',
        liquidBorder: 'border-emerald-400',
        badge:
          'text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60',
        cardTop: 'border-t-4 border-t-[#16A34A]',
        dot: 'bg-[#16A34A]',
      },
      DIESEL: {
        liquid: 'from-amber-400 to-amber-500',
        liquidBorder: 'border-amber-400',
        badge:
          'text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60',
        cardTop: 'border-t-4 border-t-[#EAB308]',
        dot: 'bg-[#EAB308]',
      },
      PETROL: {
        liquid: 'from-emerald-500 to-emerald-600',
        liquidBorder: 'border-emerald-400',
        badge:
          'text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/60',
        cardTop: 'border-t-4 border-t-[#16A34A]',
        dot: 'bg-[#16A34A]',
      },
      PREMIUM: {
        liquid: 'from-rose-500 to-rose-600',
        liquidBorder: 'border-rose-400',
        badge:
          'text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/60',
        cardTop: 'border-t-4 border-t-[#DC2626]',
        dot: 'bg-[#DC2626]',
      },
    }[fuelDef.code] || {
      liquid: 'from-emerald-500 to-emerald-600',
      liquidBorder: 'border-emerald-400',
      badge:
        'text-slate-700 dark:text-gray-300 border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-800',
      cardTop: 'border-t-4 border-t-[#16A34A]',
      dot: 'bg-[#16A34A]',
    };

  return (
    <div
      onClick={() => (onViewDetails ? onViewDetails(tank) : onSelect?.(tank))}
      className={`flex flex-col justify-between rounded-2xl border bg-white dark:bg-[#0D2926] p-5 shadow-xs transition duration-200 ${
        isSelected
          ? 'ring-2 ring-[#12544F] border-[#12544F] dark:border-[#2BA096] shadow-md'
          : 'border-slate-200 dark:border-[#194C47] hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md'
      } ${fuelTheme.cardTop} ${onViewDetails || onSelect ? 'cursor-pointer' : ''}`}
    >
      {/* Tank Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              {tank.id || `TNK-${tank.tankNumber}`}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider border ${fuelTheme.badge}`}
            >
              {fuel.shortName || fuelDef.name}
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                tank.status === 'ACTIVE'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : tank.status === 'MAINTENANCE'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              {tank.status}
            </span>
          </div>
          <h3 className="mt-1.5 font-sans text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-baseline gap-1.5">
            <span className="tabular-nums font-mono text-xl">
              {tank.currentVolumeLiters.toLocaleString()}
            </span>
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              / {tank.capacityLiters.toLocaleString()} L
            </span>
          </h3>
          {tank.name && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
              {tank.name}
            </p>
          )}
        </div>

        {/* Status indicators */}
        <div className="flex flex-col items-end gap-1">
          {isLowStock && (
            <div className="flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-400 animate-pulse">
              <AlertTriangle className="h-3 w-3" />
              <span>Low Reserve</span>
            </div>
          )}
          {isWaterAlert && (
            <div className="flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-700 dark:text-cyan-400">
              <Droplet className="h-3 w-3" />
              <span>Water: {tank.waterDipCm}cm</span>
            </div>
          )}
          <span className="font-mono text-xs text-[#12544F] dark:text-[#2BA096] tabular-nums font-bold">
            {fillPercentage.toFixed(1)}% Full
          </span>
        </div>
      </div>

      {/* Industrial Subterranean Cylindrical Tank Graphic: Steel Chamber */}
      <div className="my-4 flex flex-col items-center">
        {/* Tank Chamber Shell: Deep Steel Cylindrical Vessel */}
        <div className="relative h-28 w-full max-w-[280px] rounded-2xl border-2 border-slate-700 dark:border-slate-700 bg-slate-950 p-1 shadow-inner">
          <div className="relative h-full w-full overflow-hidden rounded-[13px] bg-slate-900">
            {/* Calibration Reference Lines */}
            <div className="absolute inset-0 flex flex-col justify-between py-2 px-3 opacity-50 pointer-events-none font-mono text-[9px] text-slate-400 z-10">
              <div className="border-b border-dashed border-slate-600 flex justify-between">
                <span>Safe Limit (95%)</span>
                <span>{tank.safeCapacityLiters.toLocaleString()} L</span>
              </div>
              <div className="border-b border-dashed border-slate-700 flex justify-between">
                <span>Mid (50%)</span>
              </div>
              <div className="border-b border-dashed border-rose-500/70 text-rose-400 flex justify-between">
                <span>Reserve Alarm</span>
                <span>{tank.lowThresholdLiters.toLocaleString()} L</span>
              </div>
            </div>

            {/* Liquid Level Gradient */}
            <div
              className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${fuelTheme.liquid} border-t-2 ${fuelTheme.liquidBorder} transition-all duration-700`}
              style={{ height: `${fillPercentage}%` }}
            >
              {/* Liquid top sheen reflection */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/40" />
            </div>

            {/* Water bottom layer if detected */}
            {tank.waterDipCm > 0 && (
              <div
                className="absolute bottom-0 left-0 right-0 bg-cyan-400 border-t border-cyan-200 z-20"
                style={{ height: `${Math.min(25, Math.max(6, tank.waterDipCm * 4))}%` }}
                title={`Water bottom detected: ${tank.waterDipCm} cm`}
              />
            )}
          </div>
        </div>

        {/* Industrial Telemetry Console Bar */}
        <div className="mt-3 flex items-center justify-between gap-4 w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#123733] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#194C47] text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <Ruler className="h-3.5 w-3.5 text-[#12544F] dark:text-[#2BA096]" />
            <span className="text-slate-500 dark:text-slate-400 font-sans">Dip:</span>
            <span className="font-bold text-slate-900 dark:text-white tabular-nums">
              {tank.currentDipCm} cm
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-sans">Safe Ullage:</span>
            <span className="font-bold text-[#12544F] dark:text-[#2BA096] tabular-nums">
              {safeUllageLiters.toLocaleString()} L
            </span>
          </div>
        </div>
      </div>

      {/* Tank Action Controls */}
      <div className="flex items-center gap-2 pt-2.5 border-t border-slate-200 dark:border-[#194C47]">
        {onOpenDipModal && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDipModal(tank);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition shadow-2xs cursor-pointer"
          >
            <Ruler className="h-3.5 w-3.5 text-slate-500" />
            <span>Dip Stick</span>
          </button>
        )}

        {onOpenDecantModal && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDecantModal(tank);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#12544F] hover:bg-[#0E433F] py-2 text-xs font-semibold text-white active:scale-95 transition shadow-sm cursor-pointer"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
            <span>Decant</span>
          </button>
        )}

        {onViewDetails && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(tank);
            }}
            title="Inspect Tank Details"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        )}

        {onEditTank && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditTank(tank);
            }}
            title="Edit Tank Configuration"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 active:scale-95 transition cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
