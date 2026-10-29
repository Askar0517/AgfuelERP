import { Request, Response, NextFunction } from 'express';
import { activeSessions } from './auth.ts';

/**
 * Mask sensitive values like passwords, hashes, and secrets from logs.
 */
function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map((item) => (typeof item === 'object' ? sanitizeData(item) : item));
  }
  const copy: Record<string, any> = { ...data };
  for (const key of Object.keys(copy)) {
    const lower = key.toLowerCase();
    if (
      lower.includes('password') ||
      lower.includes('secret') ||
      lower.includes('token') ||
      lower.includes('authorization')
    ) {
      copy[key] = '******';
    } else if (typeof copy[key] === 'object' && copy[key] !== null) {
      copy[key] = sanitizeData(copy[key]);
    }
  }
  return copy;
}

/**
 * Safely format and sanitize response body payload for log output.
 */
export function formatResponseBody(body: any, maxLength = 1000): string {
  if (body === undefined || body === null) {
    return '[No Content]';
  }

  // Handle binary Buffers (e.g. downloads, photos)
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(body)) {
    return `[Binary Buffer: ${body.length} bytes]`;
  }

  let str: string;
  try {
    if (typeof body === 'object') {
      const sanitized = sanitizeData(body);
      str = JSON.stringify(sanitized);
    } else {
      str = String(body);
    }
  } catch (err: any) {
    str = `[Unserializable body: ${err?.message || 'error'}]`;
  }

  if (str.length > maxLength) {
    return `${str.slice(0, maxLength)}... (${str.length} bytes)`;
  }
  return str;
}

/**
 * Resolves user name from authenticated user context, session tokens, or request headers.
 */
export function resolveUserName(req: Request): string {
  let userName: string | undefined = (req as any).user?.name || (req as any).user?.username;

  // 1. Resolve from active bearer token session
  if (!userName && req.headers?.authorization?.startsWith('Bearer ')) {
    const token = req.headers.authorization.substring(7);
    const session = activeSessions.get(token);
    if (session?.userName) {
      userName = session.userName;
    }
  }

  // 2. Resolve from custom headers
  if (!userName && req.headers?.['x-user-name']) {
    userName = req.headers['x-user-name'] as string;
  }

  // 3. Resolve from login body credentials
  if (!userName && (req as any).body?.usernameOrEmail) {
    userName = (req as any).body.usernameOrEmail;
  }

  // 4. Resolve from role header fallback
  if (!userName && req.headers?.['x-user-role']) {
    userName = `${req.headers['x-user-role']}`;
  }

  // 5. Default fallback
  return userName || 'Anonymous';
}

/**
 * Request Response Logger Middleware
 * Logs incoming request method & URL, HTTP response status code, authenticated user name,
 * execution duration (latency), and the outgoing API response payload.
 */
export function requestResponseLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  let responseBody: any = undefined;

  // Intercept res.json to capture response payload
  if (typeof res.json === 'function') {
    const originalJson = res.json.bind(res);
    res.json = function (body: any): Response {
      responseBody = body;
      return originalJson(body);
    };
  }

  // Intercept res.send to capture response body
  if (typeof res.send === 'function') {
    const originalSend = res.send.bind(res);
    res.send = function (body: any): Response {
      if (responseBody === undefined) {
        responseBody = body;
      }
      return originalSend(body);
    };
  }

  // Intercept res.end to capture raw or stream chunks
  if (typeof res.end === 'function') {
    const originalEnd = res.end.bind(res);
    res.end = function (chunk?: any, ...rest: any[]): any {
      if (responseBody === undefined && chunk !== undefined) {
        responseBody = chunk;
      }
      return originalEnd(chunk, ...rest);
    };
  }

  // Capture response event on completion
  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const requestUrl = req.originalUrl || req.url;
    const responseCode = res.statusCode;
    const method = req.method || 'GET';
    const userName = resolveUserName(req);
    const formattedResponse = formatResponseBody(responseBody);

    console.log(
      `[HTTP LOG] ${method} URL: ${requestUrl} | Response Code: ${responseCode} | User: ${userName} | ${durationMs}ms | Response: ${formattedResponse}`
    );
  });

  next();
}

// Backward-compatible alias
export const requestLogger = requestResponseLogger;
