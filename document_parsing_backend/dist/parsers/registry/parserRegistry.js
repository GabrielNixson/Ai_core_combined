"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserRegistry = void 0;
const logger_1 = require("../../utils/logger");
class ParserRegistry {
    static parsers = new Map();
    /**
     * Registers a parser instance for a specific DocumentType.
     */
    static register(type, parser) {
        this.parsers.set(type, parser);
        logger_1.logger.debug(`Parser registered for type: ${type}`);
    }
    /**
     * Retrieves the registered parser instance for a DocumentType, or null if none exists.
     */
    static getParser(type) {
        return this.parsers.get(type) || null;
    }
    /**
     * Clears all registrations. Primarily used for clean-up/testing.
     */
    static clear() {
        this.parsers.clear();
        logger_1.logger.debug('Parser registry cleared.');
    }
}
exports.ParserRegistry = ParserRegistry;
exports.default = ParserRegistry;
