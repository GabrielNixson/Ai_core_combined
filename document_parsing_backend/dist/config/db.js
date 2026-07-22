"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDatabase = connectDatabase;
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("./config");
const logger_1 = require("../utils/logger");
async function connectDatabase() {
    const options = {
        autoIndex: true, // Build indexes on startup
    };
    logger_1.logger.info('Connecting to MongoDB...');
    try {
        await mongoose_1.default.connect(config_1.config.mongoUri, options);
        logger_1.logger.info('Successfully connected to MongoDB.');
    }
    catch (error) {
        logger_1.logger.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
    mongoose_1.default.connection.on('disconnected', () => {
        logger_1.logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    mongoose_1.default.connection.on('error', (err) => {
        logger_1.logger.error('MongoDB connection error:', err);
    });
}
