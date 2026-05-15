import { IncomingMessage, ServerResponse } from 'http';
import { User } from '@supabase/supabase-js';
import { extractTokenFromHeader, getUserFromSession } from '../services/auth';

export interface ApiRequest extends IncomingMessage {
  query: Partial<Record<string, string | string[]>>;
  cookies: Partial<Record<string, string>>;
  body: unknown;
}

export interface ApiResponse extends ServerResponse {
  status: (code: number) => ApiResponse;
  json: (data: unknown) => void;
  headersSent: boolean;
}

export type AuthenticatedRequest = ApiRequest & {
  user: User;
};

export type Handler = (req: ApiRequest, res: ApiResponse) => Promise<void>;
export type AuthenticatedHandler = (req: AuthenticatedRequest, res: ApiResponse, user: User) => Promise<void>;

/**
 * Middleware to enforce authentication via Supabase session
 */
export function withAuth(handler: AuthenticatedHandler): Handler {
  return async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = extractTokenFromHeader(authHeader);
      
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized: Missing token' });
      }

      const user = await getUserFromSession(token);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized: Invalid session' });
      }

      const authReq = req as AuthenticatedRequest;
      authReq.user = user;
      
      return await handler(authReq, res, user);
    } catch (error: unknown) {
      console.error('Auth Middleware Error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}

/**
 * Middleware to provide consistent error handling and standard API methods
 */
export function withErrorHandling(handler: Handler | AuthenticatedHandler): Handler {
  return async (req, res) => {
    const vercelRes = res as ApiResponse;
    
    // Polyfill Vercel-like helpers if missing
    if (typeof vercelRes.status !== 'function') {
      vercelRes.status = function(this: ApiResponse, code: number) {
        this.statusCode = code;
        return this;
      };
    }
    
    if (typeof vercelRes.json !== 'function') {
      vercelRes.json = function(this: ApiResponse, data: unknown) {
        this.setHeader('Content-Type', 'application/json');
        this.end(JSON.stringify(data));
      };
    }

    try {
      // We cast to Handler because we've ensured the request/response are handled correctly
      return await (handler as Handler)(req, vercelRes);
    } catch (error: unknown) {
      console.error('API Error:', error);
      
      const err = error as { status?: number; message?: string };
      const status = typeof err.status === 'number' ? err.status : 500;
      const message = typeof err.message === 'string' ? err.message : 'Internal Server Error';
      
      if (!vercelRes.headersSent) {
        vercelRes.status(status).json({ error: message });
      }
    }
  };
}
