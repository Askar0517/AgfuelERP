# PetroPulse REST API Guide

All API endpoints are prefixed with `/api`.

## 1. System & Authentication
- `GET /api/health` — Returns system uptime, database status, and API health.
- `GET /api/roles` — Authoritative list of system roles and default capabilities.
- `POST /api/auth/login` — Authenticates user credentials and returns session token.
- `POST /api/auth/logout` — Revokes current user session token.
- `GET /api/auth/me` — Fetches authenticated profile from active bearer token.
- `POST /api/auth/forgot-password` — Dispatches password recovery link.
- `POST /api/auth/reset-password` — Sets new password using reset token.
- `POST /api/auth/change-password` — Updates password for authenticated user.

## 2. Stations & Bunks
- `GET /api/stations` — List all fuel stations.
- `GET /api/stations/next-code` — Previews authoritative backend-generated bunk code.
- `GET /api/stations/:id` — Details of a specific station.
- `POST /api/stations` — Creates a new station (backend generates unique code).
- `PUT /api/stations/:id` — Updates station details.
- `POST /api/stations/:id/deactivate` — Soft-deactivates station.
- `DELETE /api/stations/:id` — Removes station if no active dependencies exist.

## 3. Underground Tanks
- `GET /api/tanks` — List tanks (optionally filtered by `?stationId=...`).
- `GET /api/tanks/next-code` — Previews authoritative backend-generated tank code.
- `GET /api/tanks/:id` — Details of a specific tank.
- `POST /api/tanks` — Creates a tank.
- `PUT /api/tanks/:id` — Updates tank parameters.
- `POST /api/tanks/:id/deactivate` — Sets tank status to `INACTIVE` or `MAINTENANCE`.
- `DELETE /api/tanks/:id` — Deletes tank (blocked if nozzles are linked).
- `POST /api/tanks/:id/dip` — Records physical dip stick measurement.
- `POST /api/tanks/:id/decant` — Records bulk tanker load decanting.
- `GET /api/tank-loads` — History of tanker decanting deliveries.

## 4. Dispensers & Nozzles
- `GET /api/dispensers` — List fuel dispensers by station.
- `GET /api/nozzles` — List nozzles (supports filters: `stationId`, `fuelCode`, `status`).
- `GET /api/nozzles/next-code` — Previews backend-generated nozzle code.
- `GET /api/nozzles/:id` — Details of a specific nozzle.
- `POST /api/nozzles` — Creates a nozzle (validates tank association).
- `PUT /api/nozzles/:id` — Updates nozzle metadata.
- `POST /api/nozzles/:id/status` — Toggles operational status (`ACTIVE`, `INACTIVE`, `MAINTENANCE`).
- `DELETE /api/nozzles/:id` — Removes nozzle if no transactions exist.

## 5. Meter Readings & Operations
- `GET /api/meter-readings/next-code` — Previews next meter reading transaction code.
- `GET /api/meter-readings` — List meter readings.
- `POST /api/meter-readings` — Records opening/closing shift meter reading.

## 6. Shifts & Day Close
- `GET /api/shifts` — List shifts by station.
- `POST /api/shifts/create` — Initiates an attendant shift.
- `POST /api/shifts/:id/close` — Settles and closes an active shift with cash breakdown.
- `GET /api/eod/settlements` — List End-of-Day forecourt settlements.
- `POST /api/eod/run-close` — Executes daily close.

## 7. Pricing & Fuels
- `GET /api/fuels?stationId=...` — Returns fuel products and rates (effective rate for specific station if provided, or global base rates).
- `POST /api/fuels/:code/rate` — Updates retail selling price for a fuel grade globally or for a specific bunk (`{ rate, stationId, remarks }`).
- `POST /api/fuels/:code/reset` — Reverts a bunk's custom rate override back to the global base rate (`{ stationId }`).

## 8. User Management & Roster
- `GET /api/users` — List staff members.
- `GET /api/users/:id` — Single user details.
- `POST /api/users` — Creates user account (guarded by role escalation checks).
- `PUT /api/users/:id` — Updates user profile.
- `POST /api/users/:id/status` — Toggles user active state.
- `DELETE /api/users/:id` — Removes user.
- `GET /api/permissions` — Role permissions configuration matrix.
- `POST /api/permissions/:id` — Updates granular permissions for a role.
- `GET /api/profile` — Current user's forecourt operational profile.
- `POST /api/profile` — Updates current user profile.

## 9. QR Resolution & Audit Logs
- `GET /api/qr/resolve/:identifier` — Resolves scanned physical forecourt QR token.
- `GET /api/audit-logs` — Immutable audit log trail.
