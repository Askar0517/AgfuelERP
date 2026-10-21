/**
 * Centralized Validation Utilities for PetroPulse Bunk & Forecourt ERP
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

// Basic regex patterns
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;
export const CODE_REGEX = /^[A-Z0-9_-]{2,15}$/;

/**
 * Validates an email address. Returns null if valid, or an error message string if invalid.
 */
export function validateEmail(email?: string | null): string | null {
  if (!email || !email.trim()) {
    return 'Email address is required.';
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    return 'Please enter a valid email address (e.g. user@example.com).';
  }
  return null;
}

/**
 * Validates a phone number. Returns null if valid or empty (when optional), or an error message if invalid.
 */
export function validatePhone(phone?: string | null, required: boolean = false): string | null {
  if (!phone || !phone.trim()) {
    return required ? 'Phone number is required.' : null;
  }
  const cleanPhone = phone.trim().replace(/\s+/g, '');
  if (!PHONE_REGEX.test(cleanPhone) || cleanPhone.replace(/\D/g, '').length < 8) {
    return 'Please enter a valid phone number (at least 8-10 digits).';
  }
  return null;
}

/**
 * Validates a Bunk (Fuel Station) form payload
 */
export function validateBunkForm(data: {
  name: string;
  code?: string;
  address?: string;
  cityState?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  latitude?: string | number;
  longitude?: string | number;
  managerName?: string;
  operatingHours?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  // Name (required, min 3 chars)
  if (!data.name || !data.name.trim()) {
    errors.name = 'Bunk name is required.';
  } else if (data.name.trim().length < 3) {
    errors.name = 'Bunk name must be at least 3 characters.';
  }

  // Code (optional on creation since backend generates it, validate format if supplied)
  if (data.code && data.code.trim()) {
    const cleanCode = data.code.trim().toUpperCase();
    if (!CODE_REGEX.test(cleanCode)) {
      errors.code = 'Bunk code must be 2-15 uppercase alphanumeric characters (e.g. BUNK-000001).';
    }
  }

  // Phone (optional or required)
  if (data.phone && data.phone.trim()) {
    const cleanPhone = data.phone.trim().replace(/\s+/g, '');
    if (!PHONE_REGEX.test(cleanPhone) || cleanPhone.replace(/\D/g, '').length < 8) {
      errors.phone = 'Please enter a valid phone number (at least 8-10 digits).';
    }
  }

  // Email (optional)
  if (data.email && data.email.trim()) {
    if (!EMAIL_REGEX.test(data.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
  }

  // Postal Code (optional)
  if (data.postalCode && data.postalCode.trim()) {
    if (data.postalCode.trim().length < 4 || data.postalCode.trim().length > 10) {
      errors.postalCode = 'Postal code must be between 4 and 10 characters.';
    }
  }

  // GPS Coordinates (optional)
  if (data.latitude !== undefined && data.latitude !== '' && data.latitude !== null) {
    const lat = Number(data.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.latitude = 'Latitude must be a valid number between -90 and 90.';
    }
  }

  if (data.longitude !== undefined && data.longitude !== '' && data.longitude !== null) {
    const lng = Number(data.longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.longitude = 'Longitude must be a valid number between -180 and 180.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

import { isValidFuelCode, normalizeFuelCode, getFuelDisplayName } from './fuelConfig.ts';

/**
 * Validates a Nozzle form payload
 */
export function validateNozzleForm(data: {
  stationId: string;
  nozzleNumber: string | number;
  name?: string;
  fuelCode: string;
  tankFuelCode?: string;
  dispenserId?: string;
  initialTotalizer?: string | number;
}): ValidationResult {
  const errors: Record<string, string> = {};

  // Station ID (strictly required - every nozzle belongs to exactly one bunk)
  if (!data.stationId || !data.stationId.trim()) {
    errors.stationId = 'Parent bunk must be selected. Nozzles cannot be unassigned.';
  }

  // Nozzle Number (required, positive integer)
  if (data.nozzleNumber === undefined || data.nozzleNumber === '' || data.nozzleNumber === null) {
    errors.nozzleNumber = 'Nozzle number is required.';
  } else {
    const num = Number(data.nozzleNumber);
    if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
      errors.nozzleNumber = 'Nozzle number must be a positive whole number (e.g. 1, 2, 3).';
    }
  }

  // Fuel Code (required, must be one of the standard fuel types)
  if (!data.fuelCode || !data.fuelCode.trim()) {
    errors.fuelCode = 'Fuel product must be selected.';
  } else if (!isValidFuelCode(data.fuelCode)) {
    errors.fuelCode = `Unsupported fuel type "${data.fuelCode}". Supported fuel types are 98 Octane, 95 Octane, and Diesel.`;
  } else if (data.tankFuelCode && data.tankFuelCode.trim()) {
    // Cross-validation: nozzle fuel must strictly match the assigned tank's fuel product
    const normNozzle = normalizeFuelCode(data.fuelCode);
    const normTank = normalizeFuelCode(data.tankFuelCode);
    if (normNozzle !== normTank) {
      errors.fuelCode = `Incompatible fuel type: Nozzle fuel (${getFuelDisplayName(normNozzle)}) does not match assigned tank fuel (${getFuelDisplayName(normTank)}).`;
    }
  }

  // Initial Totalizer (optional, non-negative)
  if (data.initialTotalizer !== undefined && data.initialTotalizer !== '' && data.initialTotalizer !== null) {
    const tot = Number(data.initialTotalizer);
    if (isNaN(tot) || tot < 0) {
      errors.initialTotalizer = 'Initial totalizer reading cannot be negative.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates a User / Employee form payload
 */
export function validateUserForm(data: {
  name: string;
  email?: string;
  username?: string;
  role: string;
  stationId: string;
  phone?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  // Name (required, min 2 chars)
  if (!data.name || !data.name.trim()) {
    errors.name = 'Full name is required.';
  } else if (data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  }

  // Email or Username (at least one required, validate email format if provided)
  const hasEmail = Boolean(data.email && data.email.trim());
  const hasUsername = Boolean(data.username && data.username.trim());

  if (!hasEmail && !hasUsername) {
    errors.email = 'Either email address or username is required.';
  } else if (hasEmail && !EMAIL_REGEX.test(data.email!.trim())) {
    errors.email = 'Please provide a valid email format (e.g. user@domain.com).';
  } else if (hasUsername && data.username!.trim().length < 3) {
    errors.username = 'Username must be at least 3 characters.';
  }

  // Role (required)
  if (!data.role) {
    errors.role = 'Role must be selected.';
  }

  // Station ID (required for all non-superadmin users)
  if (data.role !== 'OWNER' && (!data.stationId || !data.stationId.trim())) {
    errors.stationId = 'Assigned bunk is required for this role.';
  }

  // Phone (optional)
  if (data.phone && data.phone.trim()) {
    const cleanPhone = data.phone.trim().replace(/\s+/g, '');
    if (!PHONE_REGEX.test(cleanPhone)) {
      errors.phone = 'Please enter a valid phone number.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates a Tank form payload
 * Enforces:
 * 1. Tank number, Tank Identifier, and Tank Name must be the same
 * 2. Capacity must be > 0, opening stock must not exceed safe filling capacity (safe filling blocked on overfill)
 */
export function validateTankForm(data: {
  tankNumber: string | number;
  tankIdentifier?: string;
  name?: string;
  fuelCode: string;
  capacityLiters: string | number;
  openingStockLiters: string | number;
  safeCapacityLiters?: string | number;
  lowThresholdLiters?: string | number;
}): ValidationResult {
  const errors: Record<string, string> = {};

  const identity = String(data.tankNumber ?? data.tankIdentifier ?? data.name ?? '').trim();
  if (!identity) {
    errors.tankNumber = 'Tank number / identifier / name is required.';
  }

  // Cross-check synchronization
  if (data.tankIdentifier && data.tankIdentifier.trim() !== identity) {
    errors.tankIdentifier = 'Tank Identifier must match Tank Number and Tank Name.';
  }
  if (data.name && data.name.trim() !== identity) {
    errors.name = 'Tank Name must match Tank Number and Tank Identifier.';
  }

  if (!data.fuelCode || !data.fuelCode.trim()) {
    errors.fuelCode = 'Fuel product must be selected.';
  }

  const cap = Number(data.capacityLiters);
  const opening = Number(data.openingStockLiters);
  const safe = data.safeCapacityLiters !== undefined ? Number(data.safeCapacityLiters) : Math.round(cap * 0.95);

  if (isNaN(cap) || cap <= 0) {
    errors.capacityLiters = 'Total capacity must be greater than zero.';
  }
  if (isNaN(opening) || opening < 0) {
    errors.openingStockLiters = 'Opening stock cannot be negative.';
  }
  if (!isNaN(cap) && opening > cap) {
    errors.openingStockLiters = `Opening stock (${opening} L) cannot exceed total capacity (${cap} L).`;
  }
  if (!isNaN(safe) && opening > safe) {
    errors.safeCapacityLiters = `Safe filling blocked: Opening stock (${opening} L) exceeds safe filling capacity (${safe} L).`;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Focuses or scrolls to the first invalid form element
 */
export function focusFirstInvalidField(formContainer?: HTMLElement | null): void {
  const container = formContainer || document;
  const firstInvalid = container.querySelector(
    '[aria-invalid="true"], .border-rose-500, .border-red-500'
  ) as HTMLElement | null;

  if (firstInvalid) {
    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (typeof firstInvalid.focus === 'function') {
      firstInvalid.focus();
    }
  }
}
