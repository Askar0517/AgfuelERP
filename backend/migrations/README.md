# PetroPulse Database Migrations & Schema Management

This directory contains database schema migrations managed with Drizzle ORM and PostgreSQL.

## Running Migrations in Development & Production

To synchronize the PostgreSQL database schema with `src/db/schema.ts`:

```bash
# Push schema directly to connected database
npm run migrate

# Or with custom DATABASE_URL
DATABASE_URL="postgresql://user:password@localhost:5432/petropulse" npm run migrate
```

## Schema Entity Mapping
- `stations`: Bunk Master stations (code, address, contact, operating hours, geolocation)
- `fuel_products`: Fuel types (Petrol, Diesel, Premium) and real-time per-liter unit prices
- `tanks`: Underground storage tanks, physical capacity, safe limit, dip calibration charts
- `dispensers`: Forecourt islands and dispensing units
- `nozzles`: Dispensing nozzles, associated tanks, totalizer readings (mechanical/electronic)
- `manual_meter_readings`: Forecourt totalizer shift records, testing allowances, net sales calculations
- `employees`: User master directory, assigned stations, role authority, and `custom_permissions` JSON overrides
- `shifts`: Handheld terminal attendant shifts, cash denominations, and handover settlements
- `eod_settlements`: Midnight end-of-day closure ledger
- `audit_logs`: Immutable audit trails for all critical actions
