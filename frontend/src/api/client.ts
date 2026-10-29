import {
  Station,
  FuelProduct,
  Tank,
  TankLoadDecanting,
  Dispenser,
  ManualMeterReading,
  Employee,
  Shift,
  EODSettlement,
  RolePermission,
  UserRole,
  UserProfile,
  AuthUser,
  AuthResponse,
  RoleDefinition,
  DailySalesReport,
} from '../types';

const API_BASE_URL = (
  (import.meta as any).env?.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.protocol === 'https:'
    ? '' // Use Vite HTTPS reverse proxy to prevent browser Mixed Content errors
    : (typeof window !== 'undefined' && (window.location.port === '3000' || window.location.port === '5173')
      ? ''
      : ''))
).replace(/\/$/, '');

let currentActiveRole: UserRole = 'OWNER';
let authToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('petropulse_token') : null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('petropulse_token', token);
    } else {
      localStorage.removeItem('petropulse_token');
    }
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

export function setActiveRoleHeader(role: UserRole) {
  currentActiveRole = role;
}

export function getActiveRoleHeader(): UserRole {
  return currentActiveRole;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user-role': currentActiveRole,
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const targetUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  const res = await fetch(targetUrl, { ...options, headers });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorBody.error || `HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  // 0. Authentication & Security
  login: (usernameOrEmail: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usernameOrEmail, password }),
    }),
  logout: () =>
    request<{ success: boolean; message: string }>('/api/auth/logout', {
      method: 'POST',
    }),
  getMe: () => request<{ user: AuthUser }>('/api/auth/me'),
  forgotPassword: (email: string) =>
    request<{ success: boolean; message: string; resetToken?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
  resetPassword: (payload: { token: string; newPassword: string }) =>
    request<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  changePassword: (payload: { currentPassword: string; newPassword: string; userId?: string }) =>
    request<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // 1. Stations / Bunks
  getStations: () => request<Station[]>('/api/stations'),
  getNextBunkCode: () => request<{ nextCode: string }>('/api/stations/next-code'),
  getStation: (id: string) => request<Station>(`/api/stations/${id}`),
  createStation: (payload: any) =>
    request<Station>('/api/stations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateStation: (id: string, payload: any) =>
    request<Station>(`/api/stations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deactivateStation: (id: string) =>
    request<Station>(`/api/stations/${id}/deactivate`, {
      method: 'POST',
    }),
  deleteStation: (id: string) =>
    request<{ success: boolean; deletedStationId: string }>(`/api/stations/${id}`, {
      method: 'DELETE',
    }),

  // 2. Fuels
  getFuels: (stationId?: string) =>
    request<FuelProduct[]>(stationId && stationId !== 'ALL' ? `/api/fuels?stationId=${stationId}` : '/api/fuels'),
  updateFuelRate: (code: string, rate: number, stationId?: string | null, remarks?: string) =>
    request<FuelProduct[]>(`/api/fuels/${code}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rate, stationId, remarks }),
    }),
  resetFuelRate: (code: string, stationId: string) =>
    request<FuelProduct[]>(`/api/fuels/${code}/reset`, {
      method: 'POST',
      body: JSON.stringify({ stationId }),
    }),

  // 3. Tanks
  // 3. Tanks (Tank Master & Underground Storage)
  getTanks: (stationId?: string) =>
    request<Tank[]>(stationId ? `/api/tanks?stationId=${stationId}` : '/api/tanks'),
  getNextTankCode: () => request<{ nextCode: string }>('/api/tanks/next-code'),
  getTank: (id: string) => request<any>(`/api/tanks/${id}`),
  createTank: (payload: any) =>
    request<Tank>('/api/tanks', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateTank: (id: string, payload: any) =>
    request<Tank>(`/api/tanks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deactivateTank: (id: string, status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE') =>
    request<Tank>(`/api/tanks/${id}/deactivate`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
  deleteTank: (id: string) =>
    request<{ success: boolean; deletedTankId: string }>(`/api/tanks/${id}`, {
      method: 'DELETE',
    }),
  recordDip: (tankId: string, dipCm: number, waterDipCm: number) =>
    request<Tank>(`/api/tanks/${tankId}/dip`, {
      method: 'POST',
      body: JSON.stringify({ dipCm, waterDipCm }),
    }),
  decantLoad: (tankId: string, payload: any) =>
    request<{ tank: Tank; loadRecord: TankLoadDecanting }>(`/api/tanks/${tankId}/decant`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getTankLoads: (stationId?: string) =>
    request<TankLoadDecanting[]>(stationId ? `/api/tank-loads?stationId=${stationId}` : '/api/tank-loads'),

  // 4. Dispensers & Nozzles
  getDispensers: (stationId?: string) =>
    request<Dispenser[]>(stationId ? `/api/dispensers?stationId=${stationId}` : '/api/dispensers'),
  getNextNozzleCode: () => request<{ nextCode: string }>('/api/nozzles/next-code'),
  getNozzles: (filters?: { stationId?: string; fuelCode?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.stationId) params.append('stationId', filters.stationId);
    if (filters?.fuelCode) params.append('fuelCode', filters.fuelCode);
    if (filters?.status) params.append('status', filters.status);
    const qs = params.toString();
    return request<any[]>(qs ? `/api/nozzles?${qs}` : '/api/nozzles');
  },
  getNozzle: (id: string) => request<any>(`/api/nozzles/${id}`),
  createNozzle: (payload: any) =>
    request<any>('/api/nozzles', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateNozzle: (id: string, payload: any) =>
    request<any>(`/api/nozzles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  updateNozzleStatus: (id: string, status: string) =>
    request<any>(`/api/nozzles/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
  deleteNozzle: (id: string) =>
    request<{ success: boolean; deletedNozzleId: string }>(`/api/nozzles/${id}`, {
      method: 'DELETE',
    }),

  // 5. Operations & Manual Meter Readings
  getNextReadingCode: () => request<{ nextCode: string }>('/api/meter-readings/next-code'),
  getMeterReadings: (filters?: { stationId?: string; nozzleId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.stationId) params.append('stationId', filters.stationId);
    if (filters?.nozzleId) params.append('nozzleId', filters.nozzleId);
    const qs = params.toString();
    return request<ManualMeterReading[]>(qs ? `/api/meter-readings?${qs}` : '/api/meter-readings');
  },
  recordMeterReading: (payload: {
    stationId: string;
    nozzleId: string;
    openingMeter: number;
    closingMeter: number;
    testingLiters?: number;
    readingType?: string;
    isCorrection?: boolean;
    correctionReason?: string;
    remarks?: string;
    enteredBy?: string;
    shiftCode?: string;
    recordedBy?: string;
    recordedByName?: string;
    meterPhotoUrl?: string;
  }) =>
    request<ManualMeterReading>('/api/meter-readings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // 5B. QR Code Resolution & Audit Logs
  resolveQRCode: (identifier: string) =>
    request<{
      type: 'BUNK' | 'TANK' | 'NOZZLE';
      entity: any;
      parentStation?: Station;
      identifier: string;
      name: string;
      stationId?: string;
      isActive: boolean;
    }>(`/api/qr/resolve/${encodeURIComponent(identifier)}`),
  getAuditLogs: (filters?: { entity?: string; entityId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.entity) params.append('entity', filters.entity);
    if (filters?.entityId) params.append('entityId', filters.entityId);
    const qs = params.toString();
    return request<any[]>(qs ? `/api/audit-logs?${qs}` : '/api/audit-logs');
  },

  // 6. Employees & Users Management
  getEmployees: (stationId?: string) =>
    request<Employee[]>(stationId ? `/api/employees?stationId=${stationId}` : '/api/employees'),
  getUsers: (filters?: { stationId?: string; role?: string }) => {
    const params = new URLSearchParams();
    if (filters?.stationId) params.append('stationId', filters.stationId);
    if (filters?.role) params.append('role', filters.role);
    const qs = params.toString();
    return request<Employee[]>(qs ? `/api/users?${qs}` : '/api/users');
  },
  getUser: (id: string) => request<Employee>(`/api/users/${id}`),
  createUser: (payload: any) =>
    request<Employee>('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateUser: (id: string, payload: any) =>
    request<Employee>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  updateUserStatus: (id: string, status: string) =>
    request<Employee>(`/api/users/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
  deleteUser: (id: string) =>
    request<{ success: boolean; deletedUserId: string }>(`/api/users/${id}`, {
      method: 'DELETE',
    }),
  getShifts: (stationId?: string) =>
    request<Shift[]>(stationId ? `/api/shifts?stationId=${stationId}` : '/api/shifts'),
  createShift: (payload: any) =>
    request<Shift>('/api/shifts/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  closeShift: (shiftId: string, payload: any) =>
    request<Shift>(`/api/shifts/${shiftId}/close`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // 7. EOD Timezone Scheduler
  getEODSettlements: (stationId?: string) =>
    request<EODSettlement[]>(
      stationId ? `/api/eod/settlements?stationId=${stationId}` : '/api/eod/settlements'
    ),
  runEODClose: (payload: {
    stationId: string;
    settlementDate: string;
    timezone: string;
    closedBy: string;
    auditorNotes?: string;
  }) =>
    request<EODSettlement>('/api/eod/run-close', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // 7B. Daily Sales Report (DSR) from Authoritative Database
  getDailySalesReport: (stationId: string, date: string) =>
    request<DailySalesReport>(
      `/api/reports/dsr?stationId=${encodeURIComponent(stationId)}&date=${encodeURIComponent(date)}`
    ),

  // 8. Customizable Role Permissions
  getPermissions: () => request<RolePermission[]>('/api/permissions'),
  updatePermission: (
    id: string,
    perms: { canCreate: boolean; canRead: boolean; canUpdate: boolean; canDelete: boolean }
  ) =>
    request<RolePermission[]>(`/api/permissions/${id}`, {
      method: 'POST',
      body: JSON.stringify(perms),
    }),

  // 9. User Profile
  getProfile: (role?: UserRole, stationId?: string) => {
    const qRole = role || currentActiveRole;
    return request<UserProfile>(
      `/api/profile?role=${encodeURIComponent(qRole)}${stationId ? `&stationId=${encodeURIComponent(stationId)}` : ''
      }`
    );
  },
  updateProfile: (payload: Partial<UserProfile>) =>
    request<UserProfile>('/api/profile', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // 10. Authoritative Roles & Health Checks
  getRoles: () => request<RoleDefinition[]>('/api/roles'),
  getHealth: () => request<any>('/api/health'),
  getDbStatus: () => request<any>('/api/db/status'),
  triggerDbSync: () => request<any>('/api/db/sync', { method: 'POST' }),

  // 11. Local Disk File Uploads
  uploadImage: (payload: { dataUrl: string; category?: string; filename?: string }) =>
    request<{ success: boolean; url: string; filename: string; size: number }>('/api/upload', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
