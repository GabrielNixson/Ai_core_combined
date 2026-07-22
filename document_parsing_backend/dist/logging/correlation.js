"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.correlationLocalStorage = void 0;
exports.getRequestId = getRequestId;
exports.getCorrelationId = getCorrelationId;
exports.runWithContext = runWithContext;
exports.runWithGeneratedContext = runWithGeneratedContext;
const async_hooks_1 = require("async_hooks");
const uuid_1 = require("uuid");
exports.correlationLocalStorage = new async_hooks_1.AsyncLocalStorage();
/**
 * Gets the current request ID from the context, if set.
 */
function getRequestId() {
    return exports.correlationLocalStorage.getStore()?.requestId;
}
/**
 * Gets the current correlation ID from the context, if set.
 */
function getCorrelationId() {
    return exports.correlationLocalStorage.getStore()?.correlationId;
}
/**
 * Runs a callback within a correlation context.
 */
function runWithContext(context, callback) {
    return exports.correlationLocalStorage.run(context, callback);
}
/**
 * Run inside context, generating new IDs if they are not provided.
 */
function runWithGeneratedContext(customRequestId, customCorrelationId, callback) {
    const requestId = customRequestId || (0, uuid_1.v4)();
    const correlationId = customCorrelationId || requestId;
    const context = { requestId, correlationId };
    if (callback) {
        return exports.correlationLocalStorage.run(context, callback);
    }
    // Return the context if no callback is supplied
    return exports.correlationLocalStorage.run(context, () => {
        return context;
    });
}
