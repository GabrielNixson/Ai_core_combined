"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const config_1 = require("./config/config");
const correlation_1 = require("./logging/correlation");
const applicationErrors_1 = require("./errors/applicationErrors");
const error_middleware_1 = require("./middlewares/error.middleware");
async function runHardeningTests() {
    console.log('🚀 Running Production Hardening Tests...');
    // 1. Centralized Configuration Tests
    try {
        assert_1.default.strictEqual(typeof config_1.config.port, 'number');
        assert_1.default.strictEqual(typeof config_1.config.mongoUri, 'string');
        assert_1.default.ok(config_1.config.maxUploadSize > 0);
        console.log('✅ Configuration Validation: PASSED');
    }
    catch (err) {
        console.error('❌ Configuration Validation failed:', err.message);
    }
    // 2. Request Correlation AsyncLocalStorage Context Tests
    try {
        await (0, correlation_1.runWithGeneratedContext)('test-req-id-123', 'test-corr-id-456', async () => {
            assert_1.default.strictEqual((0, correlation_1.getRequestId)(), 'test-req-id-123');
            assert_1.default.strictEqual((0, correlation_1.getCorrelationId)(), 'test-corr-id-456');
        });
        console.log('✅ Request Correlation context propagation: PASSED');
    }
    catch (err) {
        console.error('❌ Request Correlation context propagation failed:', err.message);
    }
    // 3. Custom Error Hierarchies Tests
    try {
        const vErr = new applicationErrors_1.ValidationError('Invalid request field', { field: 'name' });
        assert_1.default.strictEqual(vErr.statusCode, 400);
        assert_1.default.strictEqual(vErr.message, 'Invalid request field');
        assert_1.default.deepStrictEqual(vErr.details, { field: 'name' });
        assert_1.default.ok(vErr instanceof applicationErrors_1.BaseApplicationError);
        console.log('✅ Custom Error Hierarchies: PASSED');
    }
    catch (err) {
        console.error('❌ Custom Error Hierarchies failed:', err.message);
    }
    // 4. Global Error Middleware Response Mapping Tests
    try {
        const mockRequest = {};
        let responseStatus = 0;
        let responseJson = null;
        const mockResponse = {
            status: (code) => {
                responseStatus = code;
                return mockResponse;
            },
            json: (data) => {
                responseJson = data;
                return mockResponse;
            },
        };
        const mockNext = () => { };
        const testErr = new applicationErrors_1.ValidationError('Bad validation');
        (0, error_middleware_1.errorMiddleware)(testErr, mockRequest, mockResponse, mockNext);
        assert_1.default.strictEqual(responseStatus, 400);
        assert_1.default.strictEqual(responseJson.error.type, 'ValidationError');
        assert_1.default.strictEqual(responseJson.error.message, 'Bad validation');
        console.log('✅ Global Error Middleware: PASSED');
    }
    catch (err) {
        console.error('❌ Global Error Middleware failed:', err.message);
    }
    console.log('🎉 All Hardening Tests Completed!');
}
runHardeningTests().catch((err) => {
    console.error('Fatal testing error:', err);
    process.exit(1);
});
