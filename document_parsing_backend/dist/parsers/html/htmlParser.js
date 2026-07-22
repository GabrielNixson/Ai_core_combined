"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HtmlParser = void 0;
const cheerio = __importStar(require("cheerio"));
const documentType_1 = require("../../types/documentType");
const fileReader_1 = require("../../utils/fileReader");
const textNormalizer_1 = require("../common/textNormalizer");
const errors_1 = require("../../utils/errors");
class HtmlParser {
    /**
     * Indicates if the parser supports the given DocumentType.
     */
    supports(type) {
        return type === documentType_1.DocumentType.HTML;
    }
    /**
     * Reads the file from disk and parses it.
     */
    async parse(context) {
        const buffer = await (0, fileReader_1.readFileToBuffer)(context.filePath);
        const htmlString = buffer.toString('utf-8');
        if (htmlString.trim() === '') {
            throw new errors_1.BadRequestError('Empty HTML file.');
        }
        return this.parseHtmlString(htmlString, context);
    }
    /**
     * Parsed raw HTML string into ParsedDocument.
     * This is exposed so that DocxParser and MarkdownParser can reuse the HTML traversal logic.
     */
    parseHtmlString(htmlContent, context) {
        const $ = cheerio.load(htmlContent);
        // Remove noise elements
        $('script, style, nav, footer, header, noscript, iframe, link, meta, comment').remove();
        // Extract Title
        let title = $('title').first().text().trim();
        if (!title) {
            title = $('h1').first().text().trim();
        }
        title = textNormalizer_1.TextNormalizer.normalizeWhitespace(title || context.originalFileName);
        const sections = [];
        let currentSection = null;
        const createNewSection = (sectionTitle, level) => {
            const section = {
                title: textNormalizer_1.TextNormalizer.normalizeWhitespace(sectionTitle),
                level,
                content: [],
            };
            sections.push(section);
            return section;
        };
        // Core list of block level selectors we want to process sequentially
        const blockSelectors = 'h1, h2, h3, h4, h5, h6, p, ul, ol, table, pre';
        // Find all blocks within body or container root
        const container = $('body').length > 0 ? $('body') : $(':root');
        const elements = container.find(blockSelectors);
        elements.each((_, el) => {
            const $el = $(el);
            // Check if this element is inside another block element we are already processing
            // e.g., if this is a <li> inside a <ul>, or a <p> inside a <blockquote>,
            // we let the parent handle the parsing to prevent duplicate entries.
            const parentBlock = $el.parent().closest(blockSelectors);
            if (parentBlock.length > 0) {
                return;
            }
            const tagName = el.tagName.toLowerCase();
            // 1. Heading Tags (h1 - h6)
            if (/^h[1-6]$/.test(tagName)) {
                const level = parseInt(tagName.charAt(1), 10);
                const headingText = $el.text().trim();
                if (headingText) {
                    currentSection = createNewSection(headingText, level);
                }
            }
            // 2. Table Tag
            else if (tagName === 'table') {
                const rows = [];
                $el.find('tr').each((_, tr) => {
                    const cells = [];
                    $(tr)
                        .find('th, td')
                        .each((_, cell) => {
                        cells.push(textNormalizer_1.TextNormalizer.normalizeWhitespace($(cell).text()));
                    });
                    if (cells.length > 0) {
                        rows.push(cells);
                    }
                });
                if (rows.length > 0) {
                    if (!currentSection) {
                        currentSection = createNewSection('Document Body', 1);
                    }
                    currentSection.content.push({
                        type: 'table',
                        content: { rows },
                        metadata: {
                            page: 1, // HTML documents are pageless by default
                        },
                    });
                }
            }
            // 3. Lists Tag (ul, ol)
            else if (tagName === 'ul' || tagName === 'ol') {
                const items = [];
                $el.find('li').each((_, li) => {
                    const text = textNormalizer_1.TextNormalizer.normalizeWhitespace($(li).text());
                    if (text) {
                        items.push(text);
                    }
                });
                if (items.length > 0) {
                    if (!currentSection) {
                        currentSection = createNewSection('Document Body', 1);
                    }
                    currentSection.content.push({
                        type: 'list',
                        content: items,
                        metadata: {
                            page: 1,
                        },
                    });
                }
            }
            // 4. Code / Pre blocks
            else if (tagName === 'pre') {
                const codeText = $el.text().trim();
                if (codeText) {
                    if (!currentSection) {
                        currentSection = createNewSection('Document Body', 1);
                    }
                    currentSection.content.push({
                        type: 'code_block',
                        content: codeText,
                        metadata: {
                            page: 1,
                        },
                    });
                }
            }
            // 5. Paragraph Tags
            else if (tagName === 'p') {
                const text = textNormalizer_1.TextNormalizer.normalizeWhitespace($el.text());
                if (text) {
                    if (!currentSection) {
                        currentSection = createNewSection('Document Body', 1);
                    }
                    currentSection.content.push({
                        type: 'paragraph',
                        content: text,
                        metadata: {
                            page: 1,
                        },
                    });
                }
            }
        });
        // Fallback if no block elements or sections were parsed successfully
        if (sections.length === 0) {
            const fallbackText = textNormalizer_1.TextNormalizer.cleanText(container.text());
            if (fallbackText) {
                currentSection = createNewSection('Document Body', 1);
                currentSection.content.push({
                    type: 'paragraph',
                    content: fallbackText,
                    metadata: {
                        page: 1,
                    },
                });
            }
        }
        return {
            documentId: context.documentId,
            documentType: documentType_1.DocumentType.HTML,
            metadata: {
                title,
                totalPages: 1,
                sourceType: 'HTML',
            },
            sections,
        };
    }
}
exports.HtmlParser = HtmlParser;
exports.default = HtmlParser;
