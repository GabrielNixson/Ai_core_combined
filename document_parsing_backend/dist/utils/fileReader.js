"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readFileToBuffer = readFileToBuffer;
const promises_1 = __importDefault(require("fs/promises"));
const errors_1 = require("./errors");
const logger_1 = require("./logger");
const config_1 = require("../config/config");
const minio_1 = require("./minio");
/**
 * Reads a file from the local filesystem or MinIO object storage and returns its content as a Node.js Buffer.
 * Throws a NotFoundError if the file is missing, and an InternalServerError for other issues.
 */
async function readFileToBuffer(filePath) {
    try {
        if (config_1.config.storageProvider === 'minio') {
            const minio = minio_1.MinioService.getInstance();
            return await minio.getObjectBuffer(filePath);
        }
        // Check file stats to ensure it exists and is a file
        const stat = await promises_1.default.stat(filePath);
        if (!stat.isFile()) {
            throw new Error(`Path is not a file: ${filePath}`);
        }
        const data = await promises_1.default.readFile(filePath);
        return data;
    }
    catch (error) {
        if (error.code === 'ENOENT' || error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
            logger_1.logger.error(`File read failed: File not found at path ${filePath}`);
            throw new errors_1.NotFoundError(`File not found at path: ${filePath}`);
        }
        logger_1.logger.error(`File read failed for path ${filePath}:`, error);
        throw new errors_1.InternalServerError(`Failed to read file: ${error.message || String(error)}`);
    }
}
