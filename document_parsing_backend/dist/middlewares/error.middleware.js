"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = errorMiddleware;
const multer_1 = __importDefault(require("multer"));
const mongoose_1 = __importDefault(require("mongoose"));
const applicationErrors_1 = require("../errors/applicationErrors");
const logger_1 = require("../utils/logger");
const config_1 = require("../config/config");
const correlation_1 = require("../logging/correlation");
function errorMiddleware(err, _req, res, _next) {
    const requestId = (0, correlation_1.getRequestId)();
    let statusCode = 500;
    let type = 'InternalServerError';
    let message = 'An unexpected error occurred.';
    let details = undefined;
    // 1. Handle our custom BaseApplicationError
    if (err instanceof applicationErrors_1.BaseApplicationError) {
        statusCode = err.statusCode;
        type = err.constructor.name;
        message = err.message;
        details = err.details;
        if (statusCode >= 500) {
            logger_1.logger.error(`[Global Error Handler] Operational Server Error: ${err.message}`, err);
        }
        else {
            logger_1.logger.warn(`[Global Error Handler] Client Request Error: ${err.message} (Status: ${statusCode})`);
        }
    }
    // 2. Handle Multer file upload errors
    else if (err instanceof multer_1.default.MulterError) {
        statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        type = 'ValidationError';
        message = err.message;
        logger_1.logger.warn(`[Global Error Handler] Multer Upload Error: ${err.message}`);
    }
    // 3. Handle Mongoose Validation Errors
    else if (err instanceof mongoose_1.default.Error.ValidationError) {
        statusCode = 400;
        type = 'ValidationError';
        message = 'Database validation failed.';
        details = Object.keys(err.errors).map((key) => ({
            field: key,
            message: err.errors[key]?.message || 'Invalid value',
        }));
        logger_1.logger.warn(`[Global Error Handler] Mongoose Validation Error: ${err.message}`);
    }
    // 4. Handle Mongoose CastError (e.g. invalid MongoDB ObjectIDs)
    else if (err instanceof mongoose_1.default.Error.CastError) {
        statusCode = 400;
        type = 'ValidationError';
        message = `Invalid format for field '${err.path}'.`;
        logger_1.logger.warn(`[Global Error Handler] Mongoose Cast Error: ${err.message}`);
    }
    // 5. Catch any other unexpected system/third-party errors
    else {
        logger_1.logger.fatal('[Global Error Handler] Unhandled System Error:', err);
        // In development environment we can show the actual error message, in production keep it generic
        if (config_1.appConfig.env !== 'production') {
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
            ...(config_1.appConfig.env !== 'production' && { stack: err.stack }),
        },
    };
    res.status(statusCode).json(errorPayload);
}
exports.default = errorMiddleware;
