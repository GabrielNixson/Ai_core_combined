"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.correlationMiddleware = correlationMiddleware;
const uuid_1 = require("uuid");
const correlation_1 = require("../logging/correlation");
function correlationMiddleware(req, res, next) {
    const requestIdHeader = req.header('x-request-id') || req.header('request-id');
    const correlationIdHeader = req.header('x-correlation-id') || req.header('correlation-id');
    const requestId = requestIdHeader || (0, uuid_1.v4)();
    // If there's a correlation ID passed from upstream (e.g. gateway), use it, otherwise fall back to requestId
    const correlationId = correlationIdHeader || requestId;
    // Attach to request object
    req.requestId = requestId;
    req.correlationId = correlationId;
    // Expose on response headers
    res.setHeader('x-request-id', requestId);
    res.setHeader('x-correlation-id', correlationId);
    // Run the rest of the request within the AsyncLocalStorage context
    (0, correlation_1.runWithContext)({ requestId, correlationId }, () => {
        next();
    });
}
exports.default = correlationMiddleware;
