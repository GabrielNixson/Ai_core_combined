"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnknownError = exports.AIProviderError = exports.QueueError = exports.VectorDatabaseError = exports.EmbeddingError = exports.DocumentProcessingError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.BaseApplicationError = void 0;
class BaseApplicationError extends Error {
    statusCode;
    isOperational;
    details;
    constructor(message, statusCode, isOperational = true, details) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.details = details;
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.BaseApplicationError = BaseApplicationError;
class ValidationError extends BaseApplicationError {
    constructor(message = 'Validation Error', details) {
        super(message, 400, true, details);
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends BaseApplicationError {
    constructor(message = 'Authentication Required') {
        super(message, 401, true);
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends BaseApplicationError {
    constructor(message = 'Access Denied / Unauthorized') {
        super(message, 403, true);
    }
}
exports.AuthorizationError = AuthorizationError;
class DocumentProcessingError extends BaseApplicationError {
    constructor(message = 'Document Processing Failed', details) {
        super(message, 500, true, details);
    }
}
exports.DocumentProcessingError = DocumentProcessingError;
class EmbeddingError extends BaseApplicationError {
    constructor(message = 'Embedding Generation Failed', details) {
        super(message, 500, true, details);
    }
}
exports.EmbeddingError = EmbeddingError;
class VectorDatabaseError extends BaseApplicationError {
    constructor(message = 'Vector Database Operation Failed', details) {
        super(message, 500, true, details);
    }
}
exports.VectorDatabaseError = VectorDatabaseError;
class QueueError extends BaseApplicationError {
    constructor(message = 'Queue Process Failed', details) {
        super(message, 500, true, details);
    }
}
exports.QueueError = QueueError;
class AIProviderError extends BaseApplicationError {
    constructor(message = 'AI Provider Request Failed', details) {
        super(message, 500, true, details);
    }
}
exports.AIProviderError = AIProviderError;
class UnknownError extends BaseApplicationError {
    constructor(message = 'An Unknown System Error Occurred', details) {
        super(message, 500, false, details);
    }
}
exports.UnknownError = UnknownError;
