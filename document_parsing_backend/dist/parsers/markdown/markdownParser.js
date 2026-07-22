"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownParser = void 0;
const marked_1 = require("marked");
const documentType_1 = require("../../types/documentType");
const htmlParser_1 = require("../html/htmlParser");
const fileReader_1 = require("../../utils/fileReader");
const errors_1 = require("../../utils/errors");
const logger_1 = require("../../utils/logger");
class MarkdownParser {
    htmlParser;
    constructor(htmlParser = new htmlParser_1.HtmlParser()) {
        this.htmlParser = htmlParser;
    }
    /**
     * Indicates if the parser supports the given DocumentType.
     */
    supports(type) {
        return type === documentType_1.DocumentType.MARKDOWN;
    }
    /**
     * Reads and parses a Markdown file, compiles it to HTML, and delegates to HtmlParser.
     */
    async parse(context) {
        const buffer = await (0, fileReader_1.readFileToBuffer)(context.filePath);
        const markdownString = buffer.toString('utf-8');
        if (markdownString.trim() === '') {
            throw new errors_1.BadRequestError('Empty Markdown file.');
        }
        try {
            // Marked translates markdown layout (headings, code blocks, lists) to standard HTML
            const htmlString = await marked_1.marked.parse(markdownString);
            // Delegate semantic DOM traversing to HtmlParser
            const parsedDoc = this.htmlParser.parseHtmlString(htmlString, context);
            // Customize metadata properties for Markdown
            parsedDoc.documentType = documentType_1.DocumentType.MARKDOWN;
            parsedDoc.metadata.sourceType = 'MARKDOWN';
            return parsedDoc;
        }
        catch (error) {
            logger_1.logger.error(`Error parsing Markdown file: ${context.filePath}`, error);
            throw new errors_1.BadRequestError(`Invalid or corrupted Markdown file: ${error.message || String(error)}`);
        }
    }
}
exports.MarkdownParser = MarkdownParser;
exports.default = MarkdownParser;
