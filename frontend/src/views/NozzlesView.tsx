import React, { useState, useRef } from 'react';
import {
  Station,
  Nozzle,
  Dispenser,
  FuelProduct,
  Tank,
  ManualMeterReading,
  UserRole,
} from '../types';
import {
  Fuel,
  Plus,
  Search,
  Sliders,
  Edit2,
  AlertTriangle,
  Building2,
  Clock,
  X,
  Gauge,
  History,
  Info,
  Loader2,
  AlertCircle,
  QrCode,
  ArrowLeft,
  CheckCircle2,
  Save,
  Layers,
  Database,
  Trash2,
} from 'lucide-react';
import { api } from '../api/client';
import { useNotification } from '../context/NotificationContext';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { QRCodeModal } from '../components/common/QRCodeModal';
import { ModalPortal } from '../components/common/ModalPortal';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import {
  validateNozzleForm,
  focusFirstInvalidField,
} from '../utils/validation';
import { SelectDropdown } from '../components/common/SelectDropdown';
import {
  getFuelDefinition,
  FUEL_SELECT_OPTIONS,
  normalizeFuelCode,
} from '../utils/fuelConfig';

interface NozzlesViewProps {
  stations: Station[];
  tanks?: Tank[];
  nozzles: Nozzle[];
  dispensers: Dispenser[];
  fuels: FuelProduct[];
  readings: ManualMeterReading[];
  currentRole: UserRole;
  currentStationId: string;
  onCreateNozzle: (payload: any) => Promise<void>;
  onUpdateNozzle: (id: string, payload: any) => Promise<void>;
  onUpdateNozzleStatus: (id: string, status: string) => Promise<void>;
  onDeleteNozzle?: (id: string) => Promise<void>;
  onSelectStation?: (id: string) => void;
  initialStationFilter?: string;
}

