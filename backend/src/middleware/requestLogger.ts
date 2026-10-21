import { Request, Response, NextFunction } from 'express';
import { activeSessions } from './auth.ts';

/**
 * Request Logger Middleware
 * Logs incoming request URL, response status code, and authenticated/associated user name.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Capture response event on completion
  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const requestUrl = req.originalUrl || req.url;
    const responseCode = res.statusCode;

    // Resolve user name
    let userName: string | undefined = (req as any).user?.name || (req as any).user?.username;

    // 1. Resolve from active bearer token session
    if (!userName && req.headers.authorization?.startsWith('Bearer ')) {
      const token = req.headers.authorization.substring(7);
      const session = activeSessions.get(token);
      if (session?.userName) {
        userName = session.userName;
      }
    }

    // 2. Resolve from custom headers
    if (!userName && req.headers['x-user-name']) {
      userName = req.headers['x-user-name'] as string;
    }

    // 3. Resolve from login body credentials
    if (!userName && req.body?.usernameOrEmail) {
      userName = req.body.usernameOrEmail;
    }

    // 4. Resolve from role header fallback
    if (!userName && req.headers['x-user-role']) {
      userName = `${req.headers['x-user-role']}`;
    }

    // 5. Default fallback
    if (!userName) {
      userName = 'Anonymous';
    }

    // Log the request URL, response Code, and user name
    console.log(
      `[HTTP LOG] URL: ${requestUrl} | Response Code: ${responseCode} | User: ${userName} | ${durationMs}ms`
    );
  });

  next();
}
