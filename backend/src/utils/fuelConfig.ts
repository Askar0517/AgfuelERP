/**
 * Authoritative Fuel Configuration for PetroPulse Backend
 * Defines the 3 standardized forecourt fuel types:
 * 1. 98 Octane (Red: #DC2626)
 * 2. 95 Octane (Green: #16A34A)
 * 3. Diesel (Yellow: #EAB308)
 */

export interface FuelTypeDefinition {
  id: string;
  code: string;
  name: string;
  displayName: string;
  shortName: string;
  color: string;
  colorHex: string;
  colorName: 'Red' | 'Green' | 'Yellow';
  densityStd15c: number;
  densityTolerance: number;
}

export const STANDARD_FUELS: FuelTypeDefinition[] = [
  {
    id: 'OCTANE_98',
    code: 'OCTANE_98',
    name: '98 Octane',
    displayName: '98 Octane',
    shortName: '98 Oct',
    color: '#DC2626',
    colorHex: '#DC2626',
    colorName: 'Red',
    densityStd15c: 752.0,
    densityTolerance: 3.0,
  },
  {
    id: 'OCTANE_95',
    code: 'OCTANE_95',
    name: '95 Octane',
    displayName: '95 Octane',
    shortName: '95 Oct',
    color: '#16A34A',
    colorHex: '#16A34A',
    colorName: 'Green',
    densityStd15c: 745.0,
    densityTolerance: 3.0,
  },
  {
    id: 'DIESEL',
    code: 'DIESEL',
    name: 'Diesel',
    displayName: 'Diesel',
    shortName: 'Diesel',
    color: '#EAB308',
    colorHex: '#EAB308',
    colorName: 'Yellow',
    densityStd15c: 830.0,
    densityTolerance: 3.0,
  },
];

export const VALID_FUEL_CODES = ['OCTANE_98', 'OCTANE_95', 'DIESEL'] as const;
export type StandardFuelCode = typeof VALID_FUEL_CODES[number];

export const STANDARD_FUEL_MAP: Record<StandardFuelCode, FuelTypeDefinition> = {
  OCTANE_98: STANDARD_FUELS[0],
  OCTANE_95: STANDARD_FUELS[1],
  DIESEL: STANDARD_FUELS[2],
};

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
  return VALID_FUEL_CODES.includes(norm as StandardFuelCode);
}

export function getFuelDefinition(code?: string | null): FuelTypeDefinition {
  const norm = normalizeFuelCode(code);
  const found = STANDARD_FUELS.find((f) => f.code === norm);
  return found || STANDARD_FUELS[1]; // default 95 Octane
}

export function getFuelDisplayName(code?: string | null): string {
  return getFuelDefinition(code).name;
}

export function getFuelColor(code?: string | null): string {
  return getFuelDefinition(code).color;
}
