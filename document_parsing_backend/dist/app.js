"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const logger_1 = require("./utils/logger");
const errors_1 = require("./utils/errors");
const error_middleware_1 = require("./middlewares/error.middleware");
const correlation_middleware_1 = require("./middlewares/correlation.middleware");
const rateLimit_middleware_1 = require("./middlewares/rateLimit.middleware");
const auth_middleware_1 = require("./middlewares/auth.middleware");
const config_1 = require("./config/config");
// Import routers
const document_routes_1 = __importDefault(require("./routes/document.routes"));
const retrieval_routes_1 = __importDefault(require("./retrieval/routes/retrieval.routes"));
const rag_routes_1 = __importDefault(require("./rag/routes/rag.routes"));
const agent_routes_1 = __importDefault(require("./agent/routes/agent.routes"));
const health_routes_1 = __importDefault(require("./health/health.routes"));
// Import swagger dependencies
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./config/swagger");
const app = (0, express_1.default)();
// 1. Trusted Proxy Support (essential for correct rate limiting behind Nginx/ELB)
app.set('trust proxy', 1);
// 2. Correlation Tracking Middleware (Generates and hooks up AsyncLocalStorage context)
app.use(correlation_middleware_1.correlationMiddleware);
// 3. Security Middlewares
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: config_1.securityConfig.corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-correlation-id'],
}));
// 4. Rate Limiting (IP-based protection on all routes)
app.use(rateLimit_middleware_1.globalIpRateLimiter);
// 5. Response Compression
app.use((0, compression_1.default)());
// 6. JSON & URL Parsers with limits configured
app.use(express_1.default.json({ limit: config_1.securityConfig.requestSizeLimit }));
app.use(express_1.default.urlencoded({ extended: true, limit: config_1.securityConfig.requestSizeLimit }));
// 7. Inject Stubbed Auth context globally for downstream usage
app.use(auth_middleware_1.authMiddleware);
// 8. Mount Health Routes (Must skip health checks from strict user/auth limits if needed)
app.use('/health', health_routes_1.default);
// 9. API Docs (Swagger UI)
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
// 10. HTTP Request Logging Middleware (using structured logging context)
app.use((req, _res, next) => {
    logger_1.logger.http(`${req.method} ${req.originalUrl}`);
    next();
});
// 11. Mount Business Routes
app.use('/documents', document_routes_1.default);
app.use('/retrieval', retrieval_routes_1.default);
app.use('/rag', rag_routes_1.default);
app.use('/agent', agent_routes_1.default);
// Catch-all NotFound Route
app.use((req, _res, next) => {
    next(new errors_1.NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
});
// Centralized Global Error Handling Middleware
app.use(error_middleware_1.errorMiddleware);
exports.default = app;
