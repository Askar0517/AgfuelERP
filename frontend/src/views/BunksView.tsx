import React, { useState, useRef } from 'react';
import {
  Station,
  Nozzle,
  Tank,
  Employee,
  FuelProduct,
  Shift,
  UserRole,
  Dispenser,
} from '../types';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Phone,
  Mail,
  Clock,
  Edit2,
  Sliders,
  ArrowLeft,
  Fuel,
  Users,
  Layers,
  Activity,
  X,
  Sparkles,
  Loader2,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  XCircle,
  Droplets,
  Trash2,
  QrCode,
  Eye,
  ArrowDownToLine,
} from 'lucide-react';
import { api } from '../api/client';
import { useNotification } from '../context/NotificationContext';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { QRCodeModal } from '../components/common/QRCodeModal';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { AddTankModal } from '../components/tanks/AddTankModal';
import { TankDetailsModal } from '../components/tanks/TankDetailsModal';
import {
  validateBunkForm,
  validateNozzleForm,
  focusFirstInvalidField,
} from '../utils/validation';
import { BunkFormPage } from '../components/bunks/BunkFormPage';
import { CylindricalTank } from '../components/CylindricalTank';
import { SelectDropdown } from '../components/common/SelectDropdown';
import { ModalPortal } from '../components/common/ModalPortal';
import {
  getFuelDefinition,
  FUEL_SELECT_OPTIONS,
  normalizeFuelCode,
} from '../utils/fuelConfig';

interface BunksViewProps {
  stations: Station[];
  nozzles: Nozzle[];
  tanks: Tank[];
  dispensers?: Dispenser[];
  employees: Employee[];
  fuels: FuelProduct[];
  shifts: Shift[];
  currentRole: UserRole;
  currentStationId: string;
  onSelectStation: (id: string) => void;
  onCreateBunk: (payload: any) => Promise<void>;
  onUpdateBunk: (id: string, payload: any) => Promise<void>;
  onDeactivateBunk: (id: string) => Promise<void>;
  onDeleteBunk?: (id: string) => Promise<void>;
  onCreateTank?: (payload: any) => Promise<void>;
  onUpdateTank?: (id: string, payload: any) => Promise<void>;
  onDeactivateTank?: (id: string, status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE') => Promise<void>;
  onDeleteTank?: (id: string) => Promise<void>;
  onRecordDip?: (tank: Tank) => void;
  onDecant?: (tank: Tank) => void;
  onCreateNozzle?: (payload: any) => Promise<void>;
  onUpdateNozzle?: (id: string, payload: any) => Promise<void>;
  onUpdateNozzleStatus?: (id: string, status: string) => Promise<void>;
  onDeleteNozzle?: (id: string) => Promise<void>;
  onNavigateToNozzles?: (stationId?: string) => void;
  onOpenAddNozzleModal?: (stationId: string) => void;
}

export const BunksView: React.FC<BunksViewProps> = ({
  stations,
  nozzles,
  tanks,
  dispensers = [],
  employees,
  fuels,
  shifts,
  currentRole,
  currentStationId,
  onSelectStation,
  onCreateBunk,
  onUpdateBunk,
  onDeactivateBunk,
  onDeleteBunk,
  onCreateTank,
  onUpdateTank,
  onDeactivateTank,
  onDeleteTank,
  onRecordDip,
  onDecant,
  onCreateNozzle,
  onUpdateNozzle,
  onUpdateNozzleStatus,
  onDeleteNozzle,
  onNavigateToNozzles,
  onOpenAddNozzleModal,
}) => {
  const { notifySuccess, notifyError, notifyValidation, notifyWarning } = useNotification();

  // Navigation / Detailed view state
  const [selectedBunkId, setSelectedBunkId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'tanks' | 'nozzles' | 'staff' | 'configuration'>('overview');

  // Search & Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals & Forms & Page Navigation
  const [viewMode, setViewMode] = useState<'LIST' | 'ADD' | 'EDIT'>('LIST');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [deactivatingStation, setDeactivatingStation] = useState<Station | null>(null);
  const [deletingStation, setDeletingStation] = useState<Station | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Tank Management state
  const [selectedTankForDetails, setSelectedTankForDetails] = useState<Tank | null>(null);
  const [tankModalInitialTab, setTankModalInitialTab] = useState<
    'overview' | 'config' | 'stock' | 'history' | 'nozzles' | 'qr' | 'audit'
  >('overview');
  const [isAddTankModalOpen, setIsAddTankModalOpen] = useState(false);

  // QR Code Modal State (supports Bunk, Tank, Nozzle)
  const [qrModalEntity, setQrModalEntity] = useState<{
    type: 'BUNK' | 'TANK' | 'NOZZLE';
    id: string;
    name: string;
    subtitle?: string;
    parentBunkName?: string;
    fuelCode?: string;
    fuelColor?: string;
    additionalDetails?: Record<string, string | number>;
  } | null>(null);

  // Inline Nozzle Management within Bunk Details -> Nozzles tab
  const [isAddNozzleModalOpen, setIsAddNozzleModalOpen] = useState(false);
  const [editingNozzle, setEditingNozzle] = useState<Nozzle | null>(null);
  const [deactivatingNozzle, setDeactivatingNozzle] = useState<{ nozzle: Nozzle; targetStatus: string } | null>(null);
  const [deletingNozzle, setDeletingNozzle] = useState<Nozzle | null>(null);
  const [blockedNozzleDelete, setBlockedNozzleDelete] = useState<{ nozzle: Nozzle; reason: string } | null>(null);
  const [nozzleFieldErrors, setNozzleFieldErrors] = useState<Record<string, string>>({});
  const [nozzleFormData, setNozzleFormData] = useState({
    nozzleNumber: '',
    name: '',
    fuelCode: 'OCTANE_95',
    tankId: '',
    dispenserId: '',
    deviceIdentifier: '',
    initialTotalizer: '0.00',
    status: 'ACTIVE',
    notes: '',
  });

  const formRef = useRef<HTMLFormElement>(null);
  const nozzleFormRef = useRef<HTMLFormElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    cityState: '',
    postalCode: '',
    phone: '',
    email: '',
    latitude: '',
    longitude: '',
    managerId: '',
    managerName: '',
    operatingHours: '24_HOURS',
    timezone: 'Asia/Kolkata',
    eodCloseTime: '23:59',
    status: 'ONLINE',
    notes: '',
  });

