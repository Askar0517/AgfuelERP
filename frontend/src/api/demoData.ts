import {
  Station,
  FuelProduct,
  Tank,
  Dispenser,
  Nozzle,
  Employee,
  Shift,
  TankLoadDecanting,
  EODSettlement,
  RolePermission,
} from '../types';

export const FALLBACK_FUELS: FuelProduct[] = [
  {
    code: 'OCTANE_98',
    name: '98 Octane',
    shortName: '98 Oct',
    ratePerLiter: 112.5,
    densityStd15c: 752.0,
    densityTolerance: 3.0,
    color: '#DC2626',
  },
  {
    code: 'OCTANE_95',
    name: '95 Octane',
    shortName: '95 Oct',
    ratePerLiter: 104.25,
    densityStd15c: 745.0,
    densityTolerance: 3.0,
    color: '#16A34A',
  },
  {
    code: 'DIESEL',
    name: 'Diesel',
    shortName: 'Diesel',
    ratePerLiter: 92.8,
    densityStd15c: 830.0,
    densityTolerance: 3.0,
    color: '#EAB308',
  },
];

export const FALLBACK_STATIONS: Station[] = [];
export const FALLBACK_TANKS: Tank[] = [];
export const FALLBACK_NOZZLES: Nozzle[] = [];
export const FALLBACK_DISPENSERS: Dispenser[] = [];

export const FALLBACK_EMPLOYEES: Employee[] = [
  {
    id: 'emp-admin',
    name: 'Administrator',
    role: 'OWNER',
    email: 'admin@petropulse.io',
    phone: '+919876543210',
    stationId: '',
    username: 'admin',
    status: 'ACTIVE',
    isActive: true,
        shiftSchedule: 'GENERAL',
  },
];

export const FALLBACK_SHIFTS: Shift[] = [];
export const FALLBACK_TANK_LOADS: TankLoadDecanting[] = [];
export const FALLBACK_EOD_SETTLEMENTS: EODSettlement[] = [];
export const FALLBACK_PERMISSIONS: RolePermission[] = [];
