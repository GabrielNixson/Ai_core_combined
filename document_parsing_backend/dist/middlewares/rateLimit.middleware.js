"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRateLimiter = exports.globalIpRateLimiter = void 0;
const express_rate_limit_1 = require("express-rate-limit");
const rate_limit_redis_1 = __importDefault(require("rate-limit-redis"));
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("../config/config");
const logger_1 = require("../utils/logger");
let redisClient;
try {
    redisClient = new ioredis_1.default({
        host: config_1.queueConfig.redisHost,
        port: config_1.queueConfig.redisPort,
        password: config_1.queueConfig.redisPassword,
        maxRetriesPerRequest: 1, // Fail fast to avoid blocking app
    });
    redisClient.on('error', (err) => {
        logger_1.logger.error('Redis Rate Limiting client error:', err);
    });
}
catch (err) {
    logger_1.logger.error('Failed to initialize Redis for rate limiting:', err);
}
// Global IP-based rate limiter
exports.globalIpRateLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: config_1.securityConfig.rateLimitWindowMs,
    max: config_1.securityConfig.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    store: new rate_limit_redis_1.default({
        // @ts-ignore
        sendCommand: (...args) => {
            if (redisClient.status !== 'ready' && redisClient.status !== 'connecting') {
                // Fallback to local memory-store behavior if Redis client is offline
                return Promise.reject(new Error('Redis is not ready'));
            }
            return redisClient.call(...args);
        },
    }),
    message: {
        error: {
            type: 'TooManyRequests',
            message: 'Too many requests from this IP, please try again later.',
        },
    },
});
// Per-user rate limiter
exports.userRateLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: config_1.securityConfig.rateLimitWindowMs,
    max: Math.floor(config_1.securityConfig.rateLimitMax * 2), // Double capacity for authenticated sessions
    standardHeaders: true,
    legacyHeaders: false,
    validate: { ip: false },
    // keyGenerator: (req) => {
    //   return req.user ? `rate_limit_user:${req.user.id}` : `rate_limit_ip:${req.ip}`;
    // },
    keyGenerator: (req) => {
        if (req.user?.id) {
            return `user:${req.user.id}`;
        }
        return (0, express_rate_limit_1.ipKeyGenerator)(req.ip);
    },
    store: new rate_limit_redis_1.default({
        // @ts-ignore
        sendCommand: (...args) => {
            if (redisClient.status !== 'ready' && redisClient.status !== 'connecting') {
                return Promise.reject(new Error('Redis is not ready'));
            }
            return redisClient.call(...args);
        },
    }),
    message: {
        error: {
            type: 'TooManyRequests',
            message: 'Too many requests. Limit exceeded.',
        },
    },
});
exports.default = exports.globalIpRateLimiter;
