"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentExportService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config/config");
const markdownExporter_1 = require("../parsers/exporter/markdownExporter");
const jsonExporter_1 = require("../parsers/exporter/jsonExporter");
const logger_1 = require("../utils/logger");
class DocumentExportService {
    configOverride;
    constructor(configOverride) {
        this.configOverride = configOverride;
    }
    /**
     * Exports a ParsedDocument to configured output formats on disk.
     * Returns saved filepaths.
     */
    async exportDocument(documentId, parsedDocument) {
        if (!parsedDocument) {
            throw new Error('Invalid ParsedDocument: Document content is null or undefined.');
        }
        const results = {};
        const mdDir = path_1.default.join(config_1.config.uploadsDir, 'markdown');
        const jsonDir = path_1.default.join(config_1.config.uploadsDir, 'json');
        const enableMarkdown = this.configOverride?.enableMarkdownExport !== undefined
            ? this.configOverride.enableMarkdownExport
            : config_1.config.enableMarkdownExport;
        const enableJson = this.configOverride?.enableJsonExport !== undefined
            ? this.configOverride.enableJsonExport
            : config_1.config.enableJsonExport;
        try {
            // 1. Export to Markdown if enabled
            if (enableMarkdown) {
                if (!fs_1.default.existsSync(mdDir)) {
                    fs_1.default.mkdirSync(mdDir, { recursive: true });
                }
                const exporter = new markdownExporter_1.MarkdownExporter();
                const mdContent = await exporter.export(parsedDocument);
                const mdFilePath = path_1.default.join(mdDir, `${documentId}.md`);
                fs_1.default.writeFileSync(mdFilePath, mdContent, 'utf-8');
                logger_1.logger.debug(`[Export Service] Exported Markdown to: ${mdFilePath}`);
                results.markdownPath = mdFilePath;
            }
            // 2. Export to JSON if enabled
            if (enableJson) {
                if (!fs_1.default.existsSync(jsonDir)) {
                    fs_1.default.mkdirSync(jsonDir, { recursive: true });
                }
                const exporter = new jsonExporter_1.JsonExporter();
                const jsonContent = await exporter.export(parsedDocument);
                const jsonFilePath = path_1.default.join(jsonDir, `${documentId}.json`);
                fs_1.default.writeFileSync(jsonFilePath, jsonContent, 'utf-8');
                logger_1.logger.debug(`[Export Service] Exported JSON to: ${jsonFilePath}`);
                results.jsonPath = jsonFilePath;
            }
        }
        catch (error) {
            logger_1.logger.error(`[Export Service] Failed to write exported files for document ${documentId}:`, error);
            throw new Error(`Document export failed: ${error.message}`);
        }
        return results;
    }
}
exports.DocumentExportService = DocumentExportService;
exports.default = DocumentExportService;
