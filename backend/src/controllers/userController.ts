import { Request, Response } from 'express';
import { dbService } from '../db/service.ts';
import { mockStore, hashPassword } from '../db/mockStore.ts';
import { activeSessions } from '../middleware/auth.ts';
import { sendInitialCredentials } from '../utils/mailHelper.ts';

let ownerProfileAvatar: string | null = null;

export const userController = {
  getEmployees: async (req: Request, res: Response) => {
    try {
      const stationId = req.query.stationId as string | undefined;
      const emps = await dbService.getEmployees(stationId);
      res.json(emps);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getUsers: async (req: Request, res: Response) => {
    try {
      const { stationId, role } = req.query;
      const users = await dbService.getUsers(stationId as string, role as string);
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  getUser: async (req: Request, res: Response) => {
    try {
      const user = await dbService.getUser(req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  createUser: async (req: Request, res: Response) => {
    try {
      const requesterRole = (req.headers['x-user-role'] as string) || 'OWNER';
      if (
        requesterRole !== 'OWNER' &&
        (req.body.role === 'OWNER' || req.body.role === 'AUDITOR' || req.body.role === 'MANAGER')
      ) {
        return res.status(403).json({
          error: `Unauthorized role assignment: Role '${requesterRole}' is not permitted to assign elevated role '${req.body.role}'. Only Super Admins (OWNER) can assign this role.`,
        });
      }

      const tempPassword = req.body.password || `PetroPulse@${Math.floor(1000 + Math.random() * 9000)}`;
      const payload = {
        ...req.body,
        passwordHash: hashPassword(tempPassword),
      };

      const newUser = await dbService.createUser(payload);

      // Automatically dispatch initial credentials via MailHelper
      let emailDispatched = false;
      if (newUser && newUser.email && req.body.sendEmail !== false) {
        let stationName: string | undefined;
        if (newUser.stationId) {
          const station = await dbService.getStation(newUser.stationId).catch(() => null);
          stationName = station?.name;
        }

        try {
          const mailResult = await sendInitialCredentials({
            user: {
              name: newUser.name,
              email: newUser.email,
              username: newUser.username,
              role: newUser.role,
              stationName,
            },
            temporaryPassword: tempPassword,
            loginUrl: req.body.loginUrl,
          });
          emailDispatched = mailResult.success;
        } catch (mailErr: any) {
          console.warn('[MailHelper] Initial credentials dispatch warning:', mailErr.message);
        }
      }

      res.status(201).json({
        ...newUser,
        temporaryPassword: tempPassword,
        emailSent: emailDispatched,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  sendCredentials: async (req: Request, res: Response) => {
    try {
      const user = await dbService.getUser(req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (!user.email) return res.status(400).json({ error: 'User does not have an email address configured.' });

      // Generate or use provided temporary password
      const tempPassword = req.body.password || `PetroPulse@${Math.floor(1000 + Math.random() * 9000)}`;
      const passwordHash = hashPassword(tempPassword);
      await dbService.updateUser(user.id, { passwordHash });

      let stationName: string | undefined;
      if (user.stationId) {
        const station = await dbService.getStation(user.stationId).catch(() => null);
        stationName = station?.name;
      }

      const mailResult = await sendInitialCredentials({
        user: {
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
          stationName,
        },
        temporaryPassword: tempPassword,
        loginUrl: req.body.loginUrl,
      });

      res.json({
        success: mailResult.success,
        message: `Initial credentials successfully dispatched to ${user.email}`,
        temporaryPassword: tempPassword,
        isMock: mailResult.isMock,
        mailResult,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateUser: async (req: Request, res: Response) => {
    try {
      const requesterRole = (req.headers['x-user-role'] as string) || 'OWNER';
      if (
        req.body.role &&
        requesterRole !== 'OWNER' &&
        (req.body.role === 'OWNER' || req.body.role === 'AUDITOR' || req.body.role === 'MANAGER')
      ) {
        return res.status(403).json({
          error: `Unauthorized role assignment: Role '${requesterRole}' is not permitted to assign elevated role '${req.body.role}'. Only Super Admins (OWNER) can assign this role.`,
        });
      }
      const updated = await dbService.updateUser(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  updateStatus: async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      if (!status) return res.status(400).json({ error: 'Status is required' });
      const updated = await dbService.updateUserStatus(req.params.id, status);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  deleteUser: async (req: Request, res: Response) => {
    try {
      const result = await dbService.deleteUser(req.params.id);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  getPermissions: async (_req: Request, res: Response) => {
    try {
      const perms = await dbService.getRolePermissions();
      res.json(perms);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updatePermission: async (req: Request, res: Response) => {
    try {
      const updated = await dbService.updateRolePermission(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  getProfile: async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      let tokenUserId: string | null = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const session = activeSessions.get(token);
        if (session) {
          tokenUserId = session.userId;
        } else if (token.startsWith('pp_')) {
          tokenUserId = token.split('_')[1];
        }
      }

      const role = (req.query.role as string) || (req.headers['x-user-role'] as string) || 'OWNER';
      const stationId = (req.query.stationId as string) || 'st-101';
      const station = await dbService.getStation(stationId).catch(() => null);

      // 1. Try resolving directly by tokenUserId
      let targetUser = tokenUserId ? (await dbService.getUser(tokenUserId).catch(() => null) || await dbService.getAuthUserById(tokenUserId).catch(() => null)) : null;

      // 2. If not found or no token, find by role & station
      if (!targetUser) {
        const employees = await dbService.getEmployees(stationId).catch(() => []);
        targetUser = employees.find((e) => e.role === role) || null;
      }

      // 3. If still not found, check all employees across stations
      if (!targetUser) {
        const allEmps = await dbService.getEmployees().catch(() => []);
        targetUser = allEmps.find((e) => e.role === role) || allEmps[0] || null;
      }

      if (targetUser) {
        return res.json({
          id: targetUser.id,
          stationId: targetUser.stationId || stationId,
          name: targetUser.name,
          email: targetUser.email || `${targetUser.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@petropulse.io`,
          phone: targetUser.phone,
          role: targetUser.role,
          shiftSchedule: targetUser.shiftSchedule || 'GENERAL',
          assignedIsland: (targetUser as any).assignedIsland ?? undefined,
          avatarUrl: (targetUser as any).avatarUrl || (targetUser.role === 'OWNER' ? ownerProfileAvatar : undefined) || undefined,
          department:
            targetUser.role === 'OWNER'
              ? 'Executive Dealership & Principal Owner'
              : targetUser.role === 'MANAGER'
              ? 'Station Forecourt Operations'
              : targetUser.role === 'ATTENDANT'
              ? 'Nozzle Island Fuel Operations'
              : targetUser.role === 'CASHIER'
              ? 'Shift Cash & Accounts Desk'
              : 'Legal Metrology Compliance Audit',
          employeeCode: targetUser.role === 'OWNER'
            ? 'DLC-HPCL-KA-2024-883'
            : `EMP-${targetUser.role.slice(0, 3)}-${targetUser.id.slice(-4).toUpperCase()}`,
          lastLoginAt: new Date().toISOString(),
        });
      }

      // 4. Default fallback for OWNER
      return res.json({
        id: 'emp-admin-001',
        stationId,
        name: station?.managerName || 'Vikramaditya Singhania',
        email: 'admin@petropulse.io',
        phone: station?.phone || '+91 98200 12345',
        role: 'OWNER',
        shiftSchedule: 'GENERAL / 24-HOUR OVERSIGHT',
        department: 'Executive Dealership & Principal Owner',
        employeeCode: 'DLC-HPCL-KA-2024-883',
        avatarUrl: ownerProfileAvatar || undefined,
        lastLoginAt: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  updateProfile: async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      let tokenUserId: string | null = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const session = activeSessions.get(token);
        if (session) {
          tokenUserId = session.userId;
        } else if (token.startsWith('pp_')) {
          tokenUserId = token.split('_')[1];
        }
      }

      const role = (req.headers['x-user-role'] as string) || req.body.role || 'OWNER';
      const stationId = req.body.stationId || 'st-101';
      const { id: requestedId, name, phone, shiftSchedule, assignedIsland, email, avatarUrl } = req.body;
      const targetId = requestedId || tokenUserId;

      if (avatarUrl !== undefined) {
        ownerProfileAvatar = avatarUrl;
      }

      // 1. Locate specific user to update
      let userToUpdate = targetId ? (await dbService.getUser(targetId).catch(() => null) || await dbService.getAuthUserById(targetId).catch(() => null)) : null;

      // 2. If not found by ID, match by role & station
      if (!userToUpdate) {
        const emps = await dbService.getEmployees(stationId).catch(() => []);
        userToUpdate = emps.find((e) => e.role === role) || null;
      }

      // 3. Fallback to all employees by role
      if (!userToUpdate) {
        const allEmps = await dbService.getEmployees().catch(() => []);
        userToUpdate = allEmps.find((e) => e.role === role) || null;
      }

      // 4. If targetId was owner alias, resolve admin user
      if (!userToUpdate && (role === 'OWNER' || targetId === 'usr-owner-001' || targetId === 'emp-admin-001')) {
        userToUpdate = await dbService.getUser('emp-admin-001').catch(() => null);
      }

      if (userToUpdate) {
        const cleanName = name ? String(name).trim() : userToUpdate.name;
        const cleanPhone = phone ? String(phone).trim() : userToUpdate.phone;

        const updated = await dbService.updateEmployee(userToUpdate.id, {
          name: cleanName,
          phone: cleanPhone,
          shiftSchedule: shiftSchedule || userToUpdate.shiftSchedule,
          assignedIsland: typeof assignedIsland === 'number' ? assignedIsland : (userToUpdate as any).assignedIsland,
          avatarUrl: avatarUrl !== undefined ? avatarUrl : (userToUpdate as any).avatarUrl,
        } as any).catch(() => null);

        // Keep station manager contact in sync for OWNER/MANAGER
        if (role === 'OWNER' || role === 'MANAGER') {
          if (cleanName || cleanPhone) {
            await dbService.updateStationContact(stationId, {
              managerName: cleanName,
              phone: cleanPhone,
            }).catch(() => null);
          }
        }

        const finalUser = updated || userToUpdate;
        return res.json({
          id: finalUser.id,
          stationId: finalUser.stationId || stationId,
          name: cleanName,
          email: email || finalUser.email || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@petropulse.io`,
          phone: cleanPhone,
          role: finalUser.role,
          shiftSchedule: shiftSchedule || finalUser.shiftSchedule,
          assignedIsland: (finalUser as any).assignedIsland ?? undefined,
          avatarUrl: avatarUrl !== undefined ? avatarUrl : (finalUser as any).avatarUrl,
          department:
            finalUser.role === 'OWNER'
              ? 'Executive Dealership & Principal Owner'
              : finalUser.role === 'MANAGER'
              ? 'Station Forecourt Operations'
              : finalUser.role === 'ATTENDANT'
              ? 'Nozzle Island Fuel Operations'
              : finalUser.role === 'CASHIER'
              ? 'Shift Cash & Accounts Desk'
              : 'Legal Metrology Compliance Audit',
          employeeCode: finalUser.role === 'OWNER'
            ? 'DLC-HPCL-KA-2024-883'
            : `EMP-${finalUser.role.slice(0, 3)}-${finalUser.id.slice(-4).toUpperCase()}`,
          lastLoginAt: new Date().toISOString(),
        });
      }

      // If no employee was found, persist in mockStore and return updated record
      const fallbackUser = mockStore.updateProfile({
        name: name ? String(name).trim() : 'Administrator',
        phone: phone ? String(phone).trim() : '+91 98200 12345',
        role,
        stationId,
        avatarUrl,
        shiftSchedule: shiftSchedule || 'GENERAL',
        assignedIsland,
      });

      return res.json({
        id: 'emp-admin-001',
        stationId,
        name: fallbackUser.name,
        email: email || 'admin@petropulse.io',
        phone: fallbackUser.phone,
        role: fallbackUser.role,
        shiftSchedule: fallbackUser.shiftSchedule,
        department: 'Executive Dealership & Principal Owner',
        employeeCode: 'DLC-HPCL-KA-2024-883',
        avatarUrl: fallbackUser.avatarUrl,
        lastLoginAt: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
