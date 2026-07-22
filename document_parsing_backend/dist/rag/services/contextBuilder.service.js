"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextBuilder = void 0;
const logger_1 = require("../../utils/logger");
class ContextBuilder {
    /**
     * Deduplicates, sorts logically, and structures retrieved chunks into a single formatted context string.
     */
    buildContext(chunks) {
        if (chunks.length === 0) {
            return { contextText: '', deduplicated: [] };
        }
        // 1. Remove duplicate chunks by chunkId
        const uniqueMap = new Map();
        for (const chunk of chunks) {
            if (!uniqueMap.has(chunk.chunkId)) {
                uniqueMap.set(chunk.chunkId, chunk);
            }
        }
        const deduplicated = Array.from(uniqueMap.values());
        // 2. Sort chunks logically: Document Title -> Section -> PageStart -> Chunk Index/Id
        deduplicated.sort((a, b) => {
            const titleComparison = a.title.localeCompare(b.title);
            if (titleComparison !== 0)
                return titleComparison;
            const secA = a.section || '';
            const secB = b.section || '';
            const sectionComparison = secA.localeCompare(secB);
            if (sectionComparison !== 0)
                return sectionComparison;
            const pageA = a.pageStart ?? -1;
            const pageB = b.pageStart ?? -1;
            if (pageA !== pageB)
                return pageA - pageB;
            const slideA = a.slideNumber ?? -1;
            const slideB = b.slideNumber ?? -1;
            if (slideA !== slideB)
                return slideA - slideB;
            return a.chunkId.localeCompare(b.chunkId);
        });
        // 3. Format the context text block with boundaries
        let contextText = '--- START RETRIEVED CONTEXT ---\n\n';
        let currentDoc = '';
        let currentSection = '';
        for (const chunk of deduplicated) {
            if (chunk.title !== currentDoc) {
                currentDoc = chunk.title;
                contextText += `Document: "${currentDoc}"\n`;
            }
            if ((chunk.section || '') !== currentSection) {
                currentSection = chunk.section || '';
                contextText += `Section: "${currentSection || 'General'}"\n`;
            }
            const pages = chunk.pageStart !== null
                ? chunk.pageEnd !== null && chunk.pageEnd !== chunk.pageStart
                    ? ` (Pages ${chunk.pageStart}-${chunk.pageEnd})`
                    : ` (Page ${chunk.pageStart})`
                : chunk.slideNumber !== null
                    ? ` (Slide ${chunk.slideNumber})`
                    : '';
            contextText += `[Chunk ID: ${chunk.chunkId}]${pages}\nContent:\n${chunk.content}\n---\n\n`;
        }
        contextText += '--- END RETRIEVED CONTEXT ---';
        logger_1.logger.debug(`[Context Builder] Compiled logical context from ${deduplicated.length} chunks.`);
        return { contextText, deduplicated };
    }
}
exports.ContextBuilder = ContextBuilder;
exports.default = ContextBuilder;
