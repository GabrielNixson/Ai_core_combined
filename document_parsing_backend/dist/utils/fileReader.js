"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readFileToBuffer = readFileToBuffer;
const promises_1 = __importDefault(require("fs/promises"));
const errors_1 = require("./errors");
const logger_1 = require("./logger");
/**
 * Reads a file from the local filesystem and returns its content as a Node.js Buffer.
 * Throws a NotFoundError if the file is missing, and an InternalServerError for other issues.
 */
async function readFileToBuffer(filePath) {
    try {
        // Check file stats to ensure it exists and is a file
        const stat = await promises_1.default.stat(filePath);
        if (!stat.isFile()) {
            throw new Error(`Path is not a file: ${filePath}`);
        }
        const data = await promises_1.default.readFile(filePath);
        return data;
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            logger_1.logger.error(`File read failed: File not found at path ${filePath}`);
            throw new errors_1.NotFoundError(`File not found at path: ${filePath}`);
        }
        logger_1.logger.error(`File read failed for path ${filePath}:`, error);
        throw new errors_1.InternalServerError(`Failed to read file from disk: ${error.message || String(error)}`);
    }
}
