import React, { useState, useRef } from 'react';
import { Station, Employee, UserRole } from '../../types';
import {
  ArrowLeft,
  Save,
  X,
  AlertCircle,
  Loader2,
  Clock,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { SelectDropdown, SelectOption } from '../common/SelectDropdown';
import { validateBunkForm, focusFirstInvalidField } from '../../utils/validation';
import { SUPPORTED_CURRENCIES } from '../../utils/currency';
import { api } from '../../api/client';
import { Breadcrumbs } from '../common/Breadcrumbs';

export interface BunkFormPageProps {
  mode: 'ADD' | 'EDIT';
  initialStation?: Station | null;
  employees: Employee[];
  currentRole: UserRole;
  onSave: (payload: any, stationId?: string) => Promise<void>;
  onCancel: () => void;
}

export const BunkFormPage: React.FC<BunkFormPageProps> = ({
  mode,
  initialStation,
  employees,
  currentRole,
  onSave,
  onCancel,
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Form Field States
  const [name, setName] = useState(initialStation?.name || '');
  const [code] = useState(initialStation?.code || '');
  const [address, setAddress] = useState(initialStation?.address || initialStation?.location || '');
  const [cityState, setCityState] = useState(initialStation?.cityState || '');
  const [postalCode, setPostalCode] = useState(initialStation?.postalCode || '');
  const [phone, setPhone] = useState(initialStation?.phone || '');
  const [email, setEmail] = useState(initialStation?.email || '');
  const [latitude, setLatitude] = useState(
    initialStation?.latitude ? String(initialStation.latitude) : ''
  );
  const [longitude, setLongitude] = useState(
    initialStation?.longitude ? String(initialStation.longitude) : ''
  );
  const [managerId, setManagerId] = useState(initialStation?.managerId || '');
  const [managerName, setManagerName] = useState(initialStation?.managerName || '');
  const [operatingHours, setOperatingHours] = useState(
    initialStation?.operatingHours || '24_HOURS'
  );
  const [timezone, setTimezone] = useState(initialStation?.timezone || 'Asia/Kolkata');
  const [currency, setCurrency] = useState(
    initialStation?.currency || (initialStation?.timezone === 'Asia/Dubai' ? 'AED' : 'INR')
  );
  const [eodCloseTime, setEodCloseTime] = useState(initialStation?.eodCloseTime || '23:59');
  const [status, setStatus] = useState(initialStation?.status || 'ONLINE');
  const [notes, setNotes] = useState(initialStation?.notes || '');

  // Manager dropdown options from employees
  const managerOptions: SelectOption[] = [
    { value: '', label: 'Unassigned (No manager assigned yet)' },
    ...employees
      .filter((e) => e.role === 'MANAGER' || e.role === 'OWNER' || mode === 'EDIT')
      .map((e) => ({
        value: e.id,
        label: `${e.name} (${e.role})`,
        description: `Phone: ${e.phone} · Bunk: ${e.stationId}`,
        badge: e.role,
        badgeClass:
          e.role === 'OWNER'
            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
      })),
  ];

  // If initial station had a manager not in list, add it
  if (managerName && !managerOptions.some((opt) => opt.label.includes(managerName))) {
    managerOptions.push({
      value: managerId || 'mgr-custom',
      label: managerName,
      description: 'Designated Station Manager',
    });
  }

  // Handle Manager selection change
  const handleManagerChange = (selectedVal: string) => {
    setManagerId(selectedVal);
    const foundEmp = employees.find((e) => e.id === selectedVal);
    if (foundEmp) {
      setManagerName(foundEmp.name);
      if (!phone && foundEmp.phone) setPhone(foundEmp.phone);
      if (!email && foundEmp.email) setEmail(foundEmp.email);
    } else if (!selectedVal) {
      setManagerName('');
    }
    if (fieldErrors.managerName) {
      setFieldErrors((prev) => ({ ...prev, managerName: '' }));
    }
  };

  const operatingHoursOptions: SelectOption[] = [
    { value: '24_HOURS', label: '24 Hours / 7 Days (Continuous Forecourt)' },
    { value: 'DAY_SHIFT_6AM_10PM', label: 'Day Shift (06:00 AM – 10:00 PM)' },
    { value: 'TWO_SHIFTS_5AM_11PM', label: 'Extended Two-Shift (05:00 AM – 11:00 PM)' },
    { value: 'DAY_SHIFT_7AM_9PM', label: 'Standard Day (07:00 AM – 09:00 PM)' },
  ];

  const timezoneOptions: SelectOption[] = [
    { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST - UTC+5:30)' },
    { value: 'Asia/Dubai', label: 'Asia/Dubai (GST - UTC+4:00)' },
    { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT - UTC+8:00)' },
    { value: 'UTC', label: 'UTC (Universal Coordinated Time)' },
  ];

  const currencyOptions: SelectOption[] = Object.values(SUPPORTED_CURRENCIES).map((c) => ({
    value: c.code,
    label: `${c.code} (${c.symbol}) – ${c.name}`,
    badge: c.symbol,
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-mono font-bold',
  }));

  const statusOptions: SelectOption[] = [
    {
      value: 'ONLINE',
      label: 'ONLINE (Fully Operational)',
      description: 'Station is open, accepting tank loads and dispensing fuel.',
      badge: 'ACTIVE',
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    },
    {
      value: 'MAINTENANCE',
      label: 'MAINTENANCE (Partial / Servicing)',
      description: 'Pumps or tanks undergo metrology inspection or pipeline maintenance.',
      badge: 'MAINTENANCE',
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    },
    {
      value: 'OFFLINE',
      label: 'OFFLINE (Temporarily Deactivated)',
      description: 'Station suspended from daily shifts and nozzle reconciliation.',
      badge: 'OFFLINE',
      badgeClass: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formValues = {
      name,
      code,
      phone,
      email,
      address,
      managerName: managerName || 'Unassigned',
      operatingHours,
      timezone,
      eodCloseTime,
      status,
      notes,
    };

    const validation = validateBunkForm(formValues);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      focusFirstInvalidField(formRef.current);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const payload: any = {
        name: name.trim(),
        code: mode === 'EDIT' && code ? code.trim().toUpperCase() : undefined,
        location: address.trim(),
        address: address.trim(),
        cityState: cityState.trim(),
        postalCode: postalCode.trim(),
        phone: phone.trim(),
        email: email.trim(),
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        managerId: managerId || undefined,
        managerName: managerName.trim() || 'Unassigned',
        operatingHours,
        timezone,
        currency: currency?.trim() || 'INR',
        eodCloseTime,
        status,
        notes: notes.trim(),
      };

      await onSave(payload, initialStation?.id);
    } catch (err: any) {
      setFieldErrors({ form: err.message || 'Failed to save bunk. Please review inputs.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Standard Unified Breadcrumbs & Action Bar */}
      <Breadcrumbs
        items={[
          { label: 'Management' },
          { label: 'Bunks', onClick: onCancel },
          {
            label: mode === 'ADD' ? 'Add Bunk' : `Edit Bunk (${initialStation?.name || initialStation?.code || ''})`,
            isCurrent: true,
          },
        ]}
        actions={
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shadow-2xs disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-[#12544F] hover:bg-[#0E433F] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-sm disabled:opacity-50 active:scale-98"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {mode === 'ADD' ? 'Save & Create Bunk' : 'Save Changes'}
            </button>
          </div>
        }
      />

      {/* Main Form Container */}
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        {/* General Form Error Banner */}
        {fieldErrors.form && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="text-xs font-bold">Submission Error</p>
              <p className="text-xs mt-0.5">{fieldErrors.form}</p>
            </div>
          </div>
        )}

        {/* Section 1: Bunk Identity & Unique Code */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#194C47] bg-white dark:bg-[#0D2926] p-6 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-slate-200/70 dark:border-[#194C47] pb-3 mb-5">
            <div className="w-7 h-7 rounded-lg bg-[#12544F]/10 dark:bg-[#12544F]/30 text-[#12544F] dark:text-[#2BA096] flex items-center justify-center font-bold text-xs">
              1
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Bunk Identification & Licensing
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official dealership name, unique identifier, and legal metrology registration code.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Bunk Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                aria-invalid={Boolean(fieldErrors.name)}
                placeholder="e.g. Grand Highway Fuel Oasis"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: '' }));
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border text-xs text-slate-900 dark:text-white focus:outline-hidden transition ${
                  fieldErrors.name
                    ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-slate-200 dark:border-[#194C47] focus:border-[#12544F] dark:focus:border-[#2BA096] focus:ring-2 focus:ring-[#12544F]/20'
                }`}
              />
              {fieldErrors.name && (
                <p className="mt-1.5 text-[11px] text-rose-500 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {fieldErrors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Authoritative Bunk Code
              </label>
              <div className="flex items-center px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300 select-all">
                {mode === 'EDIT' ? (
                  <span className="font-bold text-slate-900 dark:text-white">{code}</span>
                ) : (
                  <span className="text-slate-500 dark:text-slate-400 italic">
                    Assigned authoritatively by backend (e.g. BUNK-000001)
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                {mode === 'EDIT'
                  ? 'Bunk code is immutable after provisioning to preserve database audit integrity.'
                  : 'Codes are generated exclusively by the backend database sequence to guarantee uniqueness.'}
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Location, Contact & Geolocation */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#194C47] bg-white dark:bg-[#0D2926] p-6 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-slate-200/70 dark:border-[#194C47] pb-3 mb-5">
            <div className="w-7 h-7 rounded-lg bg-[#12544F]/10 dark:bg-[#12544F]/30 text-[#12544F] dark:text-[#2BA096] flex items-center justify-center font-bold text-xs">
              2
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Location & Forecourt Contact Details
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Physical address, delivery dispatch coordinates, and emergency contact numbers.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Physical Address / Highway Location <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="address"
                required
                placeholder="e.g. Plot 42, NH-44 Bengaluru-Hyderabad Expressway, Devanahalli"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (fieldErrors.address) setFieldErrors((p) => ({ ...p, address: '' }));
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border text-xs text-slate-900 dark:text-white focus:outline-hidden transition ${
                  fieldErrors.address
                    ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-slate-200 dark:border-[#194C47] focus:border-[#12544F] dark:focus:border-[#2BA096] focus:ring-2 focus:ring-[#12544F]/20'
                }`}
              />
              {fieldErrors.address && (
                <p className="mt-1.5 text-[11px] text-rose-500 font-medium">{fieldErrors.address}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                City / State
              </label>
              <input
                type="text"
                name="cityState"
                placeholder="e.g. Bengaluru, Karnataka"
                value={cityState}
                onChange={(e) => setCityState(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-[#194C47] text-xs text-slate-900 dark:text-white focus:border-[#12544F] dark:focus:border-[#2BA096] focus:outline-hidden transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Postal / PIN Code
              </label>
              <input
                type="text"
                name="postalCode"
                placeholder="e.g. 562110"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-[#194C47] text-xs text-slate-900 dark:text-white focus:border-[#12544F] dark:focus:border-[#2BA096] focus:outline-hidden transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Forecourt Contact Phone <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                required
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: '' }));
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border text-xs text-slate-900 dark:text-white focus:outline-hidden transition ${
                  fieldErrors.phone
                    ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-slate-200 dark:border-[#194C47] focus:border-[#12544F] dark:focus:border-[#2BA096] focus:ring-2 focus:ring-[#12544F]/20'
                }`}
              />
              {fieldErrors.phone && (
                <p className="mt-1.5 text-[11px] text-rose-500 font-medium">{fieldErrors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Station Contact Email
              </label>
              <input
                type="email"
                name="email"
                placeholder="station.devanahalli@petropulse.io"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border text-xs text-slate-900 dark:text-white focus:outline-hidden transition ${
                  fieldErrors.email
                    ? 'border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-slate-200 dark:border-[#194C47] focus:border-[#12544F] dark:focus:border-[#2BA096] focus:ring-2 focus:ring-[#12544F]/20'
                }`}
              />
              {fieldErrors.email && (
                <p className="mt-1.5 text-[11px] text-rose-500 font-medium">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Latitude Coordinates (Optional)
              </label>
              <input
                type="number"
                step="0.000001"
                placeholder="13.248301"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-[#194C47] text-xs font-mono text-slate-900 dark:text-white focus:border-[#12544F] dark:focus:border-[#2BA096] focus:outline-hidden transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Longitude Coordinates (Optional)
              </label>
              <input
                type="number"
                step="0.000001"
                placeholder="77.712610"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-[#194C47] text-xs font-mono text-slate-900 dark:text-white focus:border-[#12544F] dark:focus:border-[#2BA096] focus:outline-hidden transition"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Manager Assignment & Operating Hours */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#194C47] bg-white dark:bg-[#0D2926] p-6 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-slate-200/70 dark:border-[#194C47] pb-3 mb-5">
            <div className="w-7 h-7 rounded-lg bg-[#12544F]/10 dark:bg-[#12544F]/30 text-[#12544F] dark:text-[#2BA096] flex items-center justify-center font-bold text-xs">
              3
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Manager Assignment & Operations Schedule
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Designated station head from User Master, timezone for meter audits, and daily settlement schedule.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <SelectDropdown
                label="Station Manager Assignment"
                placeholder="Select a registered Manager from User Master..."
                options={managerOptions}
                value={managerId}
                onChange={handleManagerChange}
                searchable={true}
                helpText="Select an active manager profile to manage shift rosters, dip logs, and EOD reconciliations."
              />
            </div>

            <div>
              <SelectDropdown
                label="Operating Schedule"
                placeholder="Select station operating hours..."
                options={operatingHoursOptions}
                value={operatingHours}
                onChange={setOperatingHours}
                searchable={false}
                helpText="Determines automated shift schedules and midnight meter roll-over timings."
              />
            </div>

            <div>
              <SelectDropdown
                label="Operational Timezone"
                placeholder="Select timezone..."
                options={timezoneOptions}
                value={timezone}
                onChange={(val) => {
                  setTimezone(val);
                  if (val === 'Asia/Dubai' && currency === 'INR') {
                    setCurrency('AED');
                  }
                }}
                searchable={false}
                helpText="Ensures legal metrology compliance timestamps align with station jurisdiction."
              />
            </div>

            <div>
              <SelectDropdown
                label="Operating Currency"
                placeholder="Select currency..."
                options={currencyOptions}
                value={currency}
                onChange={setCurrency}
                searchable={false}
                helpText="Currency used for fuel rates, cashier shift totals, and accounting reconciliation."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                End-Of-Day (EOD) Auto-Close Time
              </label>
              <input
                type="time"
                value={eodCloseTime}
                onChange={(e) => setEodCloseTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-[#194C47] text-xs font-mono text-slate-900 dark:text-white focus:border-[#12544F] dark:focus:border-[#2BA096] focus:outline-hidden transition"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Daily cutoff time when sales reconciliation and automated shift settlement trigger.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Operational Status & Administrative Notes */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#194C47] bg-white dark:bg-[#0D2926] p-6 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-slate-200/70 dark:border-[#194C47] pb-3 mb-5">
            <div className="w-7 h-7 rounded-lg bg-[#12544F]/10 dark:bg-[#12544F]/30 text-[#12544F] dark:text-[#2BA096] flex items-center justify-center font-bold text-xs">
              4
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Operational Status & Administrative Notes
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live availability status and internal notes for forecourt supervisors.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <SelectDropdown
                label="Station Operational Status"
                placeholder="Select operational status..."
                options={statusOptions}
                value={status}
                onChange={setStatus}
                searchable={false}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Administrative Notes / Metrology License Details (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Legal Metrology verification stamped on Oct 2024. Next calibration due Q4. Generator backup 65 kVA."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-[#194C47] text-xs text-slate-900 dark:text-white focus:border-[#12544F] dark:focus:border-[#2BA096] focus:outline-hidden transition"
              />
            </div>
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-[#194C47]">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-xs font-semibold cursor-pointer transition shadow-2xs disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-[#12544F] hover:bg-[#0E433F] text-white text-xs font-bold flex items-center gap-2 cursor-pointer transition shadow-sm disabled:opacity-50 active:scale-98"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {mode === 'ADD' ? 'Save & Create Bunk' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
