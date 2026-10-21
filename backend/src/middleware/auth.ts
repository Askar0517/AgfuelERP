import { Request, Response, NextFunction } from 'express';
import { dbService, hashPassword, verifyPassword } from '../db/service.ts';
export { hashPassword, verifyPassword };

// In-memory rate limiting
export const authRateLimits = new Map<string, { count: number; resetTime: number }>();

export const isRateLimited = (key: string, maxAttempts = 12, windowMs = 15 * 60 * 1000) => {
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
    let userRole = (req.headers['x-user-role'] as string) || 'OWNER';
    let userId: string | undefined = undefined;
    let userName: string | undefined = (req.headers['x-user-name'] as string) || undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
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
