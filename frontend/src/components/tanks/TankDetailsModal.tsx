import React, { useState, useEffect } from 'react';
import {
  Tank,
  Station,
  Nozzle,
  TankLoadDecanting,
  UserRole,
} from '../../types';
import { getFuelDefinition } from '../../utils/fuelConfig';
import {
  X,
  Fuel,
  Info,
  Sliders,
  BarChart3,
  History,
  QrCode,
  ShieldCheck,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Save,
  Download,
  Printer,
  Copy,
  Check,
  Calendar,
  Layers,
  Wrench,
  Loader2,
  Lock,
  Eye,
  Image as ImageIcon,
} from 'lucide-react';
import QRCode from 'qrcode';
import { api } from '../../api/client';
import { useNotification } from '../../context/NotificationContext';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { SelectDropdown } from '../common/SelectDropdown';
import { ModalPortal } from '../common/ModalPortal';

export interface TankDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tank: Tank;
  station: Station;
  nozzles: Nozzle[];
  currentRole: UserRole;
  onUpdateTank: (id: string, payload: any) => Promise<void>;
  onDeactivateTank: (id: string, targetStatus?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE') => Promise<void>;
  onDeleteTank: (id: string) => Promise<void>;
  onRecordDip?: (tank: Tank) => void;
  onDecant?: (tank: Tank) => void;
  initialTab?: 'overview' | 'config' | 'stock' | 'history' | 'nozzles' | 'qr' | 'audit';
  tankLoads?: TankLoadDecanting[];
}

