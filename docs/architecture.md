# PetroPulse Architecture & Technical Overview

## 1. System Overview
PetroPulse is an enterprise multi-station petrol bunk management system (Fuel Forecourt ERP). It supports:
- Multi-station monitoring and operational telemetry
- Underground fuel tank volume, dip logs, and tanker load decanting
- Dispenser nozzle meter tracking and shift reconciliations
- Role-Based Access Control (Super Admin OWNER, MANAGER, ATTENDANT, CASHIER, AUDITOR)
- Daily Sales Reconciliation (DSR) and forecourt efficiency forecasting

## 2. Directory Structure

```text
petropulse-erp/
│
├── frontend/                   # Client-Side Application (React 19 + TypeScript + Vite + Tailwind CSS)
│   ├── public/                 # Static public assets
│   ├── src/
│   │   ├── api/                # Authoritative typed API client & offline fallbacks
│   │   ├── components/         # Reusable forecourt UI components & modals
│   │   │   ├── bunks/          # Bunk form components
│   │   │   ├── common/         # Header, sidebar, modals, dropdowns, navigation
│   │   │   ├── meters/         # Meter reading entry forms
│   │   │   ├── privileges/     # Role privilege matrix panels
│   │   │   ├── scheduler/      # EOD midnight automated scheduler
│   │   │   ├── tanks/          # Tank configuration and details modals
│   │   │   └── users/          # User forms and permissions modals
│   │   ├── context/            # Global UI contexts (Theme, Notifications)
│   │   ├── features/           # Domain feature slices and exports
│   │   ├── types/              # Typed TypeScript domain models
│   │   ├── utils/              # Fuel configuration, validation, roles
│   │   ├── views/              # Core ERP page views (Bunks, Tanks, Nozzles, Shifts, etc.)
│   │   ├── App.tsx             # Main application layout and state container
│   │   ├── index.css           # Global stylesheet and Tailwind directives
│   │   └── main.tsx            # Application entry point
│   ├── tests/                  # Client-side validation test suite
│   ├── Dockerfile              # Multi-stage production NGINX container
│   ├── nginx.conf              # Production NGINX routing & reverse proxy config
│   ├── package.json            # Frontend dependencies & scripts
│   ├── tsconfig.json           # Frontend TypeScript compiler options
│   └── vite.config.ts          # Vite build & proxy configuration
│
├── backend/                    # Server-Side Application (Node.js + Express + Drizzle ORM + PostgreSQL)
│   ├── migrations/             # Drizzle SQL schema migrations
│   ├── src/
│   │   ├── config/             # Environment, CORS, DB pool configuration
│   │   ├── controllers/        # Express route controllers
│   │   ├── db/                 # Drizzle schema, DB client, seed data, and service
│   │   ├── middleware/         # requestLogger, auth, CORS, error handler
│   │   ├── models/             # Schema re-exports and domain entities
│   │   ├── routes/             # Modular API routes
│   │   ├── services/           # Business logic & database service
│   │   ├── types/              # Backend TypeScript interfaces
│   │   ├── utils/              # Roles, permissions catalog, validation
│   │   ├── validators/         # Input validation schemas
│   │   ├── app.ts              # Modular Express app configuration
│   │   └── server.ts           # Server bootstrap and port listening
│   ├── tests/                  # Backend unit and integration tests
│   ├── Dockerfile              # Production Node.js runtime container
│   ├── drizzle.config.ts       # Drizzle Kit configuration
│   ├── package.json            # Backend dependencies & scripts
│   └── tsconfig.json           # Backend TypeScript configuration
│
├── docs/                       # Architecture (architecture.md) & API docs (api-guide.md)
├── docker-compose.yml          # Multi-container orchestration (Postgres, Backend, Frontend)
├── .gitignore                  # Git exclusions for dependencies, builds, and secrets
└── README.md                   # Getting started and operations guide
```

## 3. Database Layer & Schema
The backend uses **Drizzle ORM** with **PostgreSQL** (`node-postgres` pool):
- `stations`: Physical bunks/dealerships with unique sequential code (`BUNK-000001`).
- `tanks`: Underground cylindrical fuel tanks (`TANK-000001`), capacity, calibration height, current stock, status (`ACTIVE`, `INACTIVE`, `MAINTENANCE`).
- `nozzles`: Fuel dispensing nozzles (`NOZZ-000001`), totalizers, linked to parent tank and bunk.
- `meter_readings`: Shift meter readings with opening/closing values and gross/net dispensed liters.
- `shifts`: Cashier/attendant shifts with cash handovers and variance calculations.
- `eod_settlements`: End-of-Day forecourt settlements.
- `users`: Staff members with role-based access.
- `fuel_prices`: Fuel product rates and history.
- `audit_logs`: Immutable audit trails.

## 4. Security & Role Privilege Matrix
Every endpoint is guarded by `verifyPrivilege(module, action)` middleware:
- **OWNER**: Super Administrator with full CRUD across all modules.
- **MANAGER**: Full operational management with restricted user creation.
- **CASHIER**: Shift settlements and sales accounting.
- **ATTENDANT**: Meter entries and dip recordings.
- **AUDITOR**: Read-only compliance audit access.
