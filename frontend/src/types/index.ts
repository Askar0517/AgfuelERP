export type FuelCode = 'OCTANE_98' | 'OCTANE_95' | 'DIESEL' | 'PETROL' | 'PREMIUM';
export type UserRole = 'OWNER' | 'MANAGER' | 'ATTENDANT' | 'CASHIER' | 'AUDITOR';

export interface Station {
  id: string;
  name: string;
  code: string;
  location: string;
  managerId?: string;
  managerName: string;
  phone: string;
  address?: string;
  cityState?: string;
  postalCode?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  timezone: string;
  operatingHours: string;
  eodCloseTime: string;
  status: string;
  currency?: string;
  createdAt?: string;
  nozzleCount?: number;
  tankCount?: number;
}

export interface FuelProduct {
  code: FuelCode;
  name: string;
  shortName: string;
  ratePerLiter: number;
  densityStd15c: number;
  densityStandard15C?: number;
  densityTolerance: number;
  color: string;
  colorName?: string;
  globalRatePerLiter?: number;
  stationRatePerLiter?: number | null;
  isStationCustom?: boolean;
  stationId?: string | null;
  updatedAt?: string;
}

export interface Tank {
  id: string;
  stationId: string;
  tankNumber: number;
  name?: string;
  fuelCode: FuelCode;
  capacityLiters: number;
  safeCapacityLiters: number;
  currentDipCm: number;
  currentVolumeLiters: number;
  openingStockLiters?: number;
  waterDipCm: number;
  lowThresholdLiters: number;
  lowAlertThresholdLiters?: number;
  maxDipCm: number;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  location?: string;
  description?: string;
  lastDipTimestamp: string;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface TankLoadDecanting {
  id: string;
  stationId: string;
  tankId: string;
  fuelCode: FuelCode;
  timestamp: string;
  invoiceNo: string;
  tankerNumber: string;
  invoiceVolumeLiters: number;
  invoiceDensity: number;
  observedDensity: number;
  observedTemp: number;
  correctedDensity15c: number;
  correctedDensity15C?: number;
  densityStatus: string;
  dipBeforeCm: number;
  volumeBeforeLiters: number;
  dipAfterCm: number;
  volumeAfterLiters: number;
  receivedVolumeLiters: number;
  varianceLiters: number;
  variancePct: number;
  variancePercentage?: number;
  operatorName: string;
  remarks?: string;
  invoiceImageUrl?: string;
}

export interface Nozzle {
  id: string;
  dispenserId: string;
  stationId: string;
  tankId?: string;
  fuelCode: FuelCode;
  nozzleNumber: number;
  name?: string;
  deviceIdentifier?: string;
  notes?: string;
  mechanicalTotalizer: number;
  electronicTotalizer: number;
  status: string;
  stationName?: string;
  dispenserNumber?: number;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Dispenser {
  id: string;
  stationId: string;
  dispenserNumber: number;
  islandNumber: number;
  brand: string;
  status: string;
  nozzles: Nozzle[];
}

export interface ManualMeterReading {
  id: string;
  stationId: string;
  nozzleId: string;
  fuelCode: FuelCode;
  openingMeter: number;
  closingMeter: number;
  grossDispensedLiters: number;
  testingLiters: number;
  netSoldLiters: number;
  fuelRate: number;
  netSalesAmount: number;
  readingType?: 'REGULAR_SHIFT' | 'PERIODIC_CHECK' | 'CALIBRATION' | 'RESET_CORRECTION';
  isCorrection?: boolean;
  correctionReason?: string;
  remarks?: string;
  enteredBy: string;
  readingTimestamp: string;
  shiftCode?: string;
  recordedBy?: string;
  recordedByName?: string;
  meterPhotoUrl?: string;
}

export interface AuditLog {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  actorId: string;
  actorName: string;
  detailsJson?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface Employee {
  id: string;
  stationId: string;
  name: string;
  email?: string;
  username?: string;
  role: UserRole;
  phone: string;
  shiftSchedule: string;
  isActive: boolean;
  status?: string;
  assignedIsland?: number;
  assignedBunks?: string;
  customPermissions?: string;
  avatarUrl?: string;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ModulePermission {
  canRead: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export type PermissionMatrix = Record<string, ModulePermission>;

export interface RoleDefinition {
  id: UserRole;
  name: string;
  description: string;
  level: number;
  assignableBy: UserRole[];
  badgeBg: string;
  badgeText: string;
  defaultPermissions: PermissionMatrix;
}

export interface Shift {
  id: string;
  stationId: string;
  shiftCode: string;
  attendantId: string;
  attendantName: string;
  islandNumber: number;
  startTime: string;
  endTime?: string;
  status: string;
  totalFuelSoldLiters: number;
  totalExpectedRevenue: number;
  cashSubmitted: number;
  digitalSubmitted: number;
  creditSubmitted: number;
  totalCollected: number;
  shortageExcess: number;
  denominationsJson?: string;
  notes?: string;
  managerSignOff?: string;
  closingPhotoUrl?: string;
  nozzleReadings?: any[];
}

export interface EODSettlement {
  id: string;
  stationId: string;
  settlementDate: string;
  timezone: string;
  scheduledCloseTime: string;
  actualCloseTimestamp: string;
  status: string;
  totalVolumeSold: number;
  totalGrossRevenue: number;
  totalCash: number;
  totalDigital: number;
  totalCredit: number;
  actualDeposits: number;
  settlementDifference: number;
  isAutoClosed: boolean;
  closedBy: string;
  auditorNotes?: string;
}

export interface RolePermission {
  id: string;
  role: UserRole;
  module: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface DSRFuelItem {
  fuelCode: FuelCode;
  fuelName: string;
  rate: number;
  openingDipLiters: number;
  receivedDecantedLiters: number;
  meterSalesLiters: number;
  testingLiters: number;
  expectedClosingStockLiters: number;
  actualClosingDipLiters: number;
  dipVarianceLiters: number;
  grossRevenue: number;
}

export interface DailySalesReport {
  id: string;
  stationId: string;
  date: string;
  status: string;
  fuelSummaries: DSRFuelItem[];
  totalVolumeSoldLiters: number;
  totalGrossRevenue: number;
  totalCashCollected: number;
  totalDigitalCollected: number;
  totalCreditCollected: number;
  totalActualDeposits: number;
  settlementDifference: number;
  auditorNotes?: string;
}

export interface AnalyticsOverview {
  totalStations: number;
  totalCapacityLiters: number;
  totalVolumeStoredLiters: number;
  overallOccupancyPct: number;
  totalRevenueToday: number;
  totalFuelSoldToday: number;
  lowStockAlertCount: number;
  lowTanks: {
    tankId: string;
    stationId: string;
    fuelCode: FuelCode;
    volume: number;
    threshold: number;
  }[];
}

export type Theme = 'light' | 'dark';

export interface UserProfile {
  id: string;
  stationId: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  shiftSchedule: string;
  assignedIsland?: number;
  avatarUrl?: string;
  department?: string;
  employeeCode?: string;
  lastLoginAt?: string;
}

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'validation' | 'live';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  errors?: string[];
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  timestamp: number;
}

export type NotificationCategory = 'operations' | 'inventory' | 'rates' | 'security' | 'system';

export interface StoredNotification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  errors?: string[];
  category: NotificationCategory;
  timestamp: number;
  read: boolean;
  link?: string;
  actionLabel?: string;
  stationId?: string;
  targetRole?: UserRole[] | UserRole;
  userId?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  phone?: string;
  stationId: string;
  assignedBunks: string[];
  status: string;
  isActive: boolean;
  shiftSchedule?: string;
  lastLogin?: string;
  avatarUrl?: string;
  assignedIsland?: number;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

