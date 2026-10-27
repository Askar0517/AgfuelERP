# PetroPulse — Multi-Station Petrol Bunk ERP Architecture

Enterprise-grade Petrol Bunk & Forecourt ERP management system featuring independently deployable Frontend & Backend services, granular RBAC permissions, and automated forecourt operations.

---

## 1. Directory Structure

```text
petropulse-erp/
│
├── frontend/                   # Standalone React 19 + TypeScript + Vite SPA Application
│   ├── public/                 # Static public assets
│   ├── src/                    # Application source code
│   │   ├── api/                # API client and demo data
│   │   ├── components/         # Forecourt ERP UI components and modals
│   │   │   ├── bunks/          # Bunk form modals and pages
│   │   │   ├── common/         # Header, sidebar, modals, dropdowns
│   │   │   ├── meters/         # Manual meter reading entry forms
│   │   │   ├── privileges/     # Role permission matrix
│   │   │   ├── scheduler/      # EOD midnight automated close scheduler
│   │   │   ├── tanks/          # Tank configuration and details modals
│   │   │   └── users/          # User management modals
│   │   ├── context/            # Notification & Theme providers
│   │   ├── features/           # Modular domain feature re-exports
│   │   ├── types/              # Typed TypeScript interfaces
│   │   ├── utils/              # Fuel config, roles, and validation
│   │   ├── views/              # Main ERP views (Bunks, Tanks, Nozzles, Shifts, etc.)
│   │   ├── App.tsx             # Root layout and view coordinator
│   │   ├── index.css           # Global Tailwind and font styles
│   │   └── main.tsx            # React application entry point
│   ├── tests/                  # Client-side validation tests
│   ├── Dockerfile              # Multi-stage production NGINX container
│   ├── nginx.conf              # Production NGINX reverse proxy & SPA configuration
│   ├── package.json            # Frontend dependencies & scripts
│   ├── tsconfig.json           # Frontend TypeScript configuration
│   └── vite.config.ts          # Vite build configuration
│
├── backend/                    # Standalone Node.js + Express + Drizzle ORM REST API
│   ├── migrations/             # Drizzle SQL schema migrations
│   ├── src/                    # Controllers, routes, middleware, services, schema
│   │   ├── config/             # Environment, CORS, DB pool configuration
│   │   ├── controllers/        # Express route controllers
│   │   ├── db/                 # Drizzle schema, DB client, seed data, and service
│   │   ├── middleware/         # requestLogger (URL, response code, user name), auth, cors
│   │   ├── models/             # Schema re-exports and domain entities
│   │   ├── routes/             # Modular API routes
│   │   ├── services/           # Business logic & database service
│   │   ├── types/              # Backend TypeScript interfaces
│   │   ├── utils/              # Roles, permissions catalog, validation
│   │   ├── validators/         # Input validation schemas
│   │   ├── app.ts              # Express application configuration
│   │   └── server.ts           # Server bootstrap
│   ├── tests/                  # Backend unit and integration tests
│   ├── Dockerfile              # Production Node.js runtime container
│   ├── drizzle.config.ts       # Drizzle Kit configuration
│   ├── package.json            # Backend dependencies & scripts
│   └── tsconfig.json           # Backend TypeScript configuration
│
├── docs/                       # Architecture (architecture.md) & API docs (api-guide.md)
├── docker-compose.yml          # Multi-container orchestration (Postgres, Backend, Frontend)
├── .gitignore                  # Exclusions for node_modules, dist, logs, and secrets
└── README.md                   # Operations and execution guide
```

---

## 2. Running Frontend & Backend Independently

### Backend Service (Port 5000)
```bash
cd backend
npm install
npm run dev
```
- Health Check: `http://172.20.10.3:5000/api/health`
- Build / Typecheck: `npm run build`
- Run Tests: `npm test`

### Frontend Application (Port 3000)
```bash
cd frontend
npm install
npm run dev
```
- Access Application: `http://localhost:3000`
- Production Build: `npm run build`
- Run Tests: `npm test`

---

## 3. Docker Deployment
```bash
docker compose up -d --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://172.20.10.3:5000/api`
- PostgreSQL: `localhost:5432`

---

## 4. Testing & Verification

Run tests in each service independently:

```bash
# Frontend tests (validates isolation, no DB leaks, valid env templates)
cd frontend
npm test

# Backend tests (validates health, route stack, role matrix, request logger)
cd backend
npm test
```

---

## 5. Request Logging Middleware
All incoming HTTP requests to the backend are logged by `requestLogger` with:
- **Request URL**: e.g., `/api/stations`, `/api/tanks/dip`
- **Response Code**: e.g., `200`, `201`, `400`, `403`, `500`
- **User Name**: Resolved from authenticated session token, user headers, or `Anonymous`
- **Duration**: Execution time in milliseconds
