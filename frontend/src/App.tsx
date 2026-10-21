import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { api, setActiveRoleHeader, getAuthToken, setAuthToken } from './api/client';
import {
  Station,
  FuelProduct,
  Tank,
  Dispenser,
  ManualMeterReading,
  Employee,
  Shift,
  TankLoadDecanting,
  EODSettlement,
  RolePermission,
  UserRole,
  UserProfile,
  AuthUser,
  Nozzle,
} from './types';
import { ThemeProvider } from './context/ThemeContext';
import {
  FALLBACK_STATIONS,
  FALLBACK_FUELS,
  FALLBACK_TANKS,
  FALLBACK_DISPENSERS,
  FALLBACK_NOZZLES,
  FALLBACK_EMPLOYEES,
  FALLBACK_SHIFTS,
  FALLBACK_TANK_LOADS,
  FALLBACK_EOD_SETTLEMENTS,
  FALLBACK_PERMISSIONS,
} from './api/demoData';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { DashboardView } from './views/DashboardView';
import { BunksView } from './views/BunksView';
import { NozzlesView } from './views/NozzlesView';
import { UsersView } from './views/UsersView';
import { TanksView } from './views/TanksView';
import { ManualMeterForm } from './components/meters/ManualMeterForm';
import { ShiftsView } from './views/ShiftsView';
import { EODSchedulerPanel } from './components/scheduler/EODSchedulerPanel';
import { DSRView } from './views/DSRView';
import { SalesEfficiencyView } from './views/SalesEfficiencyView';
import { PrivilegeMatrixPanel } from './components/privileges/PrivilegeMatrixPanel';
import { AttendantMobileView } from './components/AttendantMobileView';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { DipLogModal } from './components/DipLogModal';
import { DecantingModal } from './components/DecantingModal';
import { PriceModal } from './components/PriceModal';
import { NewShiftModal } from './components/NewShiftModal';
import { LoginView } from './views/LoginView';
import { ProfileView } from './views/ProfileView';
import { NotificationsView } from './views/NotificationsView';
import { NotFoundView } from './views/NotFoundView';
import { QRScannerModal } from './components/common/QRScannerModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  // Authentication & Security State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Forecourt Database Records
  const [stations, setStations] = useState<Station[]>([]);
  const [currentStationId, setCurrentStationId] = useState<string>('st-101');
  const [fuels, setFuels] = useState<FuelProduct[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [dispensers, setDispensers] = useState<Dispenser[]>([]);
  const [nozzles, setNozzles] = useState<Nozzle[]>([]);
  const [readings, setReadings] = useState<ManualMeterReading[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [tankLoads, setTankLoads] = useState<TankLoadDecanting[]>([]);
  const [eodSettlements, setEodSettlements] = useState<EODSettlement[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Navigation & Active Route Synced to URL
  const [currentRole, setCurrentRole] = useState<UserRole>('OWNER');
  const currentPathSegment = location.pathname.replace(/^\//, '').split('/')[0] || 'dashboard';
  const activeTab = currentPathSegment === 'login' ? 'dashboard' : currentPathSegment;
  const handleSelectTab = (tab: string) => navigate(`/${tab}`);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const {
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
    notifyLive,
  } = useNotification();

  // Modals
  const [activeDipTank, setActiveDipTank] = useState<Tank | null>(null);
  const [activeDecantTank, setActiveDecantTank] = useState<Tank | null>(null);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState<boolean>(false);
  const [isNewShiftModalOpen, setIsNewShiftModalOpen] = useState<boolean>(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState<boolean>(false);

  const showToast = (msg: string) => {
    notifySuccess('System Notification', msg);
  };

  // Live telemetry notification
  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = setTimeout(() => {
      notifyLive('Forecourt Telemetry Live', 'IoT sensors, automated tank gauging, and dispensers connected.');
    }, 1500);
    return () => clearTimeout(timer);
  }, [isAuthenticated, notifyLive]);

  // Session verification on mount
  useEffect(() => {
    const verifyAuth = async () => {
      const token = getAuthToken();
      if (!token) {
        setAuthChecking(false);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      try {
        const me = await api.getMe();
        setCurrentUser(me.user);
        setIsAuthenticated(true);
        setCurrentRole(me.user.role);
        setActiveRoleHeader(me.user.role);
        if (me.user.stationId) {
          setCurrentStationId(me.user.stationId);
        }
      } catch (e) {
        console.warn('Auth token expired or invalid:', e);
        setAuthToken(null);
        setCurrentUser(null);
        setIsAuthenticated(false);
      } finally {
        setAuthChecking(false);
      }
    };
    verifyAuth();
  }, []);

  const handleLoginSuccess = (user: AuthUser, token: string) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setCurrentRole(user.role);
    setActiveRoleHeader(user.role);
    if (user.stationId) {
      setCurrentStationId(user.stationId);
    }
    const destination =
      location.pathname !== '/login' && location.pathname !== '/'
        ? location.pathname
        : user.role === 'ATTENDANT'
        ? '/mobile'
        : '/dashboard';
    navigate(destination);
    loadData();
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignored
    }
    setAuthToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
    notifyInfo('Logged Out', 'You have been signed out of AG Fuels ERP.');
    navigate('/login');
  };

  // Initial Load
  const loadData = useCallback(async () => {
    try {
      setErrorMsg(null);
      const [
        loadedStations,
        loadedFuels,
        loadedTanks,
        loadedDispensers,
        loadedNozzles,
        loadedReadings,
        loadedEmployees,
        loadedShifts,
        loadedLoads,
        loadedEOD,
        loadedPerms,
        loadedProfile,
      ] = await Promise.all([
        api.getStations().catch(() => FALLBACK_STATIONS),
        api.getFuels().catch(() => FALLBACK_FUELS),
        api.getTanks().catch(() => FALLBACK_TANKS),
        api.getDispensers().catch(() => FALLBACK_DISPENSERS),
        api.getNozzles().catch(() => FALLBACK_NOZZLES),
        api.getMeterReadings().catch(() => []),
        api.getEmployees().catch(() => FALLBACK_EMPLOYEES),
        api.getShifts().catch(() => FALLBACK_SHIFTS),
        api.getTankLoads().catch(() => FALLBACK_TANK_LOADS),
        api.getEODSettlements().catch(() => FALLBACK_EOD_SETTLEMENTS),
        api.getPermissions().catch(() => FALLBACK_PERMISSIONS),
        api.getProfile(currentRole, currentStationId).catch(() => null),
      ]);

      const finalStations = loadedStations && loadedStations.length > 0 ? loadedStations : FALLBACK_STATIONS;
      const finalFuels = loadedFuels && loadedFuels.length > 0 ? loadedFuels : FALLBACK_FUELS;
      const finalTanks = loadedTanks && loadedTanks.length > 0 ? loadedTanks : FALLBACK_TANKS;
      const finalDispensers = loadedDispensers && loadedDispensers.length > 0 ? loadedDispensers : FALLBACK_DISPENSERS;
      const finalNozzles = loadedNozzles && loadedNozzles.length > 0 ? loadedNozzles : FALLBACK_NOZZLES;
      const finalEmployees = loadedEmployees && loadedEmployees.length > 0 ? loadedEmployees : FALLBACK_EMPLOYEES;

      setStations(finalStations);
      setFuels(finalFuels);
      setTanks(finalTanks);
      setDispensers(finalDispensers);
      setNozzles(finalNozzles);
      setReadings(loadedReadings || []);
      setEmployees(finalEmployees);
      setShifts(loadedShifts && loadedShifts.length > 0 ? loadedShifts : FALLBACK_SHIFTS);
      setTankLoads(loadedLoads || []);
      setEodSettlements(loadedEOD || []);
      setPermissions(loadedPerms || []);
      if (loadedProfile) setUserProfile(loadedProfile);

      if (finalStations.length > 0 && (!currentStationId || !finalStations.some((s) => s.id === currentStationId))) {
        setCurrentStationId(finalStations[0].id);
      }
    } catch (err: any) {
      console.warn('Backend loadData fallback active:', err);
      setErrorMsg(err.message || 'Running in local fallback mode (PostgreSQL offline).');
      setStations(FALLBACK_STATIONS);
      setFuels(FALLBACK_FUELS);
      setTanks(FALLBACK_TANKS);
      setDispensers(FALLBACK_DISPENSERS);
      setNozzles(FALLBACK_NOZZLES);
      setEmployees(FALLBACK_EMPLOYEES);
      setShifts(FALLBACK_SHIFTS);
    } finally {
      setIsLoading(false);
    }
  }, [currentRole, currentStationId]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  // Handlers
  const handleRecordDip = async (tankId: string, dipCm: number, waterDipCm: number) => {
    const updatedTank = await api.recordDip(tankId, dipCm, waterDipCm);
    setTanks((prev) => prev.map((t) => (t.id === tankId ? updatedTank : t)));
    showToast(`Tank #${updatedTank.tankNumber} dip recorded: ${updatedTank.currentVolumeLiters.toLocaleString()} L`);
  };

  const handleDecantLoad = async (payload: any) => {
    if (!activeDecantTank) return;
    const { tank, loadRecord } = await api.decantLoad(activeDecantTank.id, payload);
    setTanks((prev) => prev.map((t) => (t.id === tank.id ? tank : t)));
    setTankLoads((prev) => [loadRecord, ...prev]);
    showToast(
      `Decanted ${loadRecord.receivedVolumeLiters.toLocaleString()}L from tanker ${loadRecord.tankerNumber} (${loadRecord.densityStatus})`
    );
  };

  const handleManualMeterReading = async (payload: any) => {
    const reading = await api.recordMeterReading(payload);
    setReadings((prev) => [reading, ...prev]);
    // Refresh tanks, dispensers, and nozzles to prevent concurrency and stale reading conflicts
    const [updatedTanks, updatedDisps, updatedNozzles] = await Promise.all([
      api.getTanks(currentStationId).catch(() => []),
      api.getDispensers(currentStationId).catch(() => []),
      api.getNozzles({ stationId: currentStationId }).catch(() => []),
    ]);
    if (updatedTanks.length > 0) setTanks(updatedTanks);
    if (updatedDisps.length > 0) setDispensers(updatedDisps);
    if (updatedNozzles.length > 0) {
      setNozzles(updatedNozzles);
    } else {
      setNozzles((prev) =>
        prev.map((n) =>
          n.id === payload.nozzleId
            ? { ...n, electronicTotalizer: payload.closingMeter, mechanicalTotalizer: payload.closingMeter }
            : n
        )
      );
    }
    showToast(
      `Meter reading logged! Sold: ${reading.netSoldLiters}L · Revenue: ₹${reading.netSalesAmount.toLocaleString()}`
    );
  };

  const handleSettleShift = async (shiftId: string, payload: any) => {
    const settled = await api.closeShift(shiftId, payload);
    setShifts((prev) => prev.map((s) => (s.id === shiftId ? settled : s)));
    // Also refresh nozzles, dispensers, and tanks when shift closes with final readings
    const [updatedDisps, updatedNozzles, updatedTanks] = await Promise.all([
      api.getDispensers(currentStationId).catch(() => []),
      api.getNozzles({ stationId: currentStationId }).catch(() => []),
      api.getTanks(currentStationId).catch(() => []),
    ]);
    if (updatedDisps.length > 0) setDispensers(updatedDisps);
    if (updatedNozzles.length > 0) setNozzles(updatedNozzles);
    if (updatedTanks.length > 0) setTanks(updatedTanks);
    showToast(
      `Shift settled! Cash: ₹${settled.cashSubmitted.toLocaleString()} (Variance: ₹${settled.shortageExcess})`
    );
  };

  const handleOpenShift = async (payload: any) => {
    const newShift = await api.createShift(payload);
    setShifts((prev) => [newShift, ...prev]);
    showToast(`Shift ${newShift.shiftCode} created for ${newShift.attendantName}`);
  };

  const handleUpdateFuelRates = async (rates: Record<string, number>) => {
    for (const [code, rate] of Object.entries(rates)) {
      if (typeof rate === 'number' && !isNaN(rate) && rate > 0) {
        await api.updateFuelRate(code, rate);
      }
    }
    const updatedFuels = await api.getFuels();
    setFuels(updatedFuels);
    showToast('Fuel rates successfully updated in PostgreSQL database.');
  };

  const handleRunEODClose = async (payload: any) => {
    const settlement = await api.runEODClose(payload);
    setEodSettlements((prev) => [settlement, ...prev.filter((s) => s.id !== settlement.id)]);
    showToast(`EOD Settlement for ${settlement.settlementDate} saved to PostgreSQL.`);
  };

  const handleUpdatePermission = async (id: string, perms: any) => {
    const updated = await api.updatePermission(id, perms);
    setPermissions(updated);
    showToast('Privilege updated successfully.');
  };

  const handleSaveProfile = async (updated: Partial<UserProfile>) => {
    const saved = await api.updateProfile({
      id: currentUser?.id,
      role: currentRole,
      ...updated,
      stationId: currentUser?.stationId || currentStationId,
    });
    setUserProfile(saved);
    if (currentUser) {
      const updatedUser: AuthUser = {
        ...currentUser,
        name: saved.name || currentUser.name,
        phone: saved.phone || currentUser.phone,
        avatarUrl: saved.avatarUrl !== undefined ? saved.avatarUrl : currentUser.avatarUrl,
        shiftSchedule: saved.shiftSchedule || currentUser.shiftSchedule,
        assignedIsland: saved.assignedIsland !== undefined ? saved.assignedIsland : currentUser.assignedIsland,
      };
      setCurrentUser(updatedUser);
    }
    // Refresh employees & stations in background
    try {
      const [updatedEmps, updatedStations] = await Promise.all([
        api.getEmployees(currentStationId).catch(() => []),
        api.getStations().catch(() => []),
      ]);
      if (updatedEmps && updatedEmps.length > 0) setEmployees(updatedEmps);
      if (updatedStations && updatedStations.length > 0) setStations(updatedStations);
    } catch {
      // Non-critical background refresh
    }
    showToast('Your profile information was updated successfully!');
  };

  // Bunk Handlers
  const handleCreateBunk = async (payload: any) => {
    const newBunk = await api.createStation(payload);
    setStations((prev) => [...prev, newBunk]);
    const updatedDisps = await api.getDispensers();
    setDispensers(updatedDisps);
    showToast(`Bunk "${newBunk.name}" (${newBunk.code}) created successfully!`);
  };

  const handleUpdateBunk = async (id: string, payload: any) => {
    const updated = await api.updateStation(id, payload);
    setStations((prev) => prev.map((s) => (s.id === id ? updated : s)));
    showToast(`Bunk "${updated.name}" updated successfully.`);
  };

  const handleDeactivateBunk = async (id: string) => {
    const updated = await api.deactivateStation(id);
    setStations((prev) => prev.map((s) => (s.id === id ? updated : s)));
    showToast(`Bunk "${updated.name}" is now ${updated.status}.`);
  };

  const handleDeleteBunk = async (id: string) => {
    await api.deleteStation(id);
    setStations((prev) => prev.filter((s) => s.id !== id));
    if (currentStationId === id) {
      const remaining = stations.filter((s) => s.id !== id);
      if (remaining.length > 0) setCurrentStationId(remaining[0].id);
    }
    showToast('Bunk permanently deleted.');
  };

  // Tank Handlers
  const handleCreateTank = async (payloadOrTank: any) => {
    let created = payloadOrTank;
    if (!payloadOrTank?.id) {
      created = await api.createTank(payloadOrTank);
    }
    setTanks((prev) => [...prev.filter((t) => t.id !== created.id), created]);
    showToast(`Tank "${created.name || created.id}" added successfully!`);
  };

  const handleUpdateTank = async (id: string, payload: any) => {
    const updated = await api.updateTank(id, payload);
    setTanks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    showToast(`Tank "${updated.name || updated.id}" configuration updated.`);
  };

  const handleDeactivateTank = async (id: string, status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE') => {
    const updated = await api.deactivateTank(id, status);
    setTanks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    showToast(`Tank status updated.`);
  };

  const handleDeleteTank = async (id: string) => {
    await api.deleteTank(id);
    setTanks((prev) => prev.filter((t) => t.id !== id));
    showToast('Tank permanently deleted.');
  };

  // Nozzle Handlers
  const handleCreateNozzle = async (payload: any) => {
    const created = await api.createNozzle(payload);
    setNozzles((prev) => [...prev.filter((n) => n.id !== created.id), created]);
    const [updatedDisps, updatedStations] = await Promise.all([
      api.getDispensers(),
      api.getStations(),
    ]);
    setDispensers(updatedDisps);
    setStations(updatedStations);
    showToast(`Nozzle #${created.nozzleNumber} (${created.fuelCode}) added!`);
  };

  const handleUpdateNozzle = async (id: string, payload: any) => {
    const updated = await api.updateNozzle(id, payload);
    setNozzles((prev) => prev.map((n) => (n.id === id ? updated : n)));
    showToast(`Nozzle #${updated.nozzleNumber} updated successfully.`);
  };

  const handleUpdateNozzleStatus = async (id: string, status: string) => {
    const updated = await api.updateNozzleStatus(id, status);
    setNozzles((prev) => prev.map((n) => (n.id === id ? updated : n)));
    showToast(`Nozzle #${updated.nozzleNumber} status changed to ${status}.`);
  };

  const handleDeleteNozzle = async (id: string) => {
    await api.deleteNozzle(id);
    setNozzles((prev) => prev.filter((n) => n.id !== id));
    const [updatedDisps, updatedStations] = await Promise.all([
      api.getDispensers(),
      api.getStations(),
    ]);
    setDispensers(updatedDisps);
    setStations(updatedStations);
    showToast('Nozzle permanently deleted.');
  };

  // User Handlers
  const handleCreateUser = async (payload: any) => {
    const newUser = await api.createUser(payload);
    setEmployees((prev) => [...prev, newUser]);
    showToast(`User "${newUser.name}" (${newUser.role}) created successfully!`);
  };

  const handleUpdateUser = async (id: string, payload: any) => {
    const updated = await api.updateUser(id, payload);
    setEmployees((prev) => prev.map((e) => (e.id === id ? updated : e)));
    showToast(`User "${updated.name}" updated successfully.`);
  };

  const handleUpdateUserStatus = async (id: string, status: string) => {
    const updated = await api.updateUserStatus(id, status);
    setEmployees((prev) => prev.map((e) => (e.id === id ? updated : e)));
    showToast(`User "${updated.name}" status updated to ${status}.`);
  };

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          <h2 className="text-xs font-semibold text-slate-400">Verifying session security...</h2>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-white transition-colors">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-xs font-semibold text-slate-500 dark:text-gray-400">
            Loading station telemetry and live records...
          </h2>
        </div>
      </div>
    );
  }

  const fallbackStation: Station = {
    id: currentStationId || 'st-101',
    name: 'Metro Central Forecourt',
    code: 'BUNK-000001',
    location: 'Connaught Place Outer Ring, New Delhi',
    operatingHours: '24_HOURS',
    status: 'ONLINE',
    timezone: 'Asia/Kolkata',
    eodCloseTime: '23:59',
  };

  const currentStation = stations.find((s) => s.id === currentStationId) || stations[0] || fallbackStation;

  const effectiveProfile: UserProfile | null = userProfile
    ? {
        ...userProfile,
        avatarUrl: userProfile.avatarUrl || currentUser?.avatarUrl,
      }
    : currentUser
    ? {
        id: currentUser.id,
        stationId: currentUser.stationId || currentStationId,
        name: currentUser.name,
        email: currentUser.email || 'admin@petropulse.io',
        phone: currentUser.phone || '',
        role: currentRole,
        shiftSchedule: currentUser.shiftSchedule || 'GENERAL',
        avatarUrl: currentUser.avatarUrl,
      }
    : null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100 dark:bg-gray-950 font-sans text-slate-900 dark:text-gray-100 antialiased selection:bg-emerald-500 selection:text-white transition-colors">
      {/* Global Error Banner */}
      {errorMsg && (
        <div className="flex items-center justify-center gap-2 bg-rose-500/10 border-b border-rose-500/20 px-4 py-2 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <Header
        fuels={fuels}
        currentRole={currentRole}
        activeStation={currentStation}
        onOpenPriceModal={() => setIsPriceModalOpen(true)}
        onOpenProfile={() => navigate('/profile')}
        onLogout={handleLogout}
        onOpenQRScanner={() => setIsQRScannerOpen(true)}
        profile={effectiveProfile}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        onToggleDesktopSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
        onNavigate={handleSelectTab}
      />

      {/* Body: Sidebar + Main Content Layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          currentRole={currentRole}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          profile={effectiveProfile}
          onOpenProfile={() => navigate('/profile')}
          onLogout={handleLogout}
        />

        <main className="flex-1 min-w-0 h-full overflow-y-auto p-3 sm:p-5 md:p-6 pb-28 lg:pb-8 max-w-full bg-slate-50 dark:bg-[#081D1B] transition-colors">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <DashboardView
                  station={currentStation}
                  stations={stations}
                  currentStationId={currentStationId}
                  onSelectStation={setCurrentStationId}
                  currentUser={currentUser}
                  fuels={fuels}
                  tanks={tanks}
                  dispensers={dispensers}
                  shifts={shifts}
                  tankLoads={tankLoads}
                  analytics={null}
                  onOpenDipModal={setActiveDipTank}
                  onOpenDecantModal={setActiveDecantTank}
                  onNavigate={handleSelectTab}
                />
              }
            />

            <Route
              path="/profile"
              element={
                currentUser ? (
                  <ProfileView
                    user={currentUser}
                    profile={effectiveProfile}
                    stations={stations}
                    onSaveProfile={handleSaveProfile}
                    onLogout={handleLogout}
                  />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />

            <Route
              path="/notifications"
              element={<NotificationsView onNavigate={handleSelectTab} />}
            />

            <Route
              path="/bunks"
              element={
                <BunksView
                  stations={stations}
                  nozzles={nozzles}
                  tanks={tanks}
                  dispensers={dispensers}
                  employees={employees}
                  fuels={fuels}
                  shifts={shifts}
                  currentRole={currentRole}
                  currentStationId={currentStationId}
                  onSelectStation={setCurrentStationId}
                  onCreateBunk={handleCreateBunk}
                  onUpdateBunk={handleUpdateBunk}
                  onDeactivateBunk={handleDeactivateBunk}
                  onDeleteBunk={handleDeleteBunk}
                  onCreateTank={handleCreateTank}
                  onUpdateTank={handleUpdateTank}
                  onDeactivateTank={handleDeactivateTank}
                  onDeleteTank={handleDeleteTank}
                  onRecordDip={setActiveDipTank}
                  onDecant={setActiveDecantTank}
                  onCreateNozzle={handleCreateNozzle}
                  onUpdateNozzle={handleUpdateNozzle}
                  onUpdateNozzleStatus={handleUpdateNozzleStatus}
                  onDeleteNozzle={handleDeleteNozzle}
                  onNavigateToNozzles={(stId) => {
                    if (stId) setCurrentStationId(stId);
                    navigate('/nozzles');
                  }}
                  onOpenAddNozzleModal={(stId) => {
                    if (stId) setCurrentStationId(stId);
                    navigate('/nozzles');
                  }}
                />
              }
            />

            <Route
              path="/nozzles"
              element={
                <NozzlesView
                  stations={stations}
                  tanks={tanks}
                  nozzles={nozzles}
                  dispensers={dispensers}
                  fuels={fuels}
                  readings={readings}
                  currentRole={currentRole}
                  currentStationId={currentStationId}
                  onCreateNozzle={handleCreateNozzle}
                  onUpdateNozzle={handleUpdateNozzle}
                  onUpdateNozzleStatus={handleUpdateNozzleStatus}
                  onDeleteNozzle={handleDeleteNozzle}
                  onSelectStation={setCurrentStationId}
                />
              }
            />

            <Route
              path="/users"
              element={
                <UsersView
                  stations={stations}
                  employees={employees}
                  currentRole={currentRole}
                  currentStationId={currentStationId}
                  onCreateUser={handleCreateUser}
                  onUpdateUser={handleUpdateUser}
                  onUpdateUserStatus={handleUpdateUserStatus}
                />
              }
            />

            <Route
              path="/tanks"
              element={
                <TanksView
                  station={currentStation}
                  stations={stations}
                  tanks={tanks}
                  nozzles={nozzles}
                  fuels={fuels}
                  tankLoads={tankLoads}
                  currentRole={currentRole}
                  onOpenDipModal={setActiveDipTank}
                  onOpenDecantModal={setActiveDecantTank}
                  onCreateTank={handleCreateTank}
                  onUpdateTank={handleUpdateTank}
                  onDeactivateTank={handleDeactivateTank}
                  onDeleteTank={handleDeleteTank}
                />
              }
            />

            <Route
              path="/meters"
              element={
                <ManualMeterForm
                  station={currentStation}
                  stations={stations}
                  dispensers={dispensers}
                  nozzles={nozzles}
                  tanks={tanks}
                  shifts={shifts}
                  currentUser={currentUser}
                  fuels={fuels}
                  readings={readings}
                  currentRole={currentRole}
                  onSelectStation={setCurrentStationId}
                  onSubmitReading={handleManualMeterReading}
                />
              }
            />

            <Route
              path="/shifts"
              element={
                <ShiftsView
                  station={currentStation}
                  shifts={shifts}
                  employees={employees}
                  fuels={fuels}
                  onSettleShift={handleSettleShift}
                  onOpenShiftModal={() => setIsNewShiftModalOpen(true)}
                />
              }
            />

            <Route
              path="/scheduler"
              element={
                <EODSchedulerPanel
                  station={currentStation}
                  settlements={eodSettlements}
                  onRunEODClose={handleRunEODClose}
                />
              }
            />

            <Route
              path="/dsr"
              element={
                <DSRView
                  station={currentStation}
                  dsr={null}
                  tanks={tanks}
                  fuels={fuels}
                  readings={readings}
                  onSelectDate={async () => {}}
                  onRefresh={() => loadData()}
                />
              }
            />

            <Route
              path="/efficiency"
              element={
                <SalesEfficiencyView
                  station={currentStation}
                  stations={stations}
                  shifts={shifts}
                  readings={readings}
                  nozzles={nozzles}
                  dispensers={dispensers}
                  fuels={fuels}
                  tanks={tanks}
                />
              }
            />

            <Route
              path="/permissions"
              element={
                <PrivilegeMatrixPanel
                  permissions={permissions}
                  currentRole={currentRole}
                  onUpdatePermission={handleUpdatePermission}
                />
              }
            />

            <Route
              path="/mobile"
              element={
                <AttendantMobileView
                  shifts={shifts.filter((s) => s.stationId === currentStationId)}
                  dispensers={dispensers.filter((d) => d.stationId === currentStationId)}
                  nozzles={nozzles.filter((n) => n.stationId === currentStationId)}
                  fuels={fuels}
                  onSettleShift={handleSettleShift}
                  onSubmitMeterReading={handleManualMeterReading}
                />
              }
            />

            {/* 404 Not Found Route */}
            <Route path="*" element={<NotFoundView />} />
          </Routes>
        </main>
      </div>

      {/* Permanent Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onToggleMenu={() => setIsMobileSidebarOpen(true)}
      />

      {/* Modals */}

      {activeDipTank && (
        <DipLogModal
          tank={activeDipTank}
          fuel={fuels.find((f) => f.code === activeDipTank.fuelCode)!}
          isOpen={!!activeDipTank}
          onClose={() => setActiveDipTank(null)}
          onSubmit={handleRecordDip}
        />
      )}

      {activeDecantTank && (
        <DecantingModal
          tank={activeDecantTank}
          fuel={fuels.find((f) => f.code === activeDecantTank.fuelCode)!}
          isOpen={!!activeDecantTank}
          onClose={() => setActiveDecantTank(null)}
          onSubmit={handleDecantLoad}
        />
      )}

      {isPriceModalOpen && (
        <PriceModal
          fuels={fuels}
          isOpen={isPriceModalOpen}
          onClose={() => setIsPriceModalOpen(false)}
          onSubmit={handleUpdateFuelRates}
        />
      )}

      {isNewShiftModalOpen && (
        <NewShiftModal
          station={currentStation}
          employees={employees}
          dispensers={dispensers}
          fuels={fuels}
          shifts={shifts}
          isOpen={isNewShiftModalOpen}
          onClose={() => setIsNewShiftModalOpen(false)}
          onSubmit={handleOpenShift}
        />
      )}

      {/* Forecourt QR Code Scanner & Entity Resolver */}
      {isQRScannerOpen && (
        <QRScannerModal
          isOpen={isQRScannerOpen}
          onClose={() => setIsQRScannerOpen(false)}
          onNavigateToEntity={(resolved) => {
            setIsQRScannerOpen(false);
            if (resolved.type === 'BUNK') {
              setCurrentStationId(resolved.entity.id);
              navigate('/bunks');
              showToast(`Forecourt "${resolved.entity.name}" selected from QR.`);
            } else if (resolved.type === 'TANK') {
              setCurrentStationId(resolved.entity.stationId);
              navigate('/bunks');
              showToast(`Tank "${resolved.entity.name || resolved.entity.id}" located.`);
            } else if (resolved.type === 'NOZZLE') {
              setCurrentStationId(resolved.entity.stationId);
              navigate('/meters');
              showToast(`Nozzle #${resolved.entity.nozzleNumber} loaded for reading update.`);
            }
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
