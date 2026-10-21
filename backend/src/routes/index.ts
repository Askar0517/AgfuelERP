import { Router } from 'express';
import { SYSTEM_ROLES } from '../utils/rolesAndPermissions.ts';
import authRoutes from './authRoutes.ts';
import stationRoutes from './stationRoutes.ts';
import tankRoutes from './tankRoutes.ts';
import nozzleRoutes from './nozzleRoutes.ts';
import shiftRoutes from './shiftRoutes.ts';
import userRoutes from './userRoutes.ts';
import pricingRoutes from './pricingRoutes.ts';
import auditRoutes from './auditRoutes.ts';
import uploadRoutes from './uploadRoutes.ts';
import { tankController } from '../controllers/tankController.ts';
import { nozzleController } from '../controllers/nozzleController.ts';
import { shiftController } from '../controllers/shiftController.ts';
import { userController } from '../controllers/userController.ts';
import { verifyPrivilege } from '../middleware/auth.ts';
import { getDbSyncStatus, initDbAndSyncTables } from '../db/index.ts';
import { testSmtpConnection, getMailLog, sendMail } from '../utils/mailHelper.ts';

const apiRouter = Router();

// Health Check Endpoint (Live DB Connection and Table Sync Awareness)
apiRouter.get('/health', (_req, res) => {
  const dbStatus = getDbSyncStatus();
  res.json({
    status: 'ok',
    service: 'PetroPulse Fuel ERP Backend',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: {
      connected: dbStatus ? dbStatus.connection.connected : false,
      mode: dbStatus ? dbStatus.tableSync.mode : 'IN_MEMORY_FALLBACK',
      target: dbStatus ? dbStatus.connection.target : 'unknown',
      engine: dbStatus ? dbStatus.connection.engine : 'In-Memory MockStore',
      latencyMs: dbStatus?.connection.latencyMs,
      tablesSynced: dbStatus ? `${dbStatus.tableSync.syncedTablesCount}/${dbStatus.tableSync.totalExpectedTables}` : '15/15',
    },
    environment: process.env.NODE_ENV || 'development',
  });
});

// Database Diagnostics & Table Synchronization Endpoint
apiRouter.get('/db/status', async (_req, res) => {
  let status = getDbSyncStatus();
  if (!status) {
    status = await initDbAndSyncTables();
  }
  res.json(status);
});

// Manual Re-trigger Table Sync & Connection Diagnostic
apiRouter.post('/db/sync', async (_req, res) => {
  const freshStatus = await initDbAndSyncTables();
  res.json({
    message: 'Database connection test and table synchronization completed.',
    report: freshStatus,
  });
});

// Mail Helper & SMTP Diagnostics Endpoints
apiRouter.get('/mail/status', async (_req, res) => {
  const status = await testSmtpConnection();
  res.json(status);
});

apiRouter.get('/mail/logs', verifyPrivilege('AUDIT_LOGS', 'READ'), (_req, res) => {
  res.json(getMailLog());
});

apiRouter.post('/mail/test', verifyPrivilege('CONFIGURATION', 'UPDATE'), async (req, res) => {
  const targetEmail = req.body.to || 'admin@petropulse.io';
  const result = await sendMail({
    to: targetEmail,
    subject: 'PetroPulse Mail Helper Test Notification',
    text: 'This is a test notification verifying that the PetroPulse Mail Helper is actively operating.',
    html: '<div style="font-family: sans-serif; padding: 20px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px;"><h3 style="color: #166534; margin-top: 0;">PetroPulse Mail Helper Test</h3><p>Your mail subsystem is operational.</p></div>',
  });
  res.json(result);
});

// Authoritative Roles Catalog Endpoint
apiRouter.get('/roles', (_req, res) => {
  res.json(SYSTEM_ROLES);
});

// Primary Feature Routers
apiRouter.use('/auth', authRoutes);
apiRouter.use('/stations', stationRoutes);
apiRouter.use('/bunks', stationRoutes);
apiRouter.use('/tanks', tankRoutes);
apiRouter.use('/nozzles', nozzleRoutes);
apiRouter.use('/shifts', shiftRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/fuels', pricingRoutes);
apiRouter.use('/pricing', pricingRoutes);

// Ancillary & Legacy compatibility routes
apiRouter.get('/tank-loads', verifyPrivilege('TANKS', 'READ'), tankController.getTankLoads);
apiRouter.get('/dispensers', verifyPrivilege('METERS', 'READ'), nozzleController.getDispensers);

// Meter Readings
apiRouter.get('/meter-readings/next-code', verifyPrivilege('METERS', 'READ'), nozzleController.getNextReadingCode);
apiRouter.get('/meter-readings', verifyPrivilege('METERS', 'READ'), nozzleController.getMeterReadings);
apiRouter.post('/meter-readings', verifyPrivilege('METERS', 'CREATE'), nozzleController.recordReading);

// QR Codes & Audit
apiRouter.use('/qr', auditRoutes);
apiRouter.get('/audit-logs', verifyPrivilege('AUDIT_LOGS', 'READ'), auditRoutes);

// EOD Day Close & Reports
apiRouter.get('/eod/settlements', verifyPrivilege('EOD', 'READ'), shiftController.getEODSettlements);
apiRouter.post('/eod/run-close', verifyPrivilege('EOD', 'CREATE'), shiftController.runEODClose);
apiRouter.get('/reports/dsr', verifyPrivilege('REPORTS', 'READ'), shiftController.getDailySalesReport);

// Role Permissions Matrix
apiRouter.get('/permissions', verifyPrivilege('PERMISSIONS', 'READ'), userController.getPermissions);
apiRouter.post('/permissions/:id', verifyPrivilege('PERMISSIONS', 'UPDATE'), userController.updatePermission);

// User Profile
apiRouter.get('/profile', userController.getProfile);
apiRouter.post('/profile', userController.updateProfile);

// Local File Uploads Storage Endpoint
apiRouter.use('/upload', uploadRoutes);
apiRouter.use('/uploads', uploadRoutes);

export default apiRouter;