export const NozzlesView: React.FC<NozzlesViewProps> = ({
  stations,
  tanks = [],
  nozzles,
  dispensers,
  fuels,
  readings,
  currentRole,
  currentStationId,
  onCreateNozzle,
  onUpdateNozzle,
  onUpdateNozzleStatus,
  onDeleteNozzle,
  onSelectStation,
  initialStationFilter,
}) => {
  const { notifySuccess, notifyError, notifyValidation, notifyWarning } = useNotification();

  // In-page view mode ('LIST' or 'FORM')
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');

  // Filters & Search
  const [stationFilter, setStationFilter] = useState<string>(initialStationFilter || 'ALL');
  const [fuelFilter, setFuelFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Drawer
  const [editingNozzle, setEditingNozzle] = useState<Nozzle | null>(null);
  const [drawerNozzle, setDrawerNozzle] = useState<Nozzle | null>(null);
  const [statusConfirmNozzle, setStatusConfirmNozzle] = useState<{ nozzle: Nozzle; targetStatus: string } | null>(null);
  const [deletingNozzle, setDeletingNozzle] = useState<Nozzle | null>(null);
  const [blockedNozzleDelete, setBlockedNozzleDelete] = useState<{ nozzle: Nozzle; reason: string } | null>(null);
  const [qrNozzle, setQrNozzle] = useState<Nozzle | null>(null);

  // Form State & Validation
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    stationId: currentStationId || (stations[0]?.id || ''),
    tankId: '',
    nozzleNumber: '',
    name: '',
    fuelCode: 'OCTANE_95',
    dispenserId: '',
    deviceIdentifier: '',
    initialTotalizer: '0.00',
    status: 'ACTIVE',
    notes: '',
  });

  const canManageNozzles = currentRole === 'OWNER' || currentRole === 'MANAGER';

  // Filter nozzles based on role (Bunk Manager can only see assigned bunk nozzles)
  const accessibleNozzles = nozzles.filter((n) => {
    if (currentRole === 'OWNER') return true;
    return n.stationId === currentStationId;
  });

  const filteredNozzles = accessibleNozzles.filter((n) => {
    const matchesStation = stationFilter === 'ALL' || n.stationId === stationFilter;
    const matchesFuel = fuelFilter === 'ALL' || n.fuelCode === fuelFilter;
    const matchesStatus = statusFilter === 'ALL' || n.status === statusFilter;

    const parentStation = stations.find((s) => s.id === n.stationId);
    const stationName = parentStation ? parentStation.name.toLowerCase() : '';
    const nozzleName = (n.name || '').toLowerCase();
    const deviceId = (n.deviceIdentifier || '').toLowerCase();
    const query = searchTerm.toLowerCase();

    const matchesSearch =
      String(n.nozzleNumber).includes(query) ||
      nozzleName.includes(query) ||
      stationName.includes(query) ||
      deviceId.includes(query) ||
      n.fuelCode.toLowerCase().includes(query);

    return matchesStation && matchesFuel && matchesStatus && matchesSearch;
  });

  const openAddForm = (presetStationId?: string) => {
    const defaultStation = presetStationId || (stationFilter !== 'ALL' ? stationFilter : currentStationId) || (stations[0]?.id || '');
    const stationDisps = dispensers.filter((d) => d.stationId === defaultStation);
    const stationTanks = tanks.filter((t) => t.stationId === defaultStation);
    const firstTank = stationTanks[0];
    const stationNozzles = nozzles.filter((n) => n.stationId === defaultStation);
    const nextNozzleNum =
      stationNozzles.length > 0
        ? Math.max(...stationNozzles.map((n) => n.nozzleNumber || 0)) + 1
        : 1;
    const parentStation = stations.find((s) => s.id === defaultStation);

    setFormData({
      stationId: defaultStation,
      tankId: firstTank ? firstTank.id : '',
      nozzleNumber: String(nextNozzleNum),
      name: `Nozzle #${nextNozzleNum} (${firstTank ? firstTank.fuelCode : 'Fuel'})`,
      fuelCode: firstTank ? firstTank.fuelCode : (fuels[0]?.code || 'OCTANE_95'),
      dispenserId: stationDisps[0]?.id || '',
      deviceIdentifier: `NZ-${parentStation?.code || 'PUMP'}-${nextNozzleNum}`,
      initialTotalizer: '0.00',
      status: 'ACTIVE',
      notes: '',
    });
    setFieldErrors({});
    setEditingNozzle(null);
    setViewMode('FORM');
  };

  const openEditForm = (nozzle: Nozzle) => {
    setFormData({
      stationId: nozzle.stationId,
      tankId: (nozzle as any).tankId || '',
      nozzleNumber: String(nozzle.nozzleNumber),
      name: nozzle.name || '',
      fuelCode: nozzle.fuelCode,
      dispenserId: nozzle.dispenserId || '',
      deviceIdentifier: nozzle.deviceIdentifier || '',
      initialTotalizer: String(nozzle.electronicTotalizer || 0),
      status: nozzle.status || 'ACTIVE',
      notes: nozzle.notes || '',
    });
    setFieldErrors({});
    setEditingNozzle(nozzle);
    setViewMode('FORM');
  };

  const handleDeleteNozzleClick = (nz: Nozzle) => {
    // Business rule: Do not allow delete if any meter reading was registered or fuel has been dispensed
    const hasDispensed = (nz.electronicTotalizer ?? 0) > 0;
    if (hasDispensed) {
      setBlockedNozzleDelete({
        nozzle: nz,
        reason: `This nozzle has already dispensed ${nz.electronicTotalizer.toLocaleString()} L of fuel and has registered meter transactions. Under statutory petroleum regulations and fiscal audit standards, nozzles with operational transaction history cannot be purged. You may mark this nozzle INACTIVE instead.`,
      });
    } else {
      setDeletingNozzle(nz);
    }
  };

  const handleConfirmDeleteNozzle = async () => {
    if (!deletingNozzle) return;
    setIsSubmitting(true);
    try {
      if (onDeleteNozzle) {
        await onDeleteNozzle(deletingNozzle.id);
      } else {
        await api.deleteNozzle(deletingNozzle.id);
      }
      notifySuccess('Nozzle Deleted', `Nozzle #${deletingNozzle.nozzleNumber} was permanently removed.`);
      if (drawerNozzle && drawerNozzle.id === deletingNozzle.id) {
        setDrawerNozzle(null);
      }
      setDeletingNozzle(null);
    } catch (err: any) {
      notifyError('Delete Failed', err.message || 'Failed to delete nozzle.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStationChange = (newStationId: string) => {
    const stationDisps = dispensers.filter((d) => d.stationId === newStationId);
    const stationTanks = tanks.filter((t) => t.stationId === newStationId);
    const firstTank = stationTanks[0];
    const stationNozzles = nozzles.filter((n) => n.stationId === newStationId);
    const nextNozzleNum =
      stationNozzles.length > 0
        ? Math.max(...stationNozzles.map((n) => n.nozzleNumber || 0)) + 1
        : 1;
    const parentStation = stations.find((s) => s.id === newStationId);

    setFormData((prev) => ({
      ...prev,
      stationId: newStationId,
      tankId: firstTank ? firstTank.id : '',
      fuelCode: firstTank ? firstTank.fuelCode : prev.fuelCode,
      dispenserId: stationDisps[0]?.id || '',
      nozzleNumber: String(nextNozzleNum),
      deviceIdentifier: `NZ-${parentStation?.code || 'PUMP'}-${nextNozzleNum}`,
    }));
    if (fieldErrors.stationId) {
      setFieldErrors((prev) => ({ ...prev, stationId: '' }));
    }
  };

  const handleTankChange = (newTankId: string) => {
    const chosenTank = tanks.find((t) => t.id === newTankId);
    setFormData((prev) => ({
      ...prev,
      tankId: newTankId,
      // Authoritatively derive fuelCode from the chosen tank
      fuelCode: chosenTank ? chosenTank.fuelCode : prev.fuelCode,
    }));
    if (fieldErrors.tankId) {
      setFieldErrors((prev) => ({ ...prev, tankId: '' }));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // 1. Client-Side Validation & Tank relationship check
    const chosenTank = formData.tankId ? tanks.find((t) => t.id === formData.tankId) : undefined;
    const validation = validateNozzleForm({
      ...formData,
      tankFuelCode: chosenTank?.fuelCode,
    });
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      notifyValidation('Validation Error', 'Please complete all required fields correctly.');
      if (formRef.current) {
        focusFirstInvalidField(formRef.current);
      }
      return;
    }

    // 3. Uniqueness Check in current station
    const num = parseInt(formData.nozzleNumber, 10);
    const duplicate = nozzles.find(
      (n) =>
        n.stationId === formData.stationId &&
        n.nozzleNumber === num &&
        (!editingNozzle || n.id !== editingNozzle.id)
    );

    if (duplicate) {
      const err = `Nozzle #${num} already exists in this bunk. Please choose a unique nozzle number.`;
      setFieldErrors({ nozzleNumber: err });
      notifyError('Duplicate Nozzle', err);
      return;
    }

    setIsSubmitting(true);

    const payload = {
      stationId: formData.stationId,
      tankId: formData.tankId || undefined,
      nozzleNumber: num,
      name: formData.name.trim(),
      fuelCode: formData.fuelCode,
      dispenserId: formData.dispenserId || undefined,
      deviceIdentifier: formData.deviceIdentifier.trim(),
      mechanicalTotalizer: parseFloat(formData.initialTotalizer) || 0,
      electronicTotalizer: parseFloat(formData.initialTotalizer) || 0,
      status: formData.status,
      notes: formData.notes.trim(),
    };

    try {
      if (editingNozzle) {
        await onUpdateNozzle(editingNozzle.id, payload);
        notifySuccess('Nozzle Updated', `Nozzle #${payload.nozzleNumber} configuration updated successfully.`);
      } else {
        await onCreateNozzle(payload);
        const parentStation = stations.find((s) => s.id === payload.stationId);
        notifySuccess(
          'Nozzle Added',
          `Nozzle #${payload.nozzleNumber} (${payload.fuelCode}) mapped to ${parentStation?.name || 'station'}.`
        );
      }
      setStationFilter(payload.stationId);
      setFuelFilter('ALL');
      setStatusFilter('ALL');
      setSearchTerm('');
      setViewMode('LIST');
      setEditingNozzle(null);
    } catch (err: any) {
      setFieldErrors({ form: err.message || 'Failed to save nozzle.' });
      notifyError('Save Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyStatusChange = async () => {
    if (!statusConfirmNozzle) return;
    setIsSubmitting(true);
    try {
      await onUpdateNozzleStatus(statusConfirmNozzle.nozzle.id, statusConfirmNozzle.targetStatus);
      if (drawerNozzle && drawerNozzle.id === statusConfirmNozzle.nozzle.id) {
        setDrawerNozzle({
          ...drawerNozzle,
          status: statusConfirmNozzle.targetStatus,
        });
      }
      notifyWarning(
        'Status Changed',
        `Nozzle #${statusConfirmNozzle.nozzle.nozzleNumber} set to ${statusConfirmNozzle.targetStatus}. Historical transaction records remain safe.`
      );
      setStatusConfirmNozzle(null);
    } catch (err: any) {
      notifyError('Status Update Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recent readings for drawer
  const drawerReadings = drawerNozzle
    ? readings
        .filter((r) => r.nozzleId === drawerNozzle.id)
        .slice(0, 10)
    : [];

  const drawerStation = drawerNozzle ? stations.find((s) => s.id === drawerNozzle.stationId) : null;
  const drawerFuel = drawerNozzle ? fuels.find((f) => f.code === drawerNozzle.fuelCode) : null;

  // Selected station tanks for in-page form
  const formStationTanks = tanks.filter((t) => t.stationId === formData.stationId);
  const formSelectedTank = formStationTanks.find((t) => t.id === formData.tankId);
  const formFuel = fuels.find((f) => f.code === formData.fuelCode);

  if (stations.length === 0) {
    return (
      <div className="space-y-6 pb-12 sm:pb-6 animate-fadeIn">
        <Breadcrumbs
          items={[
            { label: 'Operations' },
            { label: 'Nozzles', isCurrent: true, icon: Fuel },
          ]}
        />
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <Fuel className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No Petrol Bunks Registered
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Please create your first petrol bunk station before setting up forecourt dispensers and nozzles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fadeIn pb-12">
      {/* View Mode: IN-PAGE FORM */}
      {viewMode === 'FORM' ? (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Breadcrumb Navigation & Top Action Bar */}
          <Breadcrumbs
            items={[
              { label: 'Management' },
              { label: 'Nozzles', onClick: () => setViewMode('LIST') },
              {
                label: editingNozzle ? `Edit Nozzle #${editingNozzle.nozzleNumber}` : 'Add Nozzle',
                isCurrent: true,
              },
            ]}
            actions={
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('LIST')}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-xs font-semibold cursor-pointer transition shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFormSubmit}
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#12544F] hover:bg-[#0E433F] text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 transition"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {editingNozzle ? 'Save Changes' : 'Create Nozzle'}
                </button>
              </div>
            }
          />

          {/* In-Page Form Body */}
          <form ref={formRef} onSubmit={handleFormSubmit} className="space-y-6">
            {fieldErrors.form && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2.5 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{fieldErrors.form}</span>
              </div>
            )}

            {/* Read-Only Entity Code Banner */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0D2926] border border-slate-200 dark:border-[#194C47] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Authoritative Nozzle Identifier:</span>
                <span className="font-mono font-bold text-[#12544F] dark:text-[#2BA096] bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  {editingNozzle ? editingNozzle.id : '(Generated exclusively by backend upon creation, e.g. NOZZ-000001)'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Identifiers are controlled authoritatively by backend code generator with collision safeguards.
              </span>
            </div>

            {/* SECTION 1: Forecourt Bunk & Subterranean Tank Hierarchy */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0D2926] border border-slate-200 dark:border-[#194C47] shadow-2xs space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Building2 className="w-4 h-4 text-[#12544F] dark:text-[#2BA096]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  1. Forecourt Asset Hierarchy & Fluid Routing
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Parent Bunk */}
                <div>
                  <SelectDropdown
                    label="Parent Fuel Bunk"
                    required
                    disabled={editingNozzle !== null}
                    placeholder="Select a parent bunk..."
                    options={stations.map((s) => ({
                      value: s.id,
                      label: `${s.name} (${s.code})`,
                      description: s.location,
                      badge: s.code,
                    }))}
                    value={formData.stationId}
                    onChange={(val) => handleStationChange(val)}
                    error={fieldErrors.stationId}
                    helpText="Every nozzle belongs strictly to exactly one bunk station."
                    searchable={stations.length > 4}
                  />
                </div>

                {/* 2. Subterranean Storage Tank */}
                <div>
                  <SelectDropdown
                    label="Subterranean Fuel Tank"
                    placeholder="Select feeder tank..."
                    options={[
                      { value: '', label: 'Unassigned / Direct Feed' },
                      ...formStationTanks.map((t) => ({
                        value: t.id,
                        label: `Tank #${t.tankNumber}: ${t.name || t.id}`,
                        description: `Grade: ${t.fuelCode} \u00B7 Cap: ${t.capacityLiters.toLocaleString()} L`,
                        badge: t.fuelCode,
                      })),
                    ]}
                    value={formData.tankId}
                    onChange={(val) => handleTankChange(val)}
                    helpText={
                      formStationTanks.length === 0
                        ? 'No tanks provisioned for this station. Add a tank in Tank Master.'
                        : 'Fuel type is strictly derived from the selected tank.'
                    }
                    searchable={formStationTanks.length > 4}
                  />
                </div>

                {/* 3. Derived Fuel Grade (or Selectable if direct feed) */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs">
                    Fuel Product Grade {formSelectedTank ? <span className="text-emerald-600">(Authoritative \u00B7 Locked to Tank)</span> : <span className="text-amber-600">(Select Grade)</span>}
                  </label>
                  {formSelectedTank ? (
                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{
                          backgroundColor: getFuelDefinition(formData.fuelCode).color,
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-slate-900 dark:text-white block truncate">
                          {getFuelDefinition(formData.fuelCode).name}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          Derived from Tank #{formSelectedTank.tankNumber}: {formSelectedTank.name}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        LOCKED
                      </span>
                    </div>
                  ) : (
                    <SelectDropdown
                      options={FUEL_SELECT_OPTIONS}
                      value={formData.fuelCode}
                      onChange={(val) => setFormData({ ...formData, fuelCode: val })}
                      searchable={false}
                    />
                  )}
                  {fieldErrors.fuelCode && (
                    <p className="mt-1 text-[11px] text-rose-500 font-medium">{fieldErrors.fuelCode}</p>
                  )}
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Fuel type is strictly bound to the physical storage tank to prevent contamination.
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 2: Physical Hardware & Meter Configuration */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0D2926] border border-slate-200 dark:border-[#194C47] shadow-2xs space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Gauge className="w-4 h-4 text-[#12544F] dark:text-[#2BA096]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  2. Dispenser Hardware, Metering & Registers
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 text-xs">
                {/* Nozzle Number */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Nozzle Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    name="nozzleNumber"
                    aria-invalid={Boolean(fieldErrors.nozzleNumber)}
                    placeholder="e.g. 1"
                    value={formData.nozzleNumber}
                    onChange={(e) => {
                      setFormData({ ...formData, nozzleNumber: e.target.value });
                      if (fieldErrors.nozzleNumber) setFieldErrors((p) => ({ ...p, nozzleNumber: '' }));
                    }}
                    className={`w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-hidden ${
                      fieldErrors.nozzleNumber
                        ? 'border-rose-500 focus:ring-2 focus:ring-rose-500'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-[#12544F]'
                    }`}
                  />
                  {fieldErrors.nozzleNumber ? (
                    <p className="mt-1 text-[11px] text-rose-500 font-medium">{fieldErrors.nozzleNumber}</p>
                  ) : (
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      Must be unique within the selected bunk station.
                    </span>
                  )}
                </div>

                {/* Dispenser */}
                <div>
                  <SelectDropdown
                    label="Dispenser / MPD Unit"
                    options={[
                      { value: '', label: 'Auto Assign (Standard Dispenser)' },
                      ...dispensers
                        .filter((d) => d.stationId === formData.stationId)
                        .map((d) => ({
                          value: d.id,
                          label: `Dispenser #${d.dispenserNumber} (Island ${d.islandNumber})`,
                          description: d.brand,
                        })),
                    ]}
                    value={formData.dispenserId}
                    onChange={(val) => setFormData({ ...formData, dispenserId: val })}
                    searchable={false}
                  />
                </div>

                {/* Device Identifier */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Meter / Hardware Device ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NZ-01 / DEV-01"
                    value={formData.deviceIdentifier}
                    onChange={(e) => setFormData({ ...formData, deviceIdentifier: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono focus:outline-hidden focus:ring-2 focus:ring-[#12544F]"
                  />
                </div>

                {/* Label / Name */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Nozzle Label / Display Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Island 1 Front - High Flow 95 Octane"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#12544F]"
                  />
                </div>

                {/* Status */}
                <div>
                  <SelectDropdown
                    label="Operational Status"
                    options={[
                      { value: 'ACTIVE', label: 'Active (Dispensing)', badge: 'ACTIVE' },
                      { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance', badge: 'MAINTENANCE' },
                      { value: 'INACTIVE', label: 'Inactive (Decommissioned)', badge: 'INACTIVE' },
                    ]}
                    value={formData.status}
                    onChange={(val) => setFormData({ ...formData, status: val })}
                    searchable={false}
                  />
                </div>

                {/* Initial Totalizer */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Cumulative Totalizer Reading (Liters) <span className="text-emerald-600 font-normal">(Locked \u00B7 Initial Register)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled
                    value={formData.initialTotalizer}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-mono cursor-not-allowed focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Starts at 0.00 L. Meter advances only via authorized forecourt dispensing and verified meter logs.
                  </span>
                </div>

                {/* Notes */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Calibration Notes & Stamping Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Calibrated with 5L standard test measure on previous shift..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-[#12544F]"
                  />
                </div>
              </div>

              {/* Form Footer Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode('LIST')}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#12544F] hover:bg-[#0E433F] text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 transition"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {editingNozzle ? 'Save Changes' : 'Create Nozzle'}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        /* View Mode: NOZZLE LIST */
        <>
          {/* Breadcrumb Navigation & Action Bar */}
          <Breadcrumbs
            items={[
              { label: 'Management' },
              { label: 'Nozzles', isCurrent: true, icon: Fuel },
            ]}
            actions={
              canManageNozzles && (
                <button
                  type="button"
                  onClick={() => openAddForm()}
                  className="px-4 py-2 rounded-xl bg-[#12544F] hover:bg-[#0E433F] text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs transition shrink-0 self-start sm:self-center"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Nozzle</span>
                </button>
              )
            }
          />

          {/* Filter and Search Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0D2926] border border-slate-200 dark:border-[#194C47] shadow-2xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search nozzles or devices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#12544F]"
                />
              </div>

              {/* Station Filter */}
              {currentRole === 'OWNER' && (
                <div className="min-w-[200px]">
                  <SelectDropdown
                    options={[
                      { value: 'ALL', label: 'All Bunks / Stations' },
                      ...stations.map((s) => ({
                        value: s.id,
                        label: `${s.name} (${s.code})`,
                      })),
                    ]}
                    value={stationFilter}
                    onChange={(val) => setStationFilter(val)}
                    placeholder="Filter by bunk..."
                    searchable={stations.length > 5}
                  />
                </div>
              )}

              {/* Fuel Grade Filter */}
              <div>
                <SelectDropdown
                  options={[
                    { value: 'ALL', label: 'All Fuel Types' },
                    ...FUEL_SELECT_OPTIONS.map((f) => ({
                      value: f.value,
                      label: f.label,
                      badge: f.badge,
                      badgeClass: f.badgeClass,
                    })),
                  ]}
                  value={fuelFilter}
                  onChange={(val) => setFuelFilter(val)}
                  placeholder="Filter by fuel..."
                  searchable={false}
                />
              </div>

              {/* Status Filter */}
              <div>
                <SelectDropdown
                  options={[
                    { value: 'ALL', label: 'All Statuses' },
                    { value: 'ACTIVE', label: 'Active Only' },
                    { value: 'UNDER_MAINTENANCE', label: 'Maintenance Only' },
                    { value: 'INACTIVE', label: 'Inactive Only' },
                  ]}
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  placeholder="Filter by status..."
                  searchable={false}
                />
              </div>
            </div>

            {/* Active Filters Summary */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>
                Showing <strong>{filteredNozzles.length}</strong> of <strong>{accessibleNozzles.length}</strong> nozzles
              </span>
              {(stationFilter !== 'ALL' || fuelFilter !== 'ALL' || statusFilter !== 'ALL' || searchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setStationFilter('ALL');
                    setFuelFilter('ALL');
                    setStatusFilter('ALL');
                    setSearchTerm('');
                  }}
                  className="text-xs text-[#12544F] dark:text-[#2BA096] hover:underline cursor-pointer"
                >
                  Reset all filters
                </button>
              )}
            </div>
          </div>

          {/* Nozzles Table */}
          <div className="rounded-2xl border border-slate-200 dark:border-[#194C47] bg-white dark:bg-[#0D2926] shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Nozzle</th>
                    <th className="py-3 px-4">Parent Bunk</th>
                    <th className="py-3 px-4">Fuel Product</th>
                    <th className="py-3 px-4">Dispenser</th>
                    <th className="py-3 px-4 text-right">Electronic Totalizer</th>
                    <th className="py-3 px-4 text-right">Mechanical Totalizer</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredNozzles.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Fuel className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                        <p className="font-medium text-slate-600 dark:text-slate-300">No dispensing nozzles found.</p>
                        <p className="text-[11px] mt-0.5">Try adjusting your filters or search keywords.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredNozzles.map((nozzle) => {
                      const station = stations.find((s) => s.id === nozzle.stationId);
                      const fuel = fuels.find((f) => f.code === nozzle.fuelCode);
                      const dispenser = dispensers.find((d) => d.id === nozzle.dispenserId);

                      return (
                        <tr
                          key={nozzle.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Nozzle Number & ID */}
                          <td className="py-3 px-4 font-mono">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-[#12544F] dark:text-[#2BA096] font-bold text-xs">
                                #{nozzle.nozzleNumber}
                              </span>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-slate-100 block font-sans">
                                  {nozzle.name || `Nozzle ${nozzle.nozzleNumber}`}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  {nozzle.id} \u00B7 {nozzle.deviceIdentifier || `NZ-${nozzle.nozzleNumber}`}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Parent Station */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {station?.name || nozzle.stationId}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {station?.code}
                            </span>
                          </td>

                          {/* Fuel Product */}
                          <td className="py-3 px-4">
                            {(() => {
                              const fuelDef = getFuelDefinition(nozzle.fuelCode);
                              return (
                                <span
                                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                                  style={{
                                    backgroundColor: `${fuelDef.color}15`,
                                    borderColor: `${fuelDef.color}35`,
                                    color: fuelDef.color,
                                  }}
                                >
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: fuelDef.color }}
                                  />
                                  {fuelDef.name}
                                </span>
                              );
                            })()}
                          </td>

                          {/* Dispenser */}
                          <td className="py-3 px-4">
                            <span className="text-slate-700 dark:text-slate-300">
                              {dispenser
                                ? `Dispenser #${dispenser.dispenserNumber} (Island ${dispenser.islandNumber})`
                                : 'Standard Dispenser'}
                            </span>
                          </td>

                          {/* Electronic Totalizer */}
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {nozzle.electronicTotalizer.toLocaleString()} L
                          </td>

                          {/* Mechanical Totalizer */}
                          <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                            {nozzle.mechanicalTotalizer.toLocaleString()} L
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                nozzle.status === 'ACTIVE'
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                  : nozzle.status === 'UNDER_MAINTENANCE'
                                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {nozzle.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* QR Code Action */}
                              <button
                                type="button"
                                onClick={() => setQrNozzle(nozzle)}
                                title="Generate Nozzle QR Code"
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                              </button>

                              {/* Drawer Inspect Action */}
                              <button
                                type="button"
                                onClick={() => setDrawerNozzle(nozzle)}
                                className="px-2.5 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer font-medium transition"
                              >
                                Details
                              </button>

                              {/* Edit Action */}
                              {canManageNozzles && (
                                <button
                                  type="button"
                                  onClick={() => openEditForm(nozzle)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
                                  title="Edit Nozzle"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Status Toggle */}
                              {canManageNozzles && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextStatus = nozzle.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                                    setStatusConfirmNozzle({ nozzle, targetStatus: nextStatus });
                                  }}
                                  className={`px-2 py-0.5 text-[11px] rounded font-semibold cursor-pointer ${
                                    nozzle.status === 'ACTIVE'
                                      ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                      : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                  }`}
                                >
                                  {nozzle.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                </button>
                              )}

                              {/* Delete Action */}
                              {canManageNozzles && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteNozzleClick(nozzle)}
                                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition"
                                  title="Delete Nozzle"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Nozzle Configuration & Details Drawer (Wrapped in ModalPortal) */}
      {drawerNozzle && (
        <ModalPortal
          isOpen={Boolean(drawerNozzle)}
          onClose={() => setDrawerNozzle(null)}
          ariaLabel={`Nozzle #${drawerNozzle.nozzleNumber} Details`}
          className="h-full max-w-none flex justify-end !p-0"
        >
          <div className="w-full max-w-md h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold font-mono shrink-0">
                  #{drawerNozzle.nozzleNumber}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {drawerNozzle.name || `Nozzle ${drawerNozzle.nozzleNumber}`}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">
                    {drawerStation?.name || drawerNozzle.stationId} ({drawerStation?.code})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerNozzle(null)}
                className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white shadow-xs transition cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4 text-white stroke-[2.5]" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* Status Banner */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Operational Status</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {drawerNozzle.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold text-white"
                    style={{ backgroundColor: drawerFuel?.color || '#10b981' }}
                  >
                    {drawerNozzle.fuelCode}
                  </span>
                </div>
              </div>

              {/* Hardware Connection Card */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-xs">
                  <Gauge className="w-4 h-4 text-emerald-600" />
                  Hardware & Dispenser Connection
                </h4>
                <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Parent Bunk</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {drawerStation?.name} ({drawerStation?.code})
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Device ID</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {drawerNozzle.deviceIdentifier || 'NZ-' + drawerNozzle.nozzleNumber}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">Electronic Totalizer</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {drawerNozzle.electronicTotalizer.toLocaleString()} L
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500 dark:text-slate-400">Mechanical Totalizer</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {drawerNozzle.mechanicalTotalizer.toLocaleString()} L
                    </span>
                  </div>
                </div>
              </div>

              {/* Recent Meter Readings Log */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-xs">
                  <History className="w-4 h-4 text-emerald-600" />
                  Historical Meter Readings ({drawerReadings.length})
                </h4>
                {drawerReadings.length === 0 ? (
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-center text-slate-400">
                    No meter readings recorded for this nozzle yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {drawerReadings.map((r) => (
                      <div
                        key={r.id}
                        className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">
                            {new Date(r.readingTimestamp).toLocaleString()}
                          </span>
                          <span className="font-mono font-bold text-emerald-600">
                            +{r.netSoldLiters.toLocaleString()} L
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-600 dark:text-slate-400">
                          <span>Opening: {r.openingMeter?.toLocaleString() ?? 0}</span>
                          <span>Closing: {r.closingMeter?.toLocaleString() ?? 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Drawer Bottom Actions */}
              {canManageNozzles && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/30">
                  <button
                    type="button"
                    onClick={() => {
                      const nz = drawerNozzle;
                      setDrawerNozzle(null);
                      openEditForm(nz);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Nozzle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteNozzleClick(drawerNozzle)}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Nozzle</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Status Confirmation Modal using Common Component */}
      <ConfirmationModal
        isOpen={Boolean(statusConfirmNozzle)}
        onClose={() => setStatusConfirmNozzle(null)}
        onConfirm={handleApplyStatusChange}
        title={`Change Nozzle #${statusConfirmNozzle?.nozzle.nozzleNumber} Status`}
        message={
          <div>
            <p>
              Are you sure you want to change status of <strong>Nozzle #{statusConfirmNozzle?.nozzle.nozzleNumber}</strong> ({statusConfirmNozzle?.nozzle.fuelCode}) to{' '}
              <strong className="text-slate-900 dark:text-slate-100">{statusConfirmNozzle?.targetStatus}</strong>?
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Historical transactions and meter totalizer registers remain completely preserved in the database.
            </p>
          </div>
        }
        variant={statusConfirmNozzle?.targetStatus === 'ACTIVE' ? 'info' : 'warning'}
        confirmLabel={`Confirm ${statusConfirmNozzle?.targetStatus}`}
        isLoading={isSubmitting}
      />

      {/* Blocked Nozzle Deletion Modal (Forecourt Compliance Warning) */}
      {blockedNozzleDelete && (
        <ModalPortal
          isOpen={Boolean(blockedNozzleDelete)}
          onClose={() => setBlockedNozzleDelete(null)}
          ariaLabel="Nozzle Deletion Blocked"
          zIndex={9999}
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 my-auto mx-auto text-slate-900 dark:text-gray-100">
            <button
              type="button"
              onClick={() => setBlockedNozzleDelete(null)}
              className="absolute top-0 right-0 flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-tr-2xl rounded-bl-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white transition cursor-pointer z-10"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-white stroke-[2.5]" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Cannot Delete Nozzle #{blockedNozzleDelete.nozzle.nozzleNumber}
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  {blockedNozzleDelete.nozzle.fuelCode} \u00B7 Totalizer: {blockedNozzleDelete.nozzle.electronicTotalizer.toLocaleString()} L
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
              {blockedNozzleDelete.reason}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setBlockedNozzleDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => {
                  const nz = blockedNozzleDelete.nozzle;
                  setBlockedNozzleDelete(null);
                  setStatusConfirmNozzle({ nozzle: nz, targetStatus: 'INACTIVE' });
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white cursor-pointer shadow-xs"
              >
                Deactivate Nozzle Instead
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Confirm Permanent Delete Nozzle Modal (Allowed only when 0 dispensed & no readings) */}
      {deletingNozzle && (
        <ModalPortal
          isOpen={Boolean(deletingNozzle)}
          onClose={() => setDeletingNozzle(null)}
          ariaLabel="Confirm Delete Nozzle"
          zIndex={9999}
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 my-auto mx-auto text-slate-900 dark:text-gray-100">
            <button
              type="button"
              onClick={() => setDeletingNozzle(null)}
              className="absolute top-0 right-0 flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-tr-2xl rounded-bl-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white transition cursor-pointer z-10"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-white stroke-[2.5]" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Delete Nozzle #{deletingNozzle.nozzleNumber}?
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  {deletingNozzle.fuelCode} \u00B7 Totalizer: 0.00 L
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This nozzle has never dispensed fuel and has no registered meter transactions. It will be permanently removed from this bunk station.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingNozzle(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmDeleteNozzle}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Nozzle QR Code Modal */}
      {qrNozzle && (
        <QRCodeModal
          isOpen={Boolean(qrNozzle)}
          onClose={() => setQrNozzle(null)}
          entityType="NOZZLE"
          entityId={qrNozzle.id}
          entityName={qrNozzle.name || `Nozzle #${qrNozzle.nozzleNumber}`}
          subtitle={`${stations.find((s) => s.id === qrNozzle.stationId)?.name || 'Bunk'} \u00B7 ${getFuelDefinition(qrNozzle.fuelCode).name}`}
          parentBunkName={stations.find((s) => s.id === qrNozzle.stationId)?.name}
          fuelCode={qrNozzle.fuelCode}
          fuelColor={getFuelDefinition(qrNozzle.fuelCode).color}
        />
      )}
    </div>
  );
};
