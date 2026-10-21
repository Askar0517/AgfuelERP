import { UserRole, ModulePermission, PermissionMatrix, RoleDefinition } from '../types';

export interface AppModuleInfo {
  id: string;
  name: string;
  category: string;
  description: string;
}

export const APP_MODULES: AppModuleInfo[] = [
  {
    id: 'DASHBOARD',
    name: 'Dashboard',
    category: 'Overview',
    description: 'Forecourt operational overview, real-time tank metrics, and sales KPI summaries.',
  },
  {
    id: 'BUNKS',
    name: 'Bunk Master',
    category: 'Management',
    description: 'Station profile, operating parameters, location settings, and contact directories.',
  },
  {
    id: 'USERS',
    name: 'User Management',
    category: 'Management',
    description: 'User master directory, role assignments, station access, and credentials.',
  },
  {
    id: 'SHIFTS',
    name: 'Shifts & Handovers',
    category: 'Management',
    description: 'Forecourt staff shift creation, attendant assignment, and cash handover settlements.',
  },
  {
    id: 'METERS',
    name: 'Meters / Nozzle Readings',
    category: 'Operations',
    description: 'Opening/closing totalizer logs, shift readings, test fuel entries, and meter verification.',
  },
  {
    id: 'POS',
    name: 'Mobile POS Handheld',
    category: 'Operations',
    description: 'Attendant handheld pump interface, fast cash/card dispensing, and receipt printing.',
  },
  {
    id: 'DAY_CLOSE',
    name: 'Day Close / EOD Scheduler',
    category: 'Operations',
    description: 'Automated midnight EOD day-close scheduler, dip book lock, and shift rollover.',
  },
  {
    id: 'NOTIFICATIONS',
    name: 'Notifications & Alerts',
    category: 'Operations',
    description: 'Forecourt real-time security alerts, price revision broadcasts, and tank variance warnings.',
  },
  {
    id: 'DAILY_SALES',
    name: 'Daily Sales Report (DSR)',
    category: 'Reports',
    description: 'Statutory Form VIII reconciliations, fuel density checks, dip variance, and banking logs.',
  },
  {
    id: 'SALES_EFFICIENCY',
    name: 'Sale Efficiency',
    category: 'Reports',
    description: 'Forecourt pump throughput, peak hour dispensing velocity, and attendant analytics.',
  },
  {
    id: 'TANKS',
    name: 'Tank Management',
    category: 'Fuel Assets',
    description: 'Underground fuel storage tanks, dip measurements, tanker decanting, and calibration.',
  },
  {
    id: 'NOZZLES',
    name: 'Nozzle Management',
    category: 'Fuel Assets',
    description: 'Dispenser pumps, fueling islands, nozzle configuration, and status controls.',
  },
  {
    id: 'PRICING',
    name: 'Fuel Pricing',
    category: 'Commercial',
    description: 'Fuel retail prices per liter, price revisions, scheduled changes, and audit trail.',
  },
  {
    id: 'CONFIGURATION',
    name: 'Configuration',
    category: 'System',
    description: 'Forecourt system parameters, timezone configurations, and business operating policies.',
  },
  {
    id: 'AUDIT',
    name: 'Audit Logs',
    category: 'Compliance',
    description: 'Forecourt security events, user activity trails, manual overrides, and login records.',
  },
];

