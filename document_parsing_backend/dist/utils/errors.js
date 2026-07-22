"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalServerError = exports.UnsupportedMediaTypeError = exports.PayloadTooLargeError = exports.NotFoundError = exports.BadRequestError = exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    isOperational;
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class BadRequestError extends AppError {
    constructor(message = 'Bad Request') {
        super(message, 400);
    }
}
exports.BadRequestError = BadRequestError;
class NotFoundError extends AppError {
    constructor(message = 'Resource Not Found') {
        super(message, 404);
    }
}
exports.NotFoundError = NotFoundError;
class PayloadTooLargeError extends AppError {
    constructor(message = 'Payload Too Large') {
        super(message, 413);
    }
}
exports.PayloadTooLargeError = PayloadTooLargeError;
class UnsupportedMediaTypeError extends AppError {
    constructor(message = 'Unsupported Media Type') {
        super(message, 415);
    }
}
exports.UnsupportedMediaTypeError = UnsupportedMediaTypeError;
class InternalServerError extends AppError {
    constructor(message = 'Internal Server Error') {
        super(message, 500, false);
    }
}
exports.InternalServerError = InternalServerError;
