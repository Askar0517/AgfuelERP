import React, { useState } from 'react';
import { Tank, FuelProduct, TankLoadDecanting, Station, Nozzle, UserRole } from '../types';
import { CylindricalTank } from '../components/CylindricalTank';
import {
  Droplets,
  ArrowDownToLine,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  History,
  Plus,
  Eye,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import { SelectDropdown } from '../components/common/SelectDropdown';
import { TankDetailsModal } from '../components/tanks/TankDetailsModal';
import { AddTankModal } from '../components/tanks/AddTankModal';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { ModalPortal } from '../components/common/ModalPortal';

interface TanksViewProps {
  station: Station;
  stations?: Station[];
  tanks: Tank[];
  nozzles?: Nozzle[];
  fuels: FuelProduct[];
  tankLoads: TankLoadDecanting[];
  currentRole?: UserRole;
  onOpenDipModal: (tank: Tank) => void;
  onOpenDecantModal: (tank: Tank) => void;
  onCreateTank?: (payload: any) => Promise<void>;
  onUpdateTank?: (id: string, payload: any) => Promise<void>;
  onDeactivateTank?: (id: string, targetStatus?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE') => Promise<void>;
  onDeleteTank?: (id: string) => Promise<void>;
}

export const TanksView: React.FC<TanksViewProps> = ({
  station,
  stations = [],
  tanks,
  nozzles = [],
  fuels,
  tankLoads,
  currentRole = 'OWNER',
  onOpenDipModal,
  onOpenDecantModal,
  onCreateTank,
  onUpdateTank = async () => {},
  onDeactivateTank = async () => {},
  onDeleteTank = async () => {},
}) => {
  const currentTanks = tanks.filter((t) => t.stationId === station.id);
  const currentLoads = tankLoads.filter((l) => l.stationId === station.id);

  // Expandable Tank Details State
  const [inspectedTank, setInspectedTank] = useState<Tank | null>(null);
  const [isAddTankModalOpen, setIsAddTankModalOpen] = useState<boolean>(false);
  const [previewInvoice, setPreviewInvoice] = useState<{ url: string; title: string } | null>(null);

  // Quick Safe Ullage Calculator state
  const [testDecantLiters, setTestDecantLiters] = useState<number>(12000);
  const [selectedCalcTankId, setSelectedCalcTankId] = useState<string>(
    currentTanks[0]?.id || ''
  );

  const calcTank = currentTanks.find((t) => t.id === selectedCalcTankId) || currentTanks[0];
  const calcSafeUllage = calcTank
    ? Math.max(0, calcTank.safeCapacityLiters - calcTank.currentVolumeLiters)
    : 0;
  const canSafelyDecant = testDecantLiters <= calcSafeUllage;

  const canManageTanks = currentRole === 'OWNER' || currentRole === 'MANAGER';

  // Synchronize inspected tank with latest props
  const activeInspectedTank = inspectedTank
    ? tanks.find((t) => t.id === inspectedTank.id) || inspectedTank
    : null;

  return (
    <div className="space-y-6 pb-12 sm:pb-6 animate-fadeIn">
      {/* Breadcrumb Navigation & Action Bar */}
      <Breadcrumbs
        items={[
          { label: 'Operations' },
          { label: 'Tanks', isCurrent: true, icon: Droplets },
        ]}
        badge={
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {station.name}
          </span>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {canManageTanks && onCreateTank && (
              <button
                type="button"
                onClick={() => setIsAddTankModalOpen(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 active:scale-95 transition shadow-2xs cursor-pointer shrink-0"
              >
                <Plus className="h-3.5 w-3.5 text-[#12544F] dark:text-[#2BA096]" />
                <span>Add Tank</span>
              </button>
            )}

            {currentTanks[0] && (
              <button
                type="button"
                onClick={() => onOpenDecantModal(currentTanks[0])}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-[#12544F] hover:bg-[#0E433F] px-3.5 py-1.5 text-xs font-semibold text-white active:scale-95 transition shadow-sm cursor-pointer shrink-0"
              >
                <ArrowDownToLine className="h-3.5 w-3.5" />
                <span>Decant Load</span>
              </button>
            )}
          </div>
        }
      />

      {/* Tanks Grid with Empty State */}
      {currentTanks.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-[#194C47] bg-white dark:bg-[#0D2926] p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#12544F]/10 dark:bg-[#12544F]/30 text-[#12544F] dark:text-[#2BA096] flex items-center justify-center mx-auto mb-3">
            <Droplets className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No Storage Tanks Provisioned
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Station "{station.name}" ({station.code}) has no underground tanks configured.
          </p>
          {canManageTanks && (
            <button
              type="button"
              onClick={() => setIsAddTankModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#12544F] hover:bg-[#0E433F] text-white text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              Configure First Tank
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {currentTanks.map((tank) => {
            const fuel = fuels.find((f) => f.code === tank.fuelCode) || {
              code: tank.fuelCode,
              name: tank.fuelCode,
              shortName: tank.fuelCode,
              ratePerLiter: 100,
              densityStd15c: 0.74,
              densityTolerance: 0.005,
              color: '#12544F',
            };
            return (
              <CylindricalTank
                key={tank.id}
                tank={tank}
                fuel={fuel}
                isSelected={tank.id === selectedCalcTankId}
                onSelect={(t) => setSelectedCalcTankId(t.id)}
                onViewDetails={(t) => setInspectedTank(t)}
                onOpenDipModal={onOpenDipModal}
                onOpenDecantModal={onOpenDecantModal}
              />
            );
          })}
        </div>
      )}

      {/* Safe Ullage & Overfill Protection Calculator */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#194C47] bg-white dark:bg-[#0D2926] p-5 shadow-xs transition">
        <div className="flex items-center gap-2 border-b border-slate-200/70 dark:border-[#194C47] pb-3">
          <ShieldCheck className="h-4 w-4 text-[#12544F] dark:text-[#2BA096]" />
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Pre-Decanting Safe Ullage Verification
          </h2>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <SelectDropdown
              label="Select Target Tank"
              placeholder="Select target tank..."
              options={currentTanks.map((t) => ({
                value: t.id,
                label: `Tank #${t.tankNumber} (${t.fuelCode})`,
                description: `Stock: ${t.currentVolumeLiters.toLocaleString()} L · Safe Cap: ${t.safeCapacityLiters.toLocaleString()} L`,
                badge: t.fuelCode,
              }))}
              value={selectedCalcTankId}
              onChange={(val) => setSelectedCalcTankId(val)}
              searchable={currentTanks.length > 4}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
              Inbound Tanker Load (Liters):
            </label>
            <input
              type="number"
              step="500"
              value={testDecantLiters}
              onChange={(e) => setTestDecantLiters(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 p-2.5 font-mono text-xs font-semibold text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div
            className={`flex flex-col justify-center rounded-xl border p-3 ${
              canSafelyDecant
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300'
            }`}
          >
            <div className="flex items-center gap-1.5 font-semibold text-xs">
              {canSafelyDecant ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Safe To Decant</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>OVERFILL RISK!</span>
                </>
              )}
            </div>
            <p className="mt-1 text-[11px]">
              Available safe ullage buffer: <strong className="font-mono">{calcSafeUllage.toLocaleString()} L</strong>
              {!canSafelyDecant && (
                <span className="block mt-0.5 font-semibold">
                  Exceeds by {(testDecantLiters - calcSafeUllage).toLocaleString()} L
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Decanting Log Register */}
      <div className="rounded-2xl border border-slate-200 dark:border-[#194C47] bg-white dark:bg-[#0D2926] p-5 shadow-xs transition">
        <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-[#194C47] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[#12544F] dark:text-[#2BA096]" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Historical Tanker Decanting Audit Log
            </h2>
          </div>
          <span className="font-mono text-xs text-slate-500 dark:text-gray-400">
            {currentLoads.length} Records Logged
          </span>
        </div>

        {currentLoads.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 dark:text-gray-500">
            No tanker load receipts recorded yet for {station.name}.
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="py-2.5 px-3">Date / Time</th>
                  <th className="py-2.5 px-3">Tanker No</th>
                  <th className="py-2.5 px-3">Invoice No</th>
                  <th className="py-2.5 px-3">Fuel</th>
                  <th className="py-2.5 px-3 text-right">Inv Volume</th>
                  <th className="py-2.5 px-3 text-right">Received Vol</th>
                  <th className="py-2.5 px-3 text-right">Variance</th>
                  <th className="py-2.5 px-3 text-center">Density Status</th>
                  <th className="py-2.5 px-3">Decanted By</th>
                  <th className="py-2.5 px-3 text-center">Invoice Copy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800 font-mono">
                {currentLoads.map((load) => (
                  <tr key={load.id} className="hover:bg-slate-50 dark:hover:bg-gray-800/40 transition">
                    <td className="py-2.5 px-3 text-slate-600 dark:text-gray-300 font-sans">
                      {new Date(load.timestamp).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      <span className="text-[10px] text-slate-400 dark:text-gray-500">
                        {new Date(load.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{load.tankerNumber}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-gray-400">{load.invoiceNo}</td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="rounded bg-slate-100 dark:bg-gray-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-gray-300">
                        {load.fuelCode}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-gray-300">
                      {load.invoiceVolumeLiters.toLocaleString()} L
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {load.receivedVolumeLiters.toLocaleString()} L
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        load.varianceLiters < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {load.varianceLiters > 0 ? `+${load.varianceLiters}` : load.varianceLiters} L
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                          load.densityStatus === 'PASSED'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {load.densityStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-gray-400">{load.operatorName}</td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      {load.invoiceImageUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewInvoice({
                              url: load.invoiceImageUrl!,
                              title: `Delivery Challan / Invoice: ${load.invoiceNo} (Tanker ${load.tankerNumber})`,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition cursor-pointer"
                          title="View uploaded delivery challan / invoice photo"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Copy</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-sans">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expandable Tank Details Modal (Mounted via ModalPortal above full viewport) */}
      {activeInspectedTank && (
        <TankDetailsModal
          isOpen={Boolean(activeInspectedTank)}
          onClose={() => setInspectedTank(null)}
          tank={activeInspectedTank}
          station={station}
          nozzles={nozzles}
          currentRole={currentRole}
          onUpdateTank={onUpdateTank}
          onDeactivateTank={onDeactivateTank}
          onDeleteTank={onDeleteTank}
          onRecordDip={onOpenDipModal}
          onDecant={onOpenDecantModal}
          tankLoads={tankLoads}
        />
      )}

      {/* Add Tank Configuration Modal */}
      {isAddTankModalOpen && (
        <AddTankModal
          isOpen={isAddTankModalOpen}
          onClose={() => setIsAddTankModalOpen(false)}
          station={station}
          fuels={fuels}
          existingTankCount={currentTanks.length}
          existingTanks={currentTanks}
          onTankCreated={async (createdTank) => {
            setIsAddTankModalOpen(false);
            if (onCreateTank && createdTank) {
               await onCreateTank(createdTank);
            }
          }}
        />
      )}

      {/* Lightbox / Modal for Delivery Challan / Invoice Copy Preview */}
      {previewInvoice && (
        <ModalPortal isOpen={Boolean(previewInvoice)} onClose={() => setPreviewInvoice(null)} ariaLabel={previewInvoice.title}>
          <div className="relative max-w-2xl w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-500" />
                {previewInvoice.title}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewInvoice(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[70vh] flex items-center justify-center bg-slate-950">
              <img
                src={previewInvoice.url}
                alt="Delivery Challan / Invoice Copy"
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
