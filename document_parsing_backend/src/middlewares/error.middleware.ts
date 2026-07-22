import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { BaseApplicationError } from '../errors/applicationErrors';
import { logger } from '../utils/logger';
import { appConfig } from '../config/config';
import { getRequestId } from '../logging/correlation';

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = getRequestId();
  let statusCode = 500;
  let type = 'InternalServerError';
  let message = 'An unexpected error occurred.';
  let details: any = undefined;

  // 1. Handle our custom BaseApplicationError
  if (err instanceof BaseApplicationError) {
    statusCode = err.statusCode;
    type = err.constructor.name;
    message = err.message;
    details = err.details;

    if (statusCode >= 500) {
      logger.error(`[Global Error Handler] Operational Server Error: ${err.message}`, err);
    } else {
      logger.warn(`[Global Error Handler] Client Request Error: ${err.message} (Status: ${statusCode})`);
    }
  }
  // 2. Handle Multer file upload errors
  else if (err instanceof multer.MulterError) {
    statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    type = 'ValidationError';
    message = err.message;
    logger.warn(`[Global Error Handler] Multer Upload Error: ${err.message}`);
  }
  // 3. Handle Mongoose Validation Errors
  else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    type = 'ValidationError';
    message = 'Database validation failed.';
    details = Object.keys(err.errors).map((key) => ({
      field: key,
      message: err.errors[key]?.message || 'Invalid value',
    }));
    logger.warn(`[Global Error Handler] Mongoose Validation Error: ${err.message}`);
  }
  // 4. Handle Mongoose CastError (e.g. invalid MongoDB ObjectIDs)
  else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    type = 'ValidationError';
    message = `Invalid format for field '${err.path}'.`;
    logger.warn(`[Global Error Handler] Mongoose Cast Error: ${err.message}`);
  }
  // 5. Catch any other unexpected system/third-party errors
  else {
    logger.fatal('[Global Error Handler] Unhandled System Error:', err);
    
    // In development environment we can show the actual error message, in production keep it generic
    if (appConfig.env !== 'production') {
      message = err.message;
    }
  }

  // Construct a standard structured error payload
  const errorPayload = {
    error: {
      type,
      message,
      requestId,
      ...(details !== undefined && { details }),
      ...(appConfig.env !== 'production' && { stack: err.stack }),
    },
  };

  res.status(statusCode).json(errorPayload);
}

export default errorMiddleware;