  const eligibleManagers = employees.filter(
    (e) => (e.isActive || e.status === 'ACTIVE') && (e.role === 'MANAGER' || e.role === 'OWNER')
  );

  const supportedTimezones = [
    { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST +05:30) \u00B7 India Standard Time' },
    { value: 'Asia/Dubai', label: 'Asia/Dubai (GST +04:00) \u00B7 Gulf Standard Time' },
    { value: 'Asia/Riyadh', label: 'Asia/Riyadh (AST +03:00) \u00B7 Arabia Standard Time' },
    { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT +08:00) \u00B7 Singapore Standard Time' },
    { value: 'Europe/London', label: 'Europe/London (GMT/BST +00:00/+01:00) \u00B7 UK Standard Time' },
    { value: 'America/New_York', label: 'America/New_York (EST/EDT -05:00/-04:00) \u00B7 US Eastern Time' },
    { value: 'UTC', label: 'UTC (UTC +00:00) \u00B7 Coordinated Universal Time' },
  ];

  const canManageBunks = currentRole === 'OWNER';
  const canEditBunk = currentRole === 'OWNER' || currentRole === 'MANAGER';

  // Filter stations based on role permissions (Bunk Manager can only view assigned bunks)
  const accessibleStations = stations.filter((s) => {
    if (currentRole === 'OWNER') return true;
    if (currentRole === 'MANAGER') return s.id === currentStationId;
    return s.id === currentStationId;
  });

  const filteredStations = accessibleStations.filter((s) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      (s.name || '').toLowerCase().includes(search) ||
      (s.code || '').toLowerCase().includes(search) ||
      (s.location || s.address || '').toLowerCase().includes(search) ||
      (s.managerName || '').toLowerCase().includes(search);

    const isStationActive = s.status === 'ONLINE' || s.status === 'ACTIVE';
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && isStationActive) ||
      (statusFilter === 'INACTIVE' && !isStationActive);

