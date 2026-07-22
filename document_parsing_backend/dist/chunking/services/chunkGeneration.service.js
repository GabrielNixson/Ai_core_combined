"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChunkGenerationService = void 0;
const tokenEstimator_1 = require("../utils/tokenEstimator");
const headingChunkStrategy_1 = require("../strategies/headingChunkStrategy");
const paragraphChunkStrategy_1 = require("../strategies/paragraphChunkStrategy");
const tableChunkStrategy_1 = require("../strategies/tableChunkStrategy");
const structuredDataChunkStrategy_1 = require("../strategies/structuredDataChunkStrategy");
const spreadsheetChunkStrategy_1 = require("../strategies/spreadsheetChunkStrategy");
const presentationChunkStrategy_1 = require("../strategies/presentationChunkStrategy");
class ChunkGenerationService {
    settings;
    strategies;
    constructor(settings = {}) {
        this.settings = {
            maxChunkTokens: settings.maxChunkTokens ?? 500,
            minChunkTokens: settings.minChunkTokens ?? 50,
            mergeSmallChunks: settings.mergeSmallChunks ?? true,
            preserveTables: settings.preserveTables ?? true,
            preserveMetadata: settings.preserveMetadata ?? true,
        };
        this.strategies = new Map([
            ['heading', new headingChunkStrategy_1.HeadingChunkStrategy()],
            ['paragraph', new paragraphChunkStrategy_1.ParagraphChunkStrategy()],
            ['list', new paragraphChunkStrategy_1.ParagraphChunkStrategy()],
            ['image', new paragraphChunkStrategy_1.ParagraphChunkStrategy()], // Fallback image to visual text placeholder
            ['table', new tableChunkStrategy_1.TableChunkStrategy()],
            ['json', new structuredDataChunkStrategy_1.StructuredDataChunkStrategy()],
            ['json-array', new structuredDataChunkStrategy_1.StructuredDataChunkStrategy()],
            ['xml', new structuredDataChunkStrategy_1.StructuredDataChunkStrategy()],
            ['xml-array', new structuredDataChunkStrategy_1.StructuredDataChunkStrategy()],
            ['spreadsheet', new spreadsheetChunkStrategy_1.SpreadsheetChunkStrategy()],
            ['slide', new presentationChunkStrategy_1.PresentationChunkStrategy()],
        ]);
    }
    /**
     * Orchestrates document decomposition. Traverses sections, matches blocks to strategies, and merges text.
     */
    generateChunks(doc) {
        if (!doc) {
            throw new Error('Invalid ParsedDocument: Document is null or undefined.');
        }
        const docId = doc.documentId;
        const docTitle = doc.metadata?.title || 'Unknown';
        const sourceType = doc.metadata?.sourceType || 'Unknown';
        const finalChunks = [];
        let globalChunkIndex = 0;
        for (const section of doc.sections) {
            // 1. Find slide notes inside section if present
            let sectionNotes = '';
            for (const block of section.content) {
                if (block.type === 'notes') {
                    sectionNotes = String(block.content);
                    break;
                }
            }
            // 2. Generate raw chunks for each content block in section
            const rawChunks = [];
            for (const block of section.content) {
                // Skip standalone notes block as it gets integrated inside slide block strategy
                if (block.type === 'notes') {
                    continue;
                }
                const strategy = this.strategies.get(block.type);
                if (!strategy) {
                    // Fallback strategy for unsupported blocks
                    const fallback = new paragraphChunkStrategy_1.ParagraphChunkStrategy();
                    const context = {
                        documentId: docId,
                        title: docTitle,
                        section: section.title,
                        sourceType,
                    };
                    rawChunks.push(...fallback.chunk(block, context));
                    continue;
                }
                const context = {
                    documentId: docId,
                    title: docTitle,
                    section: section.title,
                    sourceType,
                    notes: sectionNotes,
                };
                rawChunks.push(...strategy.chunk(block, context));
            }
            // 3. Apply semantic merge builder
            const mergedSectionChunks = this.mergeSectionChunks(rawChunks);
            // 4. Finalize document chunk structures
            for (const raw of mergedSectionChunks) {
                const charCount = raw.content.length;
                const tokenEst = tokenEstimator_1.TokenEstimator.estimateTokens(raw.content);
                const chunk = {
                    chunkId: `chunk-${docId}-${globalChunkIndex}`,
                    documentId: docId,
                    chunkIndex: globalChunkIndex,
                    content: raw.content,
                    contentType: raw.contentType,
                    title: docTitle,
                    section: section.title,
                    pageStart: raw.pageStart,
                    pageEnd: raw.pageEnd,
                    slideNumber: raw.slideNumber,
                    metadata: this.settings.preserveMetadata ? raw.metadata : undefined,
                    tokenEstimate: tokenEst,
                    characterCount: charCount,
                    createdAt: new Date(),
                };
                finalChunks.push(chunk);
                globalChunkIndex++;
            }
        }
        return finalChunks;
    }
    /**
     * Merges contiguous small text blocks within a section up to maxChunkTokens limit.
     */
    mergeSectionChunks(rawChunks) {
        if (rawChunks.length === 0)
            return [];
        if (!this.settings.mergeSmallChunks)
            return rawChunks;
        const merged = [];
        let currentTextChunk = null;
        for (const chunk of rawChunks) {
            const isMergeable = chunk.contentType === 'TEXT' || chunk.contentType === 'HEADING';
            if (!isMergeable) {
                // Flush any active text block first
                if (currentTextChunk) {
                    merged.push(currentTextChunk);
                    currentTextChunk = null;
                }
                merged.push(chunk);
                continue;
            }
            if (!currentTextChunk) {
                currentTextChunk = { ...chunk };
                currentTextChunk.contentType = 'TEXT';
            }
            else {
                const potentialContent = currentTextChunk.content + '\n\n' + chunk.content;
                const potentialTokens = tokenEstimator_1.TokenEstimator.estimateTokens(potentialContent);
                if (potentialTokens <= this.settings.maxChunkTokens) {
                    currentTextChunk.content = potentialContent;
                    if (chunk.pageStart !== undefined) {
                        currentTextChunk.pageStart = currentTextChunk.pageStart !== undefined
                            ? Math.min(currentTextChunk.pageStart, chunk.pageStart)
                            : chunk.pageStart;
                    }
                    if (chunk.pageEnd !== undefined) {
                        currentTextChunk.pageEnd = currentTextChunk.pageEnd !== undefined
                            ? Math.max(currentTextChunk.pageEnd, chunk.pageEnd)
                            : chunk.pageEnd;
                    }
                    if (chunk.metadata || currentTextChunk.metadata) {
                        currentTextChunk.metadata = {
                            ...currentTextChunk.metadata,
                            ...chunk.metadata,
                        };
                    }
                }
                else {
                    // Flush current and start a new merged block
                    merged.push(currentTextChunk);
                    currentTextChunk = { ...chunk };
                    currentTextChunk.contentType = 'TEXT';
                }
            }
        }
        if (currentTextChunk) {
            merged.push(currentTextChunk);
        }
        return merged;
    }
}
exports.ChunkGenerationService = ChunkGenerationService;
exports.default = ChunkGenerationService;
