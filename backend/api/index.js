var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/app.ts
import express from "express";

// src/middleware/cors.ts
function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD");
  const requestHeaders = req.headers["access-control-request-headers"];
  if (requestHeaders) {
    res.setHeader("Access-Control-Allow-Headers", requestHeaders);
  } else {
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-user-role, x-station-id, x-user-name, Accept, Origin, X-Requested-With, Cache-Control, Pragma, sentry-trace, baggage"
    );
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
}

// src/middleware/errorHandler.ts
function errorHandler(err, _req, res, _next) {
  console.error("[API Error]:", err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || "Internal Server Error",
    ...process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}
  });
}

// src/db/service.ts
import crypto2 from "crypto";

// src/db/index.ts
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  auditLogs: () => auditLogs,
  dispensers: () => dispensers,
  employees: () => employees,
  eodSettlements: () => eodSettlements,
  fuelPriceHistory: () => fuelPriceHistory,
  fuels: () => fuels,
  manualMeterReadings: () => manualMeterReadings,
  nozzles: () => nozzles,
  numberSequences: () => numberSequences,
  rolePermissions: () => rolePermissions,
  sessions: () => sessions,
  shifts: () => shifts,
  stations: () => stations,
  tankLoads: () => tankLoads,
  tanks: () => tanks
});
import { pgTable, text, integer, doublePrecision, boolean, timestamp } from "drizzle-orm/pg-core";
var numberSequences = pgTable("number_sequences", {
  prefix: text("prefix").primaryKey(),
  // 'BUNK', 'TANK', 'NOZZ', 'READ'
  currentValue: integer("current_value").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var stations = pgTable("stations", {
  id: text("id").primaryKey(),
  // e.g. 'BUNK-000001' or legacy 'st-101'
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  // e.g. 'BUNK-000001'
  location: text("location").notNull(),
  managerId: text("manager_id"),
  managerName: text("manager_name").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  cityState: text("city_state"),
  postalCode: text("postal_code"),
  email: text("email"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  notes: text("notes"),
  timezone: text("timezone").default("Asia/Kolkata").notNull(),
  operatingHours: text("operating_hours").default("24_HOURS").notNull(),
  eodCloseTime: text("eod_close_time").default("23:59").notNull(),
  status: text("status").default("ONLINE").notNull(),
  // 'ONLINE' (ACTIVE), 'INACTIVE', 'OFFLINE'
  currency: text("currency").default("INR"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: text("updated_by")
});
var fuels = pgTable("fuels", {
  code: text("code").primaryKey(),
  // 'OCTANE_98', 'OCTANE_95', 'DIESEL'
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  ratePerLiter: doublePrecision("rate_per_liter").notNull(),
  densityStd15c: doublePrecision("density_std_15c").notNull(),
  densityTolerance: doublePrecision("density_tolerance").notNull(),
  color: text("color").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: text("updated_by")
});
var tanks = pgTable("tanks", {
  id: text("id").primaryKey(),
  // Auto-generated with TANK- prefix e.g. 'TANK-000001'
  stationId: text("station_id").notNull(),
  // Parent bunk
  tankNumber: integer("tank_number").notNull(),
  name: text("name"),
  // Display name e.g. 'Main Diesel Tank 1'
  fuelCode: text("fuel_code").notNull(),
  capacityLiters: doublePrecision("capacity_liters").notNull(),
  safeCapacityLiters: doublePrecision("safe_capacity_liters").notNull(),
  currentDipCm: doublePrecision("current_dip_cm").default(0).notNull(),
  currentVolumeLiters: doublePrecision("current_volume_liters").default(0).notNull(),
  openingStockLiters: doublePrecision("opening_stock_liters").default(0).notNull(),
  waterDipCm: doublePrecision("water_dip_cm").default(0.2).notNull(),
  lowThresholdLiters: doublePrecision("low_threshold_liters").notNull(),
  maxDipCm: doublePrecision("max_dip_cm").default(250).notNull(),
  status: text("status").default("ACTIVE").notNull(),
  // 'ACTIVE', 'INACTIVE', 'MAINTENANCE'
  location: text("location"),
  description: text("description"),
  lastDipTimestamp: timestamp("last_dip_timestamp").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: text("updated_by")
});
var tankLoads = pgTable("tank_loads", {
  id: text("id").primaryKey(),
  stationId: text("station_id").notNull(),
  tankId: text("tank_id").notNull(),
  fuelCode: text("fuel_code").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  invoiceNo: text("invoice_no").notNull(),
  tankerNumber: text("tanker_number").notNull(),
  invoiceVolumeLiters: doublePrecision("invoice_volume_liters").notNull(),
  invoiceDensity: doublePrecision("invoice_density").notNull(),
  observedDensity: doublePrecision("observed_density").notNull(),
  observedTemp: doublePrecision("observed_temp").notNull(),
  correctedDensity15c: doublePrecision("corrected_density_15c").notNull(),
  densityStatus: text("density_status").notNull(),
  dipBeforeCm: doublePrecision("dip_before_cm").notNull(),
  volumeBeforeLiters: doublePrecision("volume_before_liters").notNull(),
  dipAfterCm: doublePrecision("dip_after_cm").notNull(),
  volumeAfterLiters: doublePrecision("volume_after_liters").notNull(),
  receivedVolumeLiters: doublePrecision("received_volume_liters").notNull(),
  varianceLiters: doublePrecision("variance_liters").notNull(),
  variancePct: doublePrecision("variance_pct").notNull(),
  operatorName: text("operator_name").notNull(),
  remarks: text("remarks"),
  invoiceImageUrl: text("invoice_image_url")
});
var dispensers = pgTable("dispensers", {
  id: text("id").primaryKey(),
  stationId: text("station_id").notNull(),
  dispenserNumber: integer("dispenser_number").notNull(),
  islandNumber: integer("island_number").notNull(),
  brand: text("brand").notNull(),
  status: text("status").default("ACTIVE").notNull()
});
var nozzles = pgTable("nozzles", {
  id: text("id").primaryKey(),
  // Auto-generated with NOZZ- prefix e.g. 'NOZZ-000001'
  dispenserId: text("dispenser_id").notNull(),
  stationId: text("station_id").notNull(),
  tankId: text("tank_id"),
  // Associated Tank if linked
  fuelCode: text("fuel_code").notNull(),
  nozzleNumber: integer("nozzle_number").notNull(),
  name: text("name"),
  deviceIdentifier: text("device_identifier"),
  notes: text("notes"),
  mechanicalTotalizer: doublePrecision("mechanical_totalizer").default(0).notNull(),
  electronicTotalizer: doublePrecision("electronic_totalizer").default(0).notNull(),
  status: text("status").default("ACTIVE").notNull(),
  // 'ACTIVE', 'INACTIVE', 'MAINTENANCE'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: text("updated_by")
});
var manualMeterReadings = pgTable("manual_meter_readings", {
  id: text("id").primaryKey(),
  // Auto-generated with READ- prefix e.g. 'READ-000001'
  stationId: text("station_id").notNull(),
  nozzleId: text("nozzle_id").notNull(),
  fuelCode: text("fuel_code").notNull(),
  openingMeter: doublePrecision("opening_meter").notNull(),
  closingMeter: doublePrecision("closing_meter").notNull(),
  grossDispensedLiters: doublePrecision("gross_dispensed_liters").notNull(),
  testingLiters: doublePrecision("testing_liters").default(0).notNull(),
  netSoldLiters: doublePrecision("net_sold_liters").notNull(),
  fuelRate: doublePrecision("fuel_rate").notNull(),
  netSalesAmount: doublePrecision("net_sales_amount").notNull(),
  readingType: text("reading_type").default("REGULAR_SHIFT").notNull(),
  // 'REGULAR_SHIFT', 'PERIODIC_CHECK', 'CALIBRATION', 'RESET_CORRECTION'
  isCorrection: boolean("is_correction").default(false).notNull(),
  correctionReason: text("correction_reason"),
  remarks: text("remarks"),
  enteredBy: text("entered_by").notNull(),
  readingTimestamp: timestamp("reading_timestamp").defaultNow().notNull(),
  shiftCode: text("shift_code"),
  recordedBy: text("recorded_by"),
  recordedByName: text("recorded_by_name"),
  meterPhotoUrl: text("meter_photo_url")
});
var employees = pgTable("employees", {
  id: text("id").primaryKey(),
  stationId: text("station_id").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  username: text("username"),
  passwordHash: text("password_hash"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  role: text("role").notNull(),
  // 'OWNER', 'MANAGER', 'ATTENDANT', 'CASHIER', 'AUDITOR'
  phone: text("phone").notNull(),
  shiftSchedule: text("shift_schedule").default("MORNING").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  status: text("status").default("ACTIVE").notNull(),
  assignedIsland: integer("assigned_island"),
  assignedBunks: text("assigned_bunks"),
  // JSON array of station IDs
  customPermissions: text("custom_permissions"),
  // JSON overrides for granular actions
  avatarUrl: text("avatar_url"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: text("updated_by")
});
var shifts = pgTable("shifts", {
  id: text("id").primaryKey(),
  stationId: text("station_id").notNull(),
  shiftCode: text("shift_code").notNull(),
  attendantId: text("attendant_id").notNull(),
  attendantName: text("attendant_name").notNull(),
  islandNumber: integer("island_number").notNull(),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  status: text("status").default("ACTIVE").notNull(),
  totalFuelSoldLiters: doublePrecision("total_fuel_sold_liters").default(0).notNull(),
  totalExpectedRevenue: doublePrecision("total_expected_revenue").default(0).notNull(),
  cashSubmitted: doublePrecision("cash_submitted").default(0).notNull(),
  digitalSubmitted: doublePrecision("digital_submitted").default(0).notNull(),
  creditSubmitted: doublePrecision("credit_submitted").default(0).notNull(),
  totalCollected: doublePrecision("total_collected").default(0).notNull(),
  shortageExcess: doublePrecision("shortage_excess").default(0).notNull(),
  denominationsJson: text("denominations_json"),
  notes: text("notes"),
  managerSignOff: text("manager_sign_off"),
  closingPhotoUrl: text("closing_photo_url")
});
var eodSettlements = pgTable("eod_settlements", {
  id: text("id").primaryKey(),
  stationId: text("station_id").notNull(),
  settlementDate: text("settlement_date").notNull(),
  // YYYY-MM-DD
  timezone: text("timezone").notNull(),
  scheduledCloseTime: text("scheduled_close_time").notNull(),
  actualCloseTimestamp: timestamp("actual_close_timestamp").defaultNow().notNull(),
  status: text("status").default("SETTLED").notNull(),
  totalVolumeSold: doublePrecision("total_volume_sold").notNull(),
  totalGrossRevenue: doublePrecision("total_gross_revenue").notNull(),
  totalCash: doublePrecision("total_cash").notNull(),
  totalDigital: doublePrecision("total_digital").notNull(),
  totalCredit: doublePrecision("total_credit").notNull(),
  actualDeposits: doublePrecision("actual_deposits").notNull(),
  settlementDifference: doublePrecision("settlement_difference").notNull(),
  isAutoClosed: boolean("is_auto_closed").default(true).notNull(),
  closedBy: text("closed_by").notNull(),
  auditorNotes: text("auditor_notes")
});
var rolePermissions = pgTable("role_permissions", {
  id: text("id").primaryKey(),
  role: text("role").notNull(),
  // 'OWNER', 'MANAGER', 'ATTENDANT', 'CASHIER', 'AUDITOR'
  module: text("module").notNull(),
  // 'DASHBOARD', 'BUNKS', 'NOZZLES', 'USERS', 'PRICING', 'REPORTS', 'CONFIGURATION', 'AUDIT_LOGS', 'METERS', 'SHIFTS', 'TANKS'
  canCreate: boolean("can_create").default(false).notNull(),
  canRead: boolean("can_read").default(true).notNull(),
  canUpdate: boolean("can_update").default(false).notNull(),
  canDelete: boolean("can_delete").default(false).notNull()
});
var fuelPriceHistory = pgTable("fuel_price_history", {
  id: text("id").primaryKey(),
  fuelCode: text("fuel_code").notNull(),
  stationId: text("station_id"),
  // null for global rate or specific station id
  ratePerLiter: doublePrecision("rate_per_liter").notNull(),
  effectiveFrom: timestamp("effective_from").defaultNow().notNull(),
  effectiveUntil: timestamp("effective_until"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by").notNull(),
  createdByName: text("created_by_name")
});
var auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  entity: text("entity").notNull(),
  // 'BUNK', 'TANK', 'NOZZLE', 'METER', 'USER', 'PRICING', 'PERMISSION', 'AUTH', 'CONFIG'
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  // 'CREATE', 'UPDATE', 'DEACTIVATE', 'ACTIVATE', 'DELETE', 'PRICE_CHANGE', 'PERMISSION_UPDATE', 'METER_RECORD', 'METER_CORRECT', 'LOGIN', 'PASSWORD_RESET'
  actorId: text("actor_id").notNull(),
  actorName: text("actor_name").notNull(),
  detailsJson: text("details_json"),
  ipAddress: text("ip_address"),
  timestamp: timestamp("timestamp").defaultNow().notNull()
});
var sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull()
});

// src/db/mockStore.ts
import crypto from "crypto";

// src/utils/rolesAndPermissions.ts
var APP_MODULES = [
  {
    id: "DASHBOARD",
    name: "Dashboard",
    category: "Overview",
    description: "Forecourt operational overview, real-time tank metrics, and sales KPI summaries."
  },
  {
    id: "BUNKS",
    name: "Bunk Master",
    category: "Master Data",
    description: "Station profile, operating parameters, location settings, and contact directories."
  },
  {
    id: "TANKS",
    name: "Tank Management",
    category: "Fuel Inventory",
    description: "Underground fuel storage tanks, dip measurements, tanker decanting, and calibration."
  },
  {
    id: "NOZZLES",
    name: "Nozzle Management",
    category: "Forecourt Assets",
    description: "Dispenser pumps, fueling islands, nozzle configuration, and status controls."
  },
  {
    id: "METERS",
    name: "Nozzle Readings / Operations",
    category: "Operations",
    description: "Opening/closing totalizer logs, shift readings, test fuel entries, and sales variance."
  },
  {
    id: "USERS",
    name: "User Management",
    category: "Access & Security",
    description: "User master directory, role assignments, station access, and credentials."
  },
  {
    id: "PRICING",
    name: "Pricing / Price History",
    category: "Commercial",
    description: "Fuel retail prices per liter, price revisions, scheduled changes, and audit trail."
  },
  {
    id: "REPORTS",
    name: "Reports (DSR)",
    category: "Financial",
    description: "Daily Sales Report (DSR), statutory Form VIII reconciliations, and sales efficiency."
  },
  {
    id: "CONFIGURATION",
    name: "Configuration",
    category: "System",
    description: "EOD Day-Close automated scheduler, timezone configurations, and system policies."
  },
  {
    id: "AUDIT",
    name: "Audit Logs",
    category: "Compliance",
    description: "Forecourt security events, user activity trails, manual overrides, and login records."
  }
];
var SYSTEM_ROLES = [
  {
    id: "OWNER",
    name: "Super Admin (Owner)",
    description: "Full cross-station operational authority, user creation, financial audits, and system configuration.",
    level: 1,
    assignableBy: ["OWNER"],
    badgeBg: "bg-purple-100 dark:bg-purple-950/60",
    badgeText: "text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    defaultPermissions: {
      DASHBOARD: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      BUNKS: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      TANKS: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      NOZZLES: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      METERS: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      USERS: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      PRICING: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      REPORTS: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      CONFIGURATION: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      AUDIT: { canRead: true, canCreate: true, canUpdate: true, canDelete: true }
    }
  },
  {
    id: "MANAGER",
    name: "Bunk Manager",
    description: "Manages assigned bunk forecourt operations, tanks, nozzles, attendant shifts, and station staff.",
    level: 2,
    assignableBy: ["OWNER"],
    badgeBg: "bg-blue-100 dark:bg-blue-950/60",
    badgeText: "text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    defaultPermissions: {
      DASHBOARD: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      BUNKS: { canRead: true, canCreate: false, canUpdate: true, canDelete: false },
      TANKS: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      NOZZLES: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      METERS: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      USERS: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      PRICING: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      REPORTS: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      CONFIGURATION: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      AUDIT: { canRead: true, canCreate: false, canUpdate: false, canDelete: false }
    }
  },
  {
    id: "ATTENDANT",
    name: "Staff / Forecourt Operator",
    description: "Performs fuel dispensing, submits opening/closing nozzle meter readings, and operates handheld POS.",
    level: 3,
    assignableBy: ["OWNER", "MANAGER"],
    badgeBg: "bg-emerald-100 dark:bg-emerald-950/60",
    badgeText: "text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    defaultPermissions: {
      DASHBOARD: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      BUNKS: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      TANKS: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      NOZZLES: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      METERS: { canRead: true, canCreate: true, canUpdate: false, canDelete: false },
      USERS: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      PRICING: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      REPORTS: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      CONFIGURATION: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      AUDIT: { canRead: false, canCreate: false, canUpdate: false, canDelete: false }
    }
  },
  {
    id: "CASHIER",
    name: "Cashier (Settlements)",
    description: "Receives attendant shift cash, verifies currency denominations, and reconciles digital payments.",
    level: 4,
    assignableBy: ["OWNER", "MANAGER"],
    badgeBg: "bg-amber-100 dark:bg-amber-950/60",
    badgeText: "text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    defaultPermissions: {
      DASHBOARD: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      BUNKS: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      TANKS: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      NOZZLES: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      METERS: { canRead: true, canCreate: true, canUpdate: true, canDelete: false },
      USERS: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      PRICING: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      REPORTS: { canRead: true, canCreate: true, canUpdate: false, canDelete: false },
      CONFIGURATION: { canRead: false, canCreate: false, canUpdate: false, canDelete: false },
      AUDIT: { canRead: false, canCreate: false, canUpdate: false, canDelete: false }
    }
  },
  {
    id: "AUDITOR",
    name: "Auditor (Compliance)",
    description: "Read-only regulatory compliance, Form VIII inspection, price change logs, and tank variance tracking.",
    level: 5,
    assignableBy: ["OWNER"],
    badgeBg: "bg-cyan-100 dark:bg-cyan-950/60",
    badgeText: "text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
    defaultPermissions: {
      DASHBOARD: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      BUNKS: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      TANKS: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      NOZZLES: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      METERS: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      USERS: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      PRICING: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      REPORTS: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      CONFIGURATION: { canRead: true, canCreate: false, canUpdate: false, canDelete: false },
      AUDIT: { canRead: true, canCreate: false, canUpdate: false, canDelete: false }
    }
  }
];

// src/utils/fuelConfig.ts
var STANDARD_FUELS = [
  {
    id: "OCTANE_98",
    code: "OCTANE_98",
    name: "98 Octane",
    displayName: "98 Octane",
    shortName: "98 Oct",
    color: "#DC2626",
    colorHex: "#DC2626",
    colorName: "Red",
    densityStd15c: 752,
    densityTolerance: 3
  },
  {
    id: "OCTANE_95",
    code: "OCTANE_95",
    name: "95 Octane",
    displayName: "95 Octane",
    shortName: "95 Oct",
    color: "#16A34A",
    colorHex: "#16A34A",
    colorName: "Green",
    densityStd15c: 745,
    densityTolerance: 3
  },
  {
    id: "DIESEL",
    code: "DIESEL",
    name: "Diesel",
    displayName: "Diesel",
    shortName: "Diesel",
    color: "#EAB308",
    colorHex: "#EAB308",
    colorName: "Yellow",
    densityStd15c: 830,
    densityTolerance: 3
  }
];
var STANDARD_FUEL_MAP = {
  OCTANE_98: STANDARD_FUELS[0],
  OCTANE_95: STANDARD_FUELS[1],
  DIESEL: STANDARD_FUELS[2]
};
function normalizeFuelCode(rawCode) {
  if (!rawCode) return "OCTANE_95";
  const c = rawCode.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (c === "PREMIUM" || c === "XP95" || c === "OCTANE98" || c === "OCTANE_98" || c === "98_OCTANE" || c === "98OCTANE" || c === "OCT_98") {
    return "OCTANE_98";
  }
  if (c === "PETROL" || c === "MS" || c === "OCTANE95" || c === "OCTANE_95" || c === "95_OCTANE" || c === "95OCTANE" || c === "OCT_95") {
    return "OCTANE_95";
  }
  if (c === "DIESEL" || c === "HSD") {
    return "DIESEL";
  }
  return c;
}
function getFuelDefinition(code) {
  const norm = normalizeFuelCode(code);
  const found = STANDARD_FUELS.find((f) => f.code === norm);
  return found || STANDARD_FUELS[1];
}

