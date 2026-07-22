"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownExporter = void 0;
class MarkdownExporter {
    /**
     * Translates ParsedDocument structures into a complete Markdown string.
     */
    async export(doc) {
        const lines = [];
        // 1. Write YAML Frontmatter Metadata
        lines.push('---');
        lines.push(`documentId: "${doc.documentId}"`);
        lines.push(`documentType: "${doc.documentType}"`);
        if (doc.metadata) {
            for (const [key, val] of Object.entries(doc.metadata)) {
                if (typeof val === 'object' && val !== null) {
                    lines.push(`${key}: ${JSON.stringify(val)}`);
                }
                else if (typeof val === 'string') {
                    lines.push(`${key}: "${val.replace(/"/g, '\\"')}"`);
                }
                else {
                    lines.push(`${key}: ${val}`);
                }
            }
        }
        lines.push('---');
        lines.push('');
        // 2. Traverse sections and blocks
        for (const section of doc.sections) {
            const headingSymbol = '#'.repeat(Math.max(1, section.level));
            lines.push(`${headingSymbol} ${section.title}`);
            lines.push('');
            for (const block of section.content) {
                const blockContent = this.formatBlock(block, section.level);
                if (blockContent) {
                    lines.push(blockContent);
                    lines.push('');
                }
            }
        }
        return lines.join('\n').trim() + '\n';
    }
    /**
     * Serializes a single ContentBlock into markdown syntax.
     */
    formatBlock(block, sectionLevel) {
        switch (block.type) {
            case 'heading':
                const sublevel = '#'.repeat(sectionLevel + 1);
                return `${sublevel} ${block.content}`;
            case 'paragraph':
                return String(block.content);
            case 'list':
                if (Array.isArray(block.content)) {
                    return block.content.map(item => `- ${item}`).join('\n');
                }
                return `- ${String(block.content)}`;
            case 'table':
            case 'spreadsheet':
                return this.convertTableToMarkdown(block.content);
            case 'json':
            case 'json-array':
                return '```json\n' + JSON.stringify(block.content, null, 2) + '\n```';
            case 'xml':
            case 'xml-array':
                return '```xml\n' + (typeof block.content === 'string' ? block.content : JSON.stringify(block.content, null, 2)) + '\n```';
            case 'image':
                const img = block.content || {};
                return `![Image: ${img.fileName || 'image'}](${img.fileName || ''}) [Dimensions: ${img.width || 0}x${img.height || 0}, Status: ${img.ocrStatus || 'NOT_PROCESSED'}]`;
            case 'notes':
                return `> **Speaker Notes:** ${block.content}`;
            case 'slide':
                const slide = block.content || {};
                return `<!-- Slide: ${slide.slideNumber || 0} | Title: ${slide.title || 'Slide'} -->`;
            default:
                if (typeof block.content === 'object' && block.content !== null) {
                    return '```json\n' + JSON.stringify(block.content, null, 2) + '\n```';
                }
                return String(block.content);
        }
    }
    /**
     * Formats structured table models (DOCX matrix lists, CSV records, XLSX grid cells) to GFM tables.
     */
    convertTableToMarkdown(content) {
        if (!content)
            return '';
        const columns = content.columns || [];
        const rows = content.rows || [];
        if (columns.length === 0 && rows.length === 0) {
            return '';
        }
        let mdHeaders = [...columns];
        let mdRows = [];
        if (Array.isArray(rows[0])) {
            // DOCX matrix array of arrays format
            if (mdHeaders.length === 0) {
                mdHeaders = rows[0] || [];
                mdRows = rows.slice(1);
            }
            else {
                mdRows = rows;
            }
        }
        else {
            // CSV/XLSX array of objects format
            mdRows = rows.map((row) => {
                return mdHeaders.map((col) => {
                    const cell = row[col];
                    if (cell === undefined || cell === null) {
                        return '';
                    }
                    if (typeof cell === 'object' && cell.value !== undefined) {
                        if (cell.value instanceof Date) {
                            return cell.value.toISOString();
                        }
                        return String(cell.value);
                    }
                    return String(cell);
                });
            });
        }
        const cleanHeaders = mdHeaders.map(h => String(h).trim() || ' ');
        const headerStr = '| ' + cleanHeaders.join(' | ') + ' |';
        const separatorStr = '| ' + cleanHeaders.map(() => '---').join(' | ') + ' |';
        const rowStrs = mdRows.map((row) => {
            const paddedRow = cleanHeaders.map((_, i) => {
                const val = row[i] !== undefined ? String(row[i]) : '';
                return val.replace(/\|/g, '\\|').trim();
            });
            return '| ' + paddedRow.join(' | ') + ' |';
        });
        return [headerStr, separatorStr, ...rowStrs].join('\n');
    }
}
exports.MarkdownExporter = MarkdownExporter;
exports.default = MarkdownExporter;
