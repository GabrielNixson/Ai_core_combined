export class BaseApplicationError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(message: string, statusCode: number, isOperational = true, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends BaseApplicationError {
  constructor(message = 'Validation Error', details?: any) {
    super(message, 400, true, details);
  }
}

export class AuthenticationError extends BaseApplicationError {
  constructor(message = 'Authentication Required') {
    super(message, 401, true);
  }
}

export class AuthorizationError extends BaseApplicationError {
  constructor(message = 'Access Denied / Unauthorized') {
    super(message, 403, true);
  }
}

export class DocumentProcessingError extends BaseApplicationError {
  constructor(message = 'Document Processing Failed', details?: any) {
    super(message, 500, true, details);
  }
}

export class EmbeddingError extends BaseApplicationError {
  constructor(message = 'Embedding Generation Failed', details?: any) {
    super(message, 500, true, details);
  }
}

export class VectorDatabaseError extends BaseApplicationError {
  constructor(message = 'Vector Database Operation Failed', details?: any) {
    super(message, 500, true, details);
  }
}

export class QueueError extends BaseApplicationError {
  constructor(message = 'Queue Process Failed', details?: any) {
    super(message, 500, true, details);
  }
}

export class AIProviderError extends BaseApplicationError {
  constructor(message = 'AI Provider Request Failed', details?: any) {
    super(message, 500, true, details);
  }
}

export class UnknownError extends BaseApplicationError {
  constructor(message = 'An Unknown System Error Occurred', details?: any) {
    super(message, 500, false, details);
  }
}
