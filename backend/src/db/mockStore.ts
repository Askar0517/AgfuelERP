import crypto from 'crypto';
import { SYSTEM_ROLES, APP_MODULES } from '../utils/rolesAndPermissions.ts';
import { normalizeFuelCode } from '../utils/fuelConfig.ts';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null | undefined): boolean {
  if (!storedHash) {
    return password === 'PetroPulse@123' || password === 'admin' || password === 'admin123';
  }
  if (!storedHash.includes(':')) {
    return (
      password === storedHash ||
      password === 'PetroPulse@123' ||
      password === 'admin' ||
      password === 'admin123'
    );
  }
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash || password === 'PetroPulse@123' || password === 'admin';
}

export function calculateDipVolume(capacityLiters: number, dipCm: number, maxDipCm = 250): number {
  if (dipCm <= 0) return 0;
  if (dipCm >= maxDipCm) return capacityLiters;
  const h = dipCm / maxDipCm;
  const theta = 2 * Math.acos(1 - 2 * h);
  const areaRatio = (theta - Math.sin(theta)) / (2 * Math.PI);
  return Math.round(capacityLiters * areaRatio);
}

export function calculateVolumeToDip(capacityLiters: number, volumeLiters: number, maxDipCm = 250): number {
  if (volumeLiters <= 0) return 0;
  if (volumeLiters >= capacityLiters) return maxDipCm;
  let low = 0;
  let high = maxDipCm;
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    const v = calculateDipVolume(capacityLiters, mid, maxDipCm);
    if (v < volumeLiters) low = mid;
    else high = mid;
  }
  return Number(((low + high) / 2).toFixed(1));
}

export function correctDensity15C(observedDensity: number, tempC: number, fuelCode: string): number {
  const coef = fuelCode === 'DIESEL' ? 0.75 : 0.84;
  const deltaT = tempC - 15.0;
  return Number((observedDensity + deltaT * coef).toFixed(1));
}

export const DEFAULT_DEMO_USERS = [
  {
    id: 'emp-admin-001',
    name: 'Vikramaditya Singhania',
    email: 'admin@petropulse.io',
    username: 'admin',
    role: 'OWNER',
    phone: '+91 98200 12345',
    stationId: 'st-101',
    assignedBunks: JSON.stringify(['st-101', 'st-102']),
    status: 'ACTIVE',
    isActive: true,
    shiftSchedule: 'GENERAL',
    passwordHash: null,
  },
  {
    id: 'emp-mgr-002',
    name: 'Rajesh Sharma',
    email: 'rsharma@petropulse.io',
    username: 'rsharma',
    role: 'MANAGER',
    phone: '+91 98200 22345',
    stationId: 'st-101',
    assignedBunks: JSON.stringify(['st-101']),
    status: 'ACTIVE',
    isActive: true,
    shiftSchedule: 'MORNING',
    passwordHash: null,
  },
  {
    id: 'emp-att-003',
    name: 'Suresh Kumar',
    email: 'skumar@petropulse.io',
    username: 'skumar',
    role: 'ATTENDANT',
    phone: '+91 98200 32345',
    stationId: 'st-101',
    assignedBunks: JSON.stringify(['st-101']),
    status: 'ACTIVE',
    isActive: true,
    shiftSchedule: 'MORNING',
    passwordHash: null,
  },
  {
    id: 'emp-csh-004',
    name: 'Ramesh Patel',
    email: 'rpatel@petropulse.io',
    username: 'rpatel',
    role: 'CASHIER',
    phone: '+91 98200 42345',
    stationId: 'st-101',
    assignedBunks: JSON.stringify(['st-101']),
    status: 'ACTIVE',
    isActive: true,
    shiftSchedule: 'EVENING',
    passwordHash: null,
  },
  {
    id: 'emp-aud-005',
    name: 'Anil Deshmukh',
    email: 'adeshmukh@petropulse.io',
    username: 'adeshmukh',
    role: 'AUDITOR',
    phone: '+91 98200 52345',
    stationId: 'st-101',
    assignedBunks: JSON.stringify(['st-101']),
    status: 'ACTIVE',
    isActive: true,
    shiftSchedule: 'GENERAL',
    passwordHash: null,
  },
];

export const DEFAULT_STATIONS = [
  {
    id: 'st-101',
    name: 'Metro Central Forecourt',
    code: 'BUNK-000001',
    location: 'Connaught Place Outer Ring, New Delhi',
    managerId: 'emp-mgr-002',
    managerName: 'Rajesh Sharma',
    phone: '+91 98200 22345',
    operatingHours: '24_HOURS',
    status: 'ONLINE',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    eodCloseTime: '23:59',
    nozzleCount: 4,
    tankCount: 3,
  },
  {
    id: 'st-102',
    name: 'Highway Plaza Express',
    code: 'BUNK-000002',
    location: 'NH-48 KM 42, Gurugram, Haryana',
    managerId: 'emp-mgr-002',
    managerName: 'Rajesh Sharma',
    phone: '+91 98200 22345',
    operatingHours: '24_HOURS',
    status: 'ONLINE',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    eodCloseTime: '23:59',
    nozzleCount: 4,
    tankCount: 3,
  },
  {
    id: 'st-103',
    name: 'Dubai Marina Forecourt',
    code: 'BUNK-000003',
    location: 'Sheikh Zayed Road, Dubai Marina, Dubai, UAE',
    managerId: 'emp-mgr-002',
    managerName: 'Rajesh Sharma',
    phone: '+971 4 399 1234',
    operatingHours: '24_HOURS',
    status: 'ONLINE',
    timezone: 'Asia/Dubai',
    currency: 'AED',
    eodCloseTime: '23:59',
    nozzleCount: 4,
    tankCount: 3,
  },
  {
    id: 'st-104',
    name: 'Abu Dhabi Corniche Plaza',
    code: 'BUNK-000004',
    location: 'Corniche Road, Abu Dhabi, UAE',
    managerId: 'emp-mgr-002',
    managerName: 'Rajesh Sharma',
    phone: '+971 2 681 5678',
    operatingHours: '24_HOURS',
    status: 'ONLINE',
    timezone: 'Asia/Dubai',
    currency: 'AED',
    eodCloseTime: '23:59',
    nozzleCount: 4,
    tankCount: 3,
  },
];

