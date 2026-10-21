import { pgTable, text, integer, doublePrecision, boolean, timestamp } from 'drizzle-orm/pg-core';

// 0. Number Sequences (Concurrency-safe atomic sequence tracking for BUNK-, TANK-, NOZZ-, READ-)
export const numberSequences = pgTable('number_sequences', {
  prefix: text('prefix').primaryKey(), // 'BUNK', 'TANK', 'NOZZ', 'READ'
  currentValue: integer('current_value').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 1. Stations (Bunks)
export const stations = pgTable('stations', {
  id: text('id').primaryKey(), // e.g. 'BUNK-000001' or legacy 'st-101'
  name: text('name').notNull(),
  code: text('code').notNull().unique(), // e.g. 'BUNK-000001'
  location: text('location').notNull(),
  managerId: text('manager_id'),
  managerName: text('manager_name').notNull(),
  phone: text('phone').notNull(),
  address: text('address'),
  cityState: text('city_state'),
  postalCode: text('postal_code'),
  email: text('email'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  notes: text('notes'),
  timezone: text('timezone').default('Asia/Kolkata').notNull(),
  operatingHours: text('operating_hours').default('24_HOURS').notNull(),
  eodCloseTime: text('eod_close_time').default('23:59').notNull(),
  status: text('status').default('ONLINE').notNull(), // 'ONLINE' (ACTIVE), 'INACTIVE', 'OFFLINE'
  currency: text('currency').default('INR'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: text('created_by'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: text('updated_by'),
});

// 2. Fuel Products
export const fuels = pgTable('fuels', {
  code: text('code').primaryKey(), // 'OCTANE_98', 'OCTANE_95', 'DIESEL'
  name: text('name').notNull(),
  shortName: text('short_name').notNull(),
  ratePerLiter: doublePrecision('rate_per_liter').notNull(),
  densityStd15c: doublePrecision('density_std_15c').notNull(),
  densityTolerance: doublePrecision('density_tolerance').notNull(),
  color: text('color').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: text('updated_by'),
});

// 3. Underground Fuel Tanks (Tank Master)
export const tanks = pgTable('tanks', {
  id: text('id').primaryKey(), // Auto-generated with TANK- prefix e.g. 'TANK-000001'
  stationId: text('station_id').notNull(), // Parent bunk
  tankNumber: integer('tank_number').notNull(),
  name: text('name'), // Display name e.g. 'Main Diesel Tank 1'
  fuelCode: text('fuel_code').notNull(),
  capacityLiters: doublePrecision('capacity_liters').notNull(),
  safeCapacityLiters: doublePrecision('safe_capacity_liters').notNull(),
  currentDipCm: doublePrecision('current_dip_cm').default(0).notNull(),
  currentVolumeLiters: doublePrecision('current_volume_liters').default(0).notNull(),
  openingStockLiters: doublePrecision('opening_stock_liters').default(0).notNull(),
  waterDipCm: doublePrecision('water_dip_cm').default(0.2).notNull(),
  lowThresholdLiters: doublePrecision('low_threshold_liters').notNull(),
  maxDipCm: doublePrecision('max_dip_cm').default(250).notNull(),
  status: text('status').default('ACTIVE').notNull(), // 'ACTIVE', 'INACTIVE', 'MAINTENANCE'
  location: text('location'),
  description: text('description'),
  lastDipTimestamp: timestamp('last_dip_timestamp').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: text('created_by'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: text('updated_by'),
});

// 4. Tank Loads / Decanting Receipts
export const tankLoads = pgTable('tank_loads', {
  id: text('id').primaryKey(),
  stationId: text('station_id').notNull(),
  tankId: text('tank_id').notNull(),
  fuelCode: text('fuel_code').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  invoiceNo: text('invoice_no').notNull(),
  tankerNumber: text('tanker_number').notNull(),
  invoiceVolumeLiters: doublePrecision('invoice_volume_liters').notNull(),
  invoiceDensity: doublePrecision('invoice_density').notNull(),
  observedDensity: doublePrecision('observed_density').notNull(),
  observedTemp: doublePrecision('observed_temp').notNull(),
  correctedDensity15c: doublePrecision('corrected_density_15c').notNull(),
  densityStatus: text('density_status').notNull(),
  dipBeforeCm: doublePrecision('dip_before_cm').notNull(),
  volumeBeforeLiters: doublePrecision('volume_before_liters').notNull(),
  dipAfterCm: doublePrecision('dip_after_cm').notNull(),
  volumeAfterLiters: doublePrecision('volume_after_liters').notNull(),
  receivedVolumeLiters: doublePrecision('received_volume_liters').notNull(),
  varianceLiters: doublePrecision('variance_liters').notNull(),
  variancePct: doublePrecision('variance_pct').notNull(),
  operatorName: text('operator_name').notNull(),
  remarks: text('remarks'),
  invoiceImageUrl: text('invoice_image_url'),
});

// 5. Forecourt Dispensers (Pumps)
export const dispensers = pgTable('dispensers', {
  id: text('id').primaryKey(),
  stationId: text('station_id').notNull(),
  dispenserNumber: integer('dispenser_number').notNull(),
  islandNumber: integer('island_number').notNull(),
  brand: text('brand').notNull(),
  status: text('status').default('ACTIVE').notNull(),
});

// 6. Dispenser Nozzles (Nozzle Master)
export const nozzles = pgTable('nozzles', {
  id: text('id').primaryKey(), // Auto-generated with NOZZ- prefix e.g. 'NOZZ-000001'
  dispenserId: text('dispenser_id').notNull(),
  stationId: text('station_id').notNull(),
  tankId: text('tank_id'), // Associated Tank if linked
  fuelCode: text('fuel_code').notNull(),
  nozzleNumber: integer('nozzle_number').notNull(),
  name: text('name'),
  deviceIdentifier: text('device_identifier'),
  notes: text('notes'),
  mechanicalTotalizer: doublePrecision('mechanical_totalizer').default(0).notNull(),
  electronicTotalizer: doublePrecision('electronic_totalizer').default(0).notNull(),
  status: text('status').default('ACTIVE').notNull(), // 'ACTIVE', 'INACTIVE', 'MAINTENANCE'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: text('created_by'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: text('updated_by'),
});

// 7. Manual Meter Readings Log (Operations & Master Meter Readings)
export const manualMeterReadings = pgTable('manual_meter_readings', {
  id: text('id').primaryKey(), // Auto-generated with READ- prefix e.g. 'READ-000001'
  stationId: text('station_id').notNull(),
  nozzleId: text('nozzle_id').notNull(),
  fuelCode: text('fuel_code').notNull(),
  openingMeter: doublePrecision('opening_meter').notNull(),
  closingMeter: doublePrecision('closing_meter').notNull(),
  grossDispensedLiters: doublePrecision('gross_dispensed_liters').notNull(),
  testingLiters: doublePrecision('testing_liters').default(0).notNull(),
  netSoldLiters: doublePrecision('net_sold_liters').notNull(),
  fuelRate: doublePrecision('fuel_rate').notNull(),
  netSalesAmount: doublePrecision('net_sales_amount').notNull(),
  readingType: text('reading_type').default('REGULAR_SHIFT').notNull(), // 'REGULAR_SHIFT', 'PERIODIC_CHECK', 'CALIBRATION', 'RESET_CORRECTION'
  isCorrection: boolean('is_correction').default(false).notNull(),
  correctionReason: text('correction_reason'),
  remarks: text('remarks'),
  enteredBy: text('entered_by').notNull(),
  readingTimestamp: timestamp('reading_timestamp').defaultNow().notNull(),
  shiftCode: text('shift_code'),
  recordedBy: text('recorded_by'),
  recordedByName: text('recorded_by_name'),
  meterPhotoUrl: text('meter_photo_url'),
});

// 8. Employees / Users (User Master)
export const employees = pgTable('employees', {
  id: text('id').primaryKey(),
  stationId: text('station_id').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  username: text('username'),
  passwordHash: text('password_hash'),
  resetToken: text('reset_token'),
  resetTokenExpiry: timestamp('reset_token_expiry'),
  role: text('role').notNull(), // 'OWNER', 'MANAGER', 'ATTENDANT', 'CASHIER', 'AUDITOR'
  phone: text('phone').notNull(),
  shiftSchedule: text('shift_schedule').default('MORNING').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  status: text('status').default('ACTIVE').notNull(),
  assignedIsland: integer('assigned_island'),
  assignedBunks: text('assigned_bunks'), // JSON array of station IDs
  customPermissions: text('custom_permissions'), // JSON overrides for granular actions
  avatarUrl: text('avatar_url'),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: text('created_by'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: text('updated_by'),
});

// 9. Shifts
export const shifts = pgTable('shifts', {
  id: text('id').primaryKey(),
  stationId: text('station_id').notNull(),
  shiftCode: text('shift_code').notNull(),
  attendantId: text('attendant_id').notNull(),
  attendantName: text('attendant_name').notNull(),
  islandNumber: integer('island_number').notNull(),
  startTime: timestamp('start_time').defaultNow().notNull(),
  endTime: timestamp('end_time'),
  status: text('status').default('ACTIVE').notNull(),
  totalFuelSoldLiters: doublePrecision('total_fuel_sold_liters').default(0).notNull(),
  totalExpectedRevenue: doublePrecision('total_expected_revenue').default(0).notNull(),
  cashSubmitted: doublePrecision('cash_submitted').default(0).notNull(),
  digitalSubmitted: doublePrecision('digital_submitted').default(0).notNull(),
  creditSubmitted: doublePrecision('credit_submitted').default(0).notNull(),
  totalCollected: doublePrecision('total_collected').default(0).notNull(),
  shortageExcess: doublePrecision('shortage_excess').default(0).notNull(),
  denominationsJson: text('denominations_json'),
  notes: text('notes'),
  managerSignOff: text('manager_sign_off'),
  closingPhotoUrl: text('closing_photo_url'),
});

// 10. EOD Day Settlements (Scheduled / Timezone based)
export const eodSettlements = pgTable('eod_settlements', {
  id: text('id').primaryKey(),
  stationId: text('station_id').notNull(),
  settlementDate: text('settlement_date').notNull(), // YYYY-MM-DD
  timezone: text('timezone').notNull(),
  scheduledCloseTime: text('scheduled_close_time').notNull(),
  actualCloseTimestamp: timestamp('actual_close_timestamp').defaultNow().notNull(),
  status: text('status').default('SETTLED').notNull(),
  totalVolumeSold: doublePrecision('total_volume_sold').notNull(),
  totalGrossRevenue: doublePrecision('total_gross_revenue').notNull(),
  totalCash: doublePrecision('total_cash').notNull(),
  totalDigital: doublePrecision('total_digital').notNull(),
  totalCredit: doublePrecision('total_credit').notNull(),
  actualDeposits: doublePrecision('actual_deposits').notNull(),
  settlementDifference: doublePrecision('settlement_difference').notNull(),
  isAutoClosed: boolean('is_auto_closed').default(true).notNull(),
  closedBy: text('closed_by').notNull(),
  auditorNotes: text('auditor_notes'),
});

// 11. Role Privilege Matrix (Base CRUD permissions per role)
export const rolePermissions = pgTable('role_permissions', {
  id: text('id').primaryKey(),
  role: text('role').notNull(), // 'OWNER', 'MANAGER', 'ATTENDANT', 'CASHIER', 'AUDITOR'
  module: text('module').notNull(), // 'DASHBOARD', 'BUNKS', 'NOZZLES', 'USERS', 'PRICING', 'REPORTS', 'CONFIGURATION', 'AUDIT_LOGS', 'METERS', 'SHIFTS', 'TANKS'
  canCreate: boolean('can_create').default(false).notNull(),
  canRead: boolean('can_read').default(true).notNull(),
  canUpdate: boolean('can_update').default(false).notNull(),
  canDelete: boolean('can_delete').default(false).notNull(),
});

// 12. Fuel Price History (Audit & Time-based pricing)
export const fuelPriceHistory = pgTable('fuel_price_history', {
  id: text('id').primaryKey(),
  fuelCode: text('fuel_code').notNull(),
  stationId: text('station_id'), // null for global rate or specific station id
  ratePerLiter: doublePrecision('rate_per_liter').notNull(),
  effectiveFrom: timestamp('effective_from').defaultNow().notNull(),
  effectiveUntil: timestamp('effective_until'),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: text('created_by').notNull(),
  createdByName: text('created_by_name'),
});

// 13. Audit Logs (System & Sensitive Administrative Operations)
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  entity: text('entity').notNull(), // 'BUNK', 'TANK', 'NOZZLE', 'METER', 'USER', 'PRICING', 'PERMISSION', 'AUTH', 'CONFIG'
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(), // 'CREATE', 'UPDATE', 'DEACTIVATE', 'ACTIVATE', 'DELETE', 'PRICE_CHANGE', 'PERMISSION_UPDATE', 'METER_RECORD', 'METER_CORRECT', 'LOGIN', 'PASSWORD_RESET'
  actorId: text('actor_id').notNull(),
  actorName: text('actor_name').notNull(),
  detailsJson: text('details_json'),
  ipAddress: text('ip_address'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

// 14. User Auth Sessions
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});