export const SYSTEM_ROLES: RoleDefinition[] = [
  {
    id: 'OWNER',
    name: 'Super Admin (Owner)',
    description: 'Full cross-station operational authority, user creation, financial audits, and system configuration.',
    level: 1,
    assignableBy: ['OWNER'],
    badgeBg: 'bg-purple-100 dark:bg-purple-950/60',
    badgeText: 'text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    defaultPermissions: {
      DASHBOARD: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      BUNKS: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      USERS: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      SHIFTS: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      METERS: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      POS: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      DAY_CLOSE: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      NOTIFICATIONS: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      DAILY_SALES: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      SALES_EFFICIENCY: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      TANKS: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      NOZZLES: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      PRICING: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      CONFIGURATION: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      AUDIT: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
    },
  },
  {
    id: 'MANAGER',
    name: 'Bunk Manager',
    description: 'Manages assigned bunk forecourt operations, tanks, nozzles, attendant shifts, and station staff.',
    level: 2,
    assignableBy: ['OWNER'],
    badgeBg: 'bg-blue-100 dark:bg-blue-950/60',
    badgeText: 'text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    defaultPermissions: {
      DASHBOARD: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      BUNKS: { canRead: true, canCreate: false, canUpdate: true, canDelete: false },
      USERS: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      SHIFTS: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      METERS: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      POS: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      DAY_CLOSE: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      NOTIFICATIONS: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      DAILY_SALES: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      SALES_EFFICIENCY: { canRead: true, canCreate: true, canUpdate: false, canDelete: false },
      TANKS: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      NOZZLES: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      PRICING: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      CONFIGURATION: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      AUDIT: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    },
  },
  {
    id: 'ATTENDANT',
    name: 'Staff / Forecourt Operator',
    description: 'Performs fuel dispensing, submits opening/closing nozzle meter readings, and operates handheld POS.',
    level: 3,
    assignableBy: ['OWNER', 'MANAGER'],
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    defaultPermissions: {
      DASHBOARD: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      BUNKS: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      USERS: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      SHIFTS: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      METERS: { canRead: true, canCreate: true, canUpdate: false, canDelete: false },
      POS: { canRead: true, canCreate: true, canUpdate: false, canDelete: false },
      DAY_CLOSE: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      NOTIFICATIONS: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      DAILY_SALES: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      SALES_EFFICIENCY: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      TANKS: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      NOZZLES: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      PRICING: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      CONFIGURATION: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      AUDIT: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    },
  },
  {
    id: 'CASHIER',
    name: 'Cashier (Settlements)',
    description: 'Receives attendant shift cash, verifies currency denominations, and reconciles digital payments.',
    level: 4,
    assignableBy: ['OWNER', 'MANAGER'],
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60',
    badgeText: 'text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    defaultPermissions: {
      DASHBOARD: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      BUNKS: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      USERS: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      SHIFTS: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      METERS: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      POS: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      DAY_CLOSE: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      NOTIFICATIONS: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      DAILY_SALES: { canRead: true, canCreate: true, canUpdate: false, canDelete: false },
      SALES_EFFICIENCY: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      TANKS: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      NOZZLES: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      PRICING: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      CONFIGURATION: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      AUDIT: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
    },
  },
  {
    id: 'AUDITOR',
    name: 'Auditor (Compliance)',
    description: 'Read-only regulatory compliance, Form VIII inspection, price change logs, and tank variance tracking.',
    level: 5,
    assignableBy: ['OWNER'],
    badgeBg: 'bg-cyan-100 dark:bg-cyan-950/60',
    badgeText: 'text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    defaultPermissions: {
      DASHBOARD: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      BUNKS: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      USERS: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      SHIFTS: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      METERS: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      POS: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      DAY_CLOSE: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      NOTIFICATIONS: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      DAILY_SALES: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      SALES_EFFICIENCY: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      TANKS: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      NOZZLES: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      PRICING: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      CONFIGURATION: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      AUDIT: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
    },
  },
];

/**
 * Returns empty/blank permission matrix for all modules
 */
export function getBlankPermissions(): PermissionMatrix {
  const result: PermissionMatrix = {};
  for (const mod of APP_MODULES) {
    result[mod.id] = { canRead: false, canCreate: false, canUpdate: false, canDelete: false };
  }
  return result;
}

/**
 * Returns default permission matrix for a role
 */
export function getDefaultPermissionsForRole(role: UserRole): PermissionMatrix {
  const found = SYSTEM_ROLES.find((r) => r.id === role);
  if (found) {
    return JSON.parse(JSON.stringify(found.defaultPermissions));
  }
  return getBlankPermissions();
}

/**
 * Resolves effective permissions for a user given their role and custom permissions JSON
 */
export function resolveUserPermissions(
  role: UserRole,
  customPermissionsJson?: string | null
): PermissionMatrix {
  const base = getDefaultPermissionsForRole(role);
  if (!customPermissionsJson) return base;

  try {
    const overrides: PermissionMatrix = JSON.parse(customPermissionsJson);
    if (typeof overrides === 'object' && overrides !== null) {
      for (const mod of APP_MODULES) {
        if (overrides[mod.id]) {
          base[mod.id] = {
            canRead: Boolean(overrides[mod.id].canRead),
            canCreate: Boolean(overrides[mod.id].canCreate),
            canUpdate: Boolean(overrides[mod.id].canUpdate),
            canDelete: Boolean(overrides[mod.id].canDelete),
          };
        }
      }
    }
  } catch {
    // Return base on parse error
  }

  return base;
}

/**
 * Computes a human-readable summary count of granted privileges
 */
export function summarizePermissions(perms: PermissionMatrix): {
  totalGrants: number;
  maxPossible: number;
  accessibleModules: number;
  totalModules: number;
  hasCustomOverrides: boolean;
} {
  let totalGrants = 0;
  let accessibleModules = 0;
  const totalModules = APP_MODULES.length;
  const maxPossible = totalModules * 4;

  for (const mod of APP_MODULES) {
    const p = perms[mod.id];
    if (p) {
      if (p.canRead || p.canCreate || p.canUpdate || p.canDelete) {
        accessibleModules++;
      }
      if (p.canRead) totalGrants++;
      if (p.canCreate) totalGrants++;
      if (p.canUpdate) totalGrants++;
      if (p.canDelete) totalGrants++;
    }
  }

  return {
    totalGrants,
    maxPossible,
    accessibleModules,
    totalModules,
    hasCustomOverrides: false,
  };
}