export const TankDetailsModal: React.FC<TankDetailsModalProps> = ({
  isOpen,
  onClose,
  tank,
  station,
  nozzles,
  currentRole,
  onUpdateTank,
  onDeactivateTank,
  onDeleteTank,
  onRecordDip,
  onDecant,
  initialTab = 'overview',
  tankLoads = [],
}) => {
  const { notifySuccess, notifyError, notifyWarning } = useNotification();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'config' | 'stock' | 'history' | 'nozzles' | 'qr' | 'audit'
  >(initialTab);

  // Loading state for detailed history
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [detailedLoads, setDetailedLoads] = useState<TankLoadDecanting[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Editing state
  const [isEditingConfig, setIsEditingConfig] = useState<boolean>(initialTab === 'config');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [configForm, setConfigForm] = useState({
    name: tank.name || `Tank ${tank.tankNumber} (${tank.fuelCode})`,
    tankNumber: String(tank.tankNumber),
    capacityLiters: String(tank.capacityLiters),
    safeCapacityLiters: String(tank.safeCapacityLiters),
    lowThresholdLiters: String(tank.lowThresholdLiters),
    status: tank.status || 'ACTIVE',
    location: tank.location || '',
    description: tank.description || '',
  });

  // Lifecycle confirmation modals
  const [isDeactivateConfirmOpen, setIsDeactivateConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // QR Code Data URL
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedId, setCopiedId] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    setIsEditingConfig(initialTab === 'config');
    setConfigForm({
      name: tank.name || `Tank ${tank.tankNumber} (${tank.fuelCode})`,
      tankNumber: String(tank.tankNumber),
      capacityLiters: String(tank.capacityLiters),
      safeCapacityLiters: String(tank.safeCapacityLiters),
      lowThresholdLiters: String(tank.lowThresholdLiters),
      status: tank.status || 'ACTIVE',
      location: tank.location || '',
      description: tank.description || '',
    });

    // Populate initial matching loads from parent if available
    if (tankLoads && tankLoads.length > 0) {
      const parentMatches = tankLoads.filter(
        (l) => l.tankId === tank.id || l.tankId?.toLowerCase() === tank.id?.toLowerCase()
      );
      if (parentMatches.length > 0) {
        setDetailedLoads(parentMatches);
      }
    }

    // Fetch tank loads and audit logs
    setIsLoadingDetails(true);
    Promise.all([
      api.getTankLoads(tank.stationId).catch(() => []),
      api.getAuditLogs({ entity: 'TANK', entityId: tank.id }).catch(() => []),
    ])
      .then(async ([loads, audits]) => {
        let matchingLoads = (loads || []).filter(
          (l) => l.tankId === tank.id || l.tankId?.toLowerCase() === tank.id?.toLowerCase()
        );
        // Fallback: if empty with stationId query, fetch without stationId query
        if (matchingLoads.length === 0) {
          const allLoads = await api.getTankLoads().catch(() => []);
          matchingLoads = (allLoads || []).filter(
            (l) => l.tankId === tank.id || l.tankId?.toLowerCase() === tank.id?.toLowerCase()
          );
        }
        if (matchingLoads.length > 0 || detailedLoads.length === 0) {
          setDetailedLoads(matchingLoads);
        }
        setAuditLogs(audits);
      })
      .finally(() => setIsLoadingDetails(false));

    // Generate QR Code
    const payload = JSON.stringify({
      schema: 'petropulse-forecourt-v1',
      type: 'TANK',
      id: tank.id,
      name: tank.name || `Tank #${tank.tankNumber}`,
      stationId: tank.stationId,
    });
    QRCode.toDataURL(payload, {
      width: 280,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Tank QR generation failed:', err));
  }, [isOpen, tank]);

  if (!isOpen) return null;

  const isOwner = currentRole === 'OWNER';
  const isManager = currentRole === 'MANAGER';
  const canEdit = isOwner || isManager;

  // Capacity calculations
  const occupancyPct = Math.min(
    100,
    Math.round((tank.currentVolumeLiters / Math.max(1, tank.capacityLiters)) * 100)
  );
  const ullageLiters = Math.max(0, tank.safeCapacityLiters - tank.currentVolumeLiters);
  const isLowStock = tank.currentVolumeLiters <= tank.lowThresholdLiters;

  const associatedNozzles = nozzles.filter(
    (n) => n.tankId === tank.id || (n.stationId === tank.stationId && n.fuelCode === tank.fuelCode)
  );

  const activeNozzles = associatedNozzles.filter((n) => n.status === 'ACTIVE');
  const hasActiveNozzles = activeNozzles.length > 0;
  const hasDecantHistory = (detailedLoads && detailedLoads.length > 0) || (tankLoads && tankLoads.some((l) => l.tankId === tank.id));
  const isDeletionBlocked = hasActiveNozzles || hasDecantHistory;

  const handleConfigCapacityChange = (capStr: string) => {
    const cap = parseFloat(capStr) || 0;
    const safe = Math.round(cap * 0.95);
    const low = Math.round(cap * 0.15);
    setConfigForm((prev) => ({
      ...prev,
      capacityLiters: capStr,
      safeCapacityLiters: String(safe),
      lowThresholdLiters: String(low),
    }));
  };

  const handleConfigIdentityChange = (val: string) => {
    setConfigForm((prev) => ({
      ...prev,
      tankNumber: val,
      name: val,
    }));
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const cap = parseFloat(configForm.capacityLiters);
    const safeCap = parseFloat(configForm.safeCapacityLiters) || Math.round(cap * 0.95);
    const lowThresh = parseFloat(configForm.lowThresholdLiters) || Math.round(cap * 0.15);
    const parsedNum = parseInt(configForm.tankNumber, 10);
    const tankNum = !isNaN(parsedNum) && parsedNum > 0 ? parsedNum : tank.tankNumber;

    if (isNaN(cap) || cap <= 0) {
      notifyWarning('Validation Error', 'Tank capacity must be a positive number.');
      return;
    }
    if (tank.currentVolumeLiters > cap) {
      notifyWarning(
        'Validation Error',
        `Current volume (${tank.currentVolumeLiters}L) exceeds proposed capacity (${cap}L).`
      );
      return;
    }
    if (tank.currentVolumeLiters > safeCap) {
      notifyWarning(
        'Safe Filling Blocked',
        `Current volume (${tank.currentVolumeLiters}L) exceeds proposed safe filling capacity (${safeCap}L). Safe filling is blocked.`
      );
      return;
    }

    // Edit flow status flag check: cannot deactivate tank if active nozzles are linked
    if (configForm.status === 'INACTIVE' && tank.status !== 'INACTIVE' && hasActiveNozzles) {
      notifyWarning(
        'Deactivation Blocked',
        `Cannot deactivate tank while active nozzle(s) (#${activeNozzles.map((n) => n.nozzleNumber).join(', ')}) are linked to it. Please deactivate or reassign nozzles first.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdateTank(tank.id, {
        name: configForm.name.trim(),
        tankNumber: tankNum,
        capacityLiters: cap,
        safeCapacityLiters: safeCap,
        lowThresholdLiters: lowThresh,
        status: configForm.status,
        location: configForm.location.trim(),
        description: configForm.description.trim(),
      });
      notifySuccess('Configuration Updated', `Tank "${configForm.name}" updated successfully.`);
      setIsEditingConfig(false);
    } catch (err: any) {
      notifyError('Update Failed', err.message || 'Failed to update tank configuration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    const nextStatus = tank.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (nextStatus === 'INACTIVE' && hasActiveNozzles) {
      notifyWarning(
        'Deactivation Blocked',
        `Cannot deactivate tank while active nozzle(s) (#${activeNozzles.map((n) => n.nozzleNumber).join(', ')}) are attached. Please deactivate or reassign the nozzles first.`
      );
      setIsDeactivateConfirmOpen(false);
      return;
    }

    try {
      await onDeactivateTank(tank.id, nextStatus);
      notifySuccess('Status Updated', `Tank is now ${nextStatus}.`);
      setIsDeactivateConfirmOpen(false);
    } catch (err: any) {
      notifyError('Failed to change status', err.message);
    }
  };

  const handleDelete = async () => {
    if (hasActiveNozzles) {
      notifyWarning(
        'Cannot Delete Tank',
        `Tank is linked to active nozzle(s) (#${activeNozzles.map((n) => n.nozzleNumber).join(', ')}). Please deactivate or reassign nozzles first.`
      );
      setIsDeleteConfirmOpen(false);
      return;
    }

    if (hasDecantHistory) {
      notifyWarning(
        'Cannot Delete Tank',
        `Tank has ${detailedLoads.length} historical decanting tanker delivery record(s). Deletion is blocked to preserve inventory audit history. Please deactivate the tank instead.`
      );
      setIsDeleteConfirmOpen(false);
      return;
    }

    try {
      await onDeleteTank(tank.id);
      notifySuccess('Tank Deleted', `Tank "${tank.name || tank.id}" was deleted.`);
      setIsDeleteConfirmOpen(false);
      onClose();
    } catch (err: any) {
      notifyError('Cannot Delete Tank', err.message);
    }
  };

  const copyId = () => {
    navigator.clipboard.writeText(tank.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    notifySuccess('Copied', `Tank ID ${tank.id} copied.`);
  };

  const fuelDef = getFuelDefinition(tank.fuelCode);
  const fuelColor = fuelDef.color;

  return (
    <ModalPortal isOpen={isOpen} onClose={onClose} ariaLabel={`Tank ${tank.name || tank.id} Details`} className="max-w-4xl">
      <div className="relative w-full max-h-[92vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden transition-colors">
        {/* Flush top-right close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-0 right-0 flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-tr-2xl rounded-bl-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white transition cursor-pointer z-10"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4 text-white stroke-[2.5]" />
        </button>
        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 px-5 py-4 bg-slate-50/70 dark:bg-slate-950/40 pr-10">
          <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-black shadow-xs"
              style={{ backgroundColor: fuelColor }}
            >
              <Fuel className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                  {tank.id}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    tank.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : tank.status === 'MAINTENANCE'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {tank.status}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white truncate mt-0.5">
                {tank.name || `Tank #${tank.tankNumber}`} · {station.name}
              </h2>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (7 Sections as specified) */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/20 px-4 overflow-x-auto no-scrollbar gap-1 text-xs">
          {[
            { id: 'overview', label: '1. Overview', icon: Info },
            { id: 'config', label: '2. Configuration', icon: Sliders },
            { id: 'stock', label: '3. Stock & Capacity', icon: BarChart3 },
            { id: 'history', label: '4. Decanting History', icon: History },
            { id: 'nozzles', label: `5. Nozzles (${associatedNozzles.length})`, icon: Fuel },
            { id: 'qr', label: '6. QR Code', icon: QrCode },
            { id: 'audit', label: '7. Audit History', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 py-3 px-3 font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400'
                    : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* SECTION 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Alert Banner if Low Stock */}
              {isLowStock && (
                <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="font-bold block">Low Fuel Stock Warning!</span>
                    Current volume ({tank.currentVolumeLiters.toLocaleString()} L) is below the minimum threshold ({tank.lowThresholdLiters.toLocaleString()} L). Please initiate a tanker decanting delivery.
                  </div>
                </div>
              )}

              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Capacity</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                    {tank.capacityLiters.toLocaleString()} L
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Stock</span>
                  <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {tank.currentVolumeLiters.toLocaleString()} L
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{occupancyPct}% Filled</span>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Safe Ullage Room</span>
                  <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono">
                    {ullageLiters.toLocaleString()} L
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Available to receive</span>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Dip Depth</span>
                  <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                    {tank.currentDipCm} cm
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Max Dip: {tank.maxDipCm} cm</span>
                </div>
              </div>

              {/* Progress Gauge */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-4 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-slate-400">Underground Tank Volume Level</span>
                  <span className="font-mono text-slate-900 dark:text-white">{occupancyPct}% Occupancy</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-3.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${occupancyPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>0 L (Dry)</span>
                  <span>Alert: {tank.lowThresholdLiters.toLocaleString()} L</span>
                  <span>Safe Limit: {tank.safeCapacityLiters.toLocaleString()} L</span>
                  <span>Max: {tank.capacityLiters.toLocaleString()} L</span>
                </div>
              </div>

              {/* Meta details */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4 text-xs space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block">Parent Bunk / Forecourt:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {station.name} ({station.code})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Fuel Grade:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{tank.fuelCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Location / Manhole Chamber:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {tank.location || 'Central Forecourt Tank Farm'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Last Dip Recorded:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {new Date(tank.lastDipTimestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Operation Triggers */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  {onRecordDip && (
                    <button
                      type="button"
                      onClick={() => onRecordDip(tank)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition"
                    >
                      Record Manual Dip Log
                    </button>
                  )}
                  {onDecant && (
                    <button
                      type="button"
                      onClick={() => onDecant(tank)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition"
                    >
                      Receive Tanker Decanting
                    </button>
                  )}
                </div>

                {canEdit && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsDeactivateConfirmOpen(true)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      {tank.status === 'ACTIVE' ? 'Deactivate Tank' : 'Activate Tank'}
                    </button>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => setIsDeleteConfirmOpen(true)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                          isDeletionBlocked
                            ? 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            : 'border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40'
                        }`}
                        title={
                          hasActiveNozzles
                            ? 'Cannot delete: linked to active nozzle(s). Deactivate or reassign nozzles first.'
                            : hasDecantHistory
                            ? 'Cannot delete: has historical decanting delivery records. Deactivate tank instead.'
                            : 'Permanently delete tank'
                        }
                      >
                        Delete Tank
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 2: CONFIGURATION */}
          {activeTab === 'config' && (
            <form onSubmit={handleSaveConfig} className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Tank Master Configuration
                </h3>
                {canEdit && !isEditingConfig && (
                  <button
                    type="button"
                    onClick={() => setIsEditingConfig(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit Configuration
                  </button>
                )}
              </div>

              {/* Synchronized identity notice */}
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    <strong>Synchronized Identity:</strong> Tank Number, Tank Identifier ({tank.id}), and Tank Name are identical.
                  </span>
                </div>
                <span className="font-mono font-bold px-2 py-0.5 rounded bg-emerald-600 text-white text-[11px]">
                  {configForm.name || tank.id}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tank Number & Display Name:
                  </label>
                  <input
                    type="text"
                    disabled={!isEditingConfig}
                    value={configForm.name}
                    onChange={(e) => handleConfigIdentityChange(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white disabled:opacity-60 font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Unified tank identity: Tank number, authoritative identifier ({tank.id}), and display name.
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Capacity (Litres):
                  </label>
                  <input
                    type="number"
                    disabled={!isEditingConfig}
                    value={configForm.capacityLiters}
                    onChange={(e) => handleConfigCapacityChange(e.target.value)}
                    required
                    min={1}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white disabled:opacity-60 font-mono font-semibold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      Safe Filling Capacity (95%):
                    </label>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      <Lock className="h-3 w-3" /> Blocked (Locked)
                    </span>
                  </div>
                  <input
                    type="number"
                    disabled={true}
                    readOnly
                    value={configForm.safeCapacityLiters}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/80 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 disabled:opacity-80 font-mono font-bold cursor-not-allowed select-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Auto-calculated from capacity (95%). Manual override blocked.
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Low Stock Alert Threshold (15%):
                  </label>
                  <input
                    type="number"
                    disabled={!isEditingConfig}
                    value={configForm.lowThresholdLiters}
                    onChange={(e) => setConfigForm({ ...configForm, lowThresholdLiters: e.target.value })}
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white disabled:opacity-60 font-mono"
                  />
                </div>

                <div>
                  <SelectDropdown
                    label="Operational Status"
                    disabled={!isEditingConfig}
                    value={configForm.status}
                    onChange={(val) => setConfigForm({ ...configForm, status: val as any })}
                    options={[
                      { value: 'ACTIVE', label: 'Active (Operational)', badge: 'ONLINE' },
                      {
                        value: 'INACTIVE',
                        label: hasActiveNozzles ? 'Inactive (Locked: Active Nozzles Linked)' : 'Inactive (Disabled)',
                        badge: hasActiveNozzles ? 'LOCKED' : 'OFFLINE',
                      },
                      { value: 'MAINTENANCE', label: 'Under Maintenance', badge: 'MAINT' },
                    ]}
                    searchable={false}
                  />
                  {configForm.status === 'INACTIVE' && hasActiveNozzles && (
                    <p className="mt-1 text-[11px] text-rose-500 font-medium">
                      Cannot set to Inactive while active nozzle(s) (#{activeNozzles.map((n) => n.nozzleNumber).join(', ')}) are attached.
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Chamber / Tank Location:
                  </label>
                  <input
                    type="text"
                    disabled={!isEditingConfig}
                    value={configForm.location}
                    onChange={(e) => setConfigForm({ ...configForm, location: e.target.value })}
                    placeholder="e.g. Forecourt East Pit, Chamber #2"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white disabled:opacity-60"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Description & Safety Notes:
                  </label>
                  <textarea
                    disabled={!isEditingConfig}
                    value={configForm.description}
                    onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })}
                    rows={2}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-white disabled:opacity-60"
                  />
                </div>
              </div>

              {isEditingConfig && (
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditingConfig(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 disabled:opacity-50 transition shadow-xs"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Save className="h-4 w-4" />
                    Save Changes
                  </button>
                </div>
              )}
            </form>
          )}

          {/* SECTION 3: STOCK & CAPACITY */}
          {activeTab === 'stock' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-500" />
                  Non-Linear Cylindrical Tank Calibration
                </h3>
                <p className="text-xs text-slate-500">
                  Fuel storage uses horizontal cylindrical geometry. As depth increases, volume changes non-linearly according to the circular segment equation:
                  <code className="block mt-1 font-mono text-[11px] bg-slate-200 dark:bg-slate-900 p-2 rounded-lg">
                    Area = r² * cos⁻¹((r - h)/r) - (r - h) * √(2rh - h²)
                  </code>
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Current Dip (h)</span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white text-base">
                      {tank.currentDipCm} cm
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Calculated Volume</span>
                    <span className="font-bold font-mono text-emerald-600 text-base">
                      {tank.currentVolumeLiters.toLocaleString()} L
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase">Water Dip Line</span>
                    <span className="font-bold font-mono text-blue-500 text-base">
                      {tank.waterDipCm || 0.2} cm
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">Stock Ledger Enforcement</span>
                  <span className="text-slate-500 text-[11px]">
                    Direct manual overwrites of stock are disabled. All inventory adjustments occur strictly via verified Tanker Decanting or authenticated Dip reconciliation logs.
                  </span>
                </div>
                {onRecordDip && (
                  <button
                    type="button"
                    onClick={() => onRecordDip(tank)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-500 transition"
                  >
                    Record Dip
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SECTION 4: STOCK MOVEMENT HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Decanting Load & Fuel Receipt Logs ({detailedLoads.length})
                </h3>
                {onDecant && (
                  <button
                    type="button"
                    onClick={() => onDecant(tank)}
                    className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition"
                  >
                    Decant Load
                  </button>
                )}
              </div>

              {detailedLoads.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No tanker decanting records logged for this tank yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Date & Time</th>
                        <th className="p-3">Invoice No</th>
                        <th className="p-3">Tanker #</th>
                        <th className="p-3">Invoice Vol</th>
                        <th className="p-3">Received Vol</th>
                        <th className="p-3">Variance</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-center">Invoice Copy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {detailedLoads.map((load) => (
                        <tr key={load.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="p-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                            {new Date(load.timestamp).toLocaleString()}
                          </td>
                          <td className="p-3 font-medium text-slate-900 dark:text-white font-mono">
                            {load.invoiceNo}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300 font-mono">
                            {load.tankerNumber}
                          </td>
                          <td className="p-3 font-mono font-semibold">
                            {load.invoiceVolumeLiters.toLocaleString()} L
                          </td>
                          <td className="p-3 font-mono font-semibold text-emerald-600">
                            {load.receivedVolumeLiters.toLocaleString()} L
                          </td>
                          <td className="p-3 font-mono text-[11px]">
                            <span
                              className={
                                load.varianceLiters < 0
                                  ? 'text-rose-600'
                                  : load.varianceLiters > 0
                                  ? 'text-emerald-600'
                                  : 'text-slate-500'
                              }
                            >
                              {load.varianceLiters > 0 ? `+${load.varianceLiters}` : load.varianceLiters} L ({load.variancePct}%)
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                load.densityStatus === 'PASSED'
                                  ? 'bg-emerald-500/10 text-emerald-600'
                                  : 'bg-amber-500/10 text-amber-600'
                              }`}
                            >
                              {load.densityStatus}
                            </span>
                          </td>
                          <td className="p-3 text-center font-sans">
                            {load.invoiceImageUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewInvoice({
                                    url: load.invoiceImageUrl!,
                                    title: `Delivery Challan / Invoice: ${load.invoiceNo} (Tanker ${load.tankerNumber})`,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition cursor-pointer"
                                title="View uploaded delivery challan / invoice photo"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400">None</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: ASSOCIATED NOZZLES */}
          {activeTab === 'nozzles' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Dispenser Nozzles Linked to this Tank ({associatedNozzles.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Nozzles dispensing {tank.fuelCode} at {station.name}
                  </p>
                </div>
              </div>

              {associatedNozzles.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No dispenser nozzles currently configured for this fuel type at this station.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {associatedNozzles.map((noz) => (
                    <div
                      key={noz.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 space-y-2 hover:border-emerald-500/40 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                            {noz.id}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            Nozzle #{noz.nozzleNumber}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            noz.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-rose-500/10 text-rose-600'
                          }`}
                        >
                          {noz.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        <div>Totalizer: {noz.electronicTotalizer.toLocaleString()} L</div>
                        {noz.deviceIdentifier && <div>Hardware: {noz.deviceIdentifier}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 6: QR CODE */}
          {activeTab === 'qr' && (
            <div className="p-4 max-w-md mx-auto text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-xs font-black uppercase text-emerald-600 dark:text-emerald-400">
                <span>AG Fuels Asset Tag</span>
                <span>·</span>
                <span className="font-mono">{tank.id}</span>
              </div>

              <div className="mx-auto w-56 h-56 p-3 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white flex items-center justify-center shadow-inner">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt={`QR for ${tank.id}`} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xs text-slate-400">Generating QR...</span>
                )}
              </div>

              <div>
                <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                  {tank.id}
                </span>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {tank.name || `Tank #${tank.tankNumber}`} ({tank.fuelCode})
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">{station.name}</p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={copyId}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy ID
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.download = `${tank.id}-qrcode.png`;
                    link.href = qrDataUrl;
                    link.click();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition shadow-xs"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Card
                </button>
              </div>
            </div>
          )}

          {/* SECTION 7: AUDIT HISTORY */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Compliance & Immutable Audit Logs
                </h3>
                <p className="text-xs text-slate-500">
                  Authoritative timestamps and user attribution for all administrative actions on this tank
                </p>
              </div>

              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No historical audit logs recorded for this tank.
                </div>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 text-xs flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {log.action}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-400">
                          Actor: <span className="font-medium">{log.actorName}</span> ({log.actorId})
                        </div>
                        {log.detailsJson && (
                          <pre className="font-mono text-[10px] text-slate-500 bg-slate-200 dark:bg-slate-900 p-2 rounded max-w-xl overflow-x-auto">
                            {log.detailsJson}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={isDeactivateConfirmOpen}
        onClose={() => setIsDeactivateConfirmOpen(false)}
        onConfirm={handleDeactivate}
        title={tank.status === 'ACTIVE' ? 'Deactivate Tank?' : 'Re-activate Tank?'}
        message={`Are you sure you want to ${
          tank.status === 'ACTIVE' ? 'deactivate' : 'activate'
        } tank "${tank.name || tank.id}"? Inactive tanks cannot accept new decanting loads.`}
        confirmLabel={tank.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        variant={tank.status === 'ACTIVE' ? 'warning' : 'info'}
      />

      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Permanently Delete Tank?"
        message={
          hasActiveNozzles
            ? `Cannot delete tank "${tank.name || tank.id}" because it is linked to active nozzle(s) (#${activeNozzles.map((n) => n.nozzleNumber).join(', ')}). Please deactivate or reassign the nozzles before deleting this tank.`
            : hasDecantHistory
            ? `Cannot delete tank "${tank.name || tank.id}" because it has ${detailedLoads.length} historical decanting tanker delivery record(s). Deletion is permanently blocked to preserve fuel inventory audit history. Please deactivate the tank instead.`
            : `Are you sure you want to delete tank "${tank.name || tank.id}"? This action cannot be undone.`
        }
        confirmLabel={isDeletionBlocked ? 'Deletion Blocked' : 'Delete Tank'}
        variant="danger"
      />

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
    </ModalPortal>
  );
};
