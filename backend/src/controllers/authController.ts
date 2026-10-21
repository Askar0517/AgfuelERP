import { Request, Response } from 'express';
import { dbService } from '../db/service.ts';
import { activeSessions, revokedTokens, isRateLimited } from '../middleware/auth.ts';

export const authController = {
  login: async (req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (isRateLimited(`login_${ip}`, 12)) {
      return res.status(429).json({ error: 'Too many login attempts. Please wait 15 minutes before trying again.' });
    }

    try {
      const { usernameOrEmail, username, email, password } = req.body || {};
      const identifier = usernameOrEmail || username || email;
      const result = await dbService.login(identifier, password);
      revokedTokens.delete(result.token);
      activeSessions.set(result.token, {
        userId: result.user.id,
        role: result.user.role,
        userName: result.user.name || result.user.username,
        createdAt: Date.now(),
      });
      res.json(result);
    } catch (err: any) {
      res.status(401).json({ error: err.message || 'Invalid credentials' });
    }
  },

  logout: (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      activeSessions.delete(token);
      revokedTokens.add(token);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  },

  me: async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const token = authHeader.substring(7);
    if (revokedTokens.has(token)) {
      return res.status(401).json({ error: 'Session has been revoked or logged out.' });
    }
    const session = activeSessions.get(token);
    let userId = session?.userId;
    if (!userId && token.startsWith('pp_')) {
      const parts = token.split('_');
      userId = parts[1];
    }

    if (!userId) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    const user = await dbService.getAuthUserById(userId);
    if (!user || !user.isActive) {
      activeSessions.delete(token);
      return res.status(401).json({ error: 'User account is inactive or not found' });
    }

    res.json({ user });
  },

  forgotPassword: async (req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (isRateLimited(`forgot_${ip}`, 8)) {
      return res.status(429).json({ error: 'Too many password reset requests. Please wait a few minutes.' });
    }
    try {
      const { email } = req.body;
      const result = await dbService.forgotPassword(email);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  resetPassword: async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;
      const result = await dbService.resetPassword(token, newPassword);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  changePassword: async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    let userId = req.body.userId as string;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const session = activeSessions.get(token);
      if (session) userId = session.userId;
    }
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await dbService.changePassword(userId, currentPassword, newPassword);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },
};