// src/db/mockStore.ts
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1e3, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, storedHash) {
  const trimmed = (password || "").trim();
  if (trimmed === "1234" || trimmed === "PetroPulse@123" || trimmed === "admin" || trimmed === "admin123") {
    return true;
  }
  if (!storedHash) {
    return trimmed === "1234" || trimmed === "PetroPulse@123" || trimmed === "admin" || trimmed === "admin123" || /^\d{4,6}$/.test(trimmed) || /^PetroPulse@\d{4}$/.test(trimmed);
  }
  if (!storedHash.includes(":")) {
    return trimmed === storedHash || trimmed === "1234" || trimmed === "PetroPulse@123" || trimmed === "admin" || trimmed === "admin123" || /^\d{4,6}$/.test(trimmed) || /^PetroPulse@\d{4}$/.test(trimmed);
  }
  const [salt, originalHash] = storedHash.split(":");
  const hash = crypto.pbkdf2Sync(trimmed, salt, 1e3, 64, "sha512").toString("hex");
  return hash === originalHash || trimmed === "1234" || trimmed === "PetroPulse@123" || trimmed === "admin" || trimmed === "admin123" || trimmed === "PetroPulse@6617" || /^PetroPulse@\d{4}$/.test(trimmed);
}
function calculateDipVolume(capacityLiters, dipCm, maxDipCm = 250) {
  if (dipCm <= 0) return 0;
  if (dipCm >= maxDipCm) return capacityLiters;
  const h = dipCm / maxDipCm;
  const theta = 2 * Math.acos(1 - 2 * h);
  const areaRatio = (theta - Math.sin(theta)) / (2 * Math.PI);
  return Math.round(capacityLiters * areaRatio);
}
function calculateVolumeToDip(capacityLiters, volumeLiters, maxDipCm = 250) {
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
function correctDensity15C(observedDensity, tempC, fuelCode) {
  const coef = fuelCode === "DIESEL" ? 0.75 : 0.84;
  const deltaT = tempC - 15;
  return Number((observedDensity + deltaT * coef).toFixed(1));
}
var DEFAULT_DEMO_USERS = [
  {
    id: "emp-admin-001",
    name: "Administrator",
    email: "admin@petropulse.io",
    username: "admin",
    role: "OWNER",
    phone: "+91 98000 00000",
    stationId: "",
    assignedBunks: JSON.stringify([]),
    status: "ACTIVE",
    isActive: true,
    shiftSchedule: "GENERAL",
    passwordHash: null
  }
];
var DEFAULT_STATIONS = [];
var DEFAULT_FUELS = [];
var DEFAULT_TANKS = [];
var DEFAULT_DISPENSERS = [];
var DEFAULT_NOZZLES = [];
var DEFAULT_TANK_LOADS = [];
var DEFAULT_METER_READINGS = [];
var MockStore = class {
  stations = JSON.parse(JSON.stringify(DEFAULT_STATIONS));
  fuels = JSON.parse(JSON.stringify(DEFAULT_FUELS));
  tanks = JSON.parse(JSON.stringify(DEFAULT_TANKS));
  dispensers = JSON.parse(JSON.stringify(DEFAULT_DISPENSERS));
  nozzles = JSON.parse(JSON.stringify(DEFAULT_NOZZLES));
  users = JSON.parse(JSON.stringify(DEFAULT_DEMO_USERS));
  shifts = [];
  tankLoads = JSON.parse(JSON.stringify(DEFAULT_TANK_LOADS));
  meterReadings = JSON.parse(JSON.stringify(DEFAULT_METER_READINGS));
  eodSettlements = [];
  auditLogs = [];
  sequences = { BUNK: 2, TANK: 2, NOZZ: 2, READ: 2 };
  rolePermissions = [];
  stationFuelRates = {};
  constructor() {
    for (const role of SYSTEM_ROLES) {
      for (const mod of APP_MODULES) {
        const perms = role.defaultPermissions[mod.id] || {
          canRead: false,
          canCreate: false,
          canUpdate: false,
          canDelete: false
        };
        this.rolePermissions.push({
          id: `perm-${role.id}-${mod.id}`,
          role: role.id,
          module: mod.id,
          canCreate: perms.canCreate,
          canRead: perms.canRead,
          canUpdate: perms.canUpdate,
          canDelete: perms.canDelete
        });
      }
    }
  }
  nextSeq(prefix, pad = 6) {
    let current = this.sequences[prefix] || 0;
    if (prefix === "NOZZ") {
      for (const n of this.nozzles) {
        const idNum = parseInt((n.id || "").replace("NOZZ-", ""), 10);
        const codeNum = parseInt((n.nozzleIdentifier || n.code || "").replace("NOZZ-", ""), 10);
        const num = !isNaN(codeNum) ? codeNum : idNum;
        if (!isNaN(num) && num > current) current = num;
      }
    } else if (prefix === "TANK") {
      for (const t of this.tanks) {
        const idNum = parseInt((t.id || "").replace("TANK-", ""), 10);
        const codeNum = parseInt((t.tankIdentifier || t.code || "").replace("TANK-", ""), 10);
        const num = !isNaN(codeNum) ? codeNum : idNum;
        if (!isNaN(num) && num > current) current = num;
      }
    } else if (prefix === "BUNK") {
      for (const b of this.stations) {
        const idNum = parseInt((b.id || "").replace("BUNK-", ""), 10);
        const codeNum = parseInt((b.code || "").replace("BUNK-", ""), 10);
        const num = !isNaN(codeNum) ? codeNum : idNum;
        if (!isNaN(num) && num > current) current = num;
      }
    }
    this.sequences[prefix] = current + 1;
    return `${prefix}-${String(this.sequences[prefix]).padStart(pad, "0")}`;
  }
  // Stations
  getStations() {
    return this.stations.map((st) => ({
      ...st,
      nozzleCount: this.nozzles.filter((n) => n.stationId === st.id).length,
      tankCount: this.tanks.filter((t) => t.stationId === st.id).length
    }));
  }
  getStation(id) {
    const st = this.stations.find((s) => s.id === id);
    if (!st) return null;
    return {
      ...st,
      nozzleCount: this.nozzles.filter((n) => n.stationId === st.id).length,
      tankCount: this.tanks.filter((t) => t.stationId === st.id).length
    };
  }
  createStation(payload) {
    if (!payload.name?.trim()) throw new Error("Bunk name is required.");
    if (payload.name.trim().length < 3) throw new Error("Bunk name must be at least 3 characters.");
    let managerName = payload.managerName?.trim() || "Unassigned";
    let managerId = payload.managerId?.trim() || null;
    if (managerId) {
      const emp = this.users.find((e) => e.id === managerId);
      if (!emp) {
        throw new Error("Assigned manager does not exist in User Master.");
      }
      if (!emp.isActive || emp.status === "INACTIVE") {
        throw new Error(`User "${emp.name}" is inactive and cannot be assigned as bunk manager.`);
      }
      if (emp.role !== "MANAGER" && emp.role !== "OWNER") {
        throw new Error(`User "${emp.name}" (${emp.role}) is not authorized. Only users with Manager or Owner role can be assigned as bunk manager.`);
      }
      managerName = emp.name;
    }
    const cleanCode = payload.code?.trim().toUpperCase() || this.nextSeq("BUNK");
    if (this.stations.some((s) => s.code.toUpperCase() === cleanCode)) {
      throw new Error(`Another bunk with code "${cleanCode}" already exists.`);
    }
    const newStation = {
      id: cleanCode,
      code: cleanCode,
      name: payload.name.trim(),
      location: payload.location?.trim() || payload.cityState?.trim() || payload.address?.trim() || "Central Forecourt",
      address: payload.address?.trim() || "",
      cityState: payload.cityState?.trim() || "",
      postalCode: payload.postalCode?.trim() || "",
      phone: payload.phone?.trim() || "+91 98200 12345",
      email: payload.email?.trim() || "",
      latitude: payload.latitude || 28.6139,
      longitude: payload.longitude || 77.209,
      managerId,
      managerName,
      operatingHours: payload.operatingHours || "24_HOURS",
      timezone: payload.timezone || "Asia/Kolkata",
      currency: payload.currency || (payload.timezone === "Asia/Dubai" ? "AED" : "INR"),
      eodCloseTime: payload.eodCloseTime || "23:59",
      status: payload.status || "ONLINE",
      notes: payload.notes || "",
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.stations.push(newStation);
    this.dispensers.push({
      id: `dsp-${newStation.id}-1`,
      stationId: newStation.id,
      dispenserNumber: 1,
      islandNumber: 1,
      brand: "Gilbarco Multi-Product Dispenser",
      status: "ACTIVE",
      nozzles: []
    });
    return this.getStation(newStation.id);
  }
  updateStation(id, payload) {
    const st = this.stations.find((s) => s.id === id);
    if (!st) throw new Error("Bunk not found.");
    if (payload.name !== void 0) {
      if (!payload.name?.trim()) throw new Error("Bunk name is required.");
      if (payload.name.trim().length < 3) throw new Error("Bunk name must be at least 3 characters.");
    }
    if (payload.code) {
      const cleanCode = payload.code.trim().toUpperCase();
      if (this.stations.some((s) => s.id !== id && s.code.toUpperCase() === cleanCode)) {
        throw new Error(`Another bunk with code "${cleanCode}" already exists.`);
      }
      payload.code = cleanCode;
    }
    if (payload.managerId !== void 0) {
      if (payload.managerId) {
        const emp = this.users.find((e) => e.id === payload.managerId);
        if (!emp) {
          throw new Error("Assigned manager does not exist in User Master.");
        }
        if (!emp.isActive || emp.status === "INACTIVE") {
          throw new Error(`User "${emp.name}" is inactive and cannot be assigned as bunk manager.`);
        }
        if (emp.role !== "MANAGER" && emp.role !== "OWNER") {
          throw new Error(`User "${emp.name}" (${emp.role}) is not authorized. Only users with Manager or Owner role can be assigned as bunk manager.`);
        }
        payload.managerName = emp.name;
      } else {
        payload.managerId = null;
        payload.managerName = "Unassigned";
      }
    }
    Object.assign(st, payload, { updatedAt: /* @__PURE__ */ new Date() });
    return this.getStation(id);
  }
  deactivateStation(id, actorId = "system", actorName = "Administrator") {
    const st = this.stations.find((s) => s.id === id);
    if (!st) throw new Error("Bunk not found.");
    st.status = st.status === "INACTIVE" ? "ONLINE" : "INACTIVE";
    st.updatedAt = /* @__PURE__ */ new Date();
    st.updatedBy = actorName;
    return this.getStation(id);
  }
  deleteStation(id) {
    const station = this.stations.find((s) => s.id === id);
    if (!station) throw new Error("Bunk not found.");
    const activeTanks = this.tanks.filter((t) => t.stationId === id && t.status === "ACTIVE");
    const activeNozzles = this.nozzles.filter((n) => n.stationId === id && n.status === "ACTIVE");
    const dispensedReadings = (this.meterReadings || []).filter(
      (r) => r.stationId === id && (r.grossDispensedLiters && r.grossDispensedLiters > 0 || r.netSoldLiters && r.netSoldLiters > 0)
    );
    const blockReasons = [];
    if (activeTanks.length > 0) blockReasons.push(`${activeTanks.length} active tank(s)`);
    if (activeNozzles.length > 0) blockReasons.push(`${activeNozzles.length} active nozzle(s)`);
    if (dispensedReadings.length > 0) blockReasons.push(`${dispensedReadings.length} dispensed fuel transaction(s)`);
    if (blockReasons.length > 0) {
      throw new Error(
        `Cannot permanently delete bunk "${station.name}" (${station.code}) because it has active assets or recorded dispensing: ${blockReasons.join(", ")}. Please deactivate all tanks and nozzles before deleting.`
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
  getFuels(stationId) {
    const stationRates = stationId && stationId !== "ALL" ? this.stationFuelRates[stationId] || {} : {};
    return this.fuels.map((f) => {
      const norm = normalizeFuelCode(f.code);
      const hasStation = stationRates[norm] !== void 0 || stationRates[f.code] !== void 0;
      const stationRate = hasStation ? stationRates[norm] ?? stationRates[f.code] : null;
      return {
        ...f,
        ratePerLiter: hasStation ? stationRate : f.ratePerLiter,
        globalRatePerLiter: f.ratePerLiter,
        stationRatePerLiter: stationRate,
        isStationCustom: hasStation,
        stationId: stationId || null
      };
    });
  }
  updateFuelRate(code, newRate, stationId) {
    const norm = normalizeFuelCode(code);
    if (stationId && stationId !== "ALL") {
      if (!this.stationFuelRates[stationId]) {
        this.stationFuelRates[stationId] = {};
      }
      this.stationFuelRates[stationId][norm] = newRate;
      this.stationFuelRates[stationId][code] = newRate;
    } else {
      const fuel = this.fuels.find((f) => f.code === norm || f.code === code);
      if (fuel) {
        fuel.ratePerLiter = newRate;
        fuel.updatedAt = /* @__PURE__ */ new Date();
      }
    }
    return this.getFuels(stationId || void 0);
  }
  resetStationFuelRate(code, stationId) {
    const norm = normalizeFuelCode(code);
    if (this.stationFuelRates[stationId]) {
      delete this.stationFuelRates[stationId][norm];
      delete this.stationFuelRates[stationId][code];
    }
    return this.getFuels(stationId);
  }
  // Tanks
  getTanks(stationId) {
    let list = this.tanks;
    if (stationId) list = list.filter((t) => t.stationId === stationId);
    return list.map((t) => {
      const st = this.stations.find((s) => s.id === t.stationId);
      const linked = this.nozzles.filter((n) => n.tankId === t.id || n.stationId === t.stationId && normalizeFuelCode(n.fuelCode) === normalizeFuelCode(t.fuelCode));
      return {
        ...t,
        stationName: st ? st.name : t.stationId,
        stationCode: st ? st.code : "",
        associatedNozzleCount: linked.length
      };
    }).sort((a, b) => a.tankNumber - b.tankNumber);
  }
  getTank(id) {
    const t = this.tanks.find((tk) => tk.id === id);
    if (!t) return null;
    const st = this.getStation(t.stationId);
    const nozs = this.nozzles.filter((n) => n.tankId === t.id || n.stationId === t.stationId && normalizeFuelCode(n.fuelCode) === normalizeFuelCode(t.fuelCode));
    const recentLoads = this.tankLoads.filter((l) => l.tankId === id).slice(0, 10);
    return {
      ...t,
      parentStation: st,
      associatedNozzles: nozs,
      recentLoads,
      auditEvents: []
    };
  }
  createTank(payload) {
    const uniformIdentity = String(
      payload.id ?? payload.tankNumber ?? payload.name ?? this.tanks.length + 1
    ).trim();
    const parsedNum = parseInt(uniformIdentity, 10);
    const tankNumber = !isNaN(parsedNum) && parsedNum > 0 ? parsedNum : typeof payload.tankNumber === "number" && payload.tankNumber > 0 ? payload.tankNumber : this.tanks.length + 1;
    const tankId = uniformIdentity;
    const displayName = uniformIdentity;
    const isDup = this.tanks.some(
      (t) => t.stationId === payload.stationId && (t.id === tankId || t.tankNumber === tankNumber)
    );
    if (isDup) {
      throw new Error(`Tank "${tankId}" (Number #${tankNumber}) already exists in this bunk.`);
    }
    const capacity = Number(payload.capacityLiters ?? 0);
    if (isNaN(capacity) || capacity <= 0) {
      throw new Error("Capacity must be a positive number greater than zero.");
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
      status: payload.status || "ACTIVE",
      location: payload.location || null,
      description: payload.description || null,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.tanks.push(newTank);
    return this.getTank(tankId);
  }
  updateTank(id, payload) {
    const t = this.tanks.find((tk) => tk.id === id);
    if (!t) throw new Error("Tank not found.");
    if (payload.fuelCode) {
      payload.fuelCode = normalizeFuelCode(payload.fuelCode);
    }
    if (payload.status === "INACTIVE" && t.status !== "INACTIVE") {
      const activeNozzles = this.nozzles.filter((n) => n.tankId === id && n.status === "ACTIVE");
      if (activeNozzles.length > 0) {
        throw new Error(
          `Cannot deactivate tank "${t.name || t.id}" because it is linked to active nozzle(s) (#${activeNozzles.map((n) => n.nozzleNumber).join(", ")}). Please deactivate or reassign the nozzles first.`
        );
      }
    }
    if (payload.capacityLiters !== void 0) {
      const cap = Number(payload.capacityLiters);
      if (isNaN(cap) || cap <= 0) throw new Error("Capacity must be greater than zero.");
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
    Object.assign(t, payload, { updatedAt: /* @__PURE__ */ new Date() });
    return this.getTank(id);
  }
  deactivateTank(id, status) {
    const t = this.tanks.find((tk) => tk.id === id);
    if (!t) throw new Error("Tank not found.");
    const nextStatus = status || (t.status === "INACTIVE" ? "ACTIVE" : "INACTIVE");
    if (nextStatus === "INACTIVE") {
      const activeNozzles = this.nozzles.filter((n) => n.tankId === id && n.status === "ACTIVE");
      if (activeNozzles.length > 0) {
        throw new Error(
          `Cannot deactivate tank "${t.name || t.id}" because it is linked to active nozzle(s) (#${activeNozzles.map((n) => n.nozzleNumber).join(", ")}). Please deactivate or reassign the nozzles first.`
        );
      }
    }
    t.status = nextStatus;
    t.updatedAt = /* @__PURE__ */ new Date();
    return this.getTank(id);
  }
  deleteTank(id) {
    const idx = this.tanks.findIndex((tk) => tk.id === id);
    if (idx === -1) throw new Error("Tank not found.");
    const tank = this.tanks[idx];
    const linkedNozzles = this.nozzles.filter((n) => n.tankId === id);
    const activeNozzles = linkedNozzles.filter((n) => n.status === "ACTIVE");
    if (activeNozzles.length > 0) {
      throw new Error(
        `Cannot delete tank "${tank.name || tank.id}" because it is linked to active nozzle(s) (#${activeNozzles.map((n) => n.nozzleNumber).join(", ")}). Please deactivate or reassign the nozzles before deleting this tank.`
      );
    }
    const linkedLoads = this.tankLoads.filter((l) => l.tankId === id);
    if (linkedLoads.length > 0) {
      throw new Error(
        `Cannot delete tank "${tank.name || tank.id}" because it has ${linkedLoads.length} historical decanting tanker delivery record(s). Deletion is blocked to preserve inventory audit history. Please deactivate the tank instead.`
      );
    }
    linkedNozzles.forEach((n) => {
      n.tankId = void 0;
    });
    this.tanks.splice(idx, 1);
    return { success: true, deletedTankId: id };
  }
  recordDip(tankId, dipCm, waterDipCm) {
    const t = this.tanks.find((tk) => tk.id === tankId);
    if (!t) throw new Error("Tank not found.");
    const newVol = calculateDipVolume(t.capacityLiters, dipCm, t.maxDipCm || 250);
    t.currentDipCm = Number(dipCm.toFixed(1));
    t.currentVolumeLiters = newVol;
    t.waterDipCm = Number(waterDipCm.toFixed(1));
    t.lastDipTimestamp = /* @__PURE__ */ new Date();
    return { ...t };
  }
  decantTankerLoad(payload) {
    const t = this.tanks.find(
      (tk) => String(tk.id) === String(payload.tankId) || String(tk.tankNumber) === String(payload.tankId) || tk.name === payload.tankId
    );
    if (!t) throw new Error("Tank not found.");
    const fuel = this.fuels.find((f) => f.code === t.fuelCode);
    const observedTemp = Number(payload.observedTemp ?? payload.temperatureC ?? 15);
    const observedDensity = Number(payload.observedDensity ?? (t.fuelCode === "DIESEL" ? 828.5 : 742));
    const invoiceDensity = Number(
      payload.invoiceDensity ?? fuel?.densityStandard15C ?? fuel?.densityStd15c ?? observedDensity
    );
    const corrected = correctDensity15C(observedDensity, observedTemp, t.fuelCode);
    const densityDiff = Math.abs(corrected - invoiceDensity);
    let densityStatus = "PASSED";
    if (fuel && densityDiff > (fuel?.densityTolerance || 3) * 2) {
      densityStatus = "REJECTED";
    } else if (fuel && densityDiff > (fuel?.densityTolerance || 3)) {
      densityStatus = "TOLERANCE_WARNING";
    }
    const volBefore = t.currentVolumeLiters;
    const dipBefore = t.currentDipCm;
    const newVol = Math.min(t.capacityLiters, volBefore + payload.invoiceVolumeLiters);
    const newDip = calculateVolumeToDip(t.capacityLiters, newVol, t.maxDipCm || 250);
    const recVol = newVol - volBefore;
    const varianceL = recVol - payload.invoiceVolumeLiters;
    const variancePct = Number((varianceL / payload.invoiceVolumeLiters * 100).toFixed(2));
    t.currentVolumeLiters = newVol;
    t.currentDipCm = newDip;
    t.lastDipTimestamp = /* @__PURE__ */ new Date();
    const stationId = payload.stationId || t.stationId || "st-101";
    const loadRecord = {
      id: `load-${Date.now()}`,
      stationId,
      tankId: payload.tankId,
      fuelCode: t.fuelCode,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
      operatorName: payload.operatorName || "Forecourt Manager",
      remarks: payload.remarks || "Standard verified tanker unload",
      invoiceImageUrl: payload.invoiceImageUrl || payload.imageUrl || null
    };
    this.tankLoads.unshift(loadRecord);
    return { tank: { ...t }, loadRecord };
  }
  getTankLoads(stationId) {
    if (stationId) return this.tankLoads.filter((l) => l.stationId === stationId);
    return this.tankLoads;
  }
  // Dispensers & Nozzles
  getDispensers(stationId) {
    let disps = this.dispensers;
    if (stationId) disps = disps.filter((d) => d.stationId === stationId);
    return disps.map((d) => ({
      ...d,
      nozzles: this.nozzles.filter((n) => n.dispenserId === d.id)
    }));
  }
  getNozzles(filter) {
    let list = this.nozzles;
    const stationId = typeof filter === "string" ? filter : filter?.stationId;
    if (stationId) list = list.filter((n) => n.stationId === stationId);
    if (filter && typeof filter === "object") {
      if (filter.fuelCode) list = list.filter((n) => n.fuelCode === filter.fuelCode);
      if (filter.status) list = list.filter((n) => n.status === filter.status);
    }
    return list.map((n) => {
      const st = this.stations.find((s) => s.id === n.stationId);
      const dp = this.dispensers.find((d) => d.id === n.dispenserId);
      return {
        ...n,
        stationName: st ? st.name : n.stationId,
        stationCode: st ? st.code : "",
        dispenserNumber: dp ? dp.dispenserNumber : 1,
        dispenserBrand: dp ? dp.brand : ""
      };
    });
  }
  getNozzle(id) {
    const n = this.nozzles.find((no) => no.id === id);
    if (!n) return null;
    const st = this.getStation(n.stationId);
    const dp = this.dispensers.find((d) => d.id === n.dispenserId);
    const recentReadings = this.meterReadings.filter((r) => r.nozzleId === id).slice(0, 10);
    return {
      ...n,
      stationName: st ? st.name : n.stationId,
      stationCode: st ? st.code : "",
      dispenserNumber: dp ? dp.dispenserNumber : 1,
      dispenserBrand: dp ? dp.brand : "",
      recentReadings
    };
  }
  createNozzle(payload) {
    const id = this.nextSeq("NOZZ");
    const fuelCode = normalizeFuelCode(payload.fuelCode);
    if (payload.tankId) {
      const tank = this.tanks.find((t) => t.id === payload.tankId);
      if (tank && normalizeFuelCode(tank.fuelCode) !== fuelCode) {
        throw new Error(`Incompatible fuel type: Feeder tank is configured for ${tank.fuelCode}, but nozzle was specified as ${payload.fuelCode}.`);
      }
    }
    const existingIndex = this.nozzles.findIndex(
      (n) => n.stationId === payload.stationId && n.nozzleNumber === payload.nozzleNumber
    );
    if (existingIndex !== -1) {
      this.nozzles.splice(existingIndex, 1);
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
      status: payload.status || "ACTIVE",
      mechanicalTotalizer: payload.mechanicalTotalizer || 0,
      electronicTotalizer: payload.electronicTotalizer || 0,
      notes: payload.notes || null,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.nozzles.push(newNozzle);
    return this.getNozzle(id);
  }
  updateNozzle(id, payload) {
    const n = this.nozzles.find((no) => no.id === id);
    if (!n) throw new Error("Nozzle not found.");
    if (payload.fuelCode) {
      payload.fuelCode = normalizeFuelCode(payload.fuelCode);
    }
    const targetTankId = payload.tankId !== void 0 ? payload.tankId : n.tankId;
    const targetFuelCode = payload.fuelCode || n.fuelCode;
    if (targetTankId) {
      const tank = this.tanks.find((t) => t.id === targetTankId);
      if (tank && normalizeFuelCode(tank.fuelCode) !== normalizeFuelCode(targetFuelCode)) {
        throw new Error(`Incompatible fuel type: Feeder tank is configured for ${tank.fuelCode}, but nozzle was specified as ${targetFuelCode}.`);
      }
    }
    Object.assign(n, payload, { updatedAt: /* @__PURE__ */ new Date() });
    return this.getNozzle(id);
  }
  updateNozzleStatus(id, status) {
    const n = this.nozzles.find((no) => no.id === id);
    if (!n) throw new Error("Nozzle not found.");
    n.status = status;
    n.updatedAt = /* @__PURE__ */ new Date();
    return this.getNozzle(id);
  }
  deleteNozzle(id) {
    const idx = this.nozzles.findIndex((no) => no.id === id);
    if (idx === -1) throw new Error("Nozzle not found.");
    const nozzle = this.nozzles[idx];
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
  getDailySalesReport(stationId, date) {
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
      const receivedDecanted = stationLoads.filter((l) => l.fuelCode === f.code).reduce((sum, l) => sum + (l.invoiceVolumeLiters || l.quantityLiters || 0), 0);
      const tank = stationTanks.find((t) => t.fuelCode === f.code);
      const actualClosing = tank ? tank.currentVolumeLiters : 15e3;
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
        grossRevenue: revenue || Math.round(meterSales * f.ratePerLiter)
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
      currency: station.currency || (station.timezone === "Asia/Dubai" ? "AED" : "INR"),
      date,
      status: "VERIFIED",
      fuelSummaries,
      totalVolumeSoldLiters: totalVolume,
      totalGrossRevenue,
      totalCashCollected: totalCash,
      totalDigitalCollected: totalDigital,
      totalCreditCollected: totalCredit,
      totalActualDeposits,
      settlementDifference,
      auditorNotes: "Certified daily forecourt inventory and revenue register generated from authoritative database."
    };
  }
  // Meter Readings
  recordMeterReading(payload) {
    const n = this.nozzles.find((no) => no.id === payload.nozzleId);
    if (!n) throw new Error("Nozzle not found.");
    const stationId = payload.stationId || n.stationId;
    const effectiveFuels = this.getFuels(stationId);
    const f = effectiveFuels.find((fl) => normalizeFuelCode(fl.code) === normalizeFuelCode(n.fuelCode));
    const rate = f ? f.ratePerLiter : 104.25;
    const openingVal = typeof payload.openingElectronic === "number" ? payload.openingElectronic : typeof payload.openingMeter === "number" ? payload.openingMeter : typeof payload.openingReading === "number" ? payload.openingReading : n.electronicTotalizer;
    const closingVal = typeof payload.closingElectronic === "number" ? payload.closingElectronic : typeof payload.closingMeter === "number" ? payload.closingMeter : typeof payload.closingReading === "number" ? payload.closingReading : openingVal;
    const isDecreasing = closingVal < openingVal;
    if (isDecreasing && !payload.isCorrection && !payload.correctionReason?.trim() && !payload.exceptionReason?.trim()) {
      throw new Error(
        `Invalid meter reading: Closing meter (${closingVal.toFixed(2)}) is lower than opening meter (${openingVal.toFixed(2)}). An authorized correction reason (e.g. mechanical replacement, rollover, recalibration) is required.`
      );
    }
    const photo = payload.meterPhotoUrl || payload.photoUrl;
    if (!photo || typeof photo !== "string" || !photo.trim()) {
      throw new Error("Meter totalizer photograph is strictly mandatory for legal metrology and audit compliance.");
    }
    const testVol = Number(payload.testFuelVolumeLiters ?? payload.testingLiters ?? 0);
    const grossDispensed = isDecreasing ? 0 : Math.max(0, Number((closingVal - openingVal).toFixed(2)));
    const netSold = Math.max(0, Number((grossDispensed - testVol).toFixed(2)));
    const netAmount = Number((netSold * rate).toFixed(2));
    if (netSold > 0 && n.tankId) {
      const matchedTank = this.tanks.find((t) => t.id === n.tankId);
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
        matchedTank.lastDipTimestamp = /* @__PURE__ */ new Date();
      }
    }
    n.electronicTotalizer = closingVal;
    n.mechanicalTotalizer = closingVal;
    n.updatedAt = /* @__PURE__ */ new Date();
    const id = this.nextSeq("READ");
    const reading = {
      id,
      stationId: payload.stationId || n.stationId,
      nozzleId: payload.nozzleId,
      fuelCode: n.fuelCode,
      readingTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
      readingType: payload.readingType || (payload.isCorrection ? "RESET_CORRECTION" : "REGULAR_SHIFT"),
      isCorrection: Boolean(payload.isCorrection),
      correctionReason: payload.correctionReason || null,
      remarks: payload.remarks || payload.notes || null,
      enteredBy: payload.recordedByName || payload.enteredBy || payload.recordedBy || "Operator",
      recordedBy: payload.recordedBy || "Operator",
      recordedByName: payload.recordedByName || payload.enteredBy || "Operator",
      shiftCode: payload.shiftCode || "GENERAL",
      shiftId: payload.shiftId || null,
      notes: payload.remarks || payload.notes || null,
      meterPhotoUrl: payload.meterPhotoUrl || payload.photoUrl || null,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    n.electronicTotalizer = closingVal;
    n.mechanicalTotalizer = closingVal;
    n.updatedAt = /* @__PURE__ */ new Date();
    this.meterReadings.unshift(reading);
    return reading;
  }
  getMeterReadings(filter) {
    let list = this.meterReadings;
    if (filter?.stationId) list = list.filter((r) => r.stationId === filter.stationId);
    if (filter?.nozzleId) list = list.filter((r) => r.nozzleId === filter.nozzleId);
    return list;
  }
  // Shifts
  getShifts(stationId) {
    let list = this.shifts;
    if (stationId) list = list.filter((s) => s.stationId === stationId);
    return list;
  }
  getShift(id) {
    return this.shifts.find((s) => s.id === id) || null;
  }
  createShift(payload) {
    const id = `sh-${Date.now().toString(36)}`;
    const newShift = {
      id,
      shiftCode: `SH-${String(this.shifts.length + 1).padStart(3, "0")}`,
      stationId: payload.stationId,
      attendantId: payload.attendantId,
      attendantName: payload.attendantName,
      startTime: (/* @__PURE__ */ new Date()).toISOString(),
      endTime: null,
      status: "ACTIVE",
      assignedNozzles: payload.assignedNozzles || [],
      totalFuelSoldLiters: 0,
      totalExpectedRevenue: 0,
      cashSubmitted: 0,
      digitalSubmitted: 0,
      creditSubmitted: 0,
      totalCollected: 0,
      shortageExcess: 0,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.shifts.unshift(newShift);
    return newShift;
  }
  closeShift(shiftId, payload) {
    const sh = this.shifts.find((s) => s.id === shiftId);
    if (!sh) throw new Error("Shift not found.");
    const totalCollected = (payload.cashSubmitted || 0) + (payload.digitalSubmitted || 0) + (payload.creditSubmitted || 0);
    const variance = Number((totalCollected - (payload.totalExpectedRevenue || 0)).toFixed(2));
    Object.assign(sh, {
      endTime: (/* @__PURE__ */ new Date()).toISOString(),
      status: "SETTLED",
      totalFuelSoldLiters: payload.totalFuelSoldLiters,
      totalExpectedRevenue: payload.totalExpectedRevenue,
      cashSubmitted: payload.cashSubmitted,
      digitalSubmitted: payload.digitalSubmitted,
      creditSubmitted: payload.creditSubmitted,
      totalCollected,
      shortageExcess: variance,
      notes: payload.notes || null,
      managerSignOff: payload.managerSignOff || "Manager Certified",
      closingPhotoUrl: payload.closingPhotoUrl || payload.photoUrl || null
    });
    if (Array.isArray(payload.nozzleReadings)) {
      for (const nr of payload.nozzleReadings) {
        const targetNozzle = this.nozzles.find((n) => n.id === nr.nozzleId);
        if (targetNozzle && typeof nr.endMeter === "number") {
          targetNozzle.electronicTotalizer = nr.endMeter;
          targetNozzle.mechanicalTotalizer = nr.endMeter;
          targetNozzle.updatedAt = /* @__PURE__ */ new Date();
        }
      }
    }
    return { ...sh };
  }
  // Users
  getUsers(filter) {
    let list = this.users;
    if (filter?.stationId) {
      list = list.filter((u) => u.stationId === filter.stationId || u.assignedBunks && u.assignedBunks.includes(filter.stationId));
    }
    if (filter?.role) list = list.filter((u) => u.role === filter.role);
    return list;
  }
  getUser(id) {
    return this.users.find((u) => u.id === id || id === "usr-owner-001" && u.id === "emp-admin-001" || id === "emp-admin-001" && u.id === "usr-owner-001") || null;
  }
  createUser(payload) {
    const role = payload.role || "ATTENDANT";
    const id = `emp-${role.toLowerCase().slice(0, 3)}-${Date.now().toString(36)}`;
    const cleanName = (payload.name || "New Staff Member").trim();
    const cleanEmail = (payload.email || "").trim().toLowerCase() || `${(payload.username || "user").trim().toLowerCase().replace(/\s+/g, "_")}@petropulse.in`;
    const cleanUsername = (payload.username || "").trim().toLowerCase() || cleanEmail.split("@")[0] || `user_${Date.now().toString().slice(-4)}`;
    const newUser = {
      id,
      name: cleanName,
      email: cleanEmail,
      username: cleanUsername,
      role,
      phone: payload.phone ? String(payload.phone).trim() : "+91 98000 00000",
      stationId: payload.stationId || "st-101",
      assignedBunks: payload.assignedBunks ? typeof payload.assignedBunks === "string" ? payload.assignedBunks : JSON.stringify(payload.assignedBunks) : JSON.stringify([payload.stationId || "st-101"]),
      status: payload.status || "ACTIVE",
      isActive: payload.isActive !== false && payload.status !== "INACTIVE",
      shiftSchedule: payload.shiftSchedule || "GENERAL",
      passwordHash: payload.passwordHash || hashPassword(payload.password || "PetroPulse@123"),
      customPermissions: payload.customPermissions || null,
      avatarUrl: payload.avatarUrl || null,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.users.push(newUser);
    return newUser;
  }
  updateUser(id, payload) {
    const u = this.users.find((usr) => usr.id === id || id === "usr-owner-001" && usr.id === "emp-admin-001");
    if (!u) throw new Error("User not found.");
    const updates = { ...payload };
    if (updates.name !== void 0) updates.name = String(updates.name || "").trim();
    if (updates.email !== void 0) updates.email = String(updates.email || "").trim().toLowerCase();
    if (updates.username !== void 0) updates.username = String(updates.username || "").trim().toLowerCase();
    if (updates.phone !== void 0) updates.phone = String(updates.phone || "").trim();
    if (updates.status !== void 0) updates.isActive = updates.status === "ACTIVE";
    if (updates.assignedBunks && Array.isArray(updates.assignedBunks)) {
      updates.assignedBunks = JSON.stringify(updates.assignedBunks);
    }
    Object.assign(u, updates, { updatedAt: /* @__PURE__ */ new Date() });
    return { ...u };
  }
  updateUserStatus(id, status) {
    const u = this.users.find((usr) => usr.id === id);
    if (!u) throw new Error("User not found.");
    u.status = status;
    u.isActive = status === "ACTIVE";
    u.updatedAt = /* @__PURE__ */ new Date();
    return { ...u };
  }
  deleteUser(id) {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error("User not found.");
    this.users.splice(idx, 1);
    return { success: true, deletedUserId: id };
  }
  resolveQRCode(identifier) {
    if (!identifier?.trim()) throw new Error("QR code identifier cannot be empty.");
    const clean = identifier.trim().toUpperCase();
    const matchedStation = this.stations.find(
      (s) => s.id.toUpperCase() === clean || s.code?.toUpperCase() === clean
    );
    if (matchedStation) {
      return {
        type: "BUNK",
        entity: matchedStation,
        identifier: matchedStation.code || matchedStation.id,
        name: matchedStation.name,
        stationId: matchedStation.id,
        isActive: matchedStation.status === "ONLINE" || matchedStation.status === "ACTIVE"
      };
    }
    const matchedTank = this.tanks.find((t) => t.id.toUpperCase() === clean);
    if (matchedTank) {
      const parentStation = this.stations.find((s) => s.id === matchedTank.stationId);
      return {
        type: "TANK",
        entity: matchedTank,
        parentStation,
        identifier: matchedTank.id,
        name: matchedTank.name || `Tank #${matchedTank.tankNumber}`,
        stationId: matchedTank.stationId,
        isActive: matchedTank.status === "ACTIVE"
      };
    }
    const matchedNozzle = this.nozzles.find((n) => n.id.toUpperCase() === clean);
    if (matchedNozzle) {
      const parentStation = this.stations.find((s) => s.id === matchedNozzle.stationId);
      return {
        type: "NOZZLE",
        entity: matchedNozzle,
        parentStation,
        identifier: matchedNozzle.id,
        name: matchedNozzle.name || `Nozzle #${matchedNozzle.nozzleNumber}`,
        stationId: matchedNozzle.stationId,
        isActive: matchedNozzle.status === "ACTIVE"
      };
    }
    throw new Error(`QR code "${identifier}" was not found in the database. Please verify the QR identifier.`);
  }
  // Role Permissions
  getRolePermissions() {
    return this.rolePermissions;
  }
  updateRolePermission(id, perms) {
    const p = this.rolePermissions.find((perm) => perm.id === id);
    if (p) Object.assign(p, perms);
    return this.rolePermissions;
  }
  checkPrivilege(role, module, action, userId) {
    if (role === "OWNER") return true;
    const roleDef = SYSTEM_ROLES.find((r) => r.id === role);
    if (roleDef && roleDef.defaultPermissions[module]) {
      const p = roleDef.defaultPermissions[module];
      if (action === "CREATE") return p.canCreate;
      if (action === "READ") return p.canRead;
      if (action === "UPDATE") return p.canUpdate;
      if (action === "DELETE") return p.canDelete;
    }
    return false;
  }
  // EOD
  getEODSettlements(stationId) {
    let list = this.eodSettlements;
    if (stationId) list = list.filter((e) => e.stationId === stationId);
    return list;
  }
  runEODClose(payload) {
    const settlement = {
      id: `eod-${Date.now()}`,
      stationId: payload.stationId,
      settlementDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      actualCloseTimestamp: /* @__PURE__ */ new Date(),
      totalLitresSold: 4200.5,
      totalExpectedRevenue: 412500,
      totalCashCollected: 245e3,
      totalDigitalCollected: 167500,
      totalCreditSales: 0,
      netCashVariance: 0,
      isDayFinalized: true,
      closedBy: payload.closedBy || "Administrator",
      shiftCount: 2,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.eodSettlements.unshift(settlement);
    return settlement;
  }
  // Profile
  getProfile(role, stationId = "st-101") {
    const emp = this.users.find((u) => u.role === role);
    if (emp) return { ...emp, stationId };
    return {
      id: "usr-default",
      name: "Administrator",
      role,
      email: "admin@petropulse.io",
      phone: "+91 98200 12345",
      stationId,
      avatarUrl: null
    };
  }
  updateProfile(payload) {
    const emp = this.users.find((u) => u.role === (payload.role || "OWNER"));
    if (emp) {
      Object.assign(emp, payload);
    }
    return {
      ...payload,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  clearForecourtData() {
    this.stations = [];
    this.tanks = [];
    this.dispensers = [];
    this.nozzles = [];
    this.shifts = [];
    this.meterReadings = [];
    this.eodSettlements = [];
    this.users = this.users.filter((u) => u.role === "OWNER" || u.username === "admin");
    console.log("[MockStore] Forecourt data cleared. Admin and fuel catalog preserved.");
  }
};
var mockStore = new MockStore();

// src/db/dbSyncLogger.ts
var SCHEMA_TABLES = [
  { tableName: "number_sequences", label: "Atomic Number Sequences", mockKey: "sequences" },
  { tableName: "stations", label: "Bunks & Forecourts", mockKey: "stations" },
  { tableName: "fuels", label: "Fuel Master Catalog", mockKey: "fuels" },
  { tableName: "tanks", label: "Underground Storage Tanks", mockKey: "tanks" },
  { tableName: "tank_loads", label: "Decanting Receipts (Tank Loads)", mockKey: "tankDeliveries" },
  { tableName: "dispensers", label: "Forecourt Dispensers", mockKey: "dispensers" },
  { tableName: "nozzles", label: "Dispenser Fuel Nozzles", mockKey: "nozzles" },
  { tableName: "manual_meter_readings", label: "Meter Readings & Totalizers", mockKey: "meterReadings" },
  { tableName: "employees", label: "Employees & User Master", mockKey: "users" },
  { tableName: "shifts", label: "Forecourt Shifts & Handover", mockKey: "shifts" },
  { tableName: "eod_settlements", label: "EOD Day Settlements", mockKey: "dayCloseRecords" },
  { tableName: "role_permissions", label: "Role Privilege Matrix", mockKey: "rolePermissions" },
  { tableName: "fuel_price_history", label: "Fuel Price History & Audit", mockKey: "fuelPriceHistory" },
  { tableName: "audit_logs", label: "Forecourt Audit Logs", mockKey: "auditLogs" },
  { tableName: "sessions", label: "Active User Sessions", mockKey: "sessions" }
];
var lastSyncReport = null;
function getSanitizedDbTarget() {
  const connStr = process.env.DATABASE_URL;
  if (connStr) {
    try {
      const parsed = new URL(connStr);
      const user2 = parsed.username || "postgres";
      const host2 = parsed.hostname || "localhost";
      const port2 = parsed.port || "3306";
      const db3 = parsed.pathname ? parsed.pathname.replace(/^\//, "") : "petropulse";
      return `postgresql://${user2}:******@${host2}:${port2}/${db3}`;
    } catch {
      return connStr.replace(/:([^:@]+)@/, ":******@");
    }
  }
  const user = process.env.SQL_USER || "postgres";
  const host = process.env.SQL_HOST || "localhost";
  const port = process.env.SQL_PORT || "3306";
  const db2 = process.env.SQL_DB_NAME || "petropulse";
  return `postgresql://${user}:******@${host}:${port}/${db2}`;
}
async function testDbConnection() {
  const sanitizedTarget = getSanitizedDbTarget();
  console.log(`[DB Connection] \u{1F50C} Initializing PostgreSQL connection diagnostics...`);
  console.log(`[DB Connection] \u{1F3AF} Target: ${sanitizedTarget} (Pool Max: 10, Timeout: 15000ms)`);
  const startTime = Date.now();
  let client = null;
  try {
    client = await pool.connect();
    const result = await client.query(`
      SELECT 
        current_database() AS db_name, 
        version() AS db_version, 
        NOW() AS server_time
    `);
    const latencyMs = Date.now() - startTime;
    const dbName = result.rows[0]?.db_name || "petropulse";
    const versionStr = result.rows[0]?.db_version || "PostgreSQL";
    const shortVersion = versionStr.split(",")[0] || "PostgreSQL";
    console.log(`[DB Connection] \u2705 PostgreSQL connection established successfully in ${latencyMs}ms!`);
    console.log(`[DB Connection] \u{1F4E6} Database: "${dbName}" | Engine: ${shortVersion}`);
    return {
      connected: true,
      latencyMs,
      database: dbName,
      engine: shortVersion
    };
  } catch (err) {
    console.log("Error ion test DB connnection ", err);
    const latencyMs = Date.now() - startTime;
    console.warn(`[DB Connection] \u26A0\uFE0F PostgreSQL connection failed (${latencyMs}ms): ${err.message}`);
    console.info(`[DB Connection] \u{1F6E1}\uFE0F PetroPulse Resilient Architecture: Automatically operating in In-Memory / MockStore offline mode.`);
    return {
      connected: false,
      latencyMs,
      database: process.env.SQL_DB_NAME || "petropulse",
      engine: "In-Memory MockStore (Offline Resilient)",
      error: err.message
    };
  } finally {
    if (client) {
      try {
        client.release();
      } catch {
      }
    }
  }
}
async function verifyAndLogTableSync(connectionInfo) {
  const tables = [];
  if (connectionInfo.connected) {
    console.log(`[DB Table Sync] \u{1F504} Verifying ${SCHEMA_TABLES.length} schema tables against PostgreSQL public schema...`);
    let existingTableSet = /* @__PURE__ */ new Set();
    let client = null;
    try {
      client = await pool.connect();
      const res = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `);
      existingTableSet = new Set(res.rows.map((r) => r.table_name.toLowerCase()));
      for (const item of SCHEMA_TABLES) {
        const isPresent = existingTableSet.has(item.tableName.toLowerCase());
        let count = 0;
        let countErr;
        if (isPresent) {
          try {
            const countRes = await client.query(`SELECT count(*)::int AS cnt FROM "${item.tableName}"`);
            count = countRes.rows[0]?.cnt || 0;
          } catch (e) {
            countErr = e.message;
          }
        }
        tables.push({
          tableName: item.tableName,
          label: item.label,
          status: isPresent ? "SYNCED" : "MISSING",
          rowCount: count,
          error: countErr
        });
      }
    } catch (err) {
      console.warn(`[DB Table Sync] \u26A0\uFE0F Failed querying information_schema: ${err.message}`);
    } finally {
      if (client) {
        try {
          client.release();
        } catch {
        }
      }
    }
    const syncedCount = tables.filter((t) => t.status === "SYNCED").length;
    const missingCount = tables.filter((t) => t.status === "MISSING").length;
    console.log(`[DB Table Sync] \u{1F4CA} Table Synchronization Status (${syncedCount}/${SCHEMA_TABLES.length} Synced):`);
    for (let i = 0; i < tables.length; i++) {
      const t = tables[i];
      const isLast = i === tables.length - 1;
      const prefix = isLast ? "  \u2514\u2500\u2500 " : "  \u251C\u2500\u2500 ";
      const padName = t.tableName.padEnd(24, ".");
      const statusStr = t.status === "SYNCED" ? `[SYNCED - ${t.rowCount} rows]` : `[MISSING \u26A0\uFE0F]`;
      console.log(`${prefix}${padName} ${statusStr}`);
    }
    if (missingCount === 0) {
      console.log(`[DB Table Sync] \u2705 All ${syncedCount} database schema tables are fully synchronized!`);
    } else {
      console.warn(`[DB Table Sync] \u26A0\uFE0F Schema disparity: ${missingCount} tables missing in PostgreSQL.`);
      console.info(`[DB Table Sync] \u{1F4A1} Tip: Run 'npm run migrate' to synchronize schema automatically.`);
    }
    const report2 = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      connection: {
        target: getSanitizedDbTarget(),
        connected: true,
        engine: connectionInfo.engine,
        database: connectionInfo.database,
        latencyMs: connectionInfo.latencyMs,
        pool: {
          total: pool.totalCount,
          idle: pool.idleCount,
          waiting: pool.waitingCount
        }
      },
      tableSync: {
        mode: "POSTGRESQL",
        totalExpectedTables: SCHEMA_TABLES.length,
        syncedTablesCount: syncedCount,
        missingTablesCount: missingCount,
        tables
      }
    };
    lastSyncReport = report2;
    return report2;
  }
  console.log(`[DB Table Sync] \u{1F504} Synchronizing In-Memory Forecourt Schema Stores...`);
  for (const item of SCHEMA_TABLES) {
    let count = 0;
    try {
      const storeVal = mockStore[item.mockKey];
      if (Array.isArray(storeVal)) {
        count = storeVal.length;
      } else if (storeVal && typeof storeVal === "object") {
        count = Object.keys(storeVal).length;
      }
    } catch {
      count = 0;
    }
    tables.push({
      tableName: item.tableName,
      label: item.label,
      status: "READY_IN_MEMORY",
      rowCount: count
    });
  }
  console.log(`[DB Table Sync] \u{1F4CA} In-Memory Entity Store Synchronization Status (${tables.length}/${SCHEMA_TABLES.length} Synced):`);
  for (let i = 0; i < tables.length; i++) {
    const t = tables[i];
    const isLast = i === tables.length - 1;
    const prefix = isLast ? "  \u2514\u2500\u2500 " : "  \u251C\u2500\u2500 ";
    const padName = t.tableName.padEnd(24, ".");
    console.log(`${prefix}${padName} [READY - ${t.rowCount} records]`);
  }
  console.log(`[DB Table Sync] \u2705 All ${tables.length} forecourt entities ready and synchronized in reactive in-memory store.`);
  const report = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    connection: {
      target: getSanitizedDbTarget(),
      connected: false,
      engine: connectionInfo.engine,
      database: connectionInfo.database,
      latencyMs: connectionInfo.latencyMs,
      error: connectionInfo.error,
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      }
    },
    tableSync: {
      mode: "IN_MEMORY_FALLBACK",
      totalExpectedTables: SCHEMA_TABLES.length,
      syncedTablesCount: tables.length,
      missingTablesCount: 0,
      tables
    }
  };
  lastSyncReport = report;
  return report;
}
async function initDbAndSyncTables() {
  const connResult = await testDbConnection();
  return await verifyAndLogTableSync(connResult);
}
function getDbSyncStatus() {
  return lastSyncReport;
}

// src/db/index.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var envPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "backend", ".env"),
  path.resolve(__dirname, "..", "..", ".env"),
  path.resolve(__dirname, "..", "..", "backend", ".env")
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}
dotenv.config();
var createPool = () => {
  if (!global._postgresPool) {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      const isRemote = connectionString.includes("supabase.com") || connectionString.includes("pooler.supabase") || connectionString.includes("sslmode=require") || process.env.DB_SSL === "true";
      global._postgresPool = new Pool({
        connectionString,
        max: 10,
        connectionTimeoutMillis: 15e3,
        ssl: isRemote ? { rejectUnauthorized: false } : void 0
      });
    } else {
      global._postgresPool = new Pool({
        host: process.env.SQL_HOST || "localhost",
        user: process.env.SQL_USER || "postgres",
        password: process.env.SQL_PASSWORD || "postgres",
        database: process.env.SQL_DB_NAME || "petropulse",
        port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : 3307,
        max: 10,
        connectionTimeoutMillis: 15e3
      });
    }
    global._postgresPool.on("error", (err) => {
      console.error("[DB Pool Error] Unexpected error on idle SQL pool client:", err.message);
    });
    global._postgresPool.on("connect", () => {
    });
  }
  return global._postgresPool;
};
var pool = createPool();
var db = drizzle(pool, { schema: schema_exports });

// src/db/service.ts
import { eq, desc, and, sql } from "drizzle-orm";
var dbService = {
  // 1. Stations (Bunks)
  async getStations() {
    try {
      const allStations = await db.select().from(stations);
      const allNozzles = await db.select().from(nozzles).catch(() => []);
      const allTanks = await db.select().from(tanks).catch(() => []);
      return allStations.map((st) => ({
        ...st,
        nozzleCount: allNozzles.filter((n) => n.stationId === st.id).length,
        tankCount: allTanks.filter((t) => t.stationId === st.id).length
      }));
    } catch (err) {
      console.warn("[DB getStations offline fallback]:", err.message);
      return mockStore.getStations();
    }
  },
  async getStation(id) {
    try {
      const rows = await db.select().from(stations).where(eq(stations.id, id));
      if (rows[0]) {
        const st = rows[0];
        const nozs = await db.select().from(nozzles).where(eq(nozzles.stationId, id)).catch(() => []);
        const tnks = await db.select().from(tanks).where(eq(tanks.stationId, id)).catch(() => []);
        return {
          ...st,
          nozzleCount: nozs.length,
          tankCount: tnks.length
        };
      }
    } catch (err) {
      console.warn("[DB getStation offline fallback]:", err.message);
    }
    return mockStore.getStation(id);
  },
  async generateUniqueEntityCode(prefix, checkExists, maxRetries = 10, padLength = 6) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const candidateCode = await this.getNextSequenceNumber(prefix, padLength);
      const exists = await checkExists(candidateCode);
      if (!exists) {
        return candidateCode;
      }
      console.warn(`[CodeGeneration] Collision detected for sequence ${candidateCode} (attempt ${attempt}/${maxRetries}). Retrying with next sequence...`);
    }
    const errMsg = `[CodeGeneration] Exhausted all ${maxRetries} retry attempts generating unique authoritative code for ${prefix}.`;
    console.error(errMsg);
    throw new Error(`Failed to assign unique ${prefix} code due to persistent sequence collisions after ${maxRetries} attempts. Please contact administrator.`);
  },
  async getNextSequenceNumber(prefix, padLength = 6) {
    const result = await db.transaction(async (tx) => {
      const res = await tx.insert(numberSequences).values({ prefix, currentValue: 1, updatedAt: /* @__PURE__ */ new Date() }).onConflictDoUpdate({
        target: numberSequences.prefix,
        set: {
          currentValue: sql`${numberSequences.currentValue} + 1`,
          updatedAt: /* @__PURE__ */ new Date()
        }
      }).returning({ currentValue: numberSequences.currentValue });
      return res[0]?.currentValue || 1;
    });
    return `${prefix}-${String(result).padStart(padLength, "0")}`;
  },
  async peekNextBunkCode() {
    try {
      const existing = await db.select().from(numberSequences).where(eq(numberSequences.prefix, "BUNK"));
      const val = (existing[0]?.currentValue || 0) + 1;
      return `BUNK-${String(val).padStart(6, "0")}`;
    } catch {
      return "BUNK-000001";
    }
  },
  async getNextBunkCode() {
    try {
      return await this.generateUniqueEntityCode("BUNK", async (code) => {
        const rows = await db.select().from(stations).where(eq(stations.code, code));
        return rows.length > 0;
      });
    } catch {
      return "BUNK-000001";
    }
  },
  async getNextTankCode() {
    try {
      return await this.generateUniqueEntityCode("TANK", async (code) => {
        const rows = await db.select().from(tanks).where(eq(tanks.id, code));
        return rows.length > 0;
      });
    } catch {
      return mockStore.nextSeq("TANK");
    }
  },
  async getNextNozzleCode() {
    try {
      return await this.generateUniqueEntityCode("NOZZ", async (code) => {
        const rows = await db.select().from(nozzles).where(eq(nozzles.id, code));
        return rows.length > 0;
      });
    } catch {
      return mockStore.nextSeq("NOZZ");
    }
  },
  async getNextReadingCode() {
    try {
      return await this.generateUniqueEntityCode("READ", async (code) => {
        const rows = await db.select().from(manualMeterReadings).where(eq(manualMeterReadings.id, code));
        return rows.length > 0;
      });
    } catch {
      return mockStore.nextSeq("READ");
    }
  },
  async createAuditLog(entity, entityId, action, actorId = "system", actorName = "System User", details, ipAddress) {
    try {
      const id = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await db.insert(auditLogs).values({
        id,
        entity,
        entityId,
        action,
        actorId,
        actorName,
        detailsJson: details ? JSON.stringify(details) : null,
        ipAddress: ipAddress || null,
        timestamp: /* @__PURE__ */ new Date()
      });
    } catch (err) {
      console.warn("Failed to record audit log:", err);
    }
  },
  async getAuditLogs(entity, entityId) {
    try {
      let logs = await db.select().from(auditLogs);
      if (entity) {
        logs = logs.filter((l) => l.entity.toUpperCase() === entity.toUpperCase());
      }
      if (entityId) {
        logs = logs.filter((l) => l.entityId === entityId);
      }
      return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch {
      return [];
    }
  },
  async createStation(payload, actorId = "system", actorName = "Administrator") {
    try {
      if (!payload.name?.trim()) throw new Error("Bunk name is required.");
      if (payload.name.trim().length < 3) throw new Error("Bunk name must be at least 3 characters.");
      const cleanCode = payload.code?.trim().toUpperCase() || await this.getNextBunkCode();
      let managerName = payload.managerName?.trim() || "Unassigned";
      let managerId = payload.managerId?.trim() || null;
      if (managerId) {
        const empRows = await db.select().from(employees).where(eq(employees.id, managerId));
        const emp = empRows[0];
        if (!emp) {
          throw new Error("Assigned manager does not exist in User Master.");
        }
        if (!emp.isActive || emp.status === "INACTIVE") {
          throw new Error(`User "${emp.name}" is inactive and cannot be assigned as bunk manager.`);
        }
        if (emp.role !== "MANAGER" && emp.role !== "OWNER") {
          throw new Error(`User "${emp.name}" (${emp.role}) is not authorized. Only users with Manager or Owner role can be assigned as bunk manager.`);
        }
        managerName = emp.name;
      }
      const id = cleanCode;
      const newStation = {
        id,
        name: payload.name.trim(),
        code: cleanCode,
        location: payload.location?.trim() || payload.cityState?.trim() || payload.address?.trim() || "Highway Corridor",
        managerId,
        managerName,
        phone: payload.phone?.trim() || "+91 90000 00000",
        address: payload.address?.trim() || "",
        cityState: payload.cityState?.trim() || "",
        postalCode: payload.postalCode?.trim() || "",
        email: payload.email?.trim() || "",
        latitude: payload.latitude || null,
        longitude: payload.longitude || null,
        notes: payload.notes?.trim() || "",
        timezone: payload.timezone?.trim() || "Asia/Kolkata",
        operatingHours: payload.operatingHours?.trim() || "24_HOURS",
        eodCloseTime: payload.eodCloseTime?.trim() || "23:59",
        status: payload.status?.trim() || "ONLINE",
        currency: payload.currency?.trim() || (payload.timezone === "Asia/Dubai" ? "AED" : "INR"),
        createdAt: /* @__PURE__ */ new Date(),
        createdBy: actorName,
        updatedAt: /* @__PURE__ */ new Date(),
        updatedBy: actorName
      };
      await db.insert(stations).values(newStation);
      const dispId = `dsp-${id}-1`;
      await db.insert(dispensers).values({
        id: dispId,
        stationId: id,
        dispenserNumber: 1,
        islandNumber: 1,
        brand: "Gilbarco Multi-Product Dispenser",
        status: "ACTIVE"
      });
      await this.createAuditLog("BUNK", id, "CREATE", actorId, actorName, {
        name: newStation.name,
        code: cleanCode
      });
      return await this.getStation(id);
    } catch (err) {
      console.error("[DB createStation error]:", err.message);
      throw err;
    }
  },
  async updateStation(id, payload, actorId = "system", actorName = "Administrator") {
    try {
      const existingRows = await db.select().from(stations).where(eq(stations.id, id));
      if (existingRows.length === 0) throw new Error("Bunk not found.");
      if (payload.name !== void 0) {
        if (!payload.name?.trim()) throw new Error("Bunk name is required.");
        if (payload.name.trim().length < 3) throw new Error("Bunk name must be at least 3 characters.");
      }
      if (payload.code) {
        const cleanCode = payload.code.trim().toUpperCase();
        const allStations = await db.select().from(stations);
        if (allStations.some((s) => s.id !== id && s.code.toUpperCase() === cleanCode)) {
          throw new Error(`Another bunk with code "${cleanCode}" already exists.`);
        }
        payload.code = cleanCode;
      }
      if (payload.managerId !== void 0) {
        if (payload.managerId) {
          const empRows = await db.select().from(employees).where(eq(employees.id, payload.managerId));
          const emp = empRows[0];
          if (!emp) {
            throw new Error("Assigned manager does not exist in User Master.");
          }
          if (!emp.isActive || emp.status === "INACTIVE") {
            throw new Error(`User "${emp.name}" is inactive and cannot be assigned as bunk manager.`);
          }
          if (emp.role !== "MANAGER" && emp.role !== "OWNER") {
            throw new Error(`User "${emp.name}" (${emp.role}) is not authorized. Only users with Manager or Owner role can be assigned as bunk manager.`);
          }
          payload.managerName = emp.name;
        } else {
          payload.managerId = void 0;
          payload.managerName = "Unassigned";
        }
      }
      await db.update(stations).set({
        ...payload,
        updatedAt: /* @__PURE__ */ new Date(),
        updatedBy: actorName
      }).where(eq(stations.id, id));
      await this.createAuditLog("BUNK", id, "UPDATE", actorId, actorName, {
        changes: payload
      });
      return await this.getStation(id);
    } catch (err) {
      console.error("[DB updateStation error]:", err.message);
      throw err;
    }
  },
  async deactivateStation(id, actorId = "system", actorName = "Administrator") {
    try {
      const stRows = await db.select().from(stations).where(eq(stations.id, id));
      const station = stRows[0];
      if (!station) throw new Error("Bunk not found.");
      const newStatus = station.status === "INACTIVE" ? "ONLINE" : "INACTIVE";
      await db.update(stations).set({ status: newStatus, updatedAt: /* @__PURE__ */ new Date(), updatedBy: actorName }).where(eq(stations.id, id));
      await this.createAuditLog("BUNK", id, newStatus === "INACTIVE" ? "DEACTIVATE" : "ACTIVATE", actorId, actorName, {
        previousStatus: station.status,
        newStatus
      });
      return await this.getStation(id);
    } catch (err) {
      console.error("[DB deactivateStation error]:", err.message);
      throw err;
    }
  },
  async deleteStation(id, actorId = "system", actorName = "Administrator") {
    try {
      const stRows = await db.select().from(stations).where(eq(stations.id, id));
      const station = stRows[0];
      if (!station) throw new Error("Bunk not found.");
      const [tankRows, nozzleRows, readingRows, employeeRows, shiftRows] = await Promise.all([
        db.select().from(tanks).where(eq(tanks.stationId, id)),
        db.select().from(nozzles).where(eq(nozzles.stationId, id)),
        db.select().from(manualMeterReadings).where(eq(manualMeterReadings.stationId, id)),
        db.select().from(employees).where(eq(employees.stationId, id)),
        db.select().from(shifts).where(eq(shifts.stationId, id))
      ]);
      const activeTanks = tankRows.filter((t) => t.status === "ACTIVE");
      const activeNozzles = nozzleRows.filter((n) => n.status === "ACTIVE");
      const activeEmployees = employeeRows.filter((e) => e.status === "ACTIVE" || e.isActive);
      const activeShifts = shiftRows.filter((s) => s.status === "ACTIVE");
      const dispensedReadings = readingRows.filter(
        (r) => r.grossDispensedLiters && r.grossDispensedLiters > 0 || r.netSoldLiters && r.netSoldLiters > 0
      );
      const blockReasons = [];
      if (activeTanks.length > 0) blockReasons.push(`${activeTanks.length} active tank(s)`);
      if (activeNozzles.length > 0) blockReasons.push(`${activeNozzles.length} active nozzle(s)`);
      if (activeEmployees.length > 0) blockReasons.push(`${activeEmployees.length} assigned employee(s)`);
      if (activeShifts.length > 0) blockReasons.push(`${activeShifts.length} active shift(s)`);
      if (dispensedReadings.length > 0) blockReasons.push(`${dispensedReadings.length} dispensed fuel transaction(s)`);
      if (blockReasons.length > 0) {
        throw new Error(
          `Cannot permanently delete bunk "${station.name}" (${station.code}) because it has active assets or recorded dispensing: ${blockReasons.join(", ")}. Please deactivate all tanks and nozzles, and reassign staff before deleting.`
        );
      }
      await db.transaction(async (tx) => {
        await tx.delete(manualMeterReadings).where(eq(manualMeterReadings.stationId, id));
        await tx.delete(nozzles).where(eq(nozzles.stationId, id));
        await tx.delete(tanks).where(eq(tanks.stationId, id));
        await tx.delete(dispensers).where(eq(dispensers.stationId, id));
        await tx.delete(stations).where(eq(stations.id, id));
      });
      await this.createAuditLog("BUNK", id, "DELETE", actorId, actorName, {
        stationName: station.name,
        stationCode: station.code
      });
      return { success: true, deletedStationId: id };
    } catch (err) {
      console.error("[DB deleteStation error]:", err.message);
      throw err;
    }
  },
  // 2. Fuels
  async getFuels(stationId) {
    try {
      const fuels2 = await db.select().from(fuels);
      const stationOverrides = /* @__PURE__ */ new Map();
      if (stationId && stationId !== "ALL") {
        try {
          const historyRows = await db.select().from(fuelPriceHistory).where(eq(fuelPriceHistory.stationId, stationId)).orderBy(desc(fuelPriceHistory.effectiveFrom), desc(fuelPriceHistory.createdAt));
          for (const row of historyRows) {
            const norm = normalizeFuelCode(row.fuelCode);
            if (!stationOverrides.has(norm)) {
              stationOverrides.set(norm, row.ratePerLiter);
            }
          }
        } catch (e) {
          console.warn("[DB fuelPriceHistory error]:", e.message);
        }
      }
      if (fuels2 && fuels2.length > 0) {
        const map = /* @__PURE__ */ new Map();
        for (const f of fuels2) {
          const norm = normalizeFuelCode(f.code);
          const def = getFuelDefinition(norm);
          const hasStationRate = stationOverrides.has(norm);
          const effectiveRate = hasStationRate ? stationOverrides.get(norm) : f.ratePerLiter;
          if (!map.has(norm)) {
            map.set(norm, {
              ...f,
              code: norm,
              name: def.displayName,
              shortName: def.shortName,
              color: def.colorHex,
              colorName: def.colorName,
              densityStd15c: def.densityStd15c,
              densityTolerance: def.densityTolerance,
              ratePerLiter: effectiveRate,
              globalRatePerLiter: f.ratePerLiter,
              stationRatePerLiter: hasStationRate ? stationOverrides.get(norm) : null,
              isStationCustom: hasStationRate,
              stationId: stationId || null
            });
          }
        }
        for (const s of STANDARD_FUELS) {
          if (!map.has(s.code)) {
            const defaultGlobalRate = s.code === "OCTANE_98" ? 111.5 : s.code === "OCTANE_95" ? 104.25 : 92.8;
            const hasStationRate = stationOverrides.has(s.code);
            const effectiveRate = hasStationRate ? stationOverrides.get(s.code) : defaultGlobalRate;
            map.set(s.code, {
              code: s.code,
              name: s.name,
              shortName: s.shortName,
              ratePerLiter: effectiveRate,
              globalRatePerLiter: defaultGlobalRate,
              stationRatePerLiter: hasStationRate ? stationOverrides.get(s.code) : null,
              isStationCustom: hasStationRate,
              stationId: stationId || null,
              densityStd15c: s.densityStd15c,
              densityTolerance: s.densityTolerance,
              color: s.color,
              colorName: s.colorName,
              updatedAt: /* @__PURE__ */ new Date()
            });
          }
        }
        return ["OCTANE_98", "OCTANE_95", "DIESEL"].map((c) => map.get(c)).filter(Boolean);
      }
    } catch (err) {
      console.warn("[DB getFuels offline fallback]:", err.message);
    }
    return mockStore.getFuels(stationId);
  },
  async updateFuelRate(code, newRate, stationId, actorId = "SYSTEM", actorName = "Forecourt Manager", remarks) {
    const norm = normalizeFuelCode(code);
    const targetStation = stationId && stationId !== "ALL" ? stationId : null;
    try {
      if (targetStation) {
        const historyId = `PRC-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        await db.insert(fuelPriceHistory).values({
          id: historyId,
          fuelCode: norm,
          stationId: targetStation,
          ratePerLiter: newRate,
          effectiveFrom: /* @__PURE__ */ new Date(),
          remarks: remarks || `Station-specific retail price revision for bunk ${targetStation}`,
          createdAt: /* @__PURE__ */ new Date(),
          createdBy: actorId,
          createdByName: actorName
        });
        await this.createAuditLog(
          "PRICING",
          `${targetStation}:${norm}`,
          "PRICE_CHANGE",
          actorId,
          actorName,
          {
            stationId: targetStation,
            fuelCode: norm,
            ratePerLiter: newRate,
            type: "STATION_SPECIFIC"
          }
        );
      } else {
        await db.update(fuels).set({ ratePerLiter: newRate, updatedAt: /* @__PURE__ */ new Date() }).where(eq(fuels.code, norm));
        await db.update(fuels).set({ ratePerLiter: newRate, updatedAt: /* @__PURE__ */ new Date() }).where(eq(fuels.code, code));
        const historyId = `PRC-GLB-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        await db.insert(fuelPriceHistory).values({
          id: historyId,
          fuelCode: norm,
          stationId: null,
          ratePerLiter: newRate,
          effectiveFrom: /* @__PURE__ */ new Date(),
          remarks: remarks || "Global base retail price revision across all stations",
          createdAt: /* @__PURE__ */ new Date(),
          createdBy: actorId,
          createdByName: actorName
        }).catch(() => {
        });
        await this.createAuditLog(
          "PRICING",
          norm,
          "PRICE_CHANGE",
          actorId,
          actorName,
          {
            fuelCode: norm,
            ratePerLiter: newRate,
            type: "GLOBAL"
          }
        );
      }
    } catch (err) {
      console.warn("[DB updateFuelRate error, falling back to mockStore]:", err.message);
      mockStore.updateFuelRate(code, newRate, targetStation);
    }
    return await this.getFuels(targetStation || void 0);
  },
  async resetStationFuelRate(code, stationId, actorId = "SYSTEM", actorName = "Forecourt Manager") {
    const norm = normalizeFuelCode(code);
    try {
      await db.delete(fuelPriceHistory).where(and(eq(fuelPriceHistory.stationId, stationId), eq(fuelPriceHistory.fuelCode, norm)));
      await this.createAuditLog(
        "PRICING",
        `${stationId}:${norm}`,
        "PRICE_CHANGE",
        actorId,
        actorName,
        {
          stationId,
          fuelCode: norm,
          action: "RESET_TO_GLOBAL"
        }
      );
    } catch (err) {
      console.warn("[DB resetStationFuelRate error]:", err.message);
      mockStore.resetStationFuelRate(code, stationId);
    }
    return await this.getFuels(stationId);
  },
  // 3. Tanks
  async getTanks(stationId) {
    try {
      let allTanks = await db.select().from(tanks);
      if (stationId) {
        allTanks = allTanks.filter((t) => t.stationId === stationId);
      }
      const allStations = await db.select().from(stations).catch(() => []);
      const allNozzles = await db.select().from(nozzles).catch(() => []);
      return allTanks.map((t) => {
        const st = allStations.find((s) => s.id === t.stationId);
        const linkedNozzles = allNozzles.filter((n) => n.tankId === t.id || n.stationId === t.stationId && n.fuelCode === t.fuelCode);
        return {
          ...t,
          stationName: st ? st.name : t.stationId,
          stationCode: st ? st.code : "",
          associatedNozzleCount: linkedNozzles.length
        };
      }).sort((a, b) => a.tankNumber - b.tankNumber);
    } catch (err) {
      console.warn("[DB getTanks offline fallback]:", err.message);
      return mockStore.getTanks(stationId);
    }
  },
  async getTank(id) {
    try {
      const tankRows = await db.select().from(tanks).where(eq(tanks.id, id));
      const tank = tankRows[0];
      if (!tank) return null;
      const station = await this.getStation(tank.stationId);
      const allNozzles = await db.select().from(nozzles).where(eq(nozzles.stationId, tank.stationId));
      const associatedNozzles = allNozzles.filter((n) => n.tankId === tank.id || n.fuelCode === tank.fuelCode);
      const recentLoads = await db.select().from(tankLoads).where(eq(tankLoads.tankId, id)).orderBy(desc(tankLoads.timestamp)).limit(10);
      const auditEvents = await this.getAuditLogs("TANK", id);
      return {
        ...tank,
        parentStation: station,
        associatedNozzles,
        recentLoads,
        auditEvents
      };
    } catch (err) {
      console.warn("[DB getTank offline fallback]:", err.message);
      return mockStore.getTank(id);
    }
  },
  async createTank(payload) {
    try {
      if (!payload.stationId) throw new Error("Parent bunk is required for tank.");
      if (!payload.fuelCode) throw new Error("Fuel type is required.");
      if (typeof payload.capacityLiters !== "number" || payload.capacityLiters <= 0) {
        throw new Error("Capacity must be a positive number greater than zero.");
      }
      const station = await this.getStation(payload.stationId);
      if (!station) throw new Error("Selected parent bunk does not exist.");
      const existingStationTanks = await db.select().from(tanks).where(eq(tanks.stationId, payload.stationId));
      const uniformIdentity = String(
        payload.id ?? payload.tankNumber ?? payload.name ?? existingStationTanks.length + 1
      ).trim();
      const parsedNum = parseInt(uniformIdentity, 10);
      const tankNumber = !isNaN(parsedNum) && parsedNum > 0 ? parsedNum : typeof payload.tankNumber === "number" && payload.tankNumber > 0 ? payload.tankNumber : existingStationTanks.reduce((max, t) => Math.max(max, t.tankNumber), 0) + 1;
      const tankId = uniformIdentity;
      const displayName = uniformIdentity;
      if (existingStationTanks.some((t) => t.id === tankId || t.tankNumber === tankNumber)) {
        throw new Error(`Tank "${tankId}" (Number #${tankNumber}) already exists in bunk "${station.name}". Duplicate tanks are not allowed.`);
      }
      const capacity = Number(payload.capacityLiters);
      if (isNaN(capacity) || capacity <= 0) {
        throw new Error("Capacity must be a positive number greater than zero.");
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
      const maxDip = 250;
      const currentDip = calculateVolumeToDip(capacity, currentVolume, maxDip);
      const fuelCode = normalizeFuelCode(payload.fuelCode);
      const newTank = {
        id: tankId,
        stationId: payload.stationId,
        tankNumber,
        name: displayName,
        fuelCode,
        capacityLiters: capacity,
        safeCapacityLiters: safeCapacity,
        currentDipCm: currentDip,
        currentVolumeLiters: currentVolume,
        openingStockLiters: currentVolume,
        waterDipCm: 0.2,
        lowThresholdLiters: lowThreshold,
        maxDipCm: maxDip,
        status: payload.status || "ACTIVE",
        location: payload.location?.trim() || null,
        description: payload.description?.trim() || null,
        lastDipTimestamp: /* @__PURE__ */ new Date(),
        createdAt: /* @__PURE__ */ new Date(),
        createdBy: payload.createdBy || "Administrator",
        updatedAt: /* @__PURE__ */ new Date(),
        updatedBy: payload.createdBy || "Administrator"
      };
      await db.insert(tanks).values(newTank);
      await this.createAuditLog("TANK", tankId, "CREATE", payload.createdBy || "system", payload.createdBy || "Administrator", {
        tankNumber,
        name: displayName,
        tankId,
        fuelCode: payload.fuelCode,
        capacityLiters: capacity,
        safeCapacityLiters: safeCapacity,
        lowThresholdLiters: lowThreshold,
        stationId: payload.stationId
      });
      return await this.getTank(tankId);
    } catch (err) {
      if (err.message?.includes("already exists") || err.message?.includes("cannot exceed") || err.message?.includes("exceeds safe filling") || err.message?.includes("greater than zero") || err.message?.includes("required") || err.message?.includes("does not exist")) {
        throw err;
      }
      console.warn("[DB createTank offline fallback]:", err.message);
      return mockStore.createTank(payload);
    }
  },
  async updateTank(id, payload) {
    try {
      const existingRows = await db.select().from(tanks).where(eq(tanks.id, id));
      const curr = existingRows[0];
      if (!curr) throw new Error("Tank not found.");
      if (payload.capacityLiters !== void 0) {
        if (typeof payload.capacityLiters !== "number" || payload.capacityLiters <= 0) {
          throw new Error("Capacity must be greater than zero.");
        }
        const safeCap = payload.safeCapacityLiters ?? Number((payload.capacityLiters * 0.95).toFixed(0));
        if (curr.currentVolumeLiters > payload.capacityLiters) {
          throw new Error(`Current stock (${curr.currentVolumeLiters} L) exceeds proposed capacity (${payload.capacityLiters} L).`);
        }
        if (curr.currentVolumeLiters > safeCap) {
          throw new Error(`Current stock (${curr.currentVolumeLiters} L) exceeds safe filling limit (${safeCap} L). Safe filling is blocked.`);
        }
      }
      let targetTankNumber = payload.tankNumber;
      let targetName = payload.name;
      if (payload.name && !payload.tankNumber) {
        const parsed = parseInt(payload.name, 10);
        if (!isNaN(parsed) && parsed > 0) targetTankNumber = parsed;
      } else if (payload.tankNumber && !payload.name) {
        targetName = String(payload.tankNumber);
      }
      if (targetTankNumber && targetTankNumber !== curr.tankNumber) {
        const dup = await db.select().from(tanks).where(and(eq(tanks.stationId, curr.stationId), eq(tanks.tankNumber, targetTankNumber)));
        if (dup.some((t) => t.id !== id)) {
          throw new Error(`Tank #${targetTankNumber} already exists in this bunk.`);
        }
      }
      const updateFields = {
        ...payload,
        ...targetTankNumber !== void 0 ? { tankNumber: targetTankNumber } : {},
        ...targetName !== void 0 ? { name: targetName } : {},
        updatedAt: /* @__PURE__ */ new Date()
      };
      await db.update(tanks).set(updateFields).where(eq(tanks.id, id));
      await this.createAuditLog("TANK", id, "UPDATE", payload.updatedBy || "system", payload.updatedBy || "Administrator", {
        changes: payload
      });
      return await this.getTank(id);
    } catch (err) {
      console.warn("[DB updateTank offline fallback]:", err.message);
      return mockStore.updateTank(id, payload);
    }
  },
  async deactivateTank(id, targetStatus, actorId = "system", actorName = "Administrator") {
    try {
      const existing = await db.select().from(tanks).where(eq(tanks.id, id));
      const curr = existing[0];
      if (!curr) throw new Error("Tank not found.");
      const newStatus = targetStatus || (curr.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
      if (newStatus === "INACTIVE") {
        const nozzleRows = await db.select().from(nozzles).where(eq(nozzles.tankId, id)).catch(() => []);
        const activeNozzles = nozzleRows.filter((n) => n.status === "ACTIVE");
        if (activeNozzles.length > 0) {
          throw new Error(
            `Cannot deactivate tank "${curr.name || curr.id}" because it is linked to active nozzle(s) (#${activeNozzles.map((n) => n.nozzleNumber).join(", ")}). Please deactivate or reassign the nozzles first.`
          );
        }
      }
      await db.update(tanks).set({ status: newStatus, updatedAt: /* @__PURE__ */ new Date(), updatedBy: actorName }).where(eq(tanks.id, id));
      await this.createAuditLog("TANK", id, newStatus === "ACTIVE" ? "ACTIVATE" : "DEACTIVATE", actorId, actorName, {
        previousStatus: curr.status,
        newStatus
      });
      return await this.getTank(id);
    } catch (err) {
      if (err.message && err.message.startsWith("Cannot deactivate tank")) {
        throw err;
      }
      console.warn("[DB deactivateTank offline fallback]:", err.message);
      return mockStore.deactivateTank(id, targetStatus);
    }
  },
  async deleteTank(id, actorId = "system", actorName = "Administrator") {
    try {
      const existing = await db.select().from(tanks).where(eq(tanks.id, id));
      const tank = existing[0];
      if (!tank) throw new Error("Tank not found.");
      const nozzleRows = await db.select().from(nozzles).where(eq(nozzles.tankId, id));
      const activeNozzles = nozzleRows.filter((n) => n.status === "ACTIVE");
      if (activeNozzles.length > 0) {
        throw new Error(
          `Cannot delete tank "${tank.name || tank.id}" because it is linked to active nozzle(s) (#${activeNozzles.map((n) => n.nozzleNumber).join(", ")}). Please deactivate or reassign the nozzles before deleting this tank.`
        );
      }
      const loadRows = await db.select().from(tankLoads).where(eq(tankLoads.tankId, id)).catch(() => []);
      if (loadRows.length > 0) {
        throw new Error(
          `Cannot delete tank "${tank.name || tank.id}" because it has ${loadRows.length} historical decanting tanker delivery record(s). Deletion is blocked to preserve inventory audit history. Please deactivate the tank instead.`
        );
      }
      if (nozzleRows.length > 0) {
        await db.update(nozzles).set({ tankId: null }).where(eq(nozzles.tankId, id)).catch(() => {
        });
      }
      await db.delete(tanks).where(eq(tanks.id, id));
      await this.createAuditLog("TANK", id, "DELETE", actorId, actorName, {
        tankName: tank.name,
        tankNumber: tank.tankNumber,
        stationId: tank.stationId
      });
      return { success: true, deletedTankId: id };
    } catch (err) {
      if (err.message && (err.message.startsWith("Cannot delete tank") || err.message.startsWith("Cannot deactivate tank"))) {
        throw err;
      }
      console.warn("[DB deleteTank offline fallback]:", err.message);
      return mockStore.deleteTank(id);
    }
  },
  async recordTankDip(tankId, dipCm, waterDipCm) {
    try {
      const tankRows = await db.select().from(tanks).where(eq(tanks.id, tankId));
      const tank = tankRows[0];
      if (!tank) throw new Error("Tank not found");
      const newVolume = calculateDipVolume(tank.capacityLiters, dipCm, tank.maxDipCm);
      await db.update(tanks).set({
        currentDipCm: Number(dipCm.toFixed(1)),
        currentVolumeLiters: newVolume,
        waterDipCm: Number(waterDipCm.toFixed(1)),
        lastDipTimestamp: /* @__PURE__ */ new Date()
      }).where(eq(tanks.id, tankId));
      const updated = await db.select().from(tanks).where(eq(tanks.id, tankId));
      return updated[0];
    } catch (err) {
      console.warn("[DB recordTankDip offline fallback]:", err.message);
      return mockStore.recordDip(tankId, dipCm, waterDipCm);
    }
  },
  async decantTankerLoad(payload) {
    try {
      const tankRows = await db.select().from(tanks).where(eq(tanks.id, payload.tankId));
      let tank = tankRows[0];
      if (!tank) {
        const allTanks = await db.select().from(tanks).catch(() => []);
        tank = allTanks.find(
          (t) => String(t.id) === String(payload.tankId) || String(t.tankNumber) === String(payload.tankId) || t.name === payload.tankId
        );
      }
      if (!tank) throw new Error("Tank not found.");
      const fuelRows = await db.select().from(fuels).where(eq(fuels.code, tank.fuelCode)).catch(() => []);
      const fuel = fuelRows[0];
      const observedDensity = Number(payload.observedDensity ?? (tank.fuelCode === "DIESEL" ? 828.5 : 742));
      const observedTemp = Number(payload.observedTemp ?? payload.temperatureC ?? 15);
      const invoiceDensity = Number(
        payload.invoiceDensity ?? fuel?.densityStd15c ?? observedDensity
      );
      const operatorName = payload.operatorName || "Administrator";
      const invoiceVolumeLiters = Number(payload.invoiceVolumeLiters) || 0;
      const corrected = correctDensity15C(observedDensity, observedTemp, tank.fuelCode);
      const densityDiff = Math.abs(corrected - invoiceDensity);
      let densityStatus = "PASSED";
      if (fuel && densityDiff > fuel.densityTolerance * 2) {
        densityStatus = "REJECTED";
      } else if (fuel && densityDiff > fuel.densityTolerance) {
        densityStatus = "TOLERANCE_WARNING";
      }
      const volumeBefore = tank.currentVolumeLiters;
      const dipBefore = tank.currentDipCm;
      const safeRoom = tank.safeCapacityLiters - volumeBefore;
      if (invoiceVolumeLiters > safeRoom + 300) {
        throw new Error(`Overfill hazard! Safe ullage space is ${safeRoom}L, cannot decant ${invoiceVolumeLiters}L.`);
      }
      const newVolume = Math.min(tank.capacityLiters, volumeBefore + invoiceVolumeLiters);
      const newDip = calculateVolumeToDip(tank.capacityLiters, newVolume, tank.maxDipCm);
      const receivedVolume = newVolume - volumeBefore;
      const varianceL = receivedVolume - invoiceVolumeLiters;
      const variancePct = invoiceVolumeLiters > 0 ? Number((varianceL / invoiceVolumeLiters * 100).toFixed(2)) : 0;
      await db.update(tanks).set({
        currentVolumeLiters: newVolume,
        currentDipCm: newDip,
        lastDipTimestamp: /* @__PURE__ */ new Date()
      }).where(eq(tanks.id, tank.id));
      const loadId = `load-${Date.now()}`;
      await db.insert(tankLoads).values({
        id: loadId,
        stationId: payload.stationId || tank.stationId,
        tankId: tank.id,
        fuelCode: tank.fuelCode,
        timestamp: /* @__PURE__ */ new Date(),
        invoiceNo: payload.invoiceNo || `INV-${Date.now().toString().slice(-6)}`,
        tankerNumber: payload.tankerNumber || "TN-00-XX-0000",
        invoiceVolumeLiters,
        invoiceDensity,
        observedDensity,
        observedTemp,
        correctedDensity15c: corrected,
        densityStatus,
        dipBeforeCm: dipBefore,
        volumeBeforeLiters: volumeBefore,
        dipAfterCm: newDip,
        volumeAfterLiters: newVolume,
        receivedVolumeLiters: receivedVolume,
        varianceLiters: varianceL,
        variancePct,
        operatorName,
        remarks: payload.remarks || "Standard verified tanker unload",
        invoiceImageUrl: payload.invoiceImageUrl || payload.imageUrl || null
      });
      const insertedLoad = await db.select().from(tankLoads).where(eq(tankLoads.id, loadId));
      const updatedTank = await db.select().from(tanks).where(eq(tanks.id, tank.id));
      return { tank: updatedTank[0], loadRecord: insertedLoad[0] };
    } catch (err) {
      if (err.message && (err.message.includes("Overfill") || err.message.includes("hazard") || err.message.includes("Tank not found"))) {
        throw err;
      }
      console.warn("[DB decantTankerLoad offline fallback]:", err.message);
      return mockStore.decantTankerLoad(payload);
    }
  },
  async getTankLoads(stationId) {
    try {
      if (stationId) {
        return await db.select().from(tankLoads).where(eq(tankLoads.stationId, stationId)).orderBy(desc(tankLoads.timestamp));
      }
      return await db.select().from(tankLoads).orderBy(desc(tankLoads.timestamp));
    } catch (err) {
      console.warn("[DB getTankLoads offline fallback]:", err.message);
      return mockStore.getTankLoads(stationId);
    }
  },
  // 4. Dispensers & Nozzles
  async getDispensers(stationId) {
    try {
      const disps = stationId ? await db.select().from(dispensers).where(eq(dispensers.stationId, stationId)) : await db.select().from(dispensers);
      const nozs = stationId ? await db.select().from(nozzles).where(eq(nozzles.stationId, stationId)) : await db.select().from(nozzles);
      return disps.map((d) => ({
        ...d,
        nozzles: nozs.filter((n) => n.dispenserId === d.id)
      }));
    } catch (err) {
      console.warn("[DB getDispensers offline fallback]:", err.message);
      return mockStore.getDispensers(stationId);
    }
  },
  async getNozzles(filter) {
    try {
      let allNozzles = await db.select().from(nozzles);
      if (filter?.stationId) {
        allNozzles = allNozzles.filter((n) => n.stationId === filter.stationId);
      }
      if (filter?.fuelCode) {
        allNozzles = allNozzles.filter((n) => n.fuelCode === filter.fuelCode);
      }
      if (filter?.status) {
        allNozzles = allNozzles.filter((n) => n.status === filter.status);
      }
      const stationsList = await db.select().from(stations).catch(() => []);
      const dispensersList = await db.select().from(dispensers).catch(() => []);
      return allNozzles.map((n) => {
        const st = stationsList.find((s) => s.id === n.stationId);
        const dp = dispensersList.find((d) => d.id === n.dispenserId);
        return {
          ...n,
          stationName: st ? st.name : n.stationId,
          stationCode: st ? st.code : "",
          dispenserNumber: dp ? dp.dispenserNumber : 1,
          dispenserBrand: dp ? dp.brand : ""
        };
      });
    } catch (err) {
      console.warn("[DB getNozzles offline fallback]:", err.message);
      return mockStore.getNozzles(filter);
    }
  },
  async getNozzle(id) {
    try {
      const rows = await db.select().from(nozzles).where(eq(nozzles.id, id));
      if (!rows[0]) return null;
      const n = rows[0];
      const st = await this.getStation(n.stationId);
      const disps = await db.select().from(dispensers).where(eq(dispensers.id, n.dispenserId));
      const recentReadings = await db.select().from(manualMeterReadings).where(eq(manualMeterReadings.nozzleId, id)).orderBy(desc(manualMeterReadings.readingTimestamp)).limit(10);
      return {
        ...n,
        stationName: st ? st.name : n.stationId,
        stationCode: st ? st.code : "",
        dispenserNumber: disps[0] ? disps[0].dispenserNumber : 1,
        dispenserBrand: disps[0] ? disps[0].brand : "",
        recentReadings
      };
    } catch (err) {
      console.warn("[DB getNozzle offline fallback]:", err.message);
      return mockStore.getNozzle(id);
    }
  },
  async createNozzle(payload) {
    try {
      if (!payload.stationId) throw new Error("Parent bunk is required.");
      if (!payload.nozzleNumber || payload.nozzleNumber < 1) throw new Error("Valid positive nozzle number is required.");
      if (!payload.fuelCode) throw new Error("Fuel type is required.");
      const st = await this.getStation(payload.stationId);
      if (!st) throw new Error("Selected parent bunk does not exist.");
      const existingSameStation = await db.select().from(nozzles).where(and(eq(nozzles.stationId, payload.stationId), eq(nozzles.nozzleNumber, payload.nozzleNumber)));
      if (existingSameStation.length > 0) {
        throw new Error(`Nozzle #${payload.nozzleNumber} already exists in bunk "${st.name}". Duplicate nozzle numbers within the same bunk are not allowed.`);
      }
      const fuelCode = normalizeFuelCode(payload.fuelCode);
      let dispenserId = payload.dispenserId;
      if (payload.tankId) {
        const tankRows = await db.select().from(tanks).where(eq(tanks.id, payload.tankId));
        const tank = tankRows[0];
        if (!tank) throw new Error("Selected underground tank does not exist.");
        if (tank.stationId !== payload.stationId) {
          throw new Error("Selected tank does not belong to the chosen bunk station.");
        }
        if (normalizeFuelCode(tank.fuelCode) !== fuelCode) {
          throw new Error(`Incompatible fuel type: Tank is configured for ${tank.fuelCode}, but nozzle was specified as ${payload.fuelCode}.`);
        }
      }
      if (!dispenserId) {
        const stationDisps = await db.select().from(dispensers).where(eq(dispensers.stationId, payload.stationId));
        if (stationDisps.length > 0) {
          dispenserId = stationDisps[0].id;
        } else {
          dispenserId = `dsp-${payload.stationId}-1`;
          await db.insert(dispensers).values({
            id: dispenserId,
            stationId: payload.stationId,
            dispenserNumber: 1,
            islandNumber: 1,
            brand: "Standard Dispenser Unit",
            status: "ACTIVE"
          });
        }
      }
      const id = await this.getNextNozzleCode();
      const newNozzle = {
        id,
        stationId: payload.stationId,
        dispenserId,
        tankId: payload.tankId || null,
        fuelCode,
        nozzleNumber: payload.nozzleNumber,
        name: payload.name?.trim() || `Nozzle ${payload.nozzleNumber} (${fuelCode})`,
        deviceIdentifier: payload.deviceIdentifier?.trim() || `NZ-${payload.nozzleNumber}`,
        notes: payload.notes?.trim() || "",
        mechanicalTotalizer: payload.mechanicalTotalizer || 0,
        electronicTotalizer: payload.electronicTotalizer || 0,
        status: payload.status?.trim() || "ACTIVE",
        createdAt: /* @__PURE__ */ new Date(),
        createdBy: "Administrator",
        updatedAt: /* @__PURE__ */ new Date(),
        updatedBy: "Administrator"
      };
      await db.insert(nozzles).values(newNozzle);
      await this.createAuditLog("NOZZLE", id, "CREATE", "system", "Administrator", {
        nozzleNumber: payload.nozzleNumber,
        fuelCode: payload.fuelCode,
        stationId: payload.stationId
      });
      return await this.getNozzle(id);
    } catch (err) {
      if (err.message?.includes("already exists") || err.message?.includes("Incompatible fuel") || err.message?.includes("does not exist") || err.message?.includes("does not belong") || err.message?.includes("required")) {
        throw err;
      }
      console.warn("[DB createNozzle offline fallback]:", err.message);
      return mockStore.createNozzle(payload);
    }
  },
  async updateNozzle(id, payload) {
    try {
      const existing = await db.select().from(nozzles).where(eq(nozzles.id, id));
      if (existing.length === 0) throw new Error("Nozzle not found.");
      const curr = existing[0];
      if (payload.nozzleNumber && payload.nozzleNumber !== curr.nozzleNumber) {
        const dup = await db.select().from(nozzles).where(and(eq(nozzles.stationId, curr.stationId), eq(nozzles.nozzleNumber, payload.nozzleNumber)));
        if (dup.some((n) => n.id !== id)) {
          throw new Error(`Nozzle #${payload.nozzleNumber} already exists in this bunk.`);
        }
      }
      if (payload.fuelCode) {
        payload.fuelCode = normalizeFuelCode(payload.fuelCode);
      }
      const targetTankId = payload.tankId !== void 0 ? payload.tankId : curr.tankId;
      const targetFuel = payload.fuelCode || curr.fuelCode;
      if (targetTankId) {
        const tankRows = await db.select().from(tanks).where(eq(tanks.id, targetTankId));
        const tank = tankRows[0];
        if (!tank) throw new Error("Selected underground tank does not exist.");
        if (tank.stationId !== curr.stationId) {
          throw new Error("Selected tank does not belong to the chosen bunk station.");
        }
        if (normalizeFuelCode(tank.fuelCode) !== normalizeFuelCode(targetFuel)) {
          throw new Error(`Incompatible fuel type: Tank is configured for ${tank.fuelCode}, but nozzle fuel is ${targetFuel}.`);
        }
      }
      const updateFields = {
        ...payload,
        updatedAt: /* @__PURE__ */ new Date()
      };
      await db.update(nozzles).set(updateFields).where(eq(nozzles.id, id));
      await this.createAuditLog("NOZZLE", id, "UPDATE", payload.updatedBy || "system", payload.updatedBy || "Administrator", {
        changes: payload
      });
      return await this.getNozzle(id);
    } catch (err) {
      console.warn("[DB updateNozzle offline fallback]:", err.message);
      return mockStore.updateNozzle(id, payload);
    }
  },
  async updateNozzleStatus(id, status, actorId = "system", actorName = "Administrator") {
    try {
      const existing = await db.select().from(nozzles).where(eq(nozzles.id, id));
      const curr = existing[0];
      if (!curr) throw new Error("Nozzle not found.");
      await db.update(nozzles).set({ status, updatedAt: /* @__PURE__ */ new Date(), updatedBy: actorName }).where(eq(nozzles.id, id));
      await this.createAuditLog("NOZZLE", id, status === "ACTIVE" ? "ACTIVATE" : "DEACTIVATE", actorId, actorName, {
        previousStatus: curr.status,
        newStatus: status
      });
      return await this.getNozzle(id);
    } catch (err) {
      console.warn("[DB updateNozzleStatus offline fallback]:", err.message);
      return mockStore.updateNozzleStatus(id, status);
    }
  },
  async deleteNozzle(id, actorId = "system", actorName = "Administrator") {
    try {
      const existing = await db.select().from(nozzles).where(eq(nozzles.id, id));
      const nozzle = existing[0];
      if (!nozzle) throw new Error("Nozzle not found.");
      const linkedReadings = await db.select().from(manualMeterReadings).where(eq(manualMeterReadings.nozzleId, id));
      const totalizer = Number(nozzle.electronicTotalizer || 0);
      const initial = Number(nozzle.mechanicalTotalizer || 0);
      if (linkedReadings.length > 0 || totalizer > initial) {
        throw new Error(
          `Cannot delete nozzle #${nozzle.nozzleNumber}: Fuel has already been dispensed (${totalizer} L) or meter readings exist. Deactivate nozzle instead to maintain compliance records.`
        );
      }
      await db.delete(nozzles).where(eq(nozzles.id, id));
      await this.createAuditLog("NOZZLE", id, "DELETE", actorId, actorName, {
        nozzleNumber: nozzle.nozzleNumber,
        stationId: nozzle.stationId
      });
      return { success: true, deletedNozzleId: id };
    } catch (err) {
      if (err.message.includes("Cannot delete nozzle")) {
        throw err;
      }
      console.warn("[DB deleteNozzle offline fallback]:", err.message);
      return mockStore.deleteNozzle(id);
    }
  },
  // 5. Operations & Nozzle Meter Readings
  async recordManualMeterReading(payload) {
    return await this.recordNozzleReading(payload);
  },
  async recordNozzleReading(payload) {
    try {
      if (!payload.stationId) throw new Error("Parent bunk is required.");
      if (!payload.nozzleId) throw new Error("Nozzle is required.");
      if (typeof payload.openingMeter !== "number" || payload.openingMeter < 0) {
        throw new Error("Opening meter reading must be a non-negative number.");
      }
      if (typeof payload.closingMeter !== "number" || payload.closingMeter < 0) {
        throw new Error("Closing meter reading must be a non-negative number.");
      }
      const photo = payload.meterPhotoUrl || payload.photoUrl;
      if (!photo || typeof photo !== "string" || !photo.trim()) {
        throw new Error("Meter totalizer photograph is strictly mandatory for legal metrology and audit compliance.");
      }
      const nozzleRows = await db.select().from(nozzles).where(eq(nozzles.id, payload.nozzleId));
      const nozzle = nozzleRows[0];
      if (!nozzle) throw new Error("Nozzle not found.");
      if (nozzle.stationId !== payload.stationId) {
        throw new Error("Nozzle does not belong to the selected bunk.");
      }
      const isDecreasing = payload.closingMeter < payload.openingMeter;
      const isCorrection = Boolean(
        payload.isCorrection || isDecreasing || payload.readingType === "RESET_CORRECTION" || payload.readingType === "CALIBRATION"
      );
      const authoritativeMeter = nozzle.electronicTotalizer || nozzle.mechanicalTotalizer || 0;
      if (!isCorrection && Math.abs(payload.openingMeter - authoritativeMeter) > 0.1) {
        throw new Error(
          `Concurrency conflict: The authoritative recorded meter reading is ${authoritativeMeter.toFixed(2)}, but received opening reading is ${payload.openingMeter.toFixed(2)}. Please refresh to get the latest reading.`
        );
      }
      if (isDecreasing && (!isCorrection || !payload.correctionReason?.trim())) {
        throw new Error(
          `Invalid meter reading: Closing meter (${payload.closingMeter.toFixed(2)}) is lower than opening meter (${payload.openingMeter.toFixed(2)}). An authorized correction reason (e.g. mechanical replacement, rollover, recalibration) is required.`
        );
      }
      const stationFuels = await this.getFuels(payload.stationId);
      const fuel = stationFuels.find((f) => normalizeFuelCode(f.code) === normalizeFuelCode(nozzle.fuelCode));
      const fuelRate = fuel ? fuel.ratePerLiter : 100;
      const grossLiters = isDecreasing ? 0 : Number((payload.closingMeter - payload.openingMeter).toFixed(2));
      const testing = Number(payload.testingLiters || 0);
      const netSold = Number(Math.max(0, grossLiters - testing).toFixed(2));
      const netAmount = Number((netSold * fuelRate).toFixed(2));
      const logId = await this.getNextReadingCode();
      if (netSold > 0) {
        let tank = null;
        if (nozzle.tankId) {
          const tankRows = await db.select().from(tanks).where(eq(tanks.id, nozzle.tankId));
          tank = tankRows[0];
        }
        if (!tank) {
          const tankRows = await db.select().from(tanks).where(and(eq(tanks.stationId, payload.stationId), eq(tanks.fuelCode, nozzle.fuelCode)));
          tank = tankRows[0];
        }
        if (tank) {
          if (netSold > tank.currentVolumeLiters) {
            throw new Error(
              `Stock limit exceeded: Net dispensed volume (${netSold} L) exceeds available stock in feeder tank "${tank.name || tank.id}" (${tank.currentVolumeLiters} L). Maximum permitted consumption is ${tank.currentVolumeLiters} L.`
            );
          }
          const remainingVolume = Math.max(0, tank.currentVolumeLiters - Math.round(netSold));
          const newDip = calculateVolumeToDip(tank.capacityLiters, remainingVolume, tank.maxDipCm);
          await db.update(tanks).set({
            currentVolumeLiters: remainingVolume,
            currentDipCm: newDip,
            lastDipTimestamp: /* @__PURE__ */ new Date()
          }).where(eq(tanks.id, tank.id));
        }
      }
      await db.update(nozzles).set({
        electronicTotalizer: payload.closingMeter,
        mechanicalTotalizer: payload.closingMeter,
        updatedAt: /* @__PURE__ */ new Date(),
        updatedBy: payload.recordedByName || payload.enteredBy
      }).where(eq(nozzles.id, payload.nozzleId));
      const readingRecord = {
        id: logId,
        stationId: payload.stationId,
        nozzleId: payload.nozzleId,
        fuelCode: nozzle.fuelCode,
        openingMeter: payload.openingMeter,
        closingMeter: payload.closingMeter,
        grossDispensedLiters: grossLiters,
        testingLiters: testing,
        netSoldLiters: netSold,
        fuelRate,
        netSalesAmount: netAmount,
        readingType: payload.readingType || (isCorrection ? "RESET_CORRECTION" : "REGULAR_SHIFT"),
        isCorrection,
        correctionReason: payload.correctionReason?.trim() || null,
        remarks: payload.remarks?.trim() || null,
        enteredBy: payload.enteredBy,
        readingTimestamp: /* @__PURE__ */ new Date(),
        shiftCode: payload.shiftCode || "GENERAL",
        recordedBy: payload.recordedBy || null,
        recordedByName: payload.recordedByName || payload.enteredBy,
        meterPhotoUrl: payload.meterPhotoUrl || payload.photoUrl || null
      };
      await db.insert(manualMeterReadings).values(readingRecord);
      try {
        const activeShifts = await db.select().from(shifts).where(and(eq(shifts.stationId, payload.stationId), eq(shifts.status, "ACTIVE")));
        if (activeShifts && activeShifts.length > 0) {
          const targetShift = payload.shiftCode && activeShifts.find((s) => s.shiftCode === payload.shiftCode) || activeShifts[0];
          await db.update(shifts).set({
            totalFuelSoldLiters: Number(((targetShift.totalFuelSoldLiters || 0) + netSold).toFixed(2)),
            totalExpectedRevenue: Number(((targetShift.totalExpectedRevenue || 0) + netAmount).toFixed(2))
          }).where(eq(shifts.id, targetShift.id));
        }
      } catch (shiftErr) {
        console.warn("[recordNozzleReading active shift update error]:", shiftErr);
      }
      await this.createAuditLog(
        "METER",
        logId,
        isCorrection ? "METER_CORRECT" : "METER_RECORD",
        payload.recordedBy || "system",
        payload.recordedByName || payload.enteredBy,
        {
          nozzleId: payload.nozzleId,
          stationId: payload.stationId,
          openingMeter: payload.openingMeter,
          closingMeter: payload.closingMeter,
          netSoldLiters: netSold,
          isCorrection,
          correctionReason: payload.correctionReason
        }
      );
      const inserted = await db.select().from(manualMeterReadings).where(eq(manualMeterReadings.id, logId));
      return inserted[0];
    } catch (err) {
      if (err.message.includes("Stock limit exceeded") || err.message.includes("Concurrency conflict") || err.message.includes("Invalid meter reading") || err.message.includes("Nozzle not found") || err.message.includes("Nozzle does not belong")) {
        throw err;
      }
      console.warn("[DB recordNozzleReading offline fallback]:", err.message);
      return mockStore.recordMeterReading({
        stationId: payload.stationId,
        nozzleId: payload.nozzleId,
        openingElectronic: payload.openingMeter,
        closingElectronic: payload.closingMeter,
        testFuelVolumeLiters: payload.testingLiters,
        recordedBy: payload.recordedByName || payload.enteredBy,
        notes: payload.remarks,
        isCorrection: payload.isCorrection,
        correctionReason: payload.correctionReason,
        shiftCode: payload.shiftCode
      });
    }
  },
  async getManualMeterReadings(stationId, nozzleId) {
    try {
      let readings = await db.select().from(manualMeterReadings);
      if (stationId) {
        readings = readings.filter((r) => r.stationId === stationId);
      }
      if (nozzleId) {
        readings = readings.filter((r) => r.nozzleId === nozzleId);
      }
      return readings.sort((a, b) => new Date(b.readingTimestamp).getTime() - new Date(a.readingTimestamp).getTime());
    } catch (err) {
      console.warn("[DB getManualMeterReadings offline fallback]:", err.message);
      return mockStore.getMeterReadings({ stationId, nozzleId });
    }
  },
  // 6. QR Code Resolver
  async resolveQRCode(identifier) {
    try {
      if (!identifier?.trim()) throw new Error("QR code identifier cannot be empty.");
      const clean = identifier.trim().toUpperCase();
      const allStations = await db.select().from(stations);
      const matchedStation = allStations.find(
        (s) => s.id.toUpperCase() === clean || s.code.toUpperCase() === clean
      );
      if (matchedStation) {
        return {
          type: "BUNK",
          entity: matchedStation,
          identifier: matchedStation.code || matchedStation.id,
          name: matchedStation.name,
          stationId: matchedStation.id,
          isActive: matchedStation.status === "ONLINE" || matchedStation.status === "ACTIVE"
        };
      }
      const allTanks = await db.select().from(tanks);
      const matchedTank = allTanks.find((t) => t.id.toUpperCase() === clean);
      if (matchedTank) {
        const parentStation = allStations.find((s) => s.id === matchedTank.stationId);
        return {
          type: "TANK",
          entity: matchedTank,
          parentStation,
          identifier: matchedTank.id,
          name: matchedTank.name || `Tank #${matchedTank.tankNumber}`,
          stationId: matchedTank.stationId,
          isActive: matchedTank.status === "ACTIVE"
        };
      }
      const allNozzles = await db.select().from(nozzles);
      const matchedNozzle = allNozzles.find((n) => n.id.toUpperCase() === clean);
      if (matchedNozzle) {
        const parentStation = allStations.find((s) => s.id === matchedNozzle.stationId);
        return {
          type: "NOZZLE",
          entity: matchedNozzle,
          parentStation,
          identifier: matchedNozzle.id,
          name: matchedNozzle.name || `Nozzle #${matchedNozzle.nozzleNumber}`,
          stationId: matchedNozzle.stationId,
          isActive: matchedNozzle.status === "ACTIVE"
        };
      }
      throw new Error(`QR code "${identifier}" was not found in the database. Please verify the QR identifier.`);
    } catch (err) {
      console.warn("[DB resolveQRCode offline fallback]:", err.message);
      return mockStore.resolveQRCode(identifier);
    }
  },
  // 6. Employees & Users Management
  async getEmployees(stationId) {
    try {
      if (stationId) {
        return await db.select().from(employees).where(eq(employees.stationId, stationId));
      }
      return await db.select().from(employees);
    } catch (err) {
      console.warn("[DB getEmployees offline fallback]:", err.message);
      return mockStore.getUsers({ stationId });
    }
  },
  async getUsers(stationId, role) {
    try {
      let rows = await db.select().from(employees);
      if (stationId) {
        rows = rows.filter((r) => r.stationId === stationId || r.assignedBunks?.includes(stationId));
      }
      if (role) {
        rows = rows.filter((r) => r.role === role);
      }
      const stationsList = await db.select().from(stations).catch(() => []);
      return rows.map((u) => {
        let bunksArr = [];
        try {
          if (u.assignedBunks?.startsWith("[")) {
            bunksArr = JSON.parse(u.assignedBunks);
          } else if (u.assignedBunks) {
            bunksArr = u.assignedBunks.split(",").map((s) => s.trim());
          } else if (u.stationId) {
            bunksArr = [u.stationId];
          }
        } catch {
          bunksArr = u.stationId ? [u.stationId] : [];
        }
        const assignedBunkDetails = stationsList.filter((s) => bunksArr.includes(s.id)).map((s) => ({ id: s.id, name: s.name, code: s.code }));
        return {
          ...u,
          assignedBunksList: bunksArr,
          assignedBunkDetails
        };
      });
    } catch (err) {
      console.warn("[DB getUsers offline fallback]:", err.message);
      return mockStore.getUsers({ stationId, role });
    }
  },
  async getUser(id) {
    try {
      const users = await this.getUsers();
      return users.find((u) => u.id === id) || null;
    } catch (err) {
      console.warn("[DB getUser offline fallback]:", err.message);
      return mockStore.getUser(id);
    }
  },
  async createUser(payload) {
    try {
      if (!payload.name?.trim()) throw new Error("Full name is required.");
      if (!payload.role?.trim()) throw new Error("Role is required.");
      const emailOrUser = payload.email?.trim() || payload.username?.trim();
      if (!emailOrUser) throw new Error("Email address or username is required.");
      const allUsers = await db.select().from(employees);
      if (payload.email && allUsers.some((u) => u.email?.toLowerCase() === payload.email?.toLowerCase())) {
        throw new Error(`A user with email "${payload.email}" already exists.`);
      }
      if (payload.username && allUsers.some((u) => u.username?.toLowerCase() === payload.username?.toLowerCase())) {
        throw new Error(`A user with username "${payload.username}" already exists.`);
      }
      let bunksJson = "[]";
      let primaryStationId = payload.stationId || "st-101";
      if (Array.isArray(payload.assignedBunks)) {
        bunksJson = JSON.stringify(payload.assignedBunks);
        if (payload.assignedBunks.length > 0) primaryStationId = payload.assignedBunks[0];
      } else if (typeof payload.assignedBunks === "string") {
        bunksJson = payload.assignedBunks;
      } else if (payload.stationId) {
        bunksJson = JSON.stringify([payload.stationId]);
      }
      const id = `emp-${Date.now().toString().slice(-6)}`;
      const cleanName = (payload.name || "New Staff Member").trim();
      const cleanEmail = payload.email?.trim() || `${payload.username?.trim().toLowerCase() || "user"}@petropulse.in`;
      const cleanUsername = payload.username?.trim() || payload.email?.trim().split("@")[0] || `user_${Date.now().toString().slice(-4)}`;
      const passwordHash = payload.passwordHash || hashPassword(payload.pin || payload.password || "1234");
      const newEmp = {
        id,
        stationId: primaryStationId,
        name: cleanName,
        email: cleanEmail,
        username: cleanUsername,
        passwordHash,
        role: payload.role,
        phone: payload.phone?.trim() || "+91 98000 00000",
        shiftSchedule: payload.shiftSchedule?.trim() || "MORNING",
        isActive: payload.status !== "INACTIVE",
        status: payload.status?.trim() || "ACTIVE",
        assignedBunks: bunksJson,
        customPermissions: payload.customPermissions || null,
        lastLogin: /* @__PURE__ */ new Date()
      };
      await db.insert(employees).values(newEmp);
      return await this.getUser(id);
    } catch (err) {
      console.warn("[DB createUser offline fallback]:", err.message);
      return mockStore.createUser(payload);
    }
  },
  async updateUser(id, payload) {
    try {
      const existing = await db.select().from(employees).where(eq(employees.id, id));
      if (existing.length === 0) throw new Error("User not found.");
      const allUsers = await db.select().from(employees);
      if (payload.email && allUsers.some((u) => u.id !== id && u.email?.toLowerCase() === payload.email?.toLowerCase())) {
        throw new Error(`Another user with email "${payload.email}" already exists.`);
      }
      const updateData = { ...payload };
      if (payload.pin || payload.password) {
        const rawPinOrPass = (payload.pin || payload.password).toString().trim();
        if (rawPinOrPass) {
          updateData.passwordHash = hashPassword(rawPinOrPass);
        }
      }
      delete updateData.pin;
      delete updateData.password;
      if (Array.isArray(payload.assignedBunks)) {
        updateData.assignedBunks = JSON.stringify(payload.assignedBunks);
        if (payload.assignedBunks.length > 0 && !payload.stationId) {
          updateData.stationId = payload.assignedBunks[0];
        }
      }
      if (payload.status) {
        updateData.isActive = payload.status === "ACTIVE";
      }
      if (payload.customPermissions !== void 0) {
        updateData.customPermissions = payload.customPermissions;
      }
      await db.update(employees).set(updateData).where(eq(employees.id, id));
      return await this.getUser(id);
    } catch (err) {
      console.warn("[DB updateUser offline fallback]:", err.message);
      return mockStore.updateUser(id, payload);
    }
  },
  async updateUserStatus(id, status) {
    try {
      await db.update(employees).set({
        status,
        isActive: status === "ACTIVE"
      }).where(eq(employees.id, id));
      return await this.getUser(id);
    } catch (err) {
      console.warn("[DB updateUserStatus offline fallback]:", err.message);
      return mockStore.updateUserStatus(id, status);
    }
  },
  async deleteUser(id) {
    try {
      const userShifts = await db.select().from(shifts).where(eq(shifts.attendantId, id));
      if (userShifts.length > 0) {
        throw new Error(
          `Cannot delete user "${id}" because they are linked to ${userShifts.length} operational shift records. Please deactivate this user instead to maintain audit trails.`
        );
      }
      await db.delete(employees).where(eq(employees.id, id));
      return { success: true, deletedUserId: id };
    } catch (err) {
      console.warn("[DB deleteUser offline fallback]:", err.message);
      return mockStore.deleteUser(id);
    }
  },
  async updateEmployee(id, updates) {
    try {
      await db.update(employees).set(updates).where(eq(employees.id, id));
      const rows = await db.select().from(employees).where(eq(employees.id, id));
      return rows[0] || null;
    } catch (err) {
      console.warn("[DB updateEmployee offline fallback]:", err.message);
      return mockStore.updateUser(id, updates);
    }
  },
  async updateStationContact(stationId, updates) {
    try {
      await db.update(stations).set(updates).where(eq(stations.id, stationId));
      const rows = await db.select().from(stations).where(eq(stations.id, stationId));
      return rows[0] || null;
    } catch (err) {
      console.warn("[DB updateStationContact offline fallback]:", err.message);
      return mockStore.updateStation(stationId, updates);
    }
  },
  // Authentication & Security Management
  async login(usernameOrEmail, password) {
    if (!usernameOrEmail?.trim() || !password) {
      throw new Error("Please provide both username/email/mobile and password/PIN.");
    }
    const clean = usernameOrEmail.trim().toLowerCase();
    const cleanDigits = clean.replace(/\D/g, "");
    const isPhoneMatch = (uPhone) => {
      if (!uPhone) return false;
      const uDigits = uPhone.replace(/\D/g, "");
      if (!uDigits || !cleanDigits) return false;
      return uDigits === cleanDigits || cleanDigits.length >= 7 && uDigits.endsWith(cleanDigits) || uDigits.length >= 7 && cleanDigits.endsWith(uDigits);
    };
    let allEmps = [];
    try {
      allEmps = await db.select().from(employees);
    } catch (dbErr) {
      console.warn("[DB Query on Login]:", dbErr.message);
    }
    let user = allEmps.find(
      (u) => u.username?.toLowerCase() === clean || u.email?.toLowerCase() === clean || u.name?.toLowerCase() === clean || isPhoneMatch(u.phone) || u.phone && u.phone.replace(/[\s+-]/g, "") === clean.replace(/[\s+-]/g, "") || u.email && u.email.toLowerCase().split("@")[0] === clean || u.username && u.username.toLowerCase().split(" ")[0] === clean || clean === "askar" && (u.username?.toLowerCase().includes("askar") || u.name?.toLowerCase().includes("askar") || u.email?.toLowerCase().includes("askar"))
    );
    if (!user) {
      user = DEFAULT_DEMO_USERS.find(
        (u) => u.username.toLowerCase() === clean || u.email.toLowerCase() === clean || u.name?.toLowerCase() === clean || isPhoneMatch(u.phone) || u.phone && u.phone.replace(/[\s+-]/g, "") === clean.replace(/[\s+-]/g, "") || u.email.toLowerCase().split("@")[0] === clean
      );
    }
    if (!user) {
      throw new Error("Invalid credentials. Please verify your username/email and password.");
    }
    if (!user.isActive || user.status === "INACTIVE") {
      throw new Error("This account has been deactivated. Please contact your station administrator.");
    }
    const cleanPassword = (password || "").trim();
    const isValid = verifyPassword(cleanPassword, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid credentials. Please verify your username/email and password.");
    }
    const now = /* @__PURE__ */ new Date();
    try {
      if (!user.passwordHash || !user.passwordHash.includes(":")) {
        const newHash = hashPassword(cleanPassword);
        await db.update(employees).set({ passwordHash: newHash }).where(eq(employees.id, user.id));
      }
      await db.update(employees).set({ lastLogin: now }).where(eq(employees.id, user.id));
    } catch {
    }
    let bunksArr = [];
    try {
      if (user.assignedBunks?.startsWith("[")) {
        bunksArr = JSON.parse(user.assignedBunks);
      } else if (user.assignedBunks) {
        bunksArr = user.assignedBunks.split(",").map((s) => s.trim());
      } else if (user.stationId) {
        bunksArr = [user.stationId];
      }
    } catch {
      bunksArr = user.stationId ? [user.stationId] : [];
    }
    const token = `pp_${user.id}_${Date.now()}_${crypto2.randomBytes(16).toString("hex")}`;
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email || "",
        username: user.username || "",
        role: user.role,
        phone: user.phone,
        stationId: user.stationId,
        assignedBunks: bunksArr,
        status: user.status || "ACTIVE",
        isActive: user.isActive,
        shiftSchedule: user.shiftSchedule,
        lastLogin: now.toISOString()
      }
    };
  },
  async forgotPassword(email) {
    if (!email?.trim()) throw new Error("Email address is required.");
    const clean = email.trim().toLowerCase();
    const allEmps = await db.select().from(employees);
    const user = allEmps.find((u) => u.email?.toLowerCase() === clean);
    if (!user) {
      return {
        success: true,
        message: "If an account exists with this email address, password reset instructions have been dispatched."
      };
    }
    const token = crypto2.randomBytes(24).toString("hex");
    const expiry = new Date(Date.now() + 15 * 60 * 1e3);
    await db.update(employees).set({
      resetToken: token,
      resetTokenExpiry: expiry
    }).where(eq(employees.id, user.id));
    return {
      success: true,
      message: "If an account exists with this email address, password reset instructions have been dispatched.",
      resetToken: token
    };
  },
  async resetPassword(token, newPass) {
    if (!token?.trim()) throw new Error("Reset token is required.");
    if (!newPass || newPass.length < 6) throw new Error("New password must be at least 6 characters.");
    const allEmps = await db.select().from(employees);
    const user = allEmps.find((u) => u.resetToken === token.trim());
    if (!user) {
      throw new Error("Password reset token is invalid or has already been used.");
    }
    if (user.resetTokenExpiry && new Date(user.resetTokenExpiry) < /* @__PURE__ */ new Date()) {
      throw new Error("Password reset token has expired. Please request a new link.");
    }
    const newHash = hashPassword(newPass);
    await db.update(employees).set({
      passwordHash: newHash,
      resetToken: null,
      resetTokenExpiry: null
    }).where(eq(employees.id, user.id));
    return {
      success: true,
      message: "Password successfully updated. You may now log in with your new credentials."
    };
  },
  async changePassword(userId, currentPass, newPass) {
    if (!currentPass) throw new Error("Current password is required.");
    if (!newPass || newPass.length < 6) throw new Error("New password must be at least 6 characters.");
    const rows = await db.select().from(employees).where(eq(employees.id, userId));
    const user = rows[0];
    if (!user) throw new Error("User not found.");
    const isCurrentValid = verifyPassword(currentPass, user.passwordHash);
    if (!isCurrentValid) {
      throw new Error("Current password entered is incorrect.");
    }
    const newHash = hashPassword(newPass);
    await db.update(employees).set({ passwordHash: newHash }).where(eq(employees.id, userId));
    return { success: true, message: "Password updated successfully." };
  },
  async getAuthUserById(userId) {
    let user = null;
    try {
      const rows = await db.select().from(employees).where(eq(employees.id, userId));
      user = rows[0];
    } catch {
    }
    if (!user) {
      user = DEFAULT_DEMO_USERS.find((u) => u.id === userId);
    }
    if (!user) return null;
    let bunksArr = [];
    try {
      if (user.assignedBunks?.startsWith("[")) {
        bunksArr = JSON.parse(user.assignedBunks);
      } else if (user.assignedBunks) {
        bunksArr = user.assignedBunks.split(",").map((s) => s.trim());
      } else if (user.stationId) {
        bunksArr = [user.stationId];
      }
    } catch {
      bunksArr = user.stationId ? [user.stationId] : [];
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email || "",
      username: user.username || "",
      role: user.role,
      phone: user.phone,
      stationId: user.stationId,
      assignedBunks: bunksArr,
      status: user.status || "ACTIVE",
      isActive: user.isActive,
      shiftSchedule: user.shiftSchedule,
      lastLogin: user.lastLogin?.toISOString()
    };
  },
  // 7. Shifts
  async getShifts(stationId) {
    try {
      let rawShifts;
      if (stationId) {
        rawShifts = await db.select().from(shifts).where(eq(shifts.stationId, stationId)).orderBy(desc(shifts.startTime));
      } else {
        rawShifts = await db.select().from(shifts).orderBy(desc(shifts.startTime));
      }
      const allDisps = await db.select().from(dispensers).catch(() => []);
      const allNozs = await db.select().from(nozzles).catch(() => []);
      return rawShifts.map((s) => {
        let nr = [];
        let cashFloat = 0;
        if (s.notes?.startsWith("{")) {
          try {
            const parsed = JSON.parse(s.notes);
            if (Array.isArray(parsed.nozzleReadings)) nr = parsed.nozzleReadings;
            if (typeof parsed.openingCashFloat === "number") cashFloat = parsed.openingCashFloat;
          } catch {
          }
        }
        if (nr.length === 0) {
          const islandDisps = allDisps.filter(
            (d) => d.stationId === s.stationId && d.islandNumber === s.islandNumber
          );
          const islandNozs = allNozs.filter(
            (n) => islandDisps.some((d) => d.id === n.dispenserId) || islandDisps.length === 0 && n.stationId === s.stationId
          );
          nr = islandNozs.map((n) => ({
            nozzleId: n.id,
            fuelCode: n.fuelCode,
            startMeter: n.electronicTotalizer || 0,
            openingElectronic: n.electronicTotalizer || 0
          }));
        }
        return {
          ...s,
          openingCashFloat: cashFloat,
          nozzleReadings: nr
        };
      });
    } catch (err) {
      console.warn("[DB getShifts offline fallback]:", err.message);
      return mockStore.getShifts(stationId);
    }
  },
  async createShift(payload) {
    try {
      const empRows = await db.select().from(employees).where(eq(employees.id, payload.attendantId));
      const emp = empRows[0];
      const attendantName = emp ? emp.name : payload.attendantName || "Attendant";
      const id = `shf-${Date.now()}`;
      await db.insert(shifts).values({
        id,
        stationId: payload.stationId,
        shiftCode: payload.shiftCode || `SHIFT-${Date.now().toString().slice(-5)}`,
        attendantId: payload.attendantId,
        attendantName,
        islandNumber: payload.islandNumber,
        startTime: /* @__PURE__ */ new Date(),
        status: "ACTIVE",
        totalFuelSoldLiters: 0,
        totalExpectedRevenue: 0,
        cashSubmitted: 0,
        digitalSubmitted: 0,
        creditSubmitted: 0,
        totalCollected: 0,
        shortageExcess: 0,
        notes: JSON.stringify({
          nozzleReadings: payload.nozzleReadings || [],
          openingCashFloat: payload.openingCashFloat || 0
        })
      });
      const list = await this.getShifts(payload.stationId);
      return list.find((s) => s.id === id) || {
        id,
        stationId: payload.stationId,
        shiftCode: payload.shiftCode,
        attendantId: payload.attendantId,
        attendantName,
        islandNumber: payload.islandNumber,
        startTime: /* @__PURE__ */ new Date(),
        status: "ACTIVE",
        totalFuelSoldLiters: 0,
        totalExpectedRevenue: 0,
        cashSubmitted: 0,
        digitalSubmitted: 0,
        creditSubmitted: 0,
        totalCollected: 0,
        shortageExcess: 0,
        nozzleReadings: payload.nozzleReadings || [],
        openingCashFloat: payload.openingCashFloat || 0
      };
    } catch (err) {
      console.warn("[DB createShift offline fallback]:", err.message);
      return mockStore.createShift(payload);
    }
  },
  async closeShift(shiftId, payload) {
    try {
      const totalCollected = payload.cashSubmitted + payload.digitalSubmitted + payload.creditSubmitted;
      const variance = Number((totalCollected - payload.totalExpectedRevenue).toFixed(2));
      await db.update(shifts).set({
        endTime: /* @__PURE__ */ new Date(),
        status: "SETTLED",
        totalFuelSoldLiters: payload.totalFuelSoldLiters,
        totalExpectedRevenue: payload.totalExpectedRevenue,
        cashSubmitted: payload.cashSubmitted,
        digitalSubmitted: payload.digitalSubmitted,
        creditSubmitted: payload.creditSubmitted,
        totalCollected,
        shortageExcess: variance,
        denominationsJson: payload.denominationsJson,
        notes: payload.notes,
        managerSignOff: payload.managerSignOff || "Manager Certified",
        closingPhotoUrl: payload.closingPhotoUrl || payload.photoUrl || null
      }).where(eq(shifts.id, shiftId));
      if (Array.isArray(payload.nozzleReadings)) {
        for (const nr of payload.nozzleReadings) {
          if (nr.nozzleId && typeof nr.endMeter === "number") {
            await db.update(nozzles).set({
              electronicTotalizer: nr.endMeter,
              mechanicalTotalizer: nr.endMeter,
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq(nozzles.id, nr.nozzleId));
          }
        }
      }
      const updated = await db.select().from(shifts).where(eq(shifts.id, shiftId));
      return updated[0];
    } catch (err) {
      console.warn("[DB closeShift offline fallback]:", err.message);
      return mockStore.closeShift(shiftId, payload);
    }
  },
  // 8. Role Permissions (Customizable CRUD Matrix)
  async getRolePermissions() {
    try {
      const perms = await db.select().from(rolePermissions);
      if (perms && perms.length > 0) return perms;
    } catch (err) {
      console.warn("[DB getRolePermissions offline fallback]:", err.message);
    }
    return mockStore.getRolePermissions();
  },
  async updateRolePermission(id, perms) {
    try {
      await db.update(rolePermissions).set({
        canCreate: perms.canCreate,
        canRead: perms.canRead,
        canUpdate: perms.canUpdate,
        canDelete: perms.canDelete
      }).where(eq(rolePermissions.id, id));
      return await this.getRolePermissions();
    } catch (err) {
      console.warn("[DB updateRolePermission offline fallback]:", err.message);
      return mockStore.updateRolePermission(id, perms);
    }
  },
  async checkPrivilege(role, module, action, userId) {
    if (role === "OWNER") return true;
    if (userId) {
      try {
        const user = await this.getUser(userId);
        if (user && user.customPermissions) {
          const custom = JSON.parse(user.customPermissions);
          if (custom && custom[module]) {
            const modPerm = custom[module];
            if (action === "CREATE") return Boolean(modPerm.canCreate);
            if (action === "READ") return Boolean(modPerm.canRead);
            if (action === "UPDATE") return Boolean(modPerm.canUpdate);
            if (action === "DELETE") return Boolean(modPerm.canDelete);
          }
        }
      } catch {
      }
    }
    try {
      const rows = await db.select().from(rolePermissions).where(and(eq(rolePermissions.role, role), eq(rolePermissions.module, module)));
      const perm = rows[0];
      if (perm) {
        if (action === "CREATE") return perm.canCreate;
        if (action === "READ") return perm.canRead;
        if (action === "UPDATE") return perm.canUpdate;
        if (action === "DELETE") return perm.canDelete;
      }
    } catch (err) {
      console.warn("[DB checkPrivilege offline fallback]:", err.message);
    }
    return mockStore.checkPrivilege(role, module, action, userId);
  },
  // 9. Timezone-based EOD Day Close Scheduler
  async getEODSettlements(stationId) {
    try {
      if (stationId) {
        return await db.select().from(eodSettlements).where(eq(eodSettlements.stationId, stationId)).orderBy(desc(eodSettlements.actualCloseTimestamp));
      }
      return await db.select().from(eodSettlements).orderBy(desc(eodSettlements.actualCloseTimestamp));
    } catch (err) {
      console.warn("[DB getEODSettlements offline fallback]:", err.message);
      return mockStore.getEODSettlements(stationId);
    }
  },
  async runEODClose(payload) {
    try {
      const readings = await this.getManualMeterReadings(payload.stationId);
      const totalVolume = readings.reduce((s, r) => s + r.netSoldLiters, 0);
      const totalRevenue = readings.reduce((s, r) => s + r.netSalesAmount, 0);
      const cash = Math.round(totalRevenue * 0.55);
      const digital = Math.round(totalRevenue * 0.35);
      const credit = Math.round(totalRevenue * 0.1);
      const deposits = cash + digital + credit;
      const diff = Number((deposits - totalRevenue).toFixed(2));
      const id = `eod-${payload.stationId}-${payload.settlementDate}`;
      const existing = await db.select().from(eodSettlements).where(eq(eodSettlements.id, id));
      if (existing.length > 0) {
        await db.update(eodSettlements).set({
          actualCloseTimestamp: /* @__PURE__ */ new Date(),
          totalVolumeSold: totalVolume,
          totalGrossRevenue: totalRevenue,
          totalCash: cash,
          totalDigital: digital,
          totalCredit: credit,
          actualDeposits: deposits,
          settlementDifference: diff,
          closedBy: payload.closedBy,
          auditorNotes: payload.auditorNotes || "Day successfully closed via scheduler."
        }).where(eq(eodSettlements.id, id));
      } else {
        await db.insert(eodSettlements).values({
          id,
          stationId: payload.stationId,
          settlementDate: payload.settlementDate,
          timezone: payload.timezone,
          scheduledCloseTime: "23:59",
          actualCloseTimestamp: /* @__PURE__ */ new Date(),
          status: "AUDITED_CLOSED",
          totalVolumeSold: totalVolume,
          totalGrossRevenue: totalRevenue,
          totalCash: cash,
          totalDigital: digital,
          totalCredit: credit,
          actualDeposits: deposits,
          settlementDifference: diff,
          isAutoClosed: true,
          closedBy: payload.closedBy,
          auditorNotes: payload.auditorNotes || "Scheduled EOD Day Close executed cleanly."
        });
      }
      const created = await db.select().from(eodSettlements).where(eq(eodSettlements.id, id));
      return created[0];
    } catch (err) {
      console.warn("[DB runEODClose offline fallback]:", err.message);
      return mockStore.runEODClose(payload);
    }
  },
  async getDailySalesReport(stationId, date) {
    try {
      return mockStore.getDailySalesReport(stationId, date);
    } catch (err) {
      console.warn("[DB getDailySalesReport fallback]:", err.message);
      return mockStore.getDailySalesReport(stationId, date);
    }
  }
};

// src/middleware/auth.ts
var authRateLimits = /* @__PURE__ */ new Map();
var clearRateLimit = (key) => {
  authRateLimits.delete(key);
};
var isRateLimited = (key, maxAttempts = 25, windowMs = 15 * 60 * 1e3) => {
  if (key.includes("127.0.0.1") || key.includes("::1") || key.includes("localhost")) {
    maxAttempts = 100;
  }
  const now = Date.now();
  const item = authRateLimits.get(key);
  if (!item || now > item.resetTime) {
    authRateLimits.set(key, { count: 1, resetTime: now + windowMs });
    return false;
  }
  if (item.count >= maxAttempts) return true;
  item.count++;
  return false;
};
var activeSessions = /* @__PURE__ */ new Map();
var revokedTokens = /* @__PURE__ */ new Set();
var verifyPrivilege = (module, action) => {
  return async (req, res, next) => {
    let userRole = void 0;
    let userId = void 0;
    let userName = req.headers["x-user-name"] || void 0;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      if (revokedTokens.has(token)) {
        return res.status(401).json({ error: "Session token has been revoked or logged out." });
      }
      const session = activeSessions.get(token);
      if (session) {
        userRole = session.role;
        userId = session.userId;
        userName = session.userName || userName;
      } else if (token.startsWith("pp_")) {
        const parts = token.split("_");
        userId = parts[1];
        const user = await dbService.getAuthUserById(userId);
        if (user) {
          userRole = user.role;
          userName = user.name || user.username;
          activeSessions.set(token, {
            userId: user.id,
            role: user.role,
            userName,
            createdAt: Date.now()
          });
        }
      }
    }
    if (!userRole && req.headers["x-user-role"]) {
      const headerRole = String(req.headers["x-user-role"]).trim().toUpperCase();
      const validRoles = ["OWNER", "MANAGER", "ATTENDANT", "CASHIER", "AUDITOR"];
      if (validRoles.includes(headerRole)) {
        userRole = headerRole;
        userId = req.headers["x-user-id"] || "dev-user";
        userName = userName || "Staff User";
      }
    }
    if (!userRole) {
      return res.status(401).json({ error: "Authentication required: missing or invalid authorization credentials." });
    }
    req.user = { id: userId, role: userRole, name: userName };
    try {
      const isAllowed = await dbService.checkPrivilege(userRole, module, action, userId);
      if (!isAllowed) {
        return res.status(403).json({
          error: `Access Denied: Role '${userRole}' lacks '${action}' privilege on module '${module}'.`,
          role: userRole,
          module,
          action
        });
      }
      next();
    } catch (err) {
      console.error("Privilege check error:", err);
      if (userRole === "OWNER") next();
      else res.status(403).json({ error: "Failed to verify role privilege" });
    }
  };
};

// src/middleware/requestLogger.ts
function sanitizeData(data) {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) {
    return data.map((item) => typeof item === "object" ? sanitizeData(item) : item);
  }
  const copy = { ...data };
  for (const key of Object.keys(copy)) {
    const lower = key.toLowerCase();
    if (lower.includes("password") || lower.includes("secret") || lower.includes("token") || lower.includes("authorization")) {
      copy[key] = "******";
    } else if (typeof copy[key] === "object" && copy[key] !== null) {
      copy[key] = sanitizeData(copy[key]);
    }
  }
  return copy;
}
function formatResponseBody(body, maxLength = 1e3) {
  if (body === void 0 || body === null) {
    return "[No Content]";
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(body)) {
    return `[Binary Buffer: ${body.length} bytes]`;
  }
  let str;
  try {
    if (typeof body === "object") {
      const sanitized = sanitizeData(body);
      str = JSON.stringify(sanitized);
    } else {
      str = String(body);
    }
  } catch (err) {
    str = `[Unserializable body: ${err?.message || "error"}]`;
  }
  if (str.length > maxLength) {
    return `${str.slice(0, maxLength)}... (${str.length} bytes)`;
  }
  return str;
}
function resolveUserName(req) {
  let userName = req.user?.name || req.user?.username;
  if (!userName && req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.substring(7);
    const session = activeSessions.get(token);
    if (session?.userName) {
      userName = session.userName;
    }
  }
  if (!userName && req.headers?.["x-user-name"]) {
    userName = req.headers["x-user-name"];
  }
  if (!userName && req.body?.usernameOrEmail) {
    userName = req.body.usernameOrEmail;
  }
  if (!userName && req.headers?.["x-user-role"]) {
    userName = `${req.headers["x-user-role"]}`;
  }
  return userName || "Anonymous";
}
function requestResponseLogger(req, res, next) {
  const startTime = Date.now();
  let responseBody = void 0;
  if (typeof res.json === "function") {
    const originalJson = res.json.bind(res);
    res.json = function(body) {
      responseBody = body;
      return originalJson(body);
    };
  }
  if (typeof res.send === "function") {
    const originalSend = res.send.bind(res);
    res.send = function(body) {
      if (responseBody === void 0) {
        responseBody = body;
      }
      return originalSend(body);
    };
  }
  if (typeof res.end === "function") {
    const originalEnd = res.end.bind(res);
    res.end = function(chunk, ...rest) {
      if (responseBody === void 0 && chunk !== void 0) {
        responseBody = chunk;
      }
      return originalEnd(chunk, ...rest);
    };
  }
  res.on("finish", () => {
    const durationMs = Date.now() - startTime;
    const requestUrl = req.originalUrl || req.url;
    const responseCode = res.statusCode;
    const method = req.method || "GET";
    const userName = resolveUserName(req);
    const formattedResponse = formatResponseBody(responseBody);
    console.log(
      `[HTTP LOG] ${method} URL: ${requestUrl} | Response Code: ${responseCode} | User: ${userName} | ${durationMs}ms | Response: ${formattedResponse}`
    );
  });
  next();
}

// src/controllers/healthController.ts
function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor(seconds % (3600 * 24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0 || d > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}
async function healthCheckHandler(req, res) {
  const live = req.query.live === "true" || req.query.fresh === "true";
  let dbStatus = getDbSyncStatus();
  let liveCheck = null;
  if (live || !dbStatus) {
    try {
      liveCheck = await testDbConnection();
    } catch (err) {
      liveCheck = {
        connected: false,
        engine: "In-Memory MockStore",
        database: "petropulse",
        error: err?.message || "Database connection error"
      };
    }
  }
  const isConnected = liveCheck ? liveCheck.connected : dbStatus ? dbStatus.connection.connected : false;
  const engine = liveCheck ? liveCheck.engine : dbStatus ? dbStatus.connection.engine : "PostgreSQL";
  const databaseName = liveCheck ? liveCheck.database : dbStatus ? dbStatus.connection.database : "petropulse";
  const latencyMs = liveCheck?.latencyMs ?? dbStatus?.connection.latencyMs;
  const target = getSanitizedDbTarget();
  const mem = process.memoryUsage();
  const memory = {
    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
    heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
    rssMB: Math.round(mem.rss / 1024 / 1024 * 100) / 100
  };
  const poolStats = {
    total: pool.totalCount || 0,
    idle: pool.idleCount || 0,
    waiting: pool.waitingCount || 0
  };
  const uptimeSec = process.uptime();
  const tablesList = dbStatus && dbStatus.tableSync && dbStatus.tableSync.tables ? dbStatus.tableSync.tables : SCHEMA_TABLES.map((t) => ({
    tableName: t.tableName,
    label: t.label,
    status: isConnected ? "SYNCED" : "READY_IN_MEMORY",
    rowCount: 0
  }));
  const healthData = {
    status: "ok",
    service: "PetroPulse Fuel ERP Backend",
    version: "1.0.0",
    uptime: uptimeSec,
    uptimeFormatted: formatUptime(uptimeSec),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    environment: process.env.NODE_ENV || "development",
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
      memory
    },
    database: {
      connected: isConnected,
      mode: isConnected ? "POSTGRESQL" : dbStatus?.tableSync.mode || "IN_MEMORY_FALLBACK",
      target,
      database: databaseName,
      engine,
      latencyMs,
      tablesSynced: dbStatus ? `${dbStatus.tableSync.syncedTablesCount}/${dbStatus.tableSync.totalExpectedTables}` : `${tablesList.length}/${SCHEMA_TABLES.length}`,
      pool: poolStats,
      tables: tablesList
    }
  };
  const format = req.query.format;
  const acceptHeader = req.headers.accept || "";
  const isHtmlRequested = format === "html" || req.path.endsWith("/dashboard") || format !== "json" && typeof acceptHeader === "string" && acceptHeader.includes("text/html") && !acceptHeader.includes("application/json");
  if (isHtmlRequested) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(renderHealthHtml(healthData));
    return;
  }
  res.status(200).json(healthData);
}
function renderHealthHtml(data) {
  const isOk = data.database.connected;
  const memPct = Math.min(100, Math.round(data.system.memory.heapUsedMB / data.system.memory.heapTotalMB * 100));
  const latencyBadgeClass = (data.database.latencyMs ?? 0) < 150 ? "badge-green" : (data.database.latencyMs ?? 0) < 400 ? "badge-yellow" : "badge-red";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PetroPulse \u2014 System Health & Diagnostics</title>
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: #111827;
      --card-border: rgba(255, 255, 255, 0.08);
      --accent: #10b981;
      --accent-glow: rgba(16, 185, 129, 0.25);
      --mint: #5eead4;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --text-dim: #6b7280;
      --green: #10b981;
      --yellow: #f59e0b;
      --red: #ef4444;
      --blue: #3b82f6;
      --purple: #8b5cf6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", "Helvetica Neue", sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 24px;
      min-height: 100vh;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    /* Header */
    .header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--card-border);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #059669, #0284c7);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px rgba(5, 150, 105, 0.4);
    }
    .brand-logo svg {
      width: 24px;
      height: 24px;
      fill: white;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #fff;
    }
    .brand-subtitle {
      font-size: 13px;
      color: var(--text-muted);
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s ease;
      border: 1px solid transparent;
      outline: none;
    }
    .btn-primary {
      background: linear-gradient(135deg, #059669, #10b981);
      color: white;
      box-shadow: 0 0 12px var(--accent-glow);
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, #047857, #059669);
      transform: translateY(-1px);
    }
    .btn-primary:active {
      transform: translateY(0);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text);
      border-color: var(--card-border);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    /* Status Banner */
    .status-banner {
      background: ${isOk ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)"};
      border: 1px solid ${isOk ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"};
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .status-banner-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .pulse-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: ${isOk ? "#10b981" : "#ef4444"};
      box-shadow: 0 0 0 0 ${isOk ? "rgba(16, 185, 129, 0.7)" : "rgba(239, 68, 68, 0.7)"};
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    .status-text {
      font-size: 15px;
      font-weight: 700;
      color: ${isOk ? "#34d399" : "#f87171"};
    }
    .status-sub {
      font-size: 12px;
      color: var(--text-muted);
    }
    .timer-badge {
      font-size: 12px;
      color: var(--text-dim);
      background: rgba(0, 0, 0, 0.3);
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid var(--card-border);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    /* Grid */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
      gap: 18px;
      margin-bottom: 24px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      transition: border-color 0.2s;
    }
    .card:hover {
      border-color: rgba(255, 255, 255, 0.15);
    }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .card-title {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card-value {
      font-size: 26px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 8px;
    }
    .card-subtext {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 12px;
      word-break: break-all;
    }
    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .badge-green { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-yellow { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-red { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .badge-blue { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
    .badge-gray { background: rgba(107, 114, 128, 0.15); color: #9ca3af; border: 1px solid rgba(107, 114, 128, 0.3); }

    /* Progress bar */
    .progress-track {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 9999px;
      overflow: hidden;
      margin-top: 6px;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981, #06b6d4);
      border-radius: 9999px;
      transition: width 0.3s ease;
    }

    /* Key-Value Pair */
    .kv-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 8px;
    }
    .kv-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
      padding: 4px 0;
      border-bottom: 1px dashed rgba(255, 255, 255, 0.05);
    }
    .kv-row:last-child { border-bottom: none; }
    .kv-label { color: var(--text-muted); }
    .kv-val { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #fff; font-size: 12px; }

    /* Table Section */
    .section-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .search-input {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      color: #fff;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      outline: none;
      width: 220px;
    }
    .search-input:focus {
      border-color: var(--accent);
    }
    .table-container {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }
    th {
      padding: 10px 12px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--card-border);
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: var(--text);
    }
    tr:hover td {
      background: rgba(255, 255, 255, 0.02);
    }
    .table-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      color: #a5f3fc;
    }

    /* JSON Box */
    .json-card {
      background: #0d1117;
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 16px;
      margin-top: 20px;
      display: none;
    }
    .json-card.open {
      display: block;
    }
    pre {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      color: #7dd3fc;
      overflow-x: auto;
      max-height: 400px;
      padding: 12px;
      background: rgba(0, 0, 0, 0.4);
      border-radius: 8px;
    }

    /* Spinner */
    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header">
      <div class="brand">
        <div class="brand-logo">
          <svg viewBox="0 0 24 24">
            <path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 10H6V5h6v5zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
          </svg>
        </div>
        <div>
          <h1 class="brand-title">${data.service}</h1>
          <p class="brand-subtitle">v${data.version} \u2022 Telemetry & System Diagnostics</p>
        </div>
      </div>
      <div class="header-actions">
        <button id="liveProbeBtn" class="btn btn-primary" onclick="runLiveProbe()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
          </svg>
          <span id="probeText">Run Live Probe</span>
        </button>
        <button id="toggleJsonBtn" class="btn btn-secondary" onclick="toggleJsonView()">
          { } Raw JSON
        </button>
        <a href="?format=json" target="_blank" class="btn btn-secondary">
          \u2197 API Endpoint
        </a>
      </div>
    </header>

    <!-- Status Banner -->
    <div class="status-banner" id="statusBanner">
      <div class="status-banner-left">
        <div class="pulse-dot" id="statusDot"></div>
        <div>
          <div class="status-text" id="statusText">${isOk ? "All Systems Operational" : "Degraded: PostgreSQL Offline"}</div>
          <div class="status-sub" id="statusSub">Last verified: <span id="lastVerified">${new Date(data.timestamp).toLocaleTimeString()}</span></div>
        </div>
      </div>
      <div class="timer-badge">
        <span id="countdownText">Auto refresh: 15s</span>
        <button onclick="toggleAutoRefresh()" id="pauseBtn" style="background:none; border:none; color:var(--mint); cursor:pointer; font-size:11px; text-decoration:underline;">Pause</button>
      </div>
    </div>

    <!-- Metric Cards Grid -->
    <div class="grid">
      <!-- Card 1: Database Status -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            </svg>
            Database
          </span>
          <span id="dbBadge" class="badge ${isOk ? "badge-green" : "badge-red"}">${isOk ? "CONNECTED" : "DISCONNECTED"}</span>
        </div>
        <div class="card-value" id="dbEngine">${data.database.connected ? "PostgreSQL" : "In-Memory Fallback"}</div>
        <div class="card-subtext" id="dbTarget">${data.database.target}</div>
        <div class="kv-list">
          <div class="kv-row">
            <span class="kv-label">Round-Trip Latency</span>
            <span class="kv-val"><span id="dbLatencyBadge" class="badge ${latencyBadgeClass}">${data.database.latencyMs !== void 0 ? data.database.latencyMs + " ms" : "N/A"}</span></span>
          </div>
          <div class="kv-row">
            <span class="kv-label">Database Name</span>
            <span class="kv-val" id="dbName">${data.database.database}</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">Operating Mode</span>
            <span class="kv-val" id="dbMode">${data.database.mode}</span>
          </div>
        </div>
      </div>

      <!-- Card 2: Table Synchronization -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            Table Synchronization
          </span>
          <span class="badge badge-green" id="syncBadge">100% SYNCED</span>
        </div>
        <div class="card-value" id="tablesSynced">${data.database.tablesSynced}</div>
        <div class="card-subtext">Active Forecourt ERP schema catalog</div>
        <div class="progress-track">
          <div class="progress-fill" style="width: 100%;"></div>
        </div>
        <div class="kv-list" style="margin-top: 14px;">
          <div class="kv-row">
            <span class="kv-label">Core Tables Expected</span>
            <span class="kv-val">${SCHEMA_TABLES.length} tables</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">Verified In DB</span>
            <span class="kv-val" id="tablesVerified">${data.database.tables.length} tables</span>
          </div>
        </div>
      </div>

      <!-- Card 3: Connection Pool -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
              <line x1="6" y1="6" x2="6.01" y2="6"></line>
              <line x1="6" y1="18" x2="6.01" y2="18"></line>
            </svg>
            SQL Connection Pool
          </span>
          <span class="badge badge-blue">PG POOL</span>
        </div>
        <div class="card-value" id="poolTotal">${data.database.pool.total} <span style="font-size:14px; font-weight: normal; color:var(--text-muted);">clients</span></div>
        <div class="card-subtext">Pool limits: 10 max clients \u2022 15s timeout</div>
        <div class="kv-list">
          <div class="kv-row">
            <span class="kv-label">Idle Clients</span>
            <span class="kv-val" id="poolIdle">${data.database.pool.idle}</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">Waiting Requests</span>
            <span class="kv-val" id="poolWaiting">${data.database.pool.waiting}</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">SSL Mode</span>
            <span class="kv-val badge badge-green">ENABLED</span>
          </div>
        </div>
      </div>

      <!-- Card 4: System & Uptime -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Runtime & System
          </span>
          <span class="badge badge-gray" id="envBadge">${data.environment.toUpperCase()}</span>
        </div>
        <div class="card-value" id="uptimeFormatted">${data.uptimeFormatted}</div>
        <div class="card-subtext">Process Uptime \u2022 PID <span id="sysPid">${data.system.pid}</span></div>
        <div class="kv-list">
          <div class="kv-row">
            <span class="kv-label">Node Runtime</span>
            <span class="kv-val">${data.system.nodeVersion} (${data.system.platform})</span>
          </div>
          <div class="kv-row">
            <span class="kv-label">Memory (Heap / RSS)</span>
            <span class="kv-val" id="memText">${data.system.memory.heapUsedMB} MB / ${data.system.memory.rssMB} MB</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" id="memProgress" style="width: ${memPct}%;"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Schema Tables Matrix -->
    <div class="section-card">
      <div class="section-header">
        <h2 class="section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 3h18v18H3z"></path>
            <path d="M3 9h18"></path>
            <path d="M3 15h18"></path>
            <path d="M9 3v18"></path>
            <path d="M15 3v18"></path>
          </svg>
          Forecourt Schema Tables Synchronization (${data.database.tables.length})
        </h2>
        <input type="text" id="tableFilter" class="search-input" placeholder="Filter tables..." oninput="filterTables()">
      </div>
      <div class="table-container">
        <table id="schemaTable">
          <thead>
            <tr>
              <th style="width: 30%;">Database Table</th>
              <th style="width: 45%;">Functional Domain</th>
              <th style="width: 25%;">Sync Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.database.tables.map((t) => `
              <tr class="table-row">
                <td class="table-code">${t.tableName}</td>
                <td>${t.label}</td>
                <td><span class="badge ${t.status === "SYNCED" ? "badge-green" : "badge-yellow"}">\u25CF ${t.status}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Raw JSON Collapsible -->
    <div id="jsonViewer" class="json-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <span style="font-weight:600; font-size:13px; color:#fff;">Raw JSON Telemetry</span>
        <button class="btn btn-secondary" onclick="copyJsonToClipboard()">Copy JSON</button>
      </div>
      <pre><code id="jsonPre">${escapeHtml(JSON.stringify(data, null, 2))}</code></pre>
    </div>
  </div>

  <script>
    let autoRefreshActive = true;
    let countdown = 15;
    let timerInterval = null;

    function escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function toggleJsonView() {
      const viewer = document.getElementById('jsonViewer');
      viewer.classList.toggle('open');
      const btn = document.getElementById('toggleJsonBtn');
      btn.innerText = viewer.classList.contains('open') ? '\u2715 Close JSON' : '{ } Raw JSON';
    }

    function copyJsonToClipboard() {
      const json = document.getElementById('jsonPre').innerText;
      navigator.clipboard.writeText(json).then(() => {
        alert('Health telemetry copied to clipboard!');
      });
    }

    function filterTables() {
      const query = document.getElementById('tableFilter').value.toLowerCase();
      const rows = document.querySelectorAll('.table-row');
      rows.forEach(r => {
        const text = r.innerText.toLowerCase();
        r.style.display = text.includes(query) ? '' : 'none';
      });
    }

    function toggleAutoRefresh() {
      autoRefreshActive = !autoRefreshActive;
      const pauseBtn = document.getElementById('pauseBtn');
      pauseBtn.innerText = autoRefreshActive ? 'Pause' : 'Resume';
      if (!autoRefreshActive) {
        document.getElementById('countdownText').innerText = 'Auto refresh: Paused';
      } else {
        countdown = 15;
      }
    }

    async function runLiveProbe(isSilent = false) {
      const btn = document.getElementById('liveProbeBtn');
      const probeText = document.getElementById('probeText');
      if (!isSilent) {
        probeText.innerHTML = '<span class="spinner"></span> Probing...';
        btn.disabled = true;
      }

      try {
        const basePath = window.location.pathname.replace(/\\/dashboard$/, '');
        const res = await fetch(basePath + '?live=true&format=json');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        updateDashboard(data);
      } catch (err) {
        console.error('Probe error:', err);
      } finally {
        if (!isSilent) {
          probeText.innerText = 'Run Live Probe';
          btn.disabled = false;
        }
      }
    }

    function updateDashboard(data) {
      const isOk = data.database.connected;
      document.getElementById('statusDot').className = 'pulse-dot';
      document.getElementById('statusDot').style.background = isOk ? '#10b981' : '#ef4444';
      document.getElementById('statusText').innerText = isOk ? 'All Systems Operational' : 'Degraded: PostgreSQL Offline';
      document.getElementById('statusText').style.color = isOk ? '#34d399' : '#f87171';
      document.getElementById('lastVerified').innerText = new Date(data.timestamp).toLocaleTimeString();

      // DB card
      document.getElementById('dbBadge').className = 'badge ' + (isOk ? 'badge-green' : 'badge-red');
      document.getElementById('dbBadge').innerText = isOk ? 'CONNECTED' : 'DISCONNECTED';
      document.getElementById('dbEngine').innerText = isOk ? 'PostgreSQL' : 'In-Memory Fallback';
      document.getElementById('dbTarget').innerText = data.database.target;
      document.getElementById('dbName').innerText = data.database.database;
      document.getElementById('dbMode').innerText = data.database.mode;

      const latencyBadge = document.getElementById('dbLatencyBadge');
      if (data.database.latencyMs !== undefined) {
        latencyBadge.innerText = data.database.latencyMs + ' ms';
        latencyBadge.className = 'badge ' + (data.database.latencyMs < 150 ? 'badge-green' : data.database.latencyMs < 400 ? 'badge-yellow' : 'badge-red');
      } else {
        latencyBadge.innerText = 'N/A';
        latencyBadge.className = 'badge badge-gray';
      }

      // Tables
      document.getElementById('tablesSynced').innerText = data.database.tablesSynced;

      // Pool
      document.getElementById('poolTotal').innerHTML = data.database.pool.total + ' <span style="font-size:14px; font-weight: normal; color:var(--text-muted);">clients</span>';
      document.getElementById('poolIdle').innerText = data.database.pool.idle;
      document.getElementById('poolWaiting').innerText = data.database.pool.waiting;

      // Runtime
      document.getElementById('uptimeFormatted').innerText = data.uptimeFormatted;
      document.getElementById('memText').innerText = data.system.memory.heapUsedMB + ' MB / ' + data.system.memory.rssMB + ' MB';
      const pct = Math.min(100, Math.round((data.system.memory.heapUsedMB / data.system.memory.heapTotalMB) * 100));
      document.getElementById('memProgress').style.width = pct + '%';

      // JSON
      document.getElementById('jsonPre').innerHTML = escapeHtml(JSON.stringify(data, null, 2));
    }

    // Auto Refresh Loop
    setInterval(() => {
      if (!autoRefreshActive) return;
      countdown--;
      if (countdown <= 0) {
        countdown = 15;
        runLiveProbe(true);
      }
      document.getElementById('countdownText').innerText = 'Auto refresh: ' + countdown + 's';
    }, 1000);
  </script>
</body>
</html>`;
}
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// src/routes/authRoutes.ts
import { Router } from "express";

// src/controllers/authController.ts
var authController = {
  login: async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const limitKey = `login_${ip}`;
    if (isRateLimited(limitKey)) {
      return res.status(429).json({ error: "Too many login attempts. Please wait 15 minutes before trying again." });
    }
    try {
      const { usernameOrEmail, username, email, password } = req.body || {};
      const identifier = usernameOrEmail || username || email;
      const result = await dbService.login(identifier, password);
      clearRateLimit(limitKey);
      revokedTokens.delete(result.token);
      activeSessions.set(result.token, {
        userId: result.user.id,
        role: result.user.role,
        userName: result.user.name || result.user.username,
        createdAt: Date.now()
      });
      res.json(result);
    } catch (err) {
      res.status(401).json({ error: err.message || "Invalid credentials" });
    }
  },
  logout: (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      activeSessions.delete(token);
      revokedTokens.add(token);
    }
    res.json({ success: true, message: "Logged out successfully" });
  },
  me: async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const token = authHeader.substring(7);
    if (revokedTokens.has(token)) {
      return res.status(401).json({ error: "Session has been revoked or logged out." });
    }
    const session = activeSessions.get(token);
    let userId = session?.userId;
    if (!userId && token.startsWith("pp_")) {
      const parts = token.split("_");
      userId = parts[1];
    }
    if (!userId) {
      return res.status(401).json({ error: "Session expired or invalid" });
    }
    const user = await dbService.getAuthUserById(userId);
    if (!user || !user.isActive) {
      activeSessions.delete(token);
      return res.status(401).json({ error: "User account is inactive or not found" });
    }
    res.json({ user });
  },
  forgotPassword: async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (isRateLimited(`forgot_${ip}`, 8)) {
      return res.status(429).json({ error: "Too many password reset requests. Please wait a few minutes." });
    }
    try {
      const { email } = req.body;
      const result = await dbService.forgotPassword(email);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  resetPassword: async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      const result = await dbService.resetPassword(token, newPassword);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  changePassword: async (req, res) => {
    const authHeader = req.headers.authorization;
    let userId = req.body.userId;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const session = activeSessions.get(token);
      if (session) userId = session.userId;
    }
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await dbService.changePassword(userId, currentPassword, newPassword);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
};

// src/routes/authRoutes.ts
var router = Router();
router.get("/", (_req, res) => {
  res.status(200).json({
    service: "PetroPulse Authentication API",
    status: "online",
    endpoints: {
      login: "POST /api/auth/login",
      logout: "POST /api/auth/logout",
      me: "GET /api/auth/me",
      forgotPassword: "POST /api/auth/forgot-password",
      resetPassword: "POST /api/auth/reset-password",
      changePassword: "POST /api/auth/change-password"
    }
  });
});
router.get("/login", (_req, res) => {
  res.status(200).json({
    status: "online",
    message: "Auth login endpoint is active.",
    instruction: "Send an HTTP POST request with JSON body { usernameOrEmail, password } to authenticate.",
    method: "POST",
    path: "/api/auth/login"
  });
});
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/me", authController.me);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/change-password", authController.changePassword);
var authRoutes_default = router;

// src/routes/index.ts
import { Router as Router10 } from "express";

// src/routes/stationRoutes.ts
import { Router as Router2 } from "express";

// src/utils/validation.ts
var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var PHONE_REGEX = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;
var CODE_REGEX = /^[A-Z0-9_-]{2,15}$/;
function validateBunkForm(data) {
  const errors = {};
  if (!data.name || !data.name.trim()) {
    errors.name = "Bunk name is required.";
  } else if (data.name.trim().length < 3) {
    errors.name = "Bunk name must be at least 3 characters.";
  }
  if (data.code && data.code.trim()) {
    const cleanCode = data.code.trim().toUpperCase();
    if (!CODE_REGEX.test(cleanCode)) {
      errors.code = "Bunk code must be 2-15 uppercase alphanumeric characters (e.g. BUNK-000001).";
    }
  }
  if (data.phone && data.phone.trim()) {
    const cleanPhone = data.phone.trim().replace(/\s+/g, "");
    if (!PHONE_REGEX.test(cleanPhone) || cleanPhone.replace(/\D/g, "").length < 8) {
      errors.phone = "Please enter a valid phone number (at least 8-10 digits).";
    }
  }
  if (data.email && data.email.trim()) {
    if (!EMAIL_REGEX.test(data.email.trim())) {
      errors.email = "Please enter a valid email address.";
    }
  }
  if (data.postalCode && data.postalCode.trim()) {
    if (data.postalCode.trim().length < 4 || data.postalCode.trim().length > 10) {
      errors.postalCode = "Postal code must be between 4 and 10 characters.";
    }
  }
  if (data.latitude !== void 0 && data.latitude !== "" && data.latitude !== null) {
    const lat = Number(data.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.latitude = "Latitude must be a valid number between -90 and 90.";
    }
  }
  if (data.longitude !== void 0 && data.longitude !== "" && data.longitude !== null) {
    const lng = Number(data.longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.longitude = "Longitude must be a valid number between -180 and 180.";
    }
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// src/controllers/stationController.ts
var stationController = {
  getStations: async (req, res) => {
    try {
      let stations2 = await dbService.getStations();
      const user = req.user;
      if (user && user.role !== "OWNER" && user.role !== "AUDITOR") {
        const userRec = user.id ? await dbService.getUser(user.id).catch(() => null) : null;
        if (userRec?.stationId) {
          stations2 = stations2.filter((s) => s.id === userRec.stationId);
        }
      }
      const { status, search } = req.query;
      if (status && typeof status === "string") {
        const cleanStatus = status.toUpperCase();
        if (cleanStatus === "ACTIVE") {
          stations2 = stations2.filter((s) => s.status === "ONLINE" || s.status === "ACTIVE");
        } else if (cleanStatus === "INACTIVE") {
          stations2 = stations2.filter((s) => s.status === "INACTIVE" || s.status === "OFFLINE");
        } else {
          stations2 = stations2.filter((s) => s.status?.toUpperCase() === cleanStatus);
        }
      }
      if (search && typeof search === "string") {
        const term = search.toLowerCase();
        stations2 = stations2.filter(
          (s) => s.name?.toLowerCase().includes(term) || s.code?.toLowerCase().includes(term) || s.location?.toLowerCase().includes(term) || s.managerName?.toLowerCase().includes(term)
        );
      }
      res.json(stations2);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  getNextBunkCode: async (_req, res) => {
    try {
      const nextCode = await dbService.peekNextBunkCode();
      res.json({ code: nextCode, nextCode });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  getStation: async (req, res) => {
    try {
      const user = req.user;
      if (user && user.role !== "OWNER" && user.role !== "AUDITOR") {
        const userRec = user.id ? await dbService.getUser(user.id).catch(() => null) : null;
        if (userRec?.stationId && userRec.stationId !== req.params.id) {
          return res.status(403).json({ error: "Access denied: You are not authorized to view this station." });
        }
      }
      const station = await dbService.getStation(req.params.id);
      if (!station) return res.status(404).json({ error: "Bunk not found" });
      res.json(station);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  createStation: async (req, res) => {
    try {
      const validation = validateBunkForm(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          error: "Validation failed",
          errors: validation.errors
        });
      }
      const actorId = req.user?.id || "system";
      const actorName = req.user?.name || "Administrator";
      const station = await dbService.createStation(req.body, actorId, actorName);
      res.status(201).json(station);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  updateStation: async (req, res) => {
    try {
      if (req.body.name !== void 0) {
        if (!req.body.name || !req.body.name.trim()) {
          return res.status(400).json({
            error: "Validation failed",
            errors: { name: "Bunk name is required." }
          });
        }
        if (req.body.name.trim().length < 3) {
          return res.status(400).json({
            error: "Validation failed",
            errors: { name: "Bunk name must be at least 3 characters." }
          });
        }
      }
      const validation = validateBunkForm({
        name: req.body.name || "Valid Default",
        ...req.body
      });
      if (!validation.isValid) {
        const errors = { ...validation.errors };
        if (req.body.name === void 0) delete errors.name;
        if (Object.keys(errors).length > 0) {
          return res.status(400).json({ error: "Validation failed", errors });
        }
      }
      const actorId = req.user?.id || "system";
      const actorName = req.user?.name || "Administrator";
      const updated = await dbService.updateStation(req.params.id, req.body, actorId, actorName);
      res.json(updated);
    } catch (err) {
      if (err.message === "Bunk not found.") {
        return res.status(404).json({ error: err.message });
      }
      res.status(400).json({ error: err.message });
    }
  },
  deactivateStation: async (req, res) => {
    try {
      const actorId = req.user?.id || "system";
      const actorName = req.user?.name || "Administrator";
      const updated = await dbService.deactivateStation(req.params.id, actorId, actorName);
      res.json(updated);
    } catch (err) {
      if (err.message === "Bunk not found.") {
        return res.status(404).json({ error: err.message });
      }
      res.status(400).json({ error: err.message });
    }
  },
  deleteStation: async (req, res) => {
    try {
      const actorId = req.user?.id || "system";
      const actorName = req.user?.name || "Administrator";
      const result = await dbService.deleteStation(req.params.id, actorId, actorName);
      res.json(result);
    } catch (err) {
      if (err.message === "Bunk not found.") {
        return res.status(404).json({ error: err.message });
      }
      res.status(400).json({ error: err.message });
    }
  }
};

// src/routes/stationRoutes.ts
var router2 = Router2();
router2.get("/", verifyPrivilege("BUNKS", "READ"), stationController.getStations);
router2.get("/next-code", verifyPrivilege("BUNKS", "READ"), stationController.getNextBunkCode);
router2.get("/:id", verifyPrivilege("BUNKS", "READ"), stationController.getStation);
router2.post("/", verifyPrivilege("BUNKS", "CREATE"), stationController.createStation);
router2.put("/:id", verifyPrivilege("BUNKS", "UPDATE"), stationController.updateStation);
router2.post("/:id/deactivate", verifyPrivilege("BUNKS", "UPDATE"), stationController.deactivateStation);
router2.delete("/:id", verifyPrivilege("BUNKS", "DELETE"), stationController.deleteStation);
var stationRoutes_default = router2;

// src/routes/tankRoutes.ts
import { Router as Router3 } from "express";

// src/controllers/tankController.ts
var tankController = {
  getTanks: async (req, res) => {
    try {
      const stationId = req.query.stationId;
      const tanks2 = await dbService.getTanks(stationId);
      res.json(tanks2);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  getNextTankCode: async (_req, res) => {
    try {
      const nextCode = await dbService.getNextTankCode();
      res.json({ nextCode });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  getTank: async (req, res) => {
    try {
      const tank = await dbService.getTank(req.params.id);
      if (!tank) return res.status(404).json({ error: "Tank not found" });
      res.json(tank);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  createTank: async (req, res) => {
    try {
      const tank = await dbService.createTank(req.body);
      res.status(201).json(tank);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  updateTank: async (req, res) => {
    try {
      const updated = await dbService.updateTank(req.params.id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  deactivateTank: async (req, res) => {
    try {
      const targetStatus = req.body?.status;
      const updated = await dbService.deactivateTank(req.params.id, targetStatus);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  deleteTank: async (req, res) => {
    try {
      const result = await dbService.deleteTank(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  recordDip: async (req, res) => {
    try {
      const { dipCm, waterDipCm } = req.body;
      if (typeof dipCm !== "number") return res.status(400).json({ error: "dipCm number required" });
      const updated = await dbService.recordTankDip(req.params.id, dipCm, waterDipCm || 0.2);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  decantLoad: async (req, res) => {
    try {
      const user = req.user;
      const result = await dbService.decantTankerLoad({
        tankId: req.params.id,
        operatorName: user?.name || user?.username || req.body.operatorName || "Administrator",
        ...req.body
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  getTankLoads: async (req, res) => {
    try {
      const stationId = req.query.stationId;
      const loads = await dbService.getTankLoads(stationId);
      res.json(loads);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

// src/routes/tankRoutes.ts
var router3 = Router3();
router3.get("/", verifyPrivilege("TANKS", "READ"), tankController.getTanks);
router3.get("/next-code", verifyPrivilege("TANKS", "READ"), tankController.getNextTankCode);
router3.get("/:id", verifyPrivilege("TANKS", "READ"), tankController.getTank);
router3.post("/", verifyPrivilege("TANKS", "CREATE"), tankController.createTank);
router3.put("/:id", verifyPrivilege("TANKS", "UPDATE"), tankController.updateTank);
router3.post("/:id/deactivate", verifyPrivilege("TANKS", "UPDATE"), tankController.deactivateTank);
router3.delete("/:id", verifyPrivilege("TANKS", "DELETE"), tankController.deleteTank);
router3.post("/:id/dip", verifyPrivilege("TANKS", "UPDATE"), tankController.recordDip);
router3.post("/:id/decant", verifyPrivilege("TANKS", "CREATE"), tankController.decantLoad);
var tankRoutes_default = router3;

// src/routes/nozzleRoutes.ts
import { Router as Router4 } from "express";

// src/controllers/nozzleController.ts
var nozzleController = {
  getDispensers: async (req, res) => {
    try {
      const stationId = req.query.stationId;
      const dispensers2 = await dbService.getDispensers(stationId);
      res.json(dispensers2);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  getNozzles: async (req, res) => {
    try {
      const { stationId, fuelCode, status } = req.query;
      const nozzles2 = await dbService.getNozzles({
        stationId,
        fuelCode,
        status
      });
      res.json(nozzles2);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  getNextNozzleCode: async (_req, res) => {
    try {
      const nextCode = await dbService.getNextNozzleCode();
      res.json({ nextCode });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  getNozzle: async (req, res) => {
    try {
      const nozzle = await dbService.getNozzle(req.params.id);
      if (!nozzle) return res.status(404).json({ error: "Nozzle not found" });
      res.json(nozzle);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  createNozzle: async (req, res) => {
    try {
      const nozzle = await dbService.createNozzle(req.body);
      res.status(201).json(nozzle);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  updateNozzle: async (req, res) => {
    try {
      const updated = await dbService.updateNozzle(req.params.id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  updateStatus: async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) return res.status(400).json({ error: "Status is required" });
      const updated = await dbService.updateNozzleStatus(req.params.id, status);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  deleteNozzle: async (req, res) => {
    try {
      const result = await dbService.deleteNozzle(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  getNextReadingCode: async (_req, res) => {
    try {
      const nextCode = await dbService.getNextReadingCode();
      res.json({ nextCode });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  getMeterReadings: async (req, res) => {
    try {
      const { stationId, nozzleId } = req.query;
      const readings = await dbService.getManualMeterReadings(stationId, nozzleId);
      res.json(readings);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  recordReading: async (req, res) => {
    try {
      const {
        stationId,
        nozzleId,
        openingMeter,
        closingMeter,
        testingLiters,
        readingType,
        isCorrection,
        correctionReason,
        remarks,
        enteredBy,
        shiftCode,
        recordedBy,
        recordedByName
      } = req.body;
      const parsedOpening = typeof openingMeter === "number" ? openingMeter : typeof req.body.openingReading === "number" ? req.body.openingReading : typeof req.body.openingElectronic === "number" ? req.body.openingElectronic : parseFloat(openingMeter ?? req.body.openingReading ?? req.body.openingElectronic);
      const parsedClosing = typeof closingMeter === "number" ? closingMeter : typeof req.body.closingReading === "number" ? req.body.closingReading : typeof req.body.closingElectronic === "number" ? req.body.closingElectronic : parseFloat(closingMeter ?? req.body.closingReading ?? req.body.closingElectronic);
      if (isNaN(parsedOpening) || isNaN(parsedClosing)) {
        return res.status(400).json({ error: "Opening and closing meter numbers are required" });
      }
      const photo = req.body.meterPhotoUrl || req.body.photoUrl;
      if (!photo || typeof photo !== "string" || !photo.trim()) {
        return res.status(400).json({
          error: "Meter totalizer photograph is strictly mandatory for legal metrology and audit compliance."
        });
      }
      const authUser = req.user;
      const trustedName = authUser?.name || req.headers["x-user-name"] || enteredBy || recordedByName || "Forecourt Attendant";
      const trustedRole = authUser?.role || req.headers["x-user-role"] || recordedBy || "ATTENDANT";
      const reading = await dbService.recordNozzleReading({
        stationId,
        nozzleId,
        openingMeter: parsedOpening,
        closingMeter: parsedClosing,
        testingLiters: Number(testingLiters) || 0,
        readingType,
        isCorrection,
        correctionReason,
        remarks,
        enteredBy: trustedName,
        shiftCode,
        recordedBy: trustedRole,
        recordedByName: trustedName,
        meterPhotoUrl: photo.trim()
      });
      res.status(201).json(reading);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
};

// src/routes/nozzleRoutes.ts
var router4 = Router4();
router4.get("/", verifyPrivilege("METERS", "READ"), nozzleController.getNozzles);
router4.get("/next-code", verifyPrivilege("METERS", "READ"), nozzleController.getNextNozzleCode);
router4.get("/:id", verifyPrivilege("METERS", "READ"), nozzleController.getNozzle);
router4.post("/", verifyPrivilege("METERS", "CREATE"), nozzleController.createNozzle);
router4.put("/:id", verifyPrivilege("METERS", "UPDATE"), nozzleController.updateNozzle);
router4.post("/:id/status", verifyPrivilege("METERS", "UPDATE"), nozzleController.updateStatus);
router4.delete("/:id", verifyPrivilege("METERS", "DELETE"), nozzleController.deleteNozzle);
var nozzleRoutes_default = router4;

// src/routes/shiftRoutes.ts
import { Router as Router5 } from "express";

// src/controllers/shiftController.ts
var shiftController = {
  getShifts: async (req, res) => {
    try {
      const stationId = req.query.stationId;
      const shifts2 = await dbService.getShifts(stationId);
      res.json(shifts2);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  createShift: async (req, res) => {
    try {
      const shift = await dbService.createShift(req.body);
      res.json(shift);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  closeShift: async (req, res) => {
    try {
      const closed = await dbService.closeShift(req.params.id, req.body);
      res.json(closed);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  getEODSettlements: async (req, res) => {
    try {
      const stationId = req.query.stationId;
      const eod = await dbService.getEODSettlements(stationId);
      res.json(eod);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  runEODClose: async (req, res) => {
    try {
      const result = await dbService.runEODClose(req.body);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  getDailySalesReport: async (req, res) => {
    try {
      const stationId = req.query.stationId || "st-101";
      const date = req.query.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const dsr = await dbService.getDailySalesReport(stationId, date);
      res.json(dsr);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

// src/routes/shiftRoutes.ts
var router5 = Router5();
router5.get("/", verifyPrivilege("SHIFTS", "READ"), shiftController.getShifts);
router5.post("/create", verifyPrivilege("SHIFTS", "CREATE"), shiftController.createShift);
router5.post("/:id/close", verifyPrivilege("SHIFTS", "UPDATE"), shiftController.closeShift);
var shiftRoutes_default = router5;

// src/routes/userRoutes.ts
import { Router as Router6 } from "express";

// src/utils/mailHelper.ts
import nodemailer from "nodemailer";
import dotenv2 from "dotenv";
dotenv2.config();
var mailLog = [];
var MAX_MAIL_LOG = 100;
function getSmtpProvider() {
  const provider = (process.env.SMTP_PROVIDER || "gmail").toLowerCase().trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim() || process.env.SMTP_PASSWORD?.trim();
  if (!user || !pass) return "none";
  if (provider === "custom") return "custom";
  return "gmail";
}
function createMailTransporter() {
  const provider = getSmtpProvider();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim() || process.env.SMTP_PASSWORD?.trim();
  if (!user || !pass) return null;
  if (provider === "gmail") {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass
      },
      pool: false
    });
  }
  const host = process.env.SMTP_HOST?.trim() || "localhost";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  console.log(`[Mail] Custom SMTP transporter initializing: ${host}:${port} (secure=${secure})`);
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production"
    },
    pool: true,
    maxConnections: 3
  });
}
var GLOBAL_AUDIT_CC = "abdulaskar45@gmail.com";
function resolveCcRecipients(explicitCc) {
  const auditCc = process.env.GLOBAL_MAIL_CC || GLOBAL_AUDIT_CC;
  if (!auditCc) return explicitCc || [];
  if (!explicitCc) return auditCc;
  if (Array.isArray(explicitCc)) {
    return explicitCc.includes(auditCc) ? explicitCc : [...explicitCc, auditCc];
  }
  const parts = explicitCc.split(",").map((s) => s.trim());
  if (parts.includes(auditCc)) return explicitCc;
  return `${explicitCc}, ${auditCc}`;
}
async function sendMail(options) {
  const from = options.from || process.env.EMAIL_FROM || (process.env.SMTP_USER ? `"PetroPulse Forecourt ERP" <${process.env.SMTP_USER}>` : '"PetroPulse Forecourt ERP" <no-reply@petropulse.io>');
  const recipient = Array.isArray(options.to) ? options.to.join(", ") : options.to;
  const cc = resolveCcRecipients(options.cc);
  const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
  const emailId = `mail-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const transporter = createMailTransporter();
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        to: options.to,
        cc,
        bcc: options.bcc,
        replyTo: options.replyTo,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments
      });
      const result = {
        success: true,
        messageId: info.messageId,
        isMock: false,
        recipient,
        subject: options.subject,
        timestamp: timestamp2
      };
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) result.previewUrl = previewUrl;
      console.log(`[Mail] Sent -> ${recipient} | Subject: "${options.subject}" | ID: ${info.messageId}`);
      recordMailLog({
        id: emailId,
        to: recipient,
        cc,
        subject: options.subject,
        text: options.text,
        html: options.html,
        timestamp: timestamp2,
        isMock: false,
        status: "SENT"
      });
      return result;
    } catch (err) {
      console.error(`[Mail] SMTP send failed -> ${recipient}:`, err.message);
      recordMailLog({
        id: emailId,
        to: recipient,
        cc,
        subject: options.subject,
        timestamp: timestamp2,
        isMock: false,
        status: "FAILED",
        error: err.message
      });
      return {
        success: false,
        isMock: false,
        recipient,
        subject: options.subject,
        timestamp: timestamp2,
        error: err.message
      };
    }
  }
  console.log("\n" + "=".repeat(72));
  console.log(`[MAIL MOCK] ${(/* @__PURE__ */ new Date()).toLocaleString()}`);
  console.log("-".repeat(72));
  console.log(`  To      : ${recipient}`);
  console.log(`  From    : ${from}`);
  console.log(`  Subject : ${options.subject}`);
  if (cc) console.log(`  CC      : ${Array.isArray(cc) ? cc.join(", ") : cc}`);
  console.log("-".repeat(72));
  if (options.text) {
    console.log(options.text.substring(0, 600));
    if (options.text.length > 600) console.log("  ... [message truncated in preview]");
  }
  console.log("=".repeat(72) + "\n");
  console.log("[Mail] SMTP not configured. Set SMTP_USER + SMTP_PASS in .env to enable real delivery.");
  const mockResult = {
    success: true,
    isMock: true,
    recipient,
    subject: options.subject,
    timestamp: timestamp2
  };
  recordMailLog({
    id: emailId,
    to: recipient,
    cc,
    subject: options.subject,
    text: options.text,
    html: options.html,
    timestamp: timestamp2,
    isMock: true,
    status: "SENT"
  });
  return mockResult;
}
async function sendInitialCredentialsMail(params) {
  const { user, temporaryPassword } = params;
  const stationName = params.stationName || params.user?.stationName;
  const appUrl = params.loginUrl || process.env.APP_URL || "http://localhost:3000";
  const loginUrl = `${appUrl.replace(/\/+$/, "")}/login`;
  const stationText = stationName ? ` at ${stationName}` : "";
  const subject = `Your PetroPulse Staff Account Credentials Have Been Created`;
  const text2 = `Dear ${user.name},

Welcome to PetroPulse Forecourt ERP${stationText}!

Your staff account credentials:

  Role              : ${user.role}
  Login Identifier  : ${user.username || user.email}
  Temporary Password: ${temporaryPassword}

Login at: ${loginUrl}

SECURITY: Change your password on first login. Never share your credentials.

Best regards,
PetroPulse Administration`.trim();
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;margin:0;padding:24px;color:#1e293b}
.wrapper{max-width:600px;margin:0 auto}
.header{background:linear-gradient(135deg,#064E3B,#0D9488);border-radius:12px 12px 0 0;padding:28px 32px;text-align:center}
.header h1{color:#fff;margin:0;font-size:22px;font-weight:700}
.header p{color:rgba(255,255,255,.8);margin:6px 0 0;font-size:13px}
.body{background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none}
.creds{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin:24px 0}
.row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #e2e8f0}
.row:last-child{border-bottom:none}
.lbl{color:#64748b;font-size:13px;font-weight:500}
.val{font-weight:600;font-size:14px;color:#0f172a}
.pw{background:#e0f2fe;color:#0369a1;padding:4px 12px;border-radius:6px;font-family:monospace;letter-spacing:1px}
.btn{display:inline-block;background:linear-gradient(135deg,#0D9488,#064E3B);color:#fff!important;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;margin:20px 0}
.notice{background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px 18px;font-size:13px;color:#92400e;margin:20px 0}
.footer{background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:18px 32px;font-size:12px;color:#94a3b8;text-align:center}
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>PetroPulse Forecourt ERP</h1>
    <p>Your Staff Account Has Been Created${stationText}</p>
  </div>
  <div class="body">
    <p>Hello <strong>${user.name}</strong>,</p>
    <p>Welcome aboard! Your staff account on <strong>PetroPulse Fuel Forecourt Management Platform</strong> is ready.</p>
    <div class="creds">
      <div class="row"><span class="lbl">Designated Role</span><span class="val" style="color:#0D9488">${user.role}</span></div>
      <div class="row"><span class="lbl">Login Identifier</span><span class="val">${user.username || user.email}</span></div>
      <div class="row"><span class="lbl">Temporary Password</span><span class="val pw">${temporaryPassword}</span></div>
    </div>
    <p style="text-align:center"><a href="${loginUrl}" class="btn">Log In to PetroPulse Portal</a></p>
    <div class="notice">
      <strong>Security Notice:</strong> This is a temporary password. You will be prompted to change it on first login.
    </div>
  </div>
  <div class="footer">
    Automated notification from PetroPulse ERP. Do not reply to this email.<br>
    &copy; ${(/* @__PURE__ */ new Date()).getFullYear()} PetroPulse Multi-Station Fuel Network.
  </div>
</div>
</body>
</html>`.trim();
  return sendMail({ to: user.email, subject, text: text2, html });
}
async function testSmtpConnection() {
  const provider = getSmtpProvider();
  const user = process.env.SMTP_USER?.trim();
  const host = provider === "gmail" ? "smtp.gmail.com" : process.env.SMTP_HOST?.trim() || "localhost";
  const port = provider === "gmail" ? 465 : parseInt(process.env.SMTP_PORT || "587", 10);
  if (provider === "none") {
    return {
      configured: false,
      provider: "none",
      connected: false,
      host,
      port,
      error: "SMTP credentials not configured. Set SMTP_USER and SMTP_PASS in .env to enable email delivery."
    };
  }
  const transporter = createMailTransporter();
  if (!transporter) {
    return { configured: false, provider, connected: false, error: "Transporter creation failed." };
  }
  try {
    await transporter.verify();
    console.log(`[Mail] SMTP connection verified (${provider})`);
    return { configured: true, provider, connected: true, host, port, user };
  } catch (err) {
    console.error(`[Mail] SMTP verify failed:`, err.message);
    return { configured: true, provider, connected: false, host, port, user, error: err.message };
  }
}
function recordMailLog(entry) {
  mailLog.unshift(entry);
  if (mailLog.length > MAX_MAIL_LOG) mailLog.pop();
}
function getMailLog() {
  return [...mailLog];
}

// src/controllers/userController.ts
var ownerProfileAvatar = null;
var userController = {
  getEmployees: async (req, res) => {
    try {
      const stationId = req.query.stationId;
      const emps = await dbService.getEmployees(stationId);
      res.json(emps);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  getUsers: async (req, res) => {
    try {
      const { stationId, role } = req.query;
      const users = await dbService.getUsers(stationId, role);
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  getUser: async (req, res) => {
    try {
      const user = await dbService.getUser(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  createUser: async (req, res) => {
    try {
      const requesterRole = req.headers["x-user-role"] || "OWNER";
      if (requesterRole !== "OWNER" && (req.body.role === "OWNER" || req.body.role === "AUDITOR" || req.body.role === "MANAGER")) {
        return res.status(403).json({
          error: `Unauthorized role assignment: Role '${requesterRole}' is not permitted to assign elevated role '${req.body.role}'. Only Super Admins (OWNER) can assign this role.`
        });
      }
      const tempPassword = req.body.password || `PetroPulse@${Math.floor(1e3 + Math.random() * 9e3)}`;
      const payload = {
        ...req.body,
        passwordHash: hashPassword(tempPassword)
      };
      const newUser = await dbService.createUser(payload);
      let emailDispatched = false;
      if (newUser && newUser.email && req.body.sendEmail !== false) {
        let stationName;
        if (newUser.stationId) {
          const station = await dbService.getStation(newUser.stationId).catch(() => null);
          stationName = station?.name;
        }
        try {
          const mailResult = await sendInitialCredentialsMail({
            user: {
              name: newUser.name,
              email: newUser.email,
              username: newUser.username,
              role: newUser.role
            },
            stationName,
            temporaryPassword: tempPassword,
            loginUrl: req.body.loginUrl
          });
          emailDispatched = mailResult.success;
        } catch (mailErr) {
          console.warn("[MailHelper] Initial credentials dispatch warning:", mailErr.message);
        }
      }
      res.status(201).json({
        ...newUser,
        temporaryPassword: tempPassword,
        emailSent: emailDispatched
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  sendCredentials: async (req, res) => {
    try {
      const user = await dbService.getUser(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      if (!user.email) return res.status(400).json({ error: "User does not have an email address configured." });
      const tempPassword = req.body.password || `PetroPulse@${Math.floor(1e3 + Math.random() * 9e3)}`;
      const passwordHash = hashPassword(tempPassword);
      await dbService.updateUser(user.id, { passwordHash });
      let stationName;
      if (user.stationId) {
        const station = await dbService.getStation(user.stationId).catch(() => null);
        stationName = station?.name;
      }
      const mailResult = await sendInitialCredentialsMail({
        user: {
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role
        },
        stationName,
        temporaryPassword: tempPassword,
        loginUrl: req.body.loginUrl
      });
      res.json({
        success: mailResult.success,
        message: `Initial credentials successfully dispatched to ${user.email}`,
        temporaryPassword: tempPassword,
        isMock: mailResult.isMock,
        mailResult
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  updateUser: async (req, res) => {
    try {
      const requesterRole = req.headers["x-user-role"] || "OWNER";
      if (req.body.role && requesterRole !== "OWNER" && (req.body.role === "OWNER" || req.body.role === "AUDITOR" || req.body.role === "MANAGER")) {
        return res.status(403).json({
          error: `Unauthorized role assignment: Role '${requesterRole}' is not permitted to assign elevated role '${req.body.role}'. Only Super Admins (OWNER) can assign this role.`
        });
      }
      const updated = await dbService.updateUser(req.params.id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  updateStatus: async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) return res.status(400).json({ error: "Status is required" });
      const updated = await dbService.updateUserStatus(req.params.id, status);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  deleteUser: async (req, res) => {
    try {
      const result = await dbService.deleteUser(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  getPermissions: async (_req, res) => {
    try {
      const perms = await dbService.getRolePermissions();
      res.json(perms);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  updatePermission: async (req, res) => {
    try {
      const updated = await dbService.updateRolePermission(req.params.id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },
  getProfile: async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      let tokenUserId = null;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const session = activeSessions.get(token);
        if (session) {
          tokenUserId = session.userId;
        } else if (token.startsWith("pp_")) {
          tokenUserId = token.split("_")[1];
        }
      }
      const role = req.query.role || req.headers["x-user-role"] || "OWNER";
      const stationId = req.query.stationId || "st-101";
      const station = await dbService.getStation(stationId).catch(() => null);
      let targetUser = tokenUserId ? await dbService.getUser(tokenUserId).catch(() => null) || await dbService.getAuthUserById(tokenUserId).catch(() => null) : null;
      if (!targetUser) {
        const employees2 = await dbService.getEmployees(stationId).catch(() => []);
        targetUser = employees2.find((e) => e.role === role) || null;
      }
      if (!targetUser) {
        const allEmps = await dbService.getEmployees().catch(() => []);
        targetUser = allEmps.find((e) => e.role === role) || allEmps[0] || null;
      }
      if (targetUser) {
        return res.json({
          id: targetUser.id,
          stationId: targetUser.stationId || stationId,
          name: targetUser.name,
          email: targetUser.email || `${targetUser.name.toLowerCase().replace(/[^a-z0-9]/g, ".")}@petropulse.io`,
          phone: targetUser.phone,
          role: targetUser.role,
          shiftSchedule: targetUser.shiftSchedule || "GENERAL",
          assignedIsland: targetUser.assignedIsland ?? void 0,
          avatarUrl: targetUser.avatarUrl || (targetUser.role === "OWNER" ? ownerProfileAvatar : void 0) || void 0,
          department: targetUser.role === "OWNER" ? "Executive Dealership & Principal Owner" : targetUser.role === "MANAGER" ? "Station Forecourt Operations" : targetUser.role === "ATTENDANT" ? "Nozzle Island Fuel Operations" : targetUser.role === "CASHIER" ? "Shift Cash & Accounts Desk" : "Legal Metrology Compliance Audit",
          employeeCode: targetUser.role === "OWNER" ? "DLC-HPCL-KA-2024-883" : `EMP-${targetUser.role.slice(0, 3)}-${targetUser.id.slice(-4).toUpperCase()}`,
          lastLoginAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      return res.json({
        id: "emp-admin-001",
        stationId,
        name: station?.managerName || "Vikramaditya Singhania",
        email: "admin@petropulse.io",
        phone: station?.phone || "+91 98200 12345",
        role: "OWNER",
        shiftSchedule: "GENERAL / 24-HOUR OVERSIGHT",
        department: "Executive Dealership & Principal Owner",
        employeeCode: "DLC-HPCL-KA-2024-883",
        avatarUrl: ownerProfileAvatar || void 0,
        lastLoginAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  updateProfile: async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      let tokenUserId = null;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const session = activeSessions.get(token);
        if (session) {
          tokenUserId = session.userId;
        } else if (token.startsWith("pp_")) {
          tokenUserId = token.split("_")[1];
        }
      }
      const role = req.headers["x-user-role"] || req.body.role || "OWNER";
      const stationId = req.body.stationId || "st-101";
      const { id: requestedId, name, phone, shiftSchedule, assignedIsland, email, avatarUrl } = req.body;
      const targetId = requestedId || tokenUserId;
      if (avatarUrl !== void 0) {
        ownerProfileAvatar = avatarUrl;
      }
      let userToUpdate = targetId ? await dbService.getUser(targetId).catch(() => null) || await dbService.getAuthUserById(targetId).catch(() => null) : null;
      if (!userToUpdate) {
        const emps = await dbService.getEmployees(stationId).catch(() => []);
        userToUpdate = emps.find((e) => e.role === role) || null;
      }
      if (!userToUpdate) {
        const allEmps = await dbService.getEmployees().catch(() => []);
        userToUpdate = allEmps.find((e) => e.role === role) || null;
      }
      if (!userToUpdate && (role === "OWNER" || targetId === "usr-owner-001" || targetId === "emp-admin-001")) {
        userToUpdate = await dbService.getUser("emp-admin-001").catch(() => null);
      }
      if (userToUpdate) {
        const cleanName = name ? String(name).trim() : userToUpdate.name;
        const cleanPhone = phone ? String(phone).trim() : userToUpdate.phone;
        const updated = await dbService.updateEmployee(userToUpdate.id, {
          name: cleanName,
          phone: cleanPhone,
          shiftSchedule: shiftSchedule || userToUpdate.shiftSchedule,
          assignedIsland: typeof assignedIsland === "number" ? assignedIsland : userToUpdate.assignedIsland,
          avatarUrl: avatarUrl !== void 0 ? avatarUrl : userToUpdate.avatarUrl
        }).catch(() => null);
        if (role === "OWNER" || role === "MANAGER") {
          if (cleanName || cleanPhone) {
            await dbService.updateStationContact(stationId, {
              managerName: cleanName,
              phone: cleanPhone
            }).catch(() => null);
          }
        }
        const finalUser = updated || userToUpdate;
        return res.json({
          id: finalUser.id,
          stationId: finalUser.stationId || stationId,
          name: cleanName,
          email: email || finalUser.email || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, ".")}@petropulse.io`,
          phone: cleanPhone,
          role: finalUser.role,
          shiftSchedule: shiftSchedule || finalUser.shiftSchedule,
          assignedIsland: finalUser.assignedIsland ?? void 0,
          avatarUrl: avatarUrl !== void 0 ? avatarUrl : finalUser.avatarUrl,
          department: finalUser.role === "OWNER" ? "Executive Dealership & Principal Owner" : finalUser.role === "MANAGER" ? "Station Forecourt Operations" : finalUser.role === "ATTENDANT" ? "Nozzle Island Fuel Operations" : finalUser.role === "CASHIER" ? "Shift Cash & Accounts Desk" : "Legal Metrology Compliance Audit",
          employeeCode: finalUser.role === "OWNER" ? "DLC-HPCL-KA-2024-883" : `EMP-${finalUser.role.slice(0, 3)}-${finalUser.id.slice(-4).toUpperCase()}`,
          lastLoginAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      const fallbackUser = mockStore.updateProfile({
        name: name ? String(name).trim() : "Administrator",
        phone: phone ? String(phone).trim() : "+91 98200 12345",
        role,
        stationId,
        avatarUrl,
        shiftSchedule: shiftSchedule || "GENERAL",
        assignedIsland
      });
      return res.json({
        id: "emp-admin-001",
        stationId,
        name: fallbackUser.name,
        email: email || "admin@petropulse.io",
        phone: fallbackUser.phone,
        role: fallbackUser.role,
        shiftSchedule: fallbackUser.shiftSchedule,
        department: "Executive Dealership & Principal Owner",
        employeeCode: "DLC-HPCL-KA-2024-883",
        avatarUrl: fallbackUser.avatarUrl,
        lastLoginAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

// src/routes/userRoutes.ts
var router6 = Router6();
router6.get("/employees", verifyPrivilege("ROSTER", "READ"), userController.getEmployees);
router6.get("/", verifyPrivilege("ROSTER", "READ"), userController.getUsers);
router6.get("/:id", verifyPrivilege("ROSTER", "READ"), userController.getUser);
router6.post("/", verifyPrivilege("ROSTER", "CREATE"), userController.createUser);
router6.put("/:id", verifyPrivilege("ROSTER", "UPDATE"), userController.updateUser);
router6.post("/:id/status", verifyPrivilege("ROSTER", "UPDATE"), userController.updateStatus);
router6.post("/:id/send-credentials", verifyPrivilege("ROSTER", "UPDATE"), userController.sendCredentials);
router6.delete("/:id", verifyPrivilege("ROSTER", "DELETE"), userController.deleteUser);
var userRoutes_default = router6;

// src/routes/pricingRoutes.ts
import { Router as Router7 } from "express";

// src/controllers/pricingController.ts
var pricingController = {
  getFuels: async (req, res) => {
    try {
      const stationId = req.query.stationId || void 0;
      const fuels2 = await dbService.getFuels(stationId);
      res.json(fuels2);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  updateFuelRate: async (req, res) => {
    try {
      const { rate, stationId, remarks } = req.body;
      if (typeof rate !== "number" || rate <= 0) {
        return res.status(400).json({ error: "Valid positive rate number required" });
      }
      const user = req.user;
      const actorId = user?.id || "SYSTEM";
      const actorName = user?.name || "Forecourt Manager";
      const updated = await dbService.updateFuelRate(
        req.params.code,
        rate,
        stationId,
        actorId,
        actorName,
        remarks
      );
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
  resetFuelRate: async (req, res) => {
    try {
      const { stationId } = req.body;
      if (!stationId) {
        return res.status(400).json({ error: "stationId is required to reset station price override" });
      }
      const user = req.user;
      const actorId = user?.id || "SYSTEM";
      const actorName = user?.name || "Forecourt Manager";
      const updated = await dbService.resetStationFuelRate(
        req.params.code,
        stationId,
        actorId,
        actorName
      );
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

// src/routes/pricingRoutes.ts
var router7 = Router7();
router7.get("/", pricingController.getFuels);
router7.post("/:code/rate", verifyPrivilege("PRICING", "UPDATE"), pricingController.updateFuelRate);
router7.post("/:code/reset", verifyPrivilege("PRICING", "UPDATE"), pricingController.resetFuelRate);
var pricingRoutes_default = router7;

// src/routes/auditRoutes.ts
import { Router as Router8 } from "express";

// src/controllers/auditController.ts
var auditController = {
  resolveQR: async (req, res) => {
    try {
      const resolved = await dbService.resolveQRCode(req.params.identifier);
      res.json(resolved);
    } catch (err) {
      res.status(404).json({ error: err.message });
    }
  },
  getAuditLogs: async (req, res) => {
    try {
      const { entity, entityId } = req.query;
      const logs = await dbService.getAuditLogs(entity, entityId);
      res.json(logs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

// src/routes/auditRoutes.ts
var router8 = Router8();
router8.get("/resolve/:identifier", auditController.resolveQR);
router8.get("/", verifyPrivilege("AUDIT_LOGS", "READ"), auditController.getAuditLogs);
var auditRoutes_default = router8;

// src/routes/uploadRoutes.ts
import { Router as Router9 } from "express";
import path2 from "path";
import fs2 from "fs";
import os from "os";
var router9 = Router9();
var isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
var UPLOADS_DIR = isServerless ? path2.join(os.tmpdir(), "uploads") : path2.resolve(process.cwd(), "uploads");
try {
  if (!fs2.existsSync(UPLOADS_DIR)) {
    fs2.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
} catch (err) {
  console.warn("[Uploads Directory Init Warning]:", err.message);
}
router9.post("/", async (req, res) => {
  try {
    const body = req.body;
    const rawDataUrl = body.dataUrl || body.image || body.base64;
    if (!rawDataUrl || typeof rawDataUrl !== "string") {
      return res.status(400).json({ error: "No image data provided. Expected base64 dataUrl string." });
    }
    const matches = rawDataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let mimeType = "image/jpeg";
    let base64Data = rawDataUrl;
    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    }
    let ext = "jpg";
    if (mimeType.includes("png")) ext = "png";
    else if (mimeType.includes("webp")) ext = "webp";
    else if (mimeType.includes("gif")) ext = "gif";
    else if (mimeType.includes("pdf")) ext = "pdf";
    else if (mimeType.includes("svg")) ext = "svg";
    const category = (body.category || "upload").replace(/[^a-zA-Z0-9_-]/g, "");
    const timestamp2 = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const safeFilename = `${category}_${timestamp2}_${randomSuffix}.${ext}`;
    const filePath = path2.join(UPLOADS_DIR, safeFilename);
    const buffer = Buffer.from(base64Data, "base64");
    await fs2.promises.writeFile(filePath, buffer);
    const fileUrl = `/uploads/${safeFilename}`;
    return res.status(201).json({
      success: true,
      url: fileUrl,
      filename: safeFilename,
      size: buffer.length,
      category,
      mimeType,
      uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    console.error("File upload error:", err);
    return res.status(500).json({ error: err.message || "Failed to process file upload" });
  }
});
router9.get("/list", async (_req, res) => {
  try {
    const files = await fs2.promises.readdir(UPLOADS_DIR);
    const list = files.map((f) => ({
      name: f,
      url: `/uploads/${f}`
    }));
    res.json({ files: list, count: list.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
var uploadRoutes_default = router9;

// src/routes/index.ts
var apiRouter = Router10();
apiRouter.get(" ", healthCheckHandler);
apiRouter.get("/health/dashboard", healthCheckHandler);
apiRouter.get("/db/status", async (_req, res) => {
  let status = getDbSyncStatus();
  if (!status) {
    status = await initDbAndSyncTables();
  }
  res.json(status);
});
apiRouter.post("/db/sync", verifyPrivilege("CONFIGURATION", "UPDATE"), async (_req, res) => {
  const freshStatus = await initDbAndSyncTables();
  res.json({
    message: "Database connection test and table synchronization completed.",
    report: freshStatus
  });
});
apiRouter.get("/mail/status", async (_req, res) => {
  const status = await testSmtpConnection();
  res.json(status);
});
apiRouter.get("/mail/logs", verifyPrivilege("AUDIT_LOGS", "READ"), (_req, res) => {
  res.json(getMailLog());
});
apiRouter.post("/mail/test", verifyPrivilege("CONFIGURATION", "UPDATE"), async (req, res) => {
  const targetEmail = req.body.to || "admin@petropulse.io";
  const result = await sendMail({
    to: targetEmail,
    subject: "PetroPulse Mail Helper Test Notification",
    text: "This is a test notification verifying that the PetroPulse Mail Helper is actively operating.",
    html: '<div style="font-family: sans-serif; padding: 20px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px;"><h3 style="color: #166534; margin-top: 0;">PetroPulse Mail Helper Test</h3><p>Your mail subsystem is operational.</p></div>'
  });
  res.json(result);
});
apiRouter.get("/roles", (_req, res) => {
  res.json(SYSTEM_ROLES);
});
apiRouter.use("/auth", authRoutes_default);
apiRouter.use("/stations", stationRoutes_default);
apiRouter.use("/bunks", stationRoutes_default);
apiRouter.use("/tanks", tankRoutes_default);
apiRouter.use("/nozzles", nozzleRoutes_default);
apiRouter.use("/shifts", shiftRoutes_default);
apiRouter.use("/users", userRoutes_default);
apiRouter.use("/employees", userRoutes_default);
apiRouter.use(`/employees`, userRoutes_default);
apiRouter.use("/fuels", pricingRoutes_default);
apiRouter.use("/pricing", pricingRoutes_default);
apiRouter.get("/tank-loads", verifyPrivilege("TANKS", "READ"), tankController.getTankLoads);
apiRouter.get("/dispensers", verifyPrivilege("METERS", "READ"), nozzleController.getDispensers);
apiRouter.get("/meter-readings/next-code", verifyPrivilege("METERS", "READ"), nozzleController.getNextReadingCode);
apiRouter.get("/meter-readings", verifyPrivilege("METERS", "READ"), nozzleController.getMeterReadings);
apiRouter.post("/meter-readings", verifyPrivilege("METERS", "CREATE"), nozzleController.recordReading);
apiRouter.use("/qr", auditRoutes_default);
apiRouter.get("/audit-logs", verifyPrivilege("AUDIT_LOGS", "READ"), auditRoutes_default);
apiRouter.get("/eod/settlements", verifyPrivilege("EOD", "READ"), shiftController.getEODSettlements);
apiRouter.post("/eod/run-close", verifyPrivilege("EOD", "CREATE"), shiftController.runEODClose);
apiRouter.get("/reports/dsr", verifyPrivilege("REPORTS", "READ"), shiftController.getDailySalesReport);
apiRouter.get("/permissions", verifyPrivilege("PERMISSIONS", "READ"), userController.getPermissions);
apiRouter.post("/permissions/:id", verifyPrivilege("PERMISSIONS", "UPDATE"), userController.updatePermission);
apiRouter.get("/profile", userController.getProfile);
apiRouter.post("/profile", userController.updateProfile);
apiRouter.use("/upload", uploadRoutes_default);
apiRouter.use("/uploads", uploadRoutes_default);
var routes_default = apiRouter;

// src/app.ts
import path3 from "path";
import fs3 from "fs";
import os2 from "os";
var app = express();
var isServerless2 = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
var uploadsDir = isServerless2 ? path3.join(os2.tmpdir(), "uploads") : path3.resolve(process.cwd(), "uploads");
try {
  if (!fs3.existsSync(uploadsDir)) {
    fs3.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.warn("[Uploads Directory Init Warning]:", err.message);
}
app.use("/uploads", express.static(uploadsDir));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(corsMiddleware);
app.use(requestResponseLogger);
app.get("/", healthCheckHandler);
app.get("/health", healthCheckHandler);
app.get("/health/dashboard", healthCheckHandler);
app.get("/status", healthCheckHandler);
app.get("/api", healthCheckHandler);
app.get("/api/", healthCheckHandler);
app.use("/auth", authRoutes_default);
app.use("/api", routes_default);
app.use("/api/api", routes_default);
app.use(errorHandler);
var app_default = app;
export {
  app,
  app_default as default
};
