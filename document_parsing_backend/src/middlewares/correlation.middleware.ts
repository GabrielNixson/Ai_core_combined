import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runWithContext } from '../logging/correlation';

// Extend Express Request interface locally to support custom fields
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      correlationId?: string;
    }
  }
}

export function correlationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestIdHeader = req.header('x-request-id') || req.header('request-id');
  const correlationIdHeader = req.header('x-correlation-id') || req.header('correlation-id');

  const requestId = requestIdHeader || uuidv4();
  // If there's a correlation ID passed from upstream (e.g. gateway), use it, otherwise fall back to requestId
  const correlationId = correlationIdHeader || requestId;

  // Attach to request object
  req.requestId = requestId;
  req.correlationId = correlationId;

  // Expose on response headers
  res.setHeader('x-request-id', requestId);
  res.setHeader('x-correlation-id', correlationId);

  // Run the rest of the request within the AsyncLocalStorage context
  runWithContext({ requestId, correlationId }, () => {
    next();
  });
}

export default correlationMiddleware;