    return matchesSearch && matchesStatus;
  });

  const activeBunk = stations.find((s) => s.id === selectedBunkId);
  const bunkNozzles = activeBunk ? nozzles.filter((n) => n.stationId === activeBunk.id) : [];
  const bunkTanks = activeBunk ? tanks.filter((t) => t.stationId === activeBunk.id) : [];
  const bunkEmployees = activeBunk ? employees.filter((e) => e.stationId === activeBunk.id) : [];
  const bunkShifts = activeBunk ? shifts.filter((s) => s.stationId === activeBunk.id) : [];

  const totalStoredVolume = bunkTanks.reduce((s, t) => s + t.currentVolumeLiters, 0);
  const totalTankCapacity = bunkTanks.reduce((s, t) => s + t.capacityLiters, 0);
  const occupancyPct = totalTankCapacity > 0 ? Math.round((totalStoredVolume / totalTankCapacity) * 100) : 0;
  const isOnline = activeBunk ? (activeBunk.status === 'ONLINE' || activeBunk.status === 'ACTIVE') : false;

  const openAddModal = () => {
    setEditingStation(null);
    setSelectedBunkId(null);
    setViewMode('ADD');
  };

  const openEditModal = (station: Station) => {
    setEditingStation(station);
    setSelectedBunkId(null);
    setViewMode('EDIT');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Centralized validation check
    const validation = validateBunkForm({
      name: formData.name,
      code: formData.code,
      address: formData.address,
      cityState: formData.cityState,
      postalCode: formData.postalCode,
      phone: formData.phone,
      email: formData.email,
      latitude: formData.latitude,
      longitude: formData.longitude,
      managerName: formData.managerName,
      operatingHours: formData.operatingHours,
    });

    // Check duplicate code client-side
    const codeClean = formData.code.trim().toUpperCase();
    const isDup = stations.some(
      (s) => s.code.toUpperCase() === codeClean && (!editingStation || s.id !== editingStation.id)
    );
    if (isDup) {
      validation.errors.code = `A bunk with code "${codeClean}" already exists.`;
      validation.isValid = false;
    }

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      notifyValidation(
        'Validation Errors',
        'Please correct the highlighted fields before saving.',
        Object.values(validation.errors)
      );
      setTimeout(() => focusFirstInvalidField(formRef.current), 50);
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});

    const payload = {
      name: formData.name.trim(),
      code: codeClean,
      address: formData.address.trim(),
      cityState: formData.cityState.trim(),
      postalCode: formData.postalCode.trim(),
      phone: formData.phone.trim() || '+91 90000 00000',
      email: formData.email.trim(),
      latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
      longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      managerId: formData.managerId || undefined,
      managerName: formData.managerName.trim() || 'Unassigned',
      operatingHours: formData.operatingHours,
      timezone: formData.timezone || 'Asia/Kolkata',
      eodCloseTime: formData.eodCloseTime || '23:59',
      status: formData.status,
      notes: formData.notes.trim(),
      location: formData.cityState.trim() || formData.address.trim() || 'Forecourt Zone',
    };

    try {
      if (editingStation) {
        await onUpdateBunk(editingStation.id, payload);
        notifySuccess('Bunk Updated', `Successfully updated configuration for "${payload.name}".`);
      } else {
        await onCreateBunk(payload);
        notifySuccess('Bunk Created', `Fuel bunk "${payload.name}" (${payload.code}) provisioned in database.`);
      }
      setIsAddModalOpen(false);
      setEditingStation(null);
    } catch (err: any) {
      setFieldErrors({ form: err.message || 'Failed to save bunk configuration.' });
      notifyError('Save Failed', err.message || 'Database error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingStation) return;
    setIsSubmitting(true);
    try {
      await onDeactivateBunk(deactivatingStation.id);
      notifyWarning(
        'Bunk Deactivated',
        `Bunk "${deactivatingStation.name}" (${deactivatingStation.code}) has been set to Inactive. Historical transactions remain preserved.`
      );
      setDeactivatingStation(null);
    } catch (err: any) {
      notifyError('Deactivation Failed', err.message || 'Failed to deactivate bunk.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteStation = async () => {
    if (!deletingStation || !onDeleteBunk) return;
    setIsSubmitting(true);
    try {
      await onDeleteBunk(deletingStation.id);
      notifySuccess('Bunk Deleted', `Bunk "${deletingStation.name}" (${deletingStation.code}) was permanently deleted.`);
      if (selectedBunkId === deletingStation.id) {
        setSelectedBunkId(null);
      }
      setDeletingStation(null);
    } catch (err: any) {
      notifyError('Delete Failed', err.message || 'Failed to delete bunk.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open inline Add Nozzle modal locked to active bunk
  const openInlineAddNozzle = () => {
    if (!activeBunk) return;
    const stationDisps = dispensers.filter((d) => d.stationId === activeBunk.id);
    const stationTanks = tanks.filter((t) => t.stationId === activeBunk.id);
    const defaultTank = stationTanks[0];
    const stationNozzles = nozzles.filter((n) => n.stationId === activeBunk.id);
    const nextNozzleNum =
      stationNozzles.length > 0
        ? Math.max(...stationNozzles.map((n) => n.nozzleNumber || 0)) + 1
        : 1;

    setNozzleFormData({
      nozzleNumber: String(nextNozzleNum),
      name: `Nozzle #${nextNozzleNum} (${defaultTank ? defaultTank.fuelCode : 'Fuel'})`,
      fuelCode: defaultTank ? defaultTank.fuelCode : (fuels[0]?.code || 'OCTANE_95'),
      tankId: defaultTank ? defaultTank.id : '',
      dispenserId: stationDisps[0]?.id || '',
      deviceIdentifier: `NZ-${activeBunk.code || 'BUNK'}-${nextNozzleNum}`,
      initialTotalizer: '0.00',
      status: 'ACTIVE',
      notes: '',
    });
    setNozzleFieldErrors({});
    setEditingNozzle(null);
    setIsAddNozzleModalOpen(true);
  };

  const openInlineEditNozzle = (nz: Nozzle) => {
    setNozzleFormData({
      nozzleNumber: String(nz.nozzleNumber),
      name: nz.name || '',
      fuelCode: nz.fuelCode,
      tankId: nz.tankId || '',
      dispenserId: nz.dispenserId || '',
      deviceIdentifier: nz.deviceIdentifier || '',
      initialTotalizer: String(nz.electronicTotalizer || 0),
      status: nz.status,
      notes: nz.notes || '',
    });
    setNozzleFieldErrors({});
    setEditingNozzle(nz);
    setIsAddNozzleModalOpen(true);
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
      notifySuccess('Nozzle Deleted', `Nozzle #${deletingNozzle.nozzleNumber} (${deletingNozzle.fuelCode}) was permanently removed.`);
      setDeletingNozzle(null);
    } catch (err: any) {
      notifyError('Delete Failed', err.message || 'Failed to delete nozzle.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInlineNozzleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBunk) return;

    const validation = validateNozzleForm({
      stationId: activeBunk.id,
      nozzleNumber: nozzleFormData.nozzleNumber,
      fuelCode: nozzleFormData.fuelCode,
      initialTotalizer: nozzleFormData.initialTotalizer,
    });

    // Check duplicate nozzle number within this specific bunk
    const num = parseInt(nozzleFormData.nozzleNumber, 10);
    const duplicate = nozzles.find(
      (n) =>
        n.stationId === activeBunk.id &&
        n.nozzleNumber === num &&
        (!editingNozzle || n.id !== editingNozzle.id)
    );
    if (duplicate) {
      validation.errors.nozzleNumber = `Nozzle #${num} already exists in "${activeBunk.name}". Nozzle numbers must be unique within this bunk.`;
      validation.isValid = false;
    }

    if (!validation.isValid) {
      setNozzleFieldErrors(validation.errors);
      notifyValidation(
        'Validation Errors',
        'Please resolve the errors below.',
        Object.values(validation.errors)
      );
      setTimeout(() => focusFirstInvalidField(nozzleFormRef.current), 50);
      return;
    }

    setIsSubmitting(true);
    setNozzleFieldErrors({});

    const payload = {
      stationId: activeBunk.id,
      nozzleNumber: num,
      name: nozzleFormData.name.trim(),
      fuelCode: nozzleFormData.fuelCode,
      tankId: nozzleFormData.tankId || undefined,
      dispenserId: nozzleFormData.dispenserId || undefined,
      deviceIdentifier: nozzleFormData.deviceIdentifier.trim(),
      mechanicalTotalizer: parseFloat(nozzleFormData.initialTotalizer) || 0,
      electronicTotalizer: parseFloat(nozzleFormData.initialTotalizer) || 0,
      status: nozzleFormData.status,
      notes: nozzleFormData.notes.trim(),
    };

    try {
      if (editingNozzle && onUpdateNozzle) {
        await onUpdateNozzle(editingNozzle.id, payload);
        notifySuccess('Nozzle Updated', `Nozzle #${payload.nozzleNumber} updated successfully.`);
      } else if (onCreateNozzle) {
        await onCreateNozzle(payload);
        notifySuccess('Nozzle Added', `Nozzle #${payload.nozzleNumber} (${payload.fuelCode}) added to "${activeBunk.name}".`);
      }
      setIsAddNozzleModalOpen(false);
      setEditingNozzle(null);
    } catch (err: any) {
      setNozzleFieldErrors({ form: err.message || 'Failed to save nozzle.' });
      notifyError('Nozzle Save Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyNozzleStatus = async () => {
    if (!deactivatingNozzle || !onUpdateNozzleStatus) return;
    setIsSubmitting(true);
    try {
      await onUpdateNozzleStatus(deactivatingNozzle.nozzle.id, deactivatingNozzle.targetStatus);
      notifyWarning(
        'Status Changed',
        `Nozzle #${deactivatingNozzle.nozzle.nozzleNumber} status changed to ${deactivatingNozzle.targetStatus}. Historical totalizer readings remain intact.`
      );
      setDeactivatingNozzle(null);
    } catch (err: any) {
      notifyError('Status Update Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dedicated Full-Page Add Bunk Form (Zero popups / modals)
  if (viewMode === 'ADD') {
    return (
      <BunkFormPage
        mode="ADD"
        employees={employees}
        currentRole={currentRole}
        onSave={async (payload) => {
          await onCreateBunk(payload);
          setViewMode('LIST');
        }}
        onCancel={() => setViewMode('LIST')}
      />
    );
  }

  // Dedicated Full-Page Edit Bunk Form (Zero popups / modals)
  if (viewMode === 'EDIT' && editingStation) {
    return (
      <BunkFormPage
        mode="EDIT"
        initialStation={editingStation}
        employees={employees}
        currentRole={currentRole}
        onSave={async (payload, id) => {
          await onUpdateBunk(id || editingStation.id, payload);
          notifySuccess('Bunk Updated', `Bunk "${payload.name}" updated successfully.`);
          setViewMode('LIST');
          setEditingStation(null);
        }}
        onCancel={() => {
          setViewMode('LIST');
          setEditingStation(null);
        }}
      />
    );
  }

  // Main Forecourt Master View: Either Details or List view, with all shared modals active
  return (
    <div className="space-y-5 animate-fadeIn">
      {selectedBunkId && activeBunk ? (
        <div className="space-y-5">
          {/* Back navigation & Header with Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={() => setSelectedBunkId(null)}
              className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Back to all bunks"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Breadcrumbs
              items={[
                { label: 'Management' },
                { label: 'Bunks', onClick: () => setSelectedBunkId(null) },
                { label: activeBunk.name, isCurrent: true },
              ]}
              badge={
                <div className="flex items-center gap-1.5 ml-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      isOnline
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {isOnline ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {activeBunk.code}
                  </span>
                </div>
              }
            />
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() =>
                setQrModalEntity({
                  type: 'BUNK',
                  id: activeBunk.code || activeBunk.id,
                  name: activeBunk.name,
                  subtitle: `${activeBunk.location} \u00B7 ${bunkTanks.length} Tanks \u00B7 ${bunkNozzles.length} Nozzles`,
                })
              }
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Generate & View QR Code"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>QR Code</span>
            </button>

            {canEditBunk && (
              <button
                onClick={() => openEditModal(activeBunk)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Bunk
              </button>
            )}

            {canManageBunks && (
              <button
                onClick={() => setDeactivatingStation(activeBunk)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer shadow-2xs ${
                  isOnline
                    ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                    : 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                }`}
              >
                {isOnline ? 'Deactivate' : 'Reactivate'}
              </button>
            )}

            {canManageBunks && (
              <button
                onClick={() => setDeletingStation(activeBunk)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Delete Bunk"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}

            <button
              onClick={() => {
                onSelectStation(activeBunk.id);
                notifySuccess('Forecourt Selected', `Now operating on ${activeBunk.name} (${activeBunk.code}).`);
              }}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                currentStationId === activeBunk.id
                  ? 'bg-[#12544F] text-white shadow-xs'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-[#12544F] hover:text-white'
              }`}
            >
              {currentStationId === activeBunk.id ? 'Active Station' : 'Switch Forecourt'}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#194C47] overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'tanks', label: `Tanks (${bunkTanks.length})`, icon: Droplets },
            { id: 'nozzles', label: `Nozzles (${bunkNozzles.length})`, icon: Fuel },
            { id: 'staff', label: `Staff (${bunkEmployees.length})`, icon: Users },
            { id: 'configuration', label: 'Configuration', icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeDetailTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveDetailTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-[#12544F] text-[#12544F] dark:text-[#2BA096] dark:border-[#2BA096] font-semibold'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview */}
        {activeDetailTab === 'overview' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Quick KPI stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <span className="text-xs text-slate-500 dark:text-slate-400">Total Nozzles</span>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {bunkNozzles.length}
                </div>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {bunkNozzles.filter((n) => n.status === 'ACTIVE').length} Active
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <span className="text-xs text-slate-500 dark:text-slate-400">Storage Volume</span>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {totalStoredVolume.toLocaleString()} L
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {occupancyPct}% of capacity
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <span className="text-xs text-slate-500 dark:text-slate-400">Station Staff</span>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {bunkEmployees.length}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Mgr: {activeBunk.managerName}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <span className="text-xs text-slate-500 dark:text-slate-400">Operating Schedule</span>
                <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">
                  {activeBunk.operatingHours === '24_HOURS' ? '24/7 Round-the-Clock' : activeBunk.operatingHours}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  EOD Close: {activeBunk.eodCloseTime || '23:59'}
                </span>
              </div>
            </div>

            {/* Bunk Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  Station Contact & Location
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400">Address</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 text-right max-w-[60%]">
                      {activeBunk.address || activeBunk.location || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400">City / State</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {activeBunk.cityState || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400">Postal Code (PIN)</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {activeBunk.postalCode || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400">Phone</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {activeBunk.phone || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400">Email</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {activeBunk.email || '—'}
                    </span>
                  </div>
                  {(activeBunk.latitude || activeBunk.longitude) && (
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500 dark:text-slate-400">GPS Coordinates</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                        {activeBunk.latitude}, {activeBunk.longitude}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Fuel Tanks Summary ({bunkTanks.length})
                </h3>
                {bunkTanks.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                    No underground tanks linked to this station yet.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {bunkTanks.map((tank) => {
                      const fuel = fuels.find((f) => f.code === tank.fuelCode);
                      const pct = Math.round((tank.currentVolumeLiters / tank.capacityLiters) * 100);
                      return (
                        <div
                          key={tank.id}
                          className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: fuel?.color || '#10b981' }}
                              />
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                Tank #{tank.tankNumber} ({tank.fuelCode})
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Dip: {tank.currentDipCm} cm \u00B7 Water: {tank.waterDipCm} cm
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {tank.currentVolumeLiters.toLocaleString()} L
                            </span>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              {pct}% full
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {activeBunk.notes && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Station Notes:</span>
                <p className="text-slate-600 dark:text-slate-400 mt-1">{activeBunk.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Tanks (Nested Tank Management under Bunk Master) */}
        {activeDetailTab === 'tanks' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Header & Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Underground Fuel Storage Tanks for {activeBunk.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hierarchy: Bunk Master &rarr; {activeBunk.name} &rarr; Tanks. Each tank belongs strictly to this bunk.
                </p>
              </div>

              {canManageBunks && (
                <button
                  type="button"
                  onClick={() => setIsAddTankModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Tank</span>
                </button>
              )}
            </div>

            {/* Tanks KPI summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Configured Tanks</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {bunkTanks.length} Units
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {bunkTanks.filter((t) => t.status === 'ACTIVE').length} Active
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Total Capacity</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {totalTankCapacity.toLocaleString()} L
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">100% Geometry</span>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Current Live Stock</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {totalStoredVolume.toLocaleString()} L
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{occupancyPct}% utilized</span>
              </div>

              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Available Ullage</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {Math.max(0, totalTankCapacity - totalStoredVolume).toLocaleString()} L
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Room for decanting</span>
              </div>
            </div>

            {/* Tanks List / Cards Grid */}
            {bunkTanks.length === 0 ? (
              <div className="p-10 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <Droplets className="w-10 h-10 text-slate-400 mx-auto mb-2.5 opacity-60" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No tanks provisioned for {activeBunk.name}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Add an underground tank linked to this bunk to track fuel inventory, dip measurements, and tanker loads.
                </p>
                {canManageBunks && (
                  <button
                    type="button"
                    onClick={() => setIsAddTankModalOpen(true)}
                    className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Tank #{bunkTanks.length + 1}</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {bunkTanks.map((tank) => {
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
                      onOpenDipModal={onRecordDip}
                      onOpenDecantModal={onDecant}
                      onViewDetails={(t) => {
                        setSelectedTankForDetails(t);
                        setTankModalInitialTab('overview');
                      }}
                      onEditTank={(t) => {
                        setSelectedTankForDetails(t);
                        setTankModalInitialTab('config');
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Nozzles (Nested Management under Bunk Master) */}
        {activeDetailTab === 'nozzles' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Dispenser Nozzles for {activeBunk.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Every nozzle is strictly mapped to this bunk. Configure fuel product linkages and registers.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={openInlineAddNozzle}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Nozzle</span>
                </button>
                {onNavigateToNozzles && (
                  <button
                    onClick={() => onNavigateToNozzles(activeBunk.id)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium cursor-pointer"
                  >
                    Forecourt View
                  </button>
                )}
              </div>
            </div>

            {bunkNozzles.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <Fuel className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">No nozzles configured for this bunk</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Add nozzles to enable meter entry and forecourt fuel dispensing.
                </p>
                <button
                  onClick={openInlineAddNozzle}
                  className="mt-3 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Nozzle</span>
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Nozzle</th>
                      <th className="px-4 py-3">Fuel Type</th>
                      <th className="px-4 py-3">Dispenser</th>
                      <th className="px-4 py-3">Device / Meter ID</th>
                      <th className="px-4 py-3">Electronic Totalizer</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {bunkNozzles.map((nz) => {
                      const fuel = fuels.find((f) => f.code === nz.fuelCode);
                      return (
                        <tr key={nz.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                            #{nz.nozzleNumber} {nz.name ? `\u00B7 ${nz.name}` : ''}
                          </td>
                          <td className="px-4 py-3">
                            {(() => {
                              const fuelDef = getFuelDefinition(nz.fuelCode);
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
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                            Dispenser #{nz.dispenserNumber || 1}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500 dark:text-slate-400">
                            {nz.deviceIdentifier || '—'}
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {nz.electronicTotalizer.toLocaleString()} L
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                nz.status === 'ACTIVE'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : nz.status === 'UNDER_MAINTENANCE'
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              {nz.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openInlineEditNozzle(nz)}
                                className="px-2 py-1 rounded text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              >
                                Edit
                              </button>
                              {nz.status === 'ACTIVE' ? (
                                <button
                                  onClick={() => setDeactivatingNozzle({ nozzle: nz, targetStatus: 'INACTIVE' })}
                                  className="px-2 py-1 rounded text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  onClick={() => setDeactivatingNozzle({ nozzle: nz, targetStatus: 'ACTIVE' })}
                                  className="px-2 py-1 rounded text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                                >
                                  Activate
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteNozzleClick(nz)}
                                className="px-2 py-1 rounded text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                title="Delete Nozzle"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Staff */}
        {activeDetailTab === 'staff' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Staff Assigned to {activeBunk.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Forecourt attendants, cashiers, and managers assigned to this location.
                </p>
              </div>
            </div>

            {bunkEmployees.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">No staff directly assigned</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Assign attendants or managers in User Management.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {bunkEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {emp.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {emp.role}
                      </span>
                    </div>
                    <div className="space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {emp.phone || 'No phone'}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Schedule: {emp.shiftSchedule} Shift
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Configuration */}
        {activeDetailTab === 'configuration' && (
          <div className="space-y-4 animate-fadeIn max-w-3xl">
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 text-xs">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                Operational Preferences & Settings
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Timezone</span>
                  <input
                    type="text"
                    disabled
                    value={activeBunk.timezone || 'Asia/Kolkata'}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono"
                  />
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">EOD Settlement Time</span>
                  <input
                    type="text"
                    disabled
                    value={activeBunk.eodCloseTime || '23:59'}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono"
                  />
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Assigned Bunk Manager</span>
                  <input
                    type="text"
                    disabled
                    value={activeBunk.managerName || 'Unassigned'}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  />
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Operating Mode</span>
                  <input
                    type="text"
                    disabled
                    value={activeBunk.operatingHours || '24_HOURS'}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  />
                </div>
              </div>

              {canEditBunk && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() => openEditModal(activeBunk)}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer shadow-xs"
                  >
                    Edit Configuration
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inline Nozzle Add/Edit Modal */}
        <ModalPortal
          isOpen={isAddNozzleModalOpen}
          onClose={() => setIsAddNozzleModalOpen(false)}
          ariaLabel={editingNozzle ? 'Edit Nozzle' : 'Add Nozzle'}
          zIndex={9995}
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto mx-auto text-slate-900 dark:text-gray-100 transition">
            {/* Flush top-right close button */}
            <button
              type="button"
              onClick={() => setIsAddNozzleModalOpen(false)}
              className="absolute top-0 right-0 flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-tr-2xl rounded-bl-xl bg-red-500 hover:bg-red-600 active:scale-95 text-white transition cursor-pointer z-10"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 text-white stroke-[2.5]" />
            </button>
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 pr-10">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-1 min-w-0 pr-2">
                <Fuel className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="truncate">
                  {editingNozzle ? `Edit Nozzle #${editingNozzle.nozzleNumber}` : `Add Nozzle to ${activeBunk?.name}`}
                </span>
              </h2>
            </div>

            <form ref={nozzleFormRef} onSubmit={handleInlineNozzleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Parent Bunk Badge - strictly locked and inherited */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                  Parent Bunk (Locked & Inherited)
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {activeBunk?.name}
                  </span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {activeBunk?.code}
                  </span>
                </div>
              </div>

              {/* Row 1: Nozzle Number & Subterranean Tank */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Nozzle Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 1, 2, 3"
                    value={nozzleFormData.nozzleNumber}
                    onChange={(e) => {
                      setNozzleFormData({ ...nozzleFormData, nozzleNumber: e.target.value });
                      if (nozzleFieldErrors.nozzleNumber) {
                        setNozzleFieldErrors((p) => ({ ...p, nozzleNumber: '' }));
                      }
                    }}
                    className={`w-full h-9 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border text-slate-900 dark:text-slate-100 font-mono text-xs ${
                      nozzleFieldErrors.nozzleNumber
                        ? 'border-rose-500 focus:ring-rose-500'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-emerald-500'
                    }`}
                  />
                  {nozzleFieldErrors.nozzleNumber && (
                    <p className="mt-1 text-[11px] text-rose-500 font-medium">
                      {nozzleFieldErrors.nozzleNumber}
                    </p>
                  )}
                </div>

                <div>
                  <SelectDropdown
                    label="Feeder Tank (Underground)"
                    placeholder="Select feeder tank..."
                    options={[
                      { value: '', label: 'Direct / Unassigned' },
                      ...bunkTanks.map((t) => ({
                        value: t.id,
                        label: `Tank #${t.tankNumber}: ${t.name || t.id}`,
                        badge: t.fuelCode,
                        description: `Grade: ${t.fuelCode} \u00B7 Cap: ${t.capacityLiters.toLocaleString()} L`,
                      })),
                    ]}
                    value={nozzleFormData.tankId}
                    onChange={(val) => {
                      const selectedTank = bunkTanks.find((t) => t.id === val);
                      setNozzleFormData({
                        ...nozzleFormData,
                        tankId: val,
                        fuelCode: selectedTank ? selectedTank.fuelCode : nozzleFormData.fuelCode,
                      });
                    }}
                    searchable={bunkTanks.length > 3}
                  />
                </div>
              </div>

              {/* Row 2: Fuel Product & Operational Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <SelectDropdown
                    label="Fuel Product"
                    required
                    disabled={Boolean(nozzleFormData.tankId)}
                    helpText={
                      nozzleFormData.tankId
                        ? 'Locked to feeder tank to prevent fuel cross-contamination.'
                        : 'Select fuel product'
                    }
                    placeholder="Select fuel product..."
                    options={FUEL_SELECT_OPTIONS}
                    value={nozzleFormData.fuelCode}
                    onChange={(val) => setNozzleFormData({ ...nozzleFormData, fuelCode: val })}
                    searchable={false}
                  />
                </div>

                <div>
                  <SelectDropdown
                    label="Operational Status"
                    options={[
                      { value: 'ACTIVE', label: 'Active (Dispensing Allowed)', badge: 'ACTIVE' },
                      { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance', badge: 'MAINTENANCE' },
                      { value: 'INACTIVE', label: 'Inactive (Disabled)', badge: 'INACTIVE' },
                    ]}
                    value={nozzleFormData.status}
                    onChange={(val) => setNozzleFormData({ ...nozzleFormData, status: val })}
                    searchable={false}
                  />
                </div>
              </div>

              {/* Row 3: Nozzle Name / Label & Meter / Device ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Nozzle Name / Label <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pump 1 Diesel High-Flow"
                    value={nozzleFormData.name}
                    onChange={(e) => setNozzleFormData({ ...nozzleFormData, name: e.target.value })}
                    className="w-full h-9 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Meter / Device ID <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NZ-101-A"
                    value={nozzleFormData.deviceIdentifier}
                    onChange={(e) => setNozzleFormData({ ...nozzleFormData, deviceIdentifier: e.target.value })}
                    className="w-full h-9 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Row 4: Totalizer & Dispenser */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Electronic Totalizer (Liters) <span className="text-emerald-600 font-normal">(Locked \u00B7 Initial Register)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    disabled
                    value={nozzleFormData.initialTotalizer}
                    className="w-full h-9 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-mono text-xs cursor-not-allowed"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Starts at 0.00 L. Totalizer strictly increments via authorized meter entries and shift dispensing.
                  </span>
                </div>

                <div>
                  <SelectDropdown
                    label="Dispenser / Pump Unit"
                    placeholder="Select dispenser pump..."
                    options={dispensers
                      .filter((d) => d.stationId === activeBunk?.id)
                      .map((d) => ({
                        value: d.id,
                        label: `Pump #${d.dispenserNumber} (Island ${d.islandNumber})`,
                        description: d.brand,
                      }))}
                    value={nozzleFormData.dispenserId}
                    onChange={(val) => setNozzleFormData({ ...nozzleFormData, dispenserId: val })}
                    searchable={false}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddNozzleModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer font-medium text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2 text-xs transition"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingNozzle ? 'Save Changes' : 'Create Nozzle'}
                </button>
              </div>
            </form>
          </div>
        </ModalPortal>

        {/* Confirmation Modal for Nozzle Status */}
        <ConfirmationModal
          isOpen={Boolean(deactivatingNozzle)}
          onClose={() => setDeactivatingNozzle(null)}
          onConfirm={handleApplyNozzleStatus}
          title={`Confirm Nozzle #${deactivatingNozzle?.nozzle.nozzleNumber} Status Change`}
          message={
            <span>
              Are you sure you want to change status of Nozzle #{deactivatingNozzle?.nozzle.nozzleNumber} to{' '}
              <strong className="text-slate-900 dark:text-slate-100">{deactivatingNozzle?.targetStatus}</strong>?
              Historical totalizer registers and sales transactions remain safely preserved in the database.
            </span>
          }
          variant={deactivatingNozzle?.targetStatus === 'ACTIVE' ? 'info' : 'warning'}
          confirmLabel={`Set to ${deactivatingNozzle?.targetStatus}`}
          isLoading={isSubmitting}
        />
      </div>
    ) : (
      <div className="space-y-5">
        {/* Breadcrumb Navigation & Action Bar */}
        <Breadcrumbs
          items={[
            { label: 'Management' },
            { label: 'Bunks', isCurrent: true, icon: Building2 },
          ]}
          actions={
            canManageBunks && (
              <button
                type="button"
                onClick={openAddModal}
                className="px-4 py-2 rounded-xl bg-[#12544F] hover:bg-[#0E433F] text-white text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Bunk</span>
              </button>
            )
          }
        />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, code, location, or manager..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-[#194C47] text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#12544F] transition-colors shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Status:</span>
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#12544F] text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#194C47] hover:bg-slate-50 dark:hover:bg-[#123733]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Bunks Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Bunk Name & Code</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Nozzles</th>
                <th className="px-4 py-3">Assigned Manager</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredStations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                    No bunks match your current search or filter criteria.
                  </td>
                </tr>
              ) : (
                filteredStations.map((station) => {
                  const stationNozzleCount = nozzles.filter((n) => n.stationId === station.id).length;
                  const isOnline = station.status === 'ONLINE' || station.status === 'ACTIVE';
                  const isCurrent = currentStationId === station.id;

                  return (
                    <tr
                      key={station.id}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                        isCurrent ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                              {station.name}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              {station.code}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                        <span className="block truncate font-medium">
                          {station.address || station.location}
                        </span>
                        {station.cityState && (
                          <span className="text-[11px] text-slate-400 block truncate">
                            {station.cityState} {station.postalCode ? `\u00B7 ${station.postalCode}` : ''}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {stationNozzleCount} Nozzles
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
                        {station.managerName || 'Unassigned'}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isOnline
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              isOnline ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {isOnline ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedBunkId(station.id);
                              setActiveDetailTab('overview');
                            }}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer"
                          >
                            View
                          </button>

                          {canEditBunk && (
                            <button
                              onClick={() => openEditModal(station)}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              Edit
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSelectedBunkId(station.id);
                              setActiveDetailTab('configuration');
                            }}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            Configure
                          </button>

                          <button
                            onClick={() =>
                              setQrModalEntity({
                                type: 'BUNK',
                                id: station.code || station.id,
                                name: station.name,
                                subtitle: `${station.location} \u00B7 ${stationNozzleCount} Nozzles`,
                              })
                            }
                            className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Generate / View QR Code"
                          >
                            <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </button>

                          {canManageBunks && (
                            <button
                              onClick={() => setDeactivatingStation(station)}
                              className={`px-2 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                                isOnline
                                  ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50'
                                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                              }`}
                            >
                              {isOnline ? 'Deactivate' : 'Activate'}
                            </button>
                          )}

                          {canManageBunks && (
                            <button
                              onClick={() => setDeletingStation(station)}
                              className="p-1 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                              title="Delete Bunk"
                            >
                              <Trash2 className="w-4 h-4" />
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
    </div>
  )}

      {/* Confirmation Modal for Bunk Deactivation / Reactivation */}
      <ConfirmationModal
        isOpen={Boolean(deactivatingStation)}
        onClose={() => setDeactivatingStation(null)}
        onConfirm={handleConfirmDeactivate}
        title={
          deactivatingStation?.status === 'INACTIVE'
            ? `Re-activate Bunk: ${deactivatingStation?.name}`
            : `Deactivate Bunk: ${deactivatingStation?.name}`
        }
        message={
          <div>
            <p>
              Are you sure you want to {deactivatingStation?.status === 'INACTIVE' ? 'reactivate' : 'deactivate'} bunk{' '}
              <strong className="text-slate-900 dark:text-slate-100">{deactivatingStation?.name}</strong> ({deactivatingStation?.code})?
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {deactivatingStation?.status === 'INACTIVE'
                ? 'Forecourt dispensing, tanker decanting, and cashier operations will resume.'
                : 'Operational records, meter logs, tank decanting entries, and cashier shifts will remain completely preserved in the database. Forecourt dispensing will be suspended until reactivated.'}
            </p>
          </div>
        }
        variant={deactivatingStation?.status === 'INACTIVE' ? 'info' : 'warning'}
        confirmLabel={deactivatingStation?.status === 'INACTIVE' ? 'Reactivate Bunk' : 'Confirm Deactivation'}
        isLoading={isSubmitting}
      />

      {/* Confirmation Modal for Bunk Deletion (Enforces Lifecycle Rules) */}
      {deletingStation && (() => {
        const depTanks = tanks.filter((t) => t.stationId === deletingStation.id);
        const depNozzles = nozzles.filter((n) => n.stationId === deletingStation.id);
        const depEmployees = employees.filter((e) => e.stationId === deletingStation.id);
        const depShifts = shifts.filter((s) => s.stationId === deletingStation.id);
        const hasDeps = depTanks.length > 0 || depNozzles.length > 0 || depEmployees.length > 0 || depShifts.length > 0;

        if (hasDeps) {
          return (
            <ConfirmationModal
              isOpen={Boolean(deletingStation)}
              onClose={() => setDeletingStation(null)}
              onConfirm={() => {
                const target = deletingStation;
                setDeletingStation(null);
                if (target) setDeactivatingStation(target);
              }}
              title={`Deletion Blocked: "${deletingStation.name}" has Dependent Records`}
              message={
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
                    <p className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      Statutory & Operational Record Retention Rule
                    </p>
                    <p className="mt-1">
                      Bunk <strong>"{deletingStation.name}"</strong> ({deletingStation.code}) cannot be permanently deleted because it has active operational dependencies:
                    </p>
                    <ul className="list-disc pl-5 mt-1.5 space-y-0.5">
                      {depTanks.length > 0 && <li>{depTanks.length} Underground Storage Tank(s)</li>}
                      {depNozzles.length > 0 && <li>{depNozzles.length} Dispensing Nozzle(s)</li>}
                      {depEmployees.length > 0 && <li>{depEmployees.length} Assigned Staff Member(s)</li>}
                      {depShifts.length > 0 && <li>{depShifts.length} Shift Register Record(s)</li>}
                    </ul>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    To comply with petroleum accounting regulations and statutory audit tracking, operational records cannot be cascade-deleted. You can deactivate the bunk instead to halt all new transactions.
                  </p>
                </div>
              }
              variant="warning"
              confirmLabel="Deactivate Bunk Instead"
              cancelLabel="Close"
              isLoading={isSubmitting}
            />
          );
        }

        return (
          <ConfirmationModal
            isOpen={Boolean(deletingStation)}
            onClose={() => setDeletingStation(null)}
            onConfirm={handleConfirmDeleteStation}
            title={`Permanently Delete Bunk "${deletingStation.name}"?`}
            message={
              <div>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  Are you sure you want to permanently delete bunk <strong>"{deletingStation.name}"</strong> ({deletingStation.code})?
                </p>
                <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-medium">
                  This action is permanent and irreversible. All zero-dependency configuration will be erased from the database.
                </p>
              </div>
            }
            variant="danger"
            confirmLabel="Delete Bunk"
            requiredText="DELETE"
            requiredTextPlaceholder="Type DELETE to confirm"
            isLoading={isSubmitting}
          />
        );
      })()}

      {/* Reusable QR Code Modal */}
      {qrModalEntity && (
        <QRCodeModal
          isOpen={Boolean(qrModalEntity)}
          onClose={() => setQrModalEntity(null)}
          entityType={qrModalEntity.type}
          entityId={qrModalEntity.id}
          entityName={qrModalEntity.name}
          subtitle={qrModalEntity.subtitle}
          parentBunkName={qrModalEntity.parentBunkName}
          fuelCode={qrModalEntity.fuelCode}
          fuelColor={qrModalEntity.fuelColor}
        />
      )}

      {/* Add Tank Modal (Scoped to Active Bunk or Current Station) */}
      {isAddTankModalOpen && (
        <AddTankModal
          isOpen={isAddTankModalOpen}
          onClose={() => setIsAddTankModalOpen(false)}
          station={activeBunk || stations.find((s) => s.id === currentStationId) || stations[0]}
          fuels={fuels}
          existingTankCount={bunkTanks.length}
          existingTanks={bunkTanks}
          onTankCreated={async (newTank) => {
            setIsAddTankModalOpen(false);
            if (onCreateTank && newTank) {
              await onCreateTank(newTank);
            }
          }}
        />
      )}

      {/* Dedicated Tank Details Modal with 7 Operational Sections */}
      {selectedTankForDetails && (
        <TankDetailsModal
          isOpen={Boolean(selectedTankForDetails)}
          onClose={() => {
            setSelectedTankForDetails(null);
            setTankModalInitialTab('overview');
          }}
          tank={selectedTankForDetails}
          station={activeBunk || stations.find((s) => s.id === selectedTankForDetails.stationId) || stations[0]}
          nozzles={nozzles.filter((n) => n.stationId === (activeBunk?.id || selectedTankForDetails.stationId))}
          currentRole={currentRole}
          initialTab={tankModalInitialTab}
          onUpdateTank={async (id, payload) => {
            if (onUpdateTank) await onUpdateTank(id, payload);
            setSelectedTankForDetails((prev) => (prev ? { ...prev, ...payload } : null));
          }}
          onDeactivateTank={async (id, status) => {
            if (onDeactivateTank) await onDeactivateTank(id, status);
            setSelectedTankForDetails((prev) => (prev ? { ...prev, status: status || (prev.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE') } : null));
          }}
          onDeleteTank={async (id) => {
            if (onDeleteTank) await onDeleteTank(id);
            setSelectedTankForDetails(null);
          }}
          onRecordDip={onRecordDip}
          onDecant={onDecant}
        />
      )}

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
                  setDeactivatingNozzle({ nozzle: nz, targetStatus: 'INACTIVE' });
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
    </div>
  );
};
