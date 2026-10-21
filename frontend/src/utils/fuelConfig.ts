/**
 * Authoritative Fuel Configuration for PetroPulse ERP
 * Defines the 3 standardized forecourt fuel types:
 * 1. 98 Octane (Red: #DC2626)
 * 2. 95 Octane (Green: #16A34A)
 * 3. Diesel (Yellow: #EAB308)
 */

export type FuelCode = 'OCTANE_98' | 'OCTANE_95' | 'DIESEL' | 'PETROL' | 'PREMIUM';

export interface FuelTypeDefinition {
  id: string;
  code: string;
  name: string;
  shortName: string;
  color: string;
  colorName: 'Red' | 'Green' | 'Yellow';
  displayName: string;
  colorHex: string;
  densityStd15c: number;
  densityTolerance: number;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  liquidGradient: string;
}

export const STANDARD_FUELS: FuelTypeDefinition[] = [
  {
    id: 'OCTANE_98',
    code: 'OCTANE_98',
    name: '98 Octane',
    shortName: '98 Oct',
    displayName: '98 Octane',
    colorHex: '#DC2626',
    color: '#DC2626',
    colorName: 'Red',
    densityStd15c: 752.0,
    densityTolerance: 3.0,
    description: 'High-performance 98-octane super-premium fuel for high-compression engines',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/60',
    badgeText: 'text-rose-700 dark:text-rose-300',
    badgeBorder: 'border-rose-200 dark:border-rose-800',
    liquidGradient: 'from-rose-500 to-rose-700',
  },
  {
    id: 'OCTANE_95',
    code: 'OCTANE_95',
    name: '95 Octane',
    shortName: '95 Oct',
    displayName: '95 Octane',
    colorHex: '#16A34A',
    color: '#16A34A',
    colorName: 'Green',
    densityStd15c: 745.0,
    densityTolerance: 3.0,
    description: 'Standard 95-octane unleaded motor fuel for passenger vehicles',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    badgeBorder: 'border-emerald-200 dark:border-emerald-800',
    liquidGradient: 'from-emerald-500 to-emerald-700',
  },
  {
    id: 'DIESEL',
    code: 'DIESEL',
    name: 'Diesel',
    shortName: 'Diesel',
    displayName: 'Diesel',
    colorHex: '#EAB308',
    color: '#EAB308',
    colorName: 'Yellow',
    densityStd15c: 830.0,
    densityTolerance: 3.0,
    description: 'Ultra-low sulfur commercial & passenger high-speed diesel',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60',
    badgeText: 'text-amber-800 dark:text-amber-200',
    badgeBorder: 'border-amber-200 dark:border-amber-800',
    liquidGradient: 'from-amber-400 to-amber-600',
  },
];

export const VALID_FUEL_CODES = ['OCTANE_98', 'OCTANE_95', 'DIESEL'] as const;

/**
 * Normalizes any legacy or variant fuel code to canonical code:
 * - 98 Octane / Premium / XP95 -> OCTANE_98
 * - 95 Octane / Petrol / MS -> OCTANE_95
 * - Diesel / HSD -> DIESEL
 */
export function normalizeFuelCode(rawCode?: string | null): string {
  if (!rawCode) return 'OCTANE_95';
  const c = rawCode.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (c === 'PREMIUM' || c === 'XP95' || c === 'OCTANE98' || c === 'OCTANE_98' || c === '98_OCTANE' || c === '98OCTANE' || c === 'OCT_98') {
    return 'OCTANE_98';
  }
  if (c === 'PETROL' || c === 'MS' || c === 'OCTANE95' || c === 'OCTANE_95' || c === '95_OCTANE' || c === '95OCTANE' || c === 'OCT_95') {
    return 'OCTANE_95';
  }
  if (c === 'DIESEL' || c === 'HSD') {
    return 'DIESEL';
  }
  return c;
}

export function isValidFuelCode(rawCode?: string | null): boolean {
  const norm = normalizeFuelCode(rawCode);
  return (VALID_FUEL_CODES as readonly string[]).includes(norm);
}

/**
 * Returns complete fuel definition for given fuel code (supports legacy PETROL/PREMIUM)
 */
export function getFuelDefinition(code?: string | null): FuelTypeDefinition {
  const norm = normalizeFuelCode(code);
  const found = STANDARD_FUELS.find((f) => f.code === norm);
  return found || STANDARD_FUELS[1]; // default 95 Octane
}

/**
 * Returns standardized display name ('98 Octane', '95 Octane', 'Diesel')
 */
export function getFuelDisplayName(code?: string | null): string {
  return getFuelDefinition(code).name;
}

/**
 * Returns authoritative display color
 */
export function getFuelColor(code?: string | null): string {
  return getFuelDefinition(code).color;
}

/**
 * Helper to build options for SelectDropdown
 */
export const FUEL_SELECT_OPTIONS = STANDARD_FUELS.map((f) => ({
  value: f.code,
  label: f.name,
  description: `${f.colorName} identifier • ${f.description}`,
  badge: f.colorName,
  badgeClass:
    f.colorName === 'Red'
      ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
      : f.colorName === 'Green'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
      : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800',
}));
