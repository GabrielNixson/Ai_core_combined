"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const config_1 = require("../config/config");
const correlation_1 = require("../logging/correlation");
const levels = {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    http: 4,
    debug: 5,
    trace: 6,
};
const colors = {
    fatal: 'red',
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
    trace: 'gray',
};
// Custom format to inject request context data automatically from AsyncLocalStorage
const addCorrelationData = winston_1.default.format((info) => {
    info.requestId = (0, correlation_1.getRequestId)() || null;
    info.correlationId = (0, correlation_1.getCorrelationId)() || null;
    info.service = 'document-processor-agent';
    return info;
});
const prettyFormat = winston_1.default.format.combine(winston_1.default.format.errors({ stack: true }), addCorrelationData(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }), winston_1.default.format.colorize({ all: true }), winston_1.default.format.printf((info) => {
    const reqId = info.requestId ? ` [Req:${info.requestId}]` : '';
    const execution = info.executionTimeMs !== undefined ? ` [${info.executionTimeMs}ms]` : '';
    const errStack = info.stack ? `\n${info.stack}` : '';
    return `[${info.timestamp}] [${info.level}]${reqId}${execution}: ${info.message}${errStack}`;
}));
const jsonFormat = winston_1.default.format.combine(winston_1.default.format.errors({ stack: true }), addCorrelationData(), winston_1.default.format.timestamp(), winston_1.default.format.json());
winston_1.default.addColors(colors);
const selectedFormat = config_1.loggingConfig.logFormat === 'json' ? jsonFormat : prettyFormat;
const winstonLogger = winston_1.default.createLogger({
    level: config_1.loggingConfig.logLevel,
    levels,
    format: selectedFormat,
    transports: [
        new winston_1.default.transports.Console(),
    ],
});
exports.logger = winstonLogger;
exports.default = exports.logger;
