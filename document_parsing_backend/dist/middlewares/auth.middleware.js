"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.requireAuth = requireAuth;
const applicationErrors_1 = require("../errors/applicationErrors");
/**
 * Authentication context injection middleware (Stub).
 * Extracts headers, validates placeholder values, and stores user context in req.user.
 */
function authMiddleware(req, _res, next) {
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        // Stub decode logic: In production, verify a JWT or session token
        if (token) {
            req.user = {
                id: token.includes('-') ? token : 'usr_prod_mock_001',
                email: 'user@example.com',
                role: 'user',
            };
        }
    }
    next();
}
/**
 * Guard middleware requiring an authenticated user context.
 */
function requireAuth(req, _res, next) {
    if (!req.user) {
        next(new applicationErrors_1.AuthenticationError('Authentication token is missing, expired, or invalid.'));
        return;
    }
    next();
}
