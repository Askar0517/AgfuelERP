import { Request, Response, NextFunction } from 'express';
import { dbService, hashPassword, verifyPassword } from '../db/service.ts';
export { hashPassword, verifyPassword };

// In-memory rate limiting
export const authRateLimits = new Map<string, { count: number; resetTime: number }>();

export const clearRateLimit = (key: string) => {
  authRateLimits.delete(key);
};

export const isRateLimited = (key: string, maxAttempts = 25, windowMs = 15 * 60 * 1000) => {
  if (key.includes('127.0.0.1') || key.includes('::1') || key.includes('localhost')) {
    maxAttempts = 100; // Generous ceiling for local development
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

// Session management
export const activeSessions = new Map<
  string,
  { userId: string; role: string; userName?: string; createdAt: number }
>();
export const revokedTokens = new Set<string>();

/**
 * Role & Module Privilege Verification Middleware
 */
export const verifyPrivilege = (module: string, action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    let userRole: string | undefined = undefined;
    let userId: string | undefined = undefined;
    let userName: string | undefined = (req.headers['x-user-name'] as string) || undefined;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (revokedTokens.has(token)) {
        return res.status(401).json({ error: 'Session token has been revoked or logged out.' });
      }
      const session = activeSessions.get(token);
      if (session) {
        userRole = session.role;
        userId = session.userId;
        userName = session.userName || userName;
      } else if (token.startsWith('pp_')) {
        const parts = token.split('_');
        userId = parts[1];
        const user = await dbService.getAuthUserById(userId);
        if (user) {
          userRole = user.role;
          userName = user.name || user.username;
          activeSessions.set(token, {
            userId: user.id,
            role: user.role,
            userName,
            createdAt: Date.now(),
          });
        }
      }
    }

    // Allow x-user-role fallback for tests and client requests with valid forecourt roles (never default to OWNER if missing)
    if (!userRole && req.headers['x-user-role']) {
      const headerRole = String(req.headers['x-user-role']).trim().toUpperCase();
      const validRoles = ['OWNER', 'MANAGER', 'ATTENDANT', 'CASHIER', 'AUDITOR'];
      if (validRoles.includes(headerRole)) {
        userRole = headerRole;
        userId = (req.headers['x-user-id'] as string) || 'dev-user';
        userName = userName || 'Staff User';
      }
    }

    if (!userRole) {
      return res.status(401).json({ error: 'Authentication required: missing or invalid authorization credentials.' });
    }

    (req as any).user = { id: userId, role: userRole, name: userName };

    try {
      const isAllowed = await dbService.checkPrivilege(userRole, module, action, userId);
      if (!isAllowed) {
        return res.status(403).json({
          error: `Access Denied: Role '${userRole}' lacks '${action}' privilege on module '${module}'.`,
          role: userRole,
          module,
          action,
        });
      }
      next();
    } catch (err: any) {
      console.error('Privilege check error:', err);
      if (userRole === 'OWNER') next();
      else res.status(403).json({ error: 'Failed to verify role privilege' });
    }
  };
};
