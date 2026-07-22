"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonParser = void 0;
const documentType_1 = require("../../types/documentType");
const fileReader_1 = require("../../utils/fileReader");
const errors_1 = require("../../utils/errors");
const structuredDataNormalizer_1 = require("../common/structuredDataNormalizer");
class JsonParser {
    /**
     * Indicates if the parser supports the given DocumentType.
     */
    supports(type) {
        return type === documentType_1.DocumentType.JSON;
    }
    /**
     * Reads a JSON file, validates its structure, and transforms it into a ParsedDocument.
     */
    async parse(context) {
        const buffer = await (0, fileReader_1.readFileToBuffer)(context.filePath);
        const rawContent = buffer.toString('utf-8').trim();
        if (rawContent === '') {
            throw new errors_1.BadRequestError('Empty JSON file.');
        }
        let parsedData;
        try {
            parsedData = JSON.parse(rawContent);
        }
        catch (err) {
            throw new errors_1.BadRequestError(`Invalid JSON syntax: ${err.message}`);
        }
        const { objectCount, keysCount } = this.computeJsonMetrics(parsedData);
        // Extract title from original filename without extension
        const rootTitle = context.originalFileName.replace(/\.[^/.]+$/, '');
        const sections = (0, structuredDataNormalizer_1.normalizeStructuredData)(parsedData, rootTitle, 'json');
        return {
            documentId: context.documentId,
            documentType: documentType_1.DocumentType.JSON,
            metadata: {
                title: context.originalFileName,
                sourceType: 'JSON',
                objectCount,
                keysCount,
                totalPages: 1,
            },
            sections,
        };
    }
    /**
     * Iteratively counts the total number of objects and keys in the JSON tree.
     * Operates iteratively to prevent call stack overflow on deep payloads.
     */
    computeJsonMetrics(data) {
        let objectCount = 0;
        let keysCount = 0;
        if (data === null || typeof data !== 'object') {
            return { objectCount, keysCount };
        }
        const stack = [data];
        while (stack.length > 0) {
            const current = stack.pop();
            if (Array.isArray(current)) {
                for (const item of current) {
                    if (item !== null && typeof item === 'object') {
                        stack.push(item);
                    }
                }
            }
            else if (current !== null && typeof current === 'object') {
                objectCount++;
                const keys = Object.keys(current);
                keysCount += keys.length;
                for (const key of keys) {
                    const val = current[key];
                    if (val !== null && typeof val === 'object') {
                        stack.push(val);
                    }
                }
            }
        }
        return { objectCount, keysCount };
    }
}
exports.JsonParser = JsonParser;
exports.default = JsonParser;
