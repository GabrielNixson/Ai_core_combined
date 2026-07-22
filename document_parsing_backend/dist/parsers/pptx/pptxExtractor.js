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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PptxExtractor = void 0;
const jszip_1 = __importDefault(require("jszip"));
const cheerio = __importStar(require("cheerio"));
class PptxExtractor {
    /**
     * Extracts raw structured slides and metadata from a PPTX file buffer.
     */
    async extract(buffer) {
        const zip = await jszip_1.default.loadAsync(buffer);
        // 1. Extract Author (Creator)
        let author = 'Unknown';
        const coreXmlFile = zip.file('docProps/core.xml');
        if (coreXmlFile) {
            const coreText = await coreXmlFile.async('text');
            const $core = cheerio.load(coreText, { xmlMode: true });
            author = $core('dc\\:creator').text().trim() || $core('creator').text().trim() || 'Unknown';
        }
        // 2. Resolve Slide File Paths in Correct Order
        const slidePaths = await this.resolveSlidePaths(zip);
        // 3. Parse each slide sequentially
        const slides = [];
        for (let i = 0; i < slidePaths.length; i++) {
            const slidePath = slidePaths[i];
            const slideNum = i + 1;
            const slideFile = zip.file(slidePath);
            if (!slideFile)
                continue;
            const slideText = await slideFile.async('text');
            const $slide = cheerio.load(slideText, { xmlMode: true });
            // Identify relationship path to extract notes & images links
            const slideFilename = slidePath.split('/').pop() || '';
            const relPath = `ppt/slides/_rels/${slideFilename}.rels`;
            const relFile = zip.file(relPath);
            let notesPath = null;
            const images = [];
            if (relFile) {
                const relText = await relFile.async('text');
                const $rels = cheerio.load(relText, { xmlMode: true });
                $rels('Relationship').each((_, rel) => {
                    const type = rel.attribs.Type || '';
                    const target = rel.attribs.Target || '';
                    const relId = rel.attribs.Id || '';
                    if (type.endsWith('/notesSlide')) {
                        // Target is relative like "../notesSlides/notesSlide1.xml"
                        notesPath = 'ppt/' + target.replace(/^\.\.\//, '');
                    }
                    else if (type.endsWith('/image')) {
                        const imageName = target.split('/').pop() || 'image';
                        images.push({
                            relationId: relId,
                            name: imageName,
                            contentType: this.inferMimeType(imageName),
                        });
                    }
                });
            }
            // Extract notes content if linked notes slide exists
            let notes;
            if (notesPath) {
                const notesFile = zip.file(notesPath);
                if (notesFile) {
                    const notesText = await notesFile.async('text');
                    const $notes = cheerio.load(notesText, { xmlMode: true });
                    const textRuns = [];
                    $notes('a\\:t').each((_, t) => {
                        textRuns.push($notes(t).text());
                    });
                    notes = textRuns.join(' ').replace(/\s+/g, ' ').trim();
                }
            }
            // Parse slide element shapes sequentially
            const elements = [];
            let slideTitle = '';
            // Slide canvas shapes root: <p:spTree>
            const spTree = $slide('p\\:spTree');
            // Select shapes, text boxes, and table containers sequentially
            spTree.find('p\\:sp, p\\:graphicFrame, p\\:pic').each((_, element) => {
                const elTagName = element.tagName;
                const $el = $slide(element);
                if (elTagName === 'p:sp') {
                    // 1. Text Shape
                    const isTitle = $el.find('p\\:ph[type="title"], p\\:ph[type="ctrTitle"]').length > 0;
                    const paragraphs = $el.find('a\\:p');
                    if (paragraphs.length > 0) {
                        let activeList = [];
                        paragraphs.each((_, p) => {
                            const $p = $slide(p);
                            const text = this.getParagraphText($p);
                            if (text === '')
                                return;
                            // Check if paragraph is list item
                            const isList = $p.find('a\\:pPr').attr('lvl') !== undefined ||
                                $p.find('a\\:buChar').length > 0 ||
                                $p.find('a\\:buAutoNum').length > 0 ||
                                $p.find('a\\:buNone').length === 0 && ($p.find('a\\:pPr').length > 0);
                            if (isList) {
                                activeList.push(text);
                            }
                            else {
                                // If there's an active list, flush it first
                                if (activeList.length > 0) {
                                    elements.push({ type: 'list', content: activeList });
                                    activeList = [];
                                }
                                if (isTitle) {
                                    if (!slideTitle)
                                        slideTitle = text;
                                    elements.push({ type: 'heading', content: text });
                                }
                                else {
                                    elements.push({ type: 'paragraph', content: text });
                                }
                            }
                        });
                        // Flush remaining list items
                        if (activeList.length > 0) {
                            elements.push({ type: 'list', content: activeList });
                        }
                    }
                }
                else if (elTagName === 'p:graphicFrame') {
                    // 2. Table Shape
                    const table = $el.find('a\\:tbl');
                    if (table.length > 0) {
                        const tableContent = this.parseTable(table, $slide);
                        if (tableContent) {
                            elements.push({ type: 'table', content: tableContent });
                        }
                    }
                }
            });
            // Default slide title fallback
            if (!slideTitle) {
                slideTitle = `Slide ${slideNum}`;
            }
            slides.push({
                slideNumber: slideNum,
                title: slideTitle,
                elements,
                notes,
                images,
            });
        }
        return {
            slides,
            slideCount: slides.length,
            author,
        };
    }
    /**
     * Resolves list of slide XML paths in presentation slide order.
     */
    async resolveSlidePaths(zip) {
        const slidePaths = [];
        // Parse presentation relationships
        const relsFile = zip.file('ppt/_rels/presentation.xml.rels');
        const relIdMap = new Map();
        if (relsFile) {
            const relsText = await relsFile.async('text');
            const $rels = cheerio.load(relsText, { xmlMode: true });
            $rels('Relationship').each((_, rel) => {
                const id = rel.attribs.Id;
                const target = rel.attribs.Target;
                if (id && target) {
                    // Relationships targets in presentation are relative e.g., "slides/slide1.xml"
                    relIdMap.set(id, 'ppt/' + target);
                }
            });
        }
        // Parse ordered slides list in presentation.xml
        const presFile = zip.file('ppt/presentation.xml');
        if (presFile) {
            const presText = await presFile.async('text');
            const $pres = cheerio.load(presText, { xmlMode: true });
            $pres('p\\:sldIdLst p\\:sldId').each((_, sld) => {
                const rId = sld.attribs['r:id'] || sld.attribs.id;
                if (rId) {
                    const path = relIdMap.get(rId);
                    if (path && zip.file(path)) {
                        slidePaths.push(path);
                    }
                }
            });
        }
        // Fallback: If presentation order mapping failed, sort slide filenames numerically
        if (slidePaths.length === 0) {
            const slideFiles = zip.filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path));
            slidePaths.push(...slideFiles
                .map((f) => f.name)
                .sort((a, b) => {
                const numA = parseInt(a.replace(/[^\d]/g, ''), 10);
                const numB = parseInt(b.replace(/[^\d]/g, ''), 10);
                return numA - numB;
            }));
        }
        return slidePaths;
    }
    /**
     * Concatenates all text runs (<a:t>) inside a paragraph element.
     */
    getParagraphText($p) {
        const textParts = [];
        $p.find('a\\:t').each((_, t) => {
            textParts.push($p.find(t).text());
        });
        return textParts.join('').trim();
    }
    /**
     * Deconstructs a slide table element into columns and row entries.
     */
    parseTable(table, $) {
        const rows = [];
        table.find('a\\:tr').each((_, tr) => {
            const cells = [];
            $(tr).find('a\\:tc').each((_, tc) => {
                const textParts = [];
                $(tc).find('a\\:t').each((_, t) => {
                    textParts.push($(t).text());
                });
                cells.push(textParts.join('').trim());
            });
            if (cells.length > 0) {
                rows.push(cells);
            }
        });
        if (rows.length === 0)
            return null;
        // Use first row cells as columns header, rest as rows.
        const firstRow = rows[0] || [];
        const columns = firstRow.map((col, index) => col !== '' ? col : `Column_${index + 1}`);
        const dataRows = rows.slice(1);
        return { columns, rows: dataRows };
    }
    /**
     * Infers image mime types from suffix file extensions.
     */
    inferMimeType(filename) {
        const ext = filename.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'png': return 'image/png';
            case 'jpg':
            case 'jpeg': return 'image/jpeg';
            case 'gif': return 'image/gif';
            case 'webp': return 'image/webp';
            default: return 'image/octet-stream';
        }
    }
}
exports.PptxExtractor = PptxExtractor;
exports.default = PptxExtractor;
