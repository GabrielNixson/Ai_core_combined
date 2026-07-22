import { Request, Response, NextFunction } from 'express';
import { AuthenticationError } from '../errors/applicationErrors';

// Extend Request interface to support req.user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Authentication context injection middleware (Stub).
 * Extracts headers, validates placeholder values, and stores user context in req.user.
 */
export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    
    // Stub decode logic: In production, verify a JWT or session token
    if (token) {
      req.user = {
        id: token.includes('-') ? token : 'usr_prod_mock_001',
        email: 'user@example.com',
        role: 'user',
      };
    }
  }

  next();
}

/**
 * Guard middleware requiring an authenticated user context.
 */
export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    next(new AuthenticationError('Authentication token is missing, expired, or invalid.'));
    return;
  }
  next();
}