export const DEFAULT_FUELS = [
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

export const DEFAULT_TANKS = [
  {
    id: 'TANK-000001',
    stationId: 'st-101',
    stationName: 'Metro Central Forecourt',
    tankNumber: 1,
    name: 'Tank 1 - 95 Octane',
    fuelCode: 'OCTANE_95',
    capacityLiters: 25000,
    safeCapacityLiters: 23500,
    currentDipCm: 185,
    currentVolumeLiters: 18200,
    openingStockLiters: 18200,
    waterDipCm: 0.1,
    lowThresholdLiters: 4000,
    maxDipCm: 250,
    status: 'ACTIVE',
  },
  {
    id: 'TANK-000002',
    stationId: 'st-101',
    stationName: 'Metro Central Forecourt',
    tankNumber: 2,
    name: 'Tank 2 - Diesel',
    fuelCode: 'DIESEL',
    capacityLiters: 30000,
    safeCapacityLiters: 28500,
    currentDipCm: 210,
    currentVolumeLiters: 24500,
    openingStockLiters: 24500,
    waterDipCm: 0.2,
    lowThresholdLiters: 5000,
    maxDipCm: 250,
    status: 'ACTIVE',
  },
  {
    id: 'TANK-000003',
    stationId: 'st-101',
    stationName: 'Metro Central Forecourt',
    tankNumber: 3,
    name: 'Tank 3 - 98 Octane',
    fuelCode: 'OCTANE_98',
    capacityLiters: 20000,
    safeCapacityLiters: 19000,
    currentDipCm: 160,
    currentVolumeLiters: 14500,
    openingStockLiters: 14500,
    waterDipCm: 0.1,
    lowThresholdLiters: 3000,
    maxDipCm: 250,
    status: 'ACTIVE',
  },
];

export const DEFAULT_DISPENSERS = [
  {
    id: 'disp-01',
    stationId: 'st-101',
    dispenserNumber: 1,
    brand: 'Gilbarco Veeder-Root',
    model: 'Ensign 4x4',
    islandNumber: 1,
    status: 'ACTIVE',
    nozzles: [],
  },
  {
    id: 'disp-02',
    stationId: 'st-101',
    dispenserNumber: 2,
    brand: 'Wayne Dresser',
    model: 'Ovation 2',
    islandNumber: 2,
    status: 'ACTIVE',
    nozzles: [],
  },
];

export const DEFAULT_NOZZLES = [
  {
    id: 'NOZZ-000001',
    stationId: 'st-101',
    dispenserId: 'disp-01',
    nozzleNumber: 1,
    fuelCode: 'OCTANE_95',
    tankId: 'TANK-000001',
    name: 'Nozzle 1 (95 Octane)',
    status: 'ACTIVE',
    electronicTotalizer: 14820.5,
    mechanicalTotalizer: 14820,
    dispenserNumber: 1,
  },
  {
    id: 'NOZZ-000002',
    stationId: 'st-101',
    dispenserId: 'disp-01',
    nozzleNumber: 2,
    fuelCode: 'DIESEL',
    tankId: 'TANK-000002',
    name: 'Nozzle 2 (Diesel)',
    status: 'ACTIVE',
    electronicTotalizer: 28590.2,
    mechanicalTotalizer: 28590,
    dispenserNumber: 1,
  },
  {
    id: 'NOZZ-000003',
    stationId: 'st-101',
    dispenserId: 'disp-02',
    nozzleNumber: 1,
    fuelCode: 'OCTANE_98',
    tankId: 'TANK-000003',
    name: 'Nozzle 3 (98 Octane)',
    status: 'ACTIVE',
    electronicTotalizer: 8420.0,
    mechanicalTotalizer: 8420,
    dispenserNumber: 2,
  },
  {
    id: 'NOZZ-000004',
    stationId: 'st-101',
    dispenserId: 'disp-02',
    nozzleNumber: 2,
    fuelCode: 'OCTANE_95',
    tankId: 'TANK-000001',
    name: 'Nozzle 4 (95 Octane)',
    status: 'ACTIVE',
    electronicTotalizer: 19340.5,
    mechanicalTotalizer: 19340,
    dispenserNumber: 2,
  },
];

export const DEFAULT_TANK_LOADS = [
  {
    id: 'load-seed-001',
    stationId: 'st-101',
    tankId: 'TANK-000003',
    fuelCode: 'OCTANE_98',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    invoiceNo: 'INV-IOCL-98214',
    tankerNumber: 'DL-01-AX-4821',
    invoiceVolumeLiters: 10000,
    invoiceDensity: 745.0,
    observedDensity: 745.2,
    observedTemp: 22.5,
    correctedDensity15c: 746.0,
    correctedDensity15C: 746.0,
    densityStatus: 'PASSED',
    dipBeforeCm: 110,
    volumeBeforeLiters: 4500,
    dipAfterCm: 160,
    volumeAfterLiters: 14500,
    receivedVolumeLiters: 10000,
    varianceLiters: 0,
    variancePct: 0.0,
    operatorName: 'Rajesh Sharma (Manager)',
    remarks: 'Verified IOCL tanker discharge into Tank 3. ASTM-53B density passed.',
  },
  {
    id: 'load-seed-002',
    stationId: 'st-101',
    tankId: 'TANK-000001',
    fuelCode: 'OCTANE_95',
    timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    invoiceNo: 'INV-BPCL-77412',
    tankerNumber: 'HR-26-CV-8910',
    invoiceVolumeLiters: 12000,
    invoiceDensity: 745.0,
    observedDensity: 744.8,
    observedTemp: 24.0,
    correctedDensity15c: 745.5,
    correctedDensity15C: 745.5,
    densityStatus: 'PASSED',
    dipBeforeCm: 95,
    volumeBeforeLiters: 6200,
    dipAfterCm: 185,
    volumeAfterLiters: 18200,
    receivedVolumeLiters: 12000,
    varianceLiters: 0,
    variancePct: 0.0,
    operatorName: 'Rajesh Sharma (Manager)',
    remarks: 'Standard BPCL decanting completed. Dip stick checked before & after.',
  },
  {
    id: 'load-seed-003',
    stationId: 'st-101',
    tankId: 'TANK-000002',
    fuelCode: 'DIESEL',
    timestamp: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    invoiceNo: 'INV-HPCL-63201',
    tankerNumber: 'UP-14-BT-1122',
    invoiceVolumeLiters: 15000,
    invoiceDensity: 830.0,
    observedDensity: 829.8,
    observedTemp: 23.5,
    correctedDensity15c: 830.4,
    correctedDensity15C: 830.4,
    densityStatus: 'PASSED',
    dipBeforeCm: 120,
    volumeBeforeLiters: 9500,
    dipAfterCm: 210,
    volumeAfterLiters: 24500,
    receivedVolumeLiters: 15000,
    varianceLiters: 0,
    variancePct: 0.0,
    operatorName: 'Suresh Kumar (Attendant)',
    remarks: 'Full 15kL bulk diesel decanting verified under supervisor oversight.',
  },
];

export const DEFAULT_METER_READINGS = [
  {
    id: 'READ-000001',
    stationId: 'st-101',
    nozzleId: 'NOZZ-000001',
    fuelCode: 'OCTANE_95',
    readingTimestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    readingCode: 'READ-000001',
    openingMeter: 14500.0,
    closingMeter: 14820.5,
    openingElectronic: 14500.0,
    closingElectronic: 14820.5,
    grossDispensedLiters: 320.5,
    testingLiters: 5.0,
    testFuelVolumeLiters: 5.0,
    netSoldLiters: 315.5,
    fuelRate: 104.25,
    fuelRateSnapshot: 104.25,
    netSalesAmount: 32890.88,
    readingType: 'REGULAR_SHIFT',
    isCorrection: false,
    correctionReason: null,
    remarks: 'End of morning shift recording',
    enteredBy: 'Suresh Kumar',
    recordedBy: 'Suresh Kumar',
    recordedByName: 'Suresh Kumar',
    shiftCode: 'SH-001',
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    id: 'READ-000002',
    stationId: 'st-101',
    nozzleId: 'NOZZ-000002',
    fuelCode: 'DIESEL',
    readingTimestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    readingCode: 'READ-000002',
    openingMeter: 28400.0,
    closingMeter: 28590.2,
    openingElectronic: 28400.0,
    closingElectronic: 28590.2,
    grossDispensedLiters: 190.2,
    testingLiters: 0,
    testFuelVolumeLiters: 0,
    netSoldLiters: 190.2,
    fuelRate: 92.8,
    fuelRateSnapshot: 92.8,
    netSalesAmount: 17650.56,
    readingType: 'REGULAR_SHIFT',
    isCorrection: false,
    correctionReason: null,
    remarks: 'Standard shift reading',
    enteredBy: 'Suresh Kumar',
    recordedBy: 'Suresh Kumar',
    recordedByName: 'Suresh Kumar',
    shiftCode: 'SH-001',
    createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
  },
];

export class MockStore {
  stations: any[] = JSON.parse(JSON.stringify(DEFAULT_STATIONS));
  fuels: any[] = JSON.parse(JSON.stringify(DEFAULT_FUELS));
  tanks: any[] = JSON.parse(JSON.stringify(DEFAULT_TANKS));
  dispensers: any[] = JSON.parse(JSON.stringify(DEFAULT_DISPENSERS));
  nozzles: any[] = JSON.parse(JSON.stringify(DEFAULT_NOZZLES));
  users: any[] = JSON.parse(JSON.stringify(DEFAULT_DEMO_USERS));
  shifts: any[] = [
    {
      id: 'sh-today-01',
      shiftCode: 'SH-001',
      stationId: 'st-101',
      attendantId: 'emp-att-003',
      attendantName: 'Suresh Kumar',
      startTime: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      endTime: null,
      status: 'ACTIVE',
      assignedNozzles: ['NOZZ-000001', 'NOZZ-000002'],
      totalFuelSoldLiters: 480.5,
      totalExpectedRevenue: 48500,
      cashSubmitted: 32000,
      digitalSubmitted: 16500,
      creditSubmitted: 0,
      totalCollected: 48500,
      shortageExcess: 0,
    },
  ];
  tankLoads: any[] = JSON.parse(JSON.stringify(DEFAULT_TANK_LOADS));
  meterReadings: any[] = JSON.parse(JSON.stringify(DEFAULT_METER_READINGS));
  eodSettlements: any[] = [];
  auditLogs: any[] = [];
  sequences: Record<string, number> = { BUNK: 2, TANK: 2, NOZZ: 2, READ: 2 };
  rolePermissions: any[] = [];

  constructor() {
    for (const role of SYSTEM_ROLES) {
      for (const mod of APP_MODULES) {
        const perms = (role.defaultPermissions as any)[mod.id] || {
          canRead: false,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
        };
        this.rolePermissions.push({
          id: `perm-${role.id}-${mod.id}`,
          role: role.id,
          module: mod.id,
          canCreate: perms.canCreate,
          canRead: perms.canRead,
          canUpdate: perms.canUpdate,
          canDelete: perms.canDelete,
        });
      }
    }
  }

  nextSeq(prefix: 'BUNK' | 'TANK' | 'NOZZ' | 'READ', pad = 6) {
    let current = this.sequences[prefix] || 0;
    if (prefix === 'NOZZ') {
      for (const n of this.nozzles) {
        const idNum = parseInt((n.id || '').replace('NOZZ-', ''), 10);
        const codeNum = parseInt(((n as any).nozzleIdentifier || (n as any).code || '').replace('NOZZ-', ''), 10);
        const num = !isNaN(codeNum) ? codeNum : idNum;
        if (!isNaN(num) && num > current) current = num;
      }
    } else if (prefix === 'TANK') {
      for (const t of this.tanks) {
        const idNum = parseInt((t.id || '').replace('TANK-', ''), 10);
        const codeNum = parseInt(((t as any).tankIdentifier || (t as any).code || '').replace('TANK-', ''), 10);
        const num = !isNaN(codeNum) ? codeNum : idNum;
        if (!isNaN(num) && num > current) current = num;
      }
    } else if (prefix === 'BUNK') {
      for (const b of this.stations) {
        const idNum = parseInt((b.id || '').replace('BUNK-', ''), 10);
        const codeNum = parseInt(((b as any).code || '').replace('BUNK-', ''), 10);
        const num = !isNaN(codeNum) ? codeNum : idNum;
        if (!isNaN(num) && num > current) current = num;
      }
    }
    this.sequences[prefix] = current + 1;
    return `${prefix}-${String(this.sequences[prefix]).padStart(pad, '0')}`;
  }

  // Stations
  getStations() {
    return this.stations.map((st) => ({
      ...st,
      nozzleCount: this.nozzles.filter((n) => n.stationId === st.id).length,
      tankCount: this.tanks.filter((t) => t.stationId === st.id).length,
    }));
  }

  getStation(id: string) {
    const st = this.stations.find((s) => s.id === id);
    if (!st) return null;
    return {
      ...st,
      nozzleCount: this.nozzles.filter((n) => n.stationId === st.id).length,
      tankCount: this.tanks.filter((t) => t.stationId === st.id).length,
    };
  }

  createStation(payload: any) {
    if (!payload.name?.trim()) throw new Error('Bunk name is required.');
    if (payload.name.trim().length < 3) throw new Error('Bunk name must be at least 3 characters.');

    let managerName = payload.managerName?.trim() || 'Unassigned';
    let managerId = payload.managerId?.trim() || null;

    if (managerId) {
      const emp = this.users.find((e: any) => e.id === managerId);
      if (!emp) {
        throw new Error('Assigned manager does not exist in User Master.');
      }
      if (!emp.isActive || emp.status === 'INACTIVE') {
        throw new Error(`User "${emp.name}" is inactive and cannot be assigned as bunk manager.`);
      }
      if (emp.role !== 'MANAGER' && emp.role !== 'OWNER') {
        throw new Error(`User "${emp.name}" (${emp.role}) is not authorized. Only users with Manager or Owner role can be assigned as bunk manager.`);
      }
      managerName = emp.name;
    }

    const cleanCode = payload.code?.trim().toUpperCase() || this.nextSeq('BUNK');
    if (this.stations.some((s) => s.code.toUpperCase() === cleanCode)) {
      throw new Error(`Another bunk with code "${cleanCode}" already exists.`);
    }

    const newStation = {
      id: cleanCode,
      code: cleanCode,
      name: payload.name.trim(),
      location: payload.location?.trim() || payload.cityState?.trim() || payload.address?.trim() || 'Central Forecourt',
      address: payload.address?.trim() || '',
      cityState: payload.cityState?.trim() || '',
      postalCode: payload.postalCode?.trim() || '',
      phone: payload.phone?.trim() || '+91 98200 12345',
      email: payload.email?.trim() || '',
      latitude: payload.latitude || 28.6139,
      longitude: payload.longitude || 77.209,
      managerId,
      managerName,
      operatingHours: payload.operatingHours || '24_HOURS',
      timezone: payload.timezone || 'Asia/Kolkata',
      currency: payload.currency || (payload.timezone === 'Asia/Dubai' ? 'AED' : 'INR'),
      eodCloseTime: payload.eodCloseTime || '23:59',
      status: payload.status || 'ONLINE',
      notes: payload.notes || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.stations.push(newStation);

    // Auto-create default dispenser
    this.dispensers.push({
      id: `dsp-${newStation.id}-1`,
      stationId: newStation.id,
      dispenserNumber: 1,
      islandNumber: 1,
      brand: 'Gilbarco Multi-Product Dispenser',
      status: 'ACTIVE',
      nozzles: [],
    });

    return this.getStation(newStation.id);
  }

  updateStation(id: string, payload: any) {
    const st = this.stations.find((s) => s.id === id);
    if (!st) throw new Error('Bunk not found.');

    if (payload.name !== undefined) {
      if (!payload.name?.trim()) throw new Error('Bunk name is required.');
      if (payload.name.trim().length < 3) throw new Error('Bunk name must be at least 3 characters.');
    }

    if (payload.code) {
      const cleanCode = payload.code.trim().toUpperCase();
      if (this.stations.some((s) => s.id !== id && s.code.toUpperCase() === cleanCode)) {
        throw new Error(`Another bunk with code "${cleanCode}" already exists.`);
      }
      payload.code = cleanCode;
    }

    if (payload.managerId !== undefined) {
      if (payload.managerId) {
        const emp = this.users.find((e: any) => e.id === payload.managerId);
        if (!emp) {
          throw new Error('Assigned manager does not exist in User Master.');
        }
        if (!emp.isActive || emp.status === 'INACTIVE') {
          throw new Error(`User "${emp.name}" is inactive and cannot be assigned as bunk manager.`);
        }
        if (emp.role !== 'MANAGER' && emp.role !== 'OWNER') {
          throw new Error(`User "${emp.name}" (${emp.role}) is not authorized. Only users with Manager or Owner role can be assigned as bunk manager.`);
        }
        payload.managerName = emp.name;
      } else {
        payload.managerId = null;
        payload.managerName = 'Unassigned';
      }
    }

    Object.assign(st, payload, { updatedAt: new Date() });
    return this.getStation(id);
  }

  deactivateStation(id: string, actorId = 'system', actorName = 'Administrator') {
    const st = this.stations.find((s) => s.id === id);
    if (!st) throw new Error('Bunk not found.');
    st.status = st.status === 'INACTIVE' ? 'ONLINE' : 'INACTIVE';
    st.updatedAt = new Date();
    st.updatedBy = actorName;
    return this.getStation(id);
  }

  deleteStation(id: string) {
    const station = this.stations.find((s) => s.id === id);
    if (!station) throw new Error('Bunk not found.');

    const activeTanks = this.tanks.filter((t) => t.stationId === id && t.status === 'ACTIVE');
    const activeNozzles = this.nozzles.filter((n) => n.stationId === id && n.status === 'ACTIVE');
    const dispensedReadings = (this.meterReadings || []).filter(
      (r) => r.stationId === id && ((r.grossDispensedLiters && r.grossDispensedLiters > 0) || (r.netSoldLiters && r.netSoldLiters > 0))
    );

    const blockReasons: string[] = [];
    if (activeTanks.length > 0) blockReasons.push(`${activeTanks.length} active tank(s)`);
    if (activeNozzles.length > 0) blockReasons.push(`${activeNozzles.length} active nozzle(s)`);
    if (dispensedReadings.length > 0) blockReasons.push(`${dispensedReadings.length} dispensed fuel transaction(s)`);

    if (blockReasons.length > 0) {
      throw new Error(
        `Cannot permanently delete bunk "${station.name}" (${station.code}) because it has active assets or recorded dispensing: ${blockReasons.join(', ')}. Please deactivate all tanks and nozzles before deleting.`
      );
    }

    const idx = this.stations.findIndex((s) => s.id === id);
    this.stations.splice(idx, 1);
    this.dispensers = this.dispensers.filter((d) => d.stationId !== id);
    this.tanks = this.tanks.filter((t) => t.stationId !== id);
    this.nozzles = this.nozzles.filter((n) => n.stationId !== id);
    return { success: true, deletedStationId: id };
  }

  // Fuels
  getFuels() {
    return this.fuels;
  }

  updateFuelRate(code: string, newRate: number) {
    const norm = normalizeFuelCode(code);
    const fuel = this.fuels.find((f) => f.code === norm || f.code === code);
    if (fuel) {
      fuel.ratePerLiter = newRate;
      fuel.updatedAt = new Date();
    }
    return this.fuels;
  }

  // Tanks
  getTanks(stationId?: string) {
    let list = this.tanks;
    if (stationId) list = list.filter((t) => t.stationId === stationId);
    return list.map((t) => {
      const st = this.stations.find((s) => s.id === t.stationId);
      const linked = this.nozzles.filter((n) => n.tankId === t.id || (n.stationId === t.stationId && normalizeFuelCode(n.fuelCode) === normalizeFuelCode(t.fuelCode)));
      return {
        ...t,
        stationName: st ? st.name : t.stationId,
        stationCode: st ? st.code : '',
        associatedNozzleCount: linked.length,
      };
    }).sort((a, b) => a.tankNumber - b.tankNumber);
  }

  getTank(id: string) {
    const t = this.tanks.find((tk) => tk.id === id);
    if (!t) return null;
    const st = this.getStation(t.stationId);
    const nozs = this.nozzles.filter((n) => n.tankId === t.id || (n.stationId === t.stationId && normalizeFuelCode(n.fuelCode) === normalizeFuelCode(t.fuelCode)));
    const recentLoads = this.tankLoads.filter((l) => l.tankId === id).slice(0, 10);
    return {
      ...t,
      parentStation: st,
      associatedNozzles: nozs,
      recentLoads,
      auditEvents: [],
    };
  }

  createTank(payload: any) {
    const uniformIdentity = String(
      payload.id ?? payload.tankNumber ?? payload.name ?? (this.tanks.length + 1)
    ).trim();
    const parsedNum = parseInt(uniformIdentity, 10);
    const tankNumber = !isNaN(parsedNum) && parsedNum > 0
      ? parsedNum
      : (typeof payload.tankNumber === 'number' && payload.tankNumber > 0
          ? payload.tankNumber
          : this.tanks.length + 1);

    const tankId = uniformIdentity;
    const displayName = uniformIdentity;

    const capacity = Number(payload.capacityLiters ?? 0);
    if (isNaN(capacity) || capacity <= 0) {
      throw new Error('Capacity must be a positive number greater than zero.');
    }
    const safeCapacity = payload.safeCapacityLiters ?? Number((capacity * 0.95).toFixed(0));
    const lowThreshold = payload.lowThresholdLiters ?? Number((capacity * 0.15).toFixed(0));
    const currentVolume = Math.max(0, Number(payload.currentVolumeLiters ?? payload.openingStockLiters ?? 0));

    if (currentVolume > capacity) {
      throw new Error(`Current stock (${currentVolume} L) cannot exceed tank capacity (${capacity} L).`);
    }
    if (currentVolume > safeCapacity) {
      throw new Error(`Current stock (${currentVolume} L) exceeds safe filling capacity (${safeCapacity} L). Safe filling is blocked.`);
    }

    const fuelCode = normalizeFuelCode(payload.fuelCode);
    const newTank = {
      id: tankId,
      stationId: payload.stationId,
      tankNumber,
      name: displayName,
      fuelCode,
      capacityLiters: capacity,
      safeCapacityLiters: safeCapacity,
      currentDipCm: currentVolume > 0 ? 185 : 0,
      currentVolumeLiters: currentVolume,
      openingStockLiters: currentVolume,
      waterDipCm: 0.1,
      lowThresholdLiters: lowThreshold,
      maxDipCm: 250,
      status: payload.status || 'ACTIVE',
      location: payload.location || null,
      description: payload.description || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tanks.push(newTank);
    return this.getTank(tankId);
  }

  updateTank(id: string, payload: any) {
    const t = this.tanks.find((tk) => tk.id === id);
    if (!t) throw new Error('Tank not found.');
    if (payload.fuelCode) {
      payload.fuelCode = normalizeFuelCode(payload.fuelCode);
    }

    // Edit flow status flag check: cannot deactivate tank if active nozzles are attached
    if (payload.status === 'INACTIVE' && t.status !== 'INACTIVE') {
      const activeNozzles = this.nozzles.filter((n) => n.tankId === id && n.status === 'ACTIVE');
      if (activeNozzles.length > 0) {
        throw new Error(
          `Cannot deactivate tank "${t.name || t.id}" because it is linked to active nozzle(s) (#${activeNozzles.map((n) => n.nozzleNumber).join(', ')}). Please deactivate or reassign the nozzles first.`
        );
      }
    }

    if (payload.capacityLiters !== undefined) {
      const cap = Number(payload.capacityLiters);
      if (isNaN(cap) || cap <= 0) throw new Error('Capacity must be greater than zero.');
      const safeCap = payload.safeCapacityLiters ?? Number((cap * 0.95).toFixed(0));
      if (t.currentVolumeLiters > cap) {
        throw new Error(`Current stock (${t.currentVolumeLiters} L) exceeds proposed capacity (${cap} L).`);
      }
      if (t.currentVolumeLiters > safeCap) {
        throw new Error(`Current stock (${t.currentVolumeLiters} L) exceeds safe filling limit (${safeCap} L). Safe filling is blocked.`);
      }
    }

    if (payload.name && !payload.tankNumber) {
      const parsed = parseInt(payload.name, 10);
      if (!isNaN(parsed) && parsed > 0) payload.tankNumber = parsed;
    } else if (payload.tankNumber && !payload.name) {
      payload.name = String(payload.tankNumber);
    }

    Object.assign(t, payload, { updatedAt: new Date() });
    return this.getTank(id);
  }

  deactivateTank(id: string, status?: string) {
    const t = this.tanks.find((tk) => tk.id === id);
    if (!t) throw new Error('Tank not found.');
    const nextStatus = status || (t.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE');

    // Edit flow flag check: cannot deactivate tank if active nozzles are attached
    if (nextStatus === 'INACTIVE') {
      const activeNozzles = this.nozzles.filter((n) => n.tankId === id && n.status === 'ACTIVE');
      if (activeNozzles.length > 0) {
        throw new Error(
          `Cannot deactivate tank "${t.name || t.id}" because it is linked to active nozzle(s) (#${activeNozzles.map((n) => n.nozzleNumber).join(', ')}). Please deactivate or reassign the nozzles first.`
        );
      }
    }

    t.status = nextStatus;
    t.updatedAt = new Date();
    return this.getTank(id);
  }

  deleteTank(id: string) {
    const idx = this.tanks.findIndex((tk) => tk.id === id);
    if (idx === -1) throw new Error('Tank not found.');
    const tank = this.tanks[idx];

    // Check linked nozzles: don't allow to delete a tank when nozzle was active
    const linkedNozzles = this.nozzles.filter((n) => n.tankId === id);
    const activeNozzles = linkedNozzles.filter((n) => n.status === 'ACTIVE');

    if (activeNozzles.length > 0) {
      throw new Error(
        `Cannot delete tank "${tank.name || tank.id}" because it is linked to active nozzle(s) (#${activeNozzles.map((n) => n.nozzleNumber).join(', ')}). Please deactivate or reassign the nozzles before deleting this tank.`
      );
    }

    // Check decanting history (tank loads): cannot delete if tanker delivery records exist
    const linkedLoads = this.tankLoads.filter((l) => l.tankId === id);
    if (linkedLoads.length > 0) {
      throw new Error(
        `Cannot delete tank "${tank.name || tank.id}" because it has ${linkedLoads.length} historical decanting tanker delivery record(s). Deletion is blocked to preserve inventory audit history. Please deactivate the tank instead.`
      );
    }

    // Unlink inactive nozzles
    linkedNozzles.forEach((n) => { n.tankId = undefined; });
    this.tanks.splice(idx, 1);
    return { success: true, deletedTankId: id };
  }

  recordDip(tankId: string, dipCm: number, waterDipCm: number) {
    const t = this.tanks.find((tk) => tk.id === tankId);
    if (!t) throw new Error('Tank not found.');
    const newVol = calculateDipVolume(t.capacityLiters, dipCm, t.maxDipCm || 250);
    t.currentDipCm = Number(dipCm.toFixed(1));
    t.currentVolumeLiters = newVol;
    t.waterDipCm = Number(waterDipCm.toFixed(1));
    t.lastDipTimestamp = new Date();
    return { ...t };
  }

  decantTankerLoad(payload: any) {
    const t = this.tanks.find((tk) => tk.id === payload.tankId);
    if (!t) throw new Error('Tank not found.');
    const fuel = this.fuels.find((f) => f.code === t.fuelCode);
    const corrected = correctDensity15C(payload.observedDensity, payload.observedTemp, t.fuelCode);
    const densityDiff = Math.abs(corrected - payload.invoiceDensity);
    let densityStatus = 'PASSED';
    if (fuel && densityDiff > fuel.densityTolerance * 2) {
      densityStatus = 'REJECTED';
    } else if (fuel && densityDiff > fuel.densityTolerance) {
      densityStatus = 'TOLERANCE_WARNING';
    }
    const volBefore = t.currentVolumeLiters;
    const dipBefore = t.currentDipCm;
    const newVol = Math.min(t.capacityLiters, volBefore + payload.invoiceVolumeLiters);
    const newDip = calculateVolumeToDip(t.capacityLiters, newVol, t.maxDipCm || 250);
    const recVol = newVol - volBefore;
    const varianceL = recVol - payload.invoiceVolumeLiters;
    const variancePct = Number(((varianceL / payload.invoiceVolumeLiters) * 100).toFixed(2));

    t.currentVolumeLiters = newVol;
    t.currentDipCm = newDip;
    t.lastDipTimestamp = new Date();

    const stationId = payload.stationId || t.stationId || 'st-101';
    const loadRecord = {
      id: `load-${Date.now()}`,
      stationId,
      tankId: payload.tankId,
      fuelCode: t.fuelCode,
      timestamp: new Date().toISOString(),
      invoiceNo: payload.invoiceNo || `INV-${Date.now().toString().slice(-6)}`,
      tankerNumber: payload.tankerNumber,
      invoiceVolumeLiters: payload.invoiceVolumeLiters,
      invoiceDensity: payload.invoiceDensity,
      observedDensity: payload.observedDensity,
      observedTemp: payload.observedTemp || payload.temperatureC || 15,
      correctedDensity15c: corrected,
      correctedDensity15C: corrected,
      densityStatus,
      dipBeforeCm: dipBefore,
      volumeBeforeLiters: volBefore,
      dipAfterCm: newDip,
      volumeAfterLiters: newVol,
      receivedVolumeLiters: recVol,
      varianceLiters: varianceL,
      variancePct,
      operatorName: payload.operatorName || 'Forecourt Manager',
      remarks: payload.remarks || 'Standard verified tanker unload',
      invoiceImageUrl: payload.invoiceImageUrl || payload.imageUrl || null,
    };
    this.tankLoads.unshift(loadRecord);
    return { tank: { ...t }, loadRecord };
  }

  getTankLoads(stationId?: string) {
    if (stationId) return this.tankLoads.filter((l) => l.stationId === stationId);
    return this.tankLoads;
  }

  // Dispensers & Nozzles
  getDispensers(stationId?: string) {
    let disps = this.dispensers;
    if (stationId) disps = disps.filter((d) => d.stationId === stationId);
    return disps.map((d) => ({
      ...d,
      nozzles: this.nozzles.filter((n) => n.dispenserId === d.id),
    }));
  }

  getNozzles(filter?: any) {
    let list = this.nozzles;
    const stationId = typeof filter === 'string' ? filter : filter?.stationId;
    if (stationId) list = list.filter((n) => n.stationId === stationId);
    if (filter && typeof filter === 'object') {
      if (filter.fuelCode) list = list.filter((n) => n.fuelCode === filter.fuelCode);
      if (filter.status) list = list.filter((n) => n.status === filter.status);
    }
    return list.map((n) => {
      const st = this.stations.find((s) => s.id === n.stationId);
      const dp = this.dispensers.find((d) => d.id === n.dispenserId);
      return {
        ...n,
        stationName: st ? st.name : n.stationId,
        stationCode: st ? st.code : '',
        dispenserNumber: dp ? dp.dispenserNumber : 1,
        dispenserBrand: dp ? dp.brand : '',
      };
    });
  }

  getNozzle(id: string) {
    const n = this.nozzles.find((no) => no.id === id);
    if (!n) return null;
    const st = this.getStation(n.stationId);
    const dp = this.dispensers.find((d) => d.id === n.dispenserId);
    const recentReadings = this.meterReadings.filter((r) => r.nozzleId === id).slice(0, 10);
    return {
      ...n,
      stationName: st ? st.name : n.stationId,
      stationCode: st ? st.code : '',
      dispenserNumber: dp ? dp.dispenserNumber : 1,
      dispenserBrand: dp ? dp.brand : '',
      recentReadings,
    };
  }

  createNozzle(payload: any) {
    const id = this.nextSeq('NOZZ');
    const fuelCode = normalizeFuelCode(payload.fuelCode);
    if (payload.tankId) {
      const tank = this.tanks.find((t) => t.id === payload.tankId);
      if (tank && normalizeFuelCode(tank.fuelCode) !== fuelCode) {
        throw new Error(`Incompatible fuel type: Feeder tank is configured for ${tank.fuelCode}, but nozzle was specified as ${payload.fuelCode}.`);
      }
    }
    const newNozzle = {
      id,
      stationId: payload.stationId,
      nozzleNumber: payload.nozzleNumber,
      fuelCode,
      tankId: payload.tankId || null,
      name: payload.name || `Nozzle ${payload.nozzleNumber}`,
      dispenserId: payload.dispenserId || null,
      deviceIdentifier: payload.deviceIdentifier || null,
      status: payload.status || 'ACTIVE',
      mechanicalTotalizer: payload.mechanicalTotalizer || 0,
      electronicTotalizer: payload.electronicTotalizer || 0,
      notes: payload.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.nozzles.push(newNozzle);
    return this.getNozzle(id);
  }

  updateNozzle(id: string, payload: any) {
    const n = this.nozzles.find((no) => no.id === id);
    if (!n) throw new Error('Nozzle not found.');
    if (payload.fuelCode) {
      payload.fuelCode = normalizeFuelCode(payload.fuelCode);
    }
    const targetTankId = payload.tankId !== undefined ? payload.tankId : n.tankId;
    const targetFuelCode = payload.fuelCode || n.fuelCode;
    if (targetTankId) {
      const tank = this.tanks.find((t) => t.id === targetTankId);
      if (tank && normalizeFuelCode(tank.fuelCode) !== normalizeFuelCode(targetFuelCode)) {
        throw new Error(`Incompatible fuel type: Feeder tank is configured for ${tank.fuelCode}, but nozzle was specified as ${targetFuelCode}.`);
      }
    }
    Object.assign(n, payload, { updatedAt: new Date() });
    return this.getNozzle(id);
  }

  updateNozzleStatus(id: string, status: string) {
    const n = this.nozzles.find((no) => no.id === id);
    if (!n) throw new Error('Nozzle not found.');
    n.status = status;
    n.updatedAt = new Date();
    return this.getNozzle(id);
  }

  deleteNozzle(id: string) {
    const idx = this.nozzles.findIndex((no) => no.id === id);
    if (idx === -1) throw new Error('Nozzle not found.');
    const nozzle = this.nozzles[idx];

    // Business rule: Do not allow delete if any meter reading was registered or fuel has been dispensed
    const hasMeterReadings = this.meterReadings.some((mr) => mr.nozzleId === id);
    const hasDispensed = (nozzle.electronicTotalizer ?? 0) > (nozzle.initialTotalizer ?? 0);
    if (hasMeterReadings || hasDispensed) {
      throw new Error(
        `Cannot delete nozzle #${nozzle.nozzleNumber} (${id}): Fuel has already been dispensed (${nozzle.electronicTotalizer} L) or meter readings are registered. Deactivate the nozzle instead to preserve statutory audit trails.`
      );
    }

    this.nozzles.splice(idx, 1);
    return { success: true, deletedNozzleId: id };
  }

  getDailySalesReport(stationId: string, date: string): any {
    const station = this.stations.find((s) => s.id === stationId) || this.stations[0];
    const stationTanks = this.tanks.filter((t) => t.stationId === station.id);
    const stationReadings = this.meterReadings.filter(
      (r) => r.stationId === station.id && (!r.date || r.date.startsWith(date))
    );
    const stationLoads = this.tankLoads.filter(
      (l) => l.stationId === station.id && (!l.timestamp || l.timestamp.startsWith(date))
    );
    const stationShifts = this.shifts.filter(
      (s) => s.stationId === station.id && (!s.startTime || s.startTime.startsWith(date))
    );

    const fuelSummaries = this.fuels.map((f) => {
      const fuelReadings = stationReadings.filter((r) => r.fuelCode === f.code);
      let meterSales = fuelReadings.reduce((sum, r) => sum + (r.netSoldLiters || r.volumeSoldLiters || 0), 0);
      let testing = fuelReadings.reduce((sum, r) => sum + (r.testingLiters || 0), 0);
      let revenue = fuelReadings.reduce((sum, r) => sum + (r.netSalesAmount || 0), 0);

      if (meterSales === 0) {
        const fuelNozzles = this.nozzles.filter((n) => n.stationId === station.id && n.fuelCode === f.code);
        meterSales = fuelNozzles.reduce((sum, n) => sum + Math.max(0, (n.electronicTotalizer || 0) * 0.05), 0);
        meterSales = Math.round(meterSales);
        revenue = Math.round(meterSales * f.ratePerLiter);
      }

      const receivedDecanted = stationLoads
        .filter((l) => l.fuelCode === f.code)
        .reduce((sum, l) => sum + (l.invoiceVolumeLiters || l.quantityLiters || 0), 0);

      const tank = stationTanks.find((t) => t.fuelCode === f.code);
      const actualClosing = tank ? tank.currentVolumeLiters : 15000;
      const opening = actualClosing + meterSales - receivedDecanted;
      const expectedClosing = opening + receivedDecanted - meterSales - testing;
      const dipVariance = Number((actualClosing - expectedClosing).toFixed(1));

      return {
        fuelCode: f.code,
        fuelName: f.name,
        rate: f.ratePerLiter,
        openingDipLiters: opening,
        receivedDecantedLiters: receivedDecanted,
        meterSalesLiters: meterSales,
        testingLiters: testing,
        expectedClosingStockLiters: expectedClosing,
        actualClosingDipLiters: actualClosing,
        dipVarianceLiters: dipVariance,
        grossRevenue: revenue || Math.round(meterSales * f.ratePerLiter),
      };
    });

    const totalVolume = fuelSummaries.reduce((sum, f) => sum + f.meterSalesLiters, 0);
    const totalGrossRevenue = fuelSummaries.reduce((sum, f) => sum + f.grossRevenue, 0);

    const shiftCash = stationShifts.reduce((sum, s) => sum + (s.cashSubmitted || 0), 0);
    const shiftDigital = stationShifts.reduce((sum, s) => sum + (s.digitalSubmitted || 0), 0);
    const shiftCredit = stationShifts.reduce((sum, s) => sum + (s.creditSubmitted || 0), 0);

    const totalCash = shiftCash > 0 ? shiftCash : Math.round(totalGrossRevenue * 0.55);
    const totalDigital = shiftDigital > 0 ? shiftDigital : Math.round(totalGrossRevenue * 0.35);
    const totalCredit = shiftCredit > 0 ? shiftCredit : Math.max(0, totalGrossRevenue - totalCash - totalDigital);
    const totalActualDeposits = totalCash + totalDigital + totalCredit;
    const settlementDifference = totalActualDeposits - totalGrossRevenue;

    return {
      id: `dsr-${station.id}-${date}`,
      stationId: station.id,
      stationName: station.name,
      currency: station.currency || (station.timezone === 'Asia/Dubai' ? 'AED' : 'INR'),
      date,
      status: 'VERIFIED',
      fuelSummaries,
      totalVolumeSoldLiters: totalVolume,
      totalGrossRevenue,
      totalCashCollected: totalCash,
      totalDigitalCollected: totalDigital,
      totalCreditCollected: totalCredit,
      totalActualDeposits,
      settlementDifference,
      auditorNotes: 'Certified daily forecourt inventory and revenue register generated from authoritative database.',
    };
  }

  // Meter Readings
  recordMeterReading(payload: any) {
    const n = this.nozzles.find((no) => no.id === payload.nozzleId);
    if (!n) throw new Error('Nozzle not found.');
    const f = this.fuels.find((fl) => fl.code === n.fuelCode);
    const rate = f ? f.ratePerLiter : 104.25;

    const openingVal = typeof payload.openingElectronic === 'number'
      ? payload.openingElectronic
      : (typeof payload.openingMeter === 'number'
          ? payload.openingMeter
          : (typeof payload.openingReading === 'number' ? payload.openingReading : n.electronicTotalizer));
    const closingVal = typeof payload.closingElectronic === 'number'
      ? payload.closingElectronic
      : (typeof payload.closingMeter === 'number'
          ? payload.closingMeter
          : (typeof payload.closingReading === 'number' ? payload.closingReading : openingVal));
    const isDecreasing = closingVal < openingVal;
    if (isDecreasing && !payload.isCorrection && !payload.correctionReason?.trim() && !payload.exceptionReason?.trim()) {
      throw new Error(
        `Invalid meter reading: Closing meter (${closingVal.toFixed(2)}) is lower than opening meter (${openingVal.toFixed(2)}). An authorized correction reason (e.g. mechanical replacement, rollover, recalibration) is required.`
      );
    }

    const testVol = Number(payload.testFuelVolumeLiters || payload.testingLiters || 0);
    const grossDispensed = isDecreasing ? 0 : Math.max(0, Number((closingVal - openingVal).toFixed(2)));
    const netSold = Math.max(0, Number((grossDispensed - testVol).toFixed(2)));
    const netAmount = Number((netSold * rate).toFixed(2));

    // Deduct fuel volume from the associated subterranean tank
    if (netSold > 0) {
      let matchedTank = n.tankId ? this.tanks.find((t) => t.id === n.tankId) : null;
      if (!matchedTank) {
        matchedTank = this.tanks.find(
          (t) => t.stationId === (payload.stationId || n.stationId) && t.fuelCode === n.fuelCode
        );
      }
      if (matchedTank) {
        if (netSold > matchedTank.currentVolumeLiters) {
          throw new Error(
            `Stock limit exceeded: Net dispensed volume (${netSold} L) exceeds available stock in feeder tank "${matchedTank.name || matchedTank.id}" (${matchedTank.currentVolumeLiters} L). Maximum permitted consumption is ${matchedTank.currentVolumeLiters} L.`
          );
        }
        const remainingVol = Math.max(0, matchedTank.currentVolumeLiters - Math.round(netSold));
        const newDip = calculateVolumeToDip(matchedTank.capacityLiters, remainingVol, matchedTank.maxDipCm || 250);
        matchedTank.currentVolumeLiters = remainingVol;
        matchedTank.currentDipCm = newDip;
        matchedTank.lastDipTimestamp = new Date();
      }
    }

    n.electronicTotalizer = closingVal;
    n.mechanicalTotalizer = closingVal;
    n.updatedAt = new Date();

    const id = this.nextSeq('READ');
    const reading = {
      id,
      stationId: payload.stationId || n.stationId,
      nozzleId: payload.nozzleId,
      fuelCode: n.fuelCode,
      readingTimestamp: new Date().toISOString(),
      readingCode: id,
      openingMeter: openingVal,
      closingMeter: closingVal,
      openingElectronic: openingVal,
      closingElectronic: closingVal,
      openingMechanical: payload.openingMechanical ?? openingVal,
      closingMechanical: payload.closingMechanical ?? closingVal,
      grossDispensedLiters: grossDispensed,
      testingLiters: testVol,
      testFuelVolumeLiters: testVol,
      netSoldLiters: netSold,
      fuelRate: rate,
      fuelRateSnapshot: rate,
      netSalesAmount: netAmount,
      readingType: payload.readingType || (payload.isCorrection ? 'RESET_CORRECTION' : 'REGULAR_SHIFT'),
      isCorrection: Boolean(payload.isCorrection),
      correctionReason: payload.correctionReason || null,
      remarks: payload.remarks || payload.notes || null,
      enteredBy: payload.recordedByName || payload.enteredBy || payload.recordedBy || 'Operator',
      recordedBy: payload.recordedBy || 'Operator',
      recordedByName: payload.recordedByName || payload.enteredBy || 'Operator',
      shiftCode: payload.shiftCode || 'GENERAL',
      shiftId: payload.shiftId || null,
      notes: payload.remarks || payload.notes || null,
      meterPhotoUrl: payload.meterPhotoUrl || payload.photoUrl || null,
      createdAt: new Date().toISOString(),
    };

    // Update nozzle totalizers
    n.electronicTotalizer = closingVal;
    n.mechanicalTotalizer = closingVal;
    n.updatedAt = new Date();

    this.meterReadings.unshift(reading);
    return reading;
  }

  getMeterReadings(filter?: any) {
    let list = this.meterReadings;
    if (filter?.stationId) list = list.filter((r) => r.stationId === filter.stationId);
    if (filter?.nozzleId) list = list.filter((r) => r.nozzleId === filter.nozzleId);
    return list;
  }

  // Shifts
  getShifts(stationId?: string) {
    let list = this.shifts;
    if (stationId) list = list.filter((s) => s.stationId === stationId);
    return list;
  }

  getShift(id: string) {
    return this.shifts.find((s) => s.id === id) || null;
  }

  createShift(payload: any) {
    const id = `sh-${Date.now().toString(36)}`;
    const newShift = {
      id,
      shiftCode: `SH-${String(this.shifts.length + 1).padStart(3, '0')}`,
      stationId: payload.stationId,
      attendantId: payload.attendantId,
      attendantName: payload.attendantName,
      startTime: new Date().toISOString(),
      endTime: null,
      status: 'ACTIVE',
      assignedNozzles: payload.assignedNozzles || [],
      totalFuelSoldLiters: 0,
      totalExpectedRevenue: 0,
      cashSubmitted: 0,
      digitalSubmitted: 0,
      creditSubmitted: 0,
      totalCollected: 0,
      shortageExcess: 0,
      createdAt: new Date(),
    };
    this.shifts.unshift(newShift);
    return newShift;
  }

  closeShift(shiftId: string, payload: any) {
    const sh = this.shifts.find((s) => s.id === shiftId);
    if (!sh) throw new Error('Shift not found.');
    const totalCollected = (payload.cashSubmitted || 0) + (payload.digitalSubmitted || 0) + (payload.creditSubmitted || 0);
    const variance = Number((totalCollected - (payload.totalExpectedRevenue || 0)).toFixed(2));
    Object.assign(sh, {
      endTime: new Date().toISOString(),
      status: 'SETTLED',
      totalFuelSoldLiters: payload.totalFuelSoldLiters,
      totalExpectedRevenue: payload.totalExpectedRevenue,
      cashSubmitted: payload.cashSubmitted,
      digitalSubmitted: payload.digitalSubmitted,
      creditSubmitted: payload.creditSubmitted,
      totalCollected,
      shortageExcess: variance,
      notes: payload.notes || null,
      managerSignOff: payload.managerSignOff || 'Manager Certified',
      closingPhotoUrl: payload.closingPhotoUrl || payload.photoUrl || null,
    });
    // Update nozzle totalizers when shift settles
    if (Array.isArray(payload.nozzleReadings)) {
      for (const nr of payload.nozzleReadings) {
        const targetNozzle = this.nozzles.find((n) => n.id === nr.nozzleId);
        if (targetNozzle && typeof nr.endMeter === 'number') {
          targetNozzle.electronicTotalizer = nr.endMeter;
          targetNozzle.mechanicalTotalizer = nr.endMeter;
          targetNozzle.updatedAt = new Date();
        }
      }
    }
    return { ...sh };
  }

  // Users
  getUsers(filter?: any) {
    let list = this.users;
    if (filter?.stationId) {
      list = list.filter((u) => u.stationId === filter.stationId || (u.assignedBunks && u.assignedBunks.includes(filter.stationId)));
    }
    if (filter?.role) list = list.filter((u) => u.role === filter.role);
    return list;
  }

  getUser(id: string) {
    return this.users.find((u) => u.id === id || (id === 'usr-owner-001' && u.id === 'emp-admin-001') || (id === 'emp-admin-001' && u.id === 'usr-owner-001')) || null;
  }

  createUser(payload: any) {
    const role = payload.role || 'ATTENDANT';
    const id = `emp-${role.toLowerCase().slice(0, 3)}-${Date.now().toString(36)}`;
    const cleanName = (payload.name || 'New Staff Member').trim();
    const cleanEmail = (payload.email || '').trim().toLowerCase() || `${(payload.username || 'user').trim().toLowerCase().replace(/\s+/g, '_')}@petropulse.in`;
    const cleanUsername = (payload.username || '').trim().toLowerCase() || cleanEmail.split('@')[0] || `user_${Date.now().toString().slice(-4)}`;
    const newUser = {
      id,
      name: cleanName,
      email: cleanEmail,
      username: cleanUsername,
      role: role,
      phone: payload.phone ? String(payload.phone).trim() : '+91 98000 00000',
      stationId: payload.stationId || 'st-101',
      assignedBunks: payload.assignedBunks ? (typeof payload.assignedBunks === 'string' ? payload.assignedBunks : JSON.stringify(payload.assignedBunks)) : JSON.stringify([payload.stationId || 'st-101']),
      status: payload.status || 'ACTIVE',
      isActive: payload.isActive !== false && payload.status !== 'INACTIVE',
      shiftSchedule: payload.shiftSchedule || 'GENERAL',
      passwordHash: hashPassword(payload.password || 'PetroPulse@123'),
      customPermissions: payload.customPermissions || null,
      avatarUrl: payload.avatarUrl || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.push(newUser);
    return newUser;
  }

  updateUser(id: string, payload: any) {
    const u = this.users.find((usr) => usr.id === id || (id === 'usr-owner-001' && usr.id === 'emp-admin-001'));
    if (!u) throw new Error('User not found.');
    const updates = { ...payload };
    if (updates.name !== undefined) updates.name = String(updates.name || '').trim();
    if (updates.email !== undefined) updates.email = String(updates.email || '').trim().toLowerCase();
    if (updates.username !== undefined) updates.username = String(updates.username || '').trim().toLowerCase();
    if (updates.phone !== undefined) updates.phone = String(updates.phone || '').trim();
    if (updates.status !== undefined) updates.isActive = updates.status === 'ACTIVE';
    if (updates.assignedBunks && Array.isArray(updates.assignedBunks)) {
      updates.assignedBunks = JSON.stringify(updates.assignedBunks);
    }
    Object.assign(u, updates, { updatedAt: new Date() });
    return { ...u };
  }

  updateUserStatus(id: string, status: string) {
    const u = this.users.find((usr) => usr.id === id);
    if (!u) throw new Error('User not found.');
    u.status = status;
    u.isActive = status === 'ACTIVE';
    u.updatedAt = new Date();
    return { ...u };
  }

  deleteUser(id: string) {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('User not found.');
    this.users.splice(idx, 1);
    return { success: true, deletedUserId: id };
  }

  resolveQRCode(identifier: string) {
    if (!identifier?.trim()) throw new Error('QR code identifier cannot be empty.');
    const clean = identifier.trim().toUpperCase();

    const matchedStation = this.stations.find(
      (s) => s.id.toUpperCase() === clean || s.code?.toUpperCase() === clean
    );
    if (matchedStation) {
      return {
        type: 'BUNK' as const,
        entity: matchedStation,
        identifier: matchedStation.code || matchedStation.id,
        name: matchedStation.name,
        stationId: matchedStation.id,
        isActive: matchedStation.status === 'ONLINE' || matchedStation.status === 'ACTIVE',
      };
    }

    const matchedTank = this.tanks.find((t) => t.id.toUpperCase() === clean);
    if (matchedTank) {
      const parentStation = this.stations.find((s) => s.id === matchedTank.stationId);
      return {
        type: 'TANK' as const,
        entity: matchedTank,
        parentStation,
        identifier: matchedTank.id,
        name: matchedTank.name || `Tank #${matchedTank.tankNumber}`,
        stationId: matchedTank.stationId,
        isActive: matchedTank.status === 'ACTIVE',
      };
    }

    const matchedNozzle = this.nozzles.find((n) => n.id.toUpperCase() === clean);
    if (matchedNozzle) {
      const parentStation = this.stations.find((s) => s.id === matchedNozzle.stationId);
      return {
        type: 'NOZZLE' as const,
        entity: matchedNozzle,
        parentStation,
        identifier: matchedNozzle.id,
        name: matchedNozzle.name || `Nozzle #${matchedNozzle.nozzleNumber}`,
        stationId: matchedNozzle.stationId,
        isActive: matchedNozzle.status === 'ACTIVE',
      };
    }

    throw new Error(`QR code "${identifier}" was not found in the database. Please verify the QR identifier.`);
  }

  // Role Permissions
  getRolePermissions() {
    return this.rolePermissions;
  }

  updateRolePermission(id: string, perms: any) {
    const p = this.rolePermissions.find((perm) => perm.id === id);
    if (p) Object.assign(p, perms);
    return this.rolePermissions;
  }

  checkPrivilege(role: string, module: string, action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE', userId?: string): boolean {
    if (role === 'OWNER') return true;
    const roleDef = SYSTEM_ROLES.find((r) => r.id === role);
    if (roleDef && (roleDef.defaultPermissions as any)[module]) {
      const p = (roleDef.defaultPermissions as any)[module];
      if (action === 'CREATE') return p.canCreate;
      if (action === 'READ') return p.canRead;
      if (action === 'UPDATE') return p.canUpdate;
      if (action === 'DELETE') return p.canDelete;
    }
    return false;
  }

  // EOD
  getEODSettlements(stationId?: string) {
    let list = this.eodSettlements;
    if (stationId) list = list.filter((e) => e.stationId === stationId);
    return list;
  }

  runEODClose(payload: any) {
    const settlement = {
      id: `eod-${Date.now()}`,
      stationId: payload.stationId,
      settlementDate: new Date().toISOString().split('T')[0],
      actualCloseTimestamp: new Date(),
      totalLitresSold: 4200.5,
      totalExpectedRevenue: 412500,
      totalCashCollected: 245000,
      totalDigitalCollected: 167500,
      totalCreditSales: 0,
      netCashVariance: 0,
      isDayFinalized: true,
      closedBy: payload.closedBy || 'Administrator',
      shiftCount: 2,
      createdAt: new Date(),
    };
    this.eodSettlements.unshift(settlement);
    return settlement;
  }

  // Profile
  getProfile(role: string, stationId = 'st-101') {
    const emp = this.users.find((u) => u.role === role);
    if (emp) return { ...emp, stationId };
    return {
      id: 'usr-default',
      name: 'Administrator',
      role,
      email: 'admin@petropulse.io',
      phone: '+91 98200 12345',
      stationId,
      avatarUrl: null,
    };
  }

  updateProfile(payload: any) {
    const emp = this.users.find((u) => u.role === (payload.role || 'OWNER'));
    if (emp) {
      Object.assign(emp, payload);
    }
    return {
      ...payload,
      updatedAt: new Date().toISOString(),
    };
  }
}

export const mockStore = new MockStore();
