"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfParser = void 0;
const documentType_1 = require("../../types/documentType");
const pdfExtractor_1 = require("./pdfExtractor");
const fileReader_1 = require("../../utils/fileReader");
const errors_1 = require("../../utils/errors");
class PdfParser {
    extractor;
    constructor(extractor = new pdfExtractor_1.PdfExtractor()) {
        this.extractor = extractor;
    }
    /**
     * Returns true if the parser supports the requested document format.
     */
    supports(type) {
        return type === documentType_1.DocumentType.PDF;
    }
    /**
     * Converts the PDF file into a Structured Document layout.
     */
    async parse(context) {
        // 1. Read file to buffer
        const buffer = await (0, fileReader_1.readFileToBuffer)(context.filePath);
        // 2. Validate empty files
        if (buffer.length === 0) {
            throw new errors_1.BadRequestError('Empty PDF file.');
        }
        // 3. Extract metadata and sorted lines page-by-page
        const { metadata, pages } = await this.extractor.extract(buffer);
        const sections = [];
        let currentSection = null;
        // Helper to add and register a new section
        const createNewSection = (title, level) => {
            const section = {
                title,
                level,
                content: [],
            };
            sections.push(section);
            return section;
        };
        // 4. Iterate over lines to group them into headings & body paragraphs
        for (const page of pages) {
            const pageNum = page.pageNumber;
            for (const line of page.lines) {
                const text = line.text;
                const fontSize = line.fontSize;
                // Basic heading detection heuristic based on font size threshold
                // Standard body is ~9-11pt. We treat >= 13pt as a heading line.
                const isHeading = fontSize >= 13.0;
                if (isHeading) {
                    // Map heading levels:
                    // >= 19pt -> H1
                    // >= 15pt -> H2
                    // Else -> H3
                    let level = 3;
                    if (fontSize >= 19.0) {
                        level = 1;
                    }
                    else if (fontSize >= 15.0) {
                        level = 2;
                    }
                    currentSection = createNewSection(text, level);
                }
                else {
                    // If no section has been encountered yet, construct a default body section
                    if (!currentSection) {
                        currentSection = createNewSection('Document Body', 1);
                    }
                    const block = {
                        type: 'paragraph',
                        content: text,
                        metadata: {
                            page: pageNum, // Preserves pagination source reference
                        },
                    };
                    currentSection.content.push(block);
                }
            }
        }
        return {
            documentId: context.documentId,
            documentType: documentType_1.DocumentType.PDF,
            metadata,
            sections,
        };
    }
}
exports.PdfParser = PdfParser;
exports.default = PdfParser;
