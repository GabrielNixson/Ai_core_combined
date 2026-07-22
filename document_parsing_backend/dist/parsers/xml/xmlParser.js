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
exports.XmlParser = void 0;
const cheerio = __importStar(require("cheerio"));
const documentType_1 = require("../../types/documentType");
const fileReader_1 = require("../../utils/fileReader");
const errors_1 = require("../../utils/errors");
const structuredDataNormalizer_1 = require("../common/structuredDataNormalizer");
class XmlParser {
    /**
     * Indicates if the parser supports the given DocumentType.
     */
    supports(type) {
        return type === documentType_1.DocumentType.XML;
    }
    /**
     * Reads an XML file, validates its structure, and transforms it into a ParsedDocument.
     */
    async parse(context) {
        const buffer = await (0, fileReader_1.readFileToBuffer)(context.filePath);
        const rawContent = buffer.toString('utf-8').trim();
        if (rawContent === '') {
            throw new errors_1.BadRequestError('Empty XML file.');
        }
        // Perform strict syntax validation for tag integrity
        try {
            this.validateXmlSyntax(rawContent);
        }
        catch (err) {
            throw new errors_1.BadRequestError(`Invalid XML syntax: ${err.message}`);
        }
        let $;
        try {
            $ = cheerio.load(rawContent, { xmlMode: true });
        }
        catch (err) {
            throw new errors_1.BadRequestError(`Invalid XML parsing: ${err.message}`);
        }
        // Check for single root element constraint
        const rootChildren = $.root().children().filter((_, el) => el.type === 'tag');
        if (rootChildren.length === 0) {
            throw new errors_1.BadRequestError('Malformed XML: Missing root node.');
        }
        if (rootChildren.length > 1) {
            throw new errors_1.BadRequestError('Malformed XML: Multiple root elements.');
        }
        const rootEl = rootChildren.get(0);
        const { elementCount, attributeCount } = this.computeXmlMetrics($);
        // Recursively transform Cheerio DOM starting from the root element
        const rootTagName = rootEl.tagName || 'xml';
        const parsedData = this.parseXmlNode(rootEl, $);
        const sections = (0, structuredDataNormalizer_1.normalizeStructuredData)(parsedData, rootTagName, 'xml');
        return {
            documentId: context.documentId,
            documentType: documentType_1.DocumentType.XML,
            metadata: {
                title: context.originalFileName,
                sourceType: 'XML',
                elementCount,
                attributeCount,
                totalPages: 1,
            },
            sections,
        };
    }
    /**
     * Translates a Cheerio DOM element into a clean JavaScript Object representation.
     * Handles text elements, element attributes, and lists of repeated nodes.
     */
    parseXmlNode(el, $) {
        const attributes = el.attribs || {};
        const hasAttributes = Object.keys(attributes).length > 0;
        const children = $(el).children();
        // Leaf node: No child elements
        if (children.length === 0) {
            const value = $(el).text().trim();
            if (hasAttributes) {
                return { attributes, value };
            }
            // Attempt primitive conversion for numbers and booleans
            if (value === 'true')
                return true;
            if (value === 'false')
                return false;
            if (value !== '' && !isNaN(Number(value)))
                return Number(value);
            return value;
        }
        // Parent node: Process nested children and group by tag name
        const childGroups = new Map();
        children.each((_, child) => {
            const tagName = child.tagName;
            if (tagName) {
                const parsedChild = this.parseXmlNode(child, $);
                const group = childGroups.get(tagName) || [];
                group.push(parsedChild);
                childGroups.set(tagName, group);
            }
        });
        const rep = {};
        if (hasAttributes) {
            rep.attributes = attributes;
        }
        // Convert grouped children. Map single elements directly, repeated tags as arrays.
        for (const [tagName, group] of childGroups.entries()) {
            if (group.length === 1) {
                rep[tagName] = group[0];
            }
            else {
                rep[tagName] = group;
            }
        }
        return rep;
    }
    /**
     * Iteratively counts the total number of elements and attributes in the XML tree.
     */
    computeXmlMetrics($) {
        let elementCount = 0;
        let attributeCount = 0;
        $('*').each((_, el) => {
            const element = el;
            elementCount++;
            if (element.attribs) {
                attributeCount += Object.keys(element.attribs).length;
            }
        });
        return { elementCount, attributeCount };
    }
    /**
     * Performs a strict syntax check on raw XML string using a tag matching stack.
     * Throws an error if tag structures, tags matching, or nesting is malformed.
     */
    validateXmlSyntax(xml) {
        const cleanXml = xml
            .replace(/<!--[\s\S]*?-->/g, '') // remove comments
            .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '') // remove CDATA
            .replace(/<\?xml[\s\S]*?\?>/g, '') // remove declaration
            .replace(/<!DOCTYPE[\s\S]*?>/g, ''); // remove DOCTYPE
        const tagRegex = /<(\/?)([a-zA-Z0-9_-]+)([^>]*?)>/g;
        let match;
        const stack = [];
        while ((match = tagRegex.exec(cleanXml)) !== null) {
            const isClose = match[1] === '/';
            const tagName = match[2];
            const rest = match[3] || '';
            const isSelfClosing = rest.trim().endsWith('/');
            if (!tagName)
                continue;
            if (isSelfClosing) {
                continue;
            }
            if (isClose) {
                if (stack.length === 0) {
                    throw new Error(`Unexpected closing tag </${tagName}>`);
                }
                const lastOpen = stack.pop();
                if (lastOpen !== tagName) {
                    throw new Error(`Mismatched tags: expected </${lastOpen}> but found </${tagName}>`);
                }
            }
            else {
                stack.push(tagName);
            }
        }
        if (stack.length > 0) {
            throw new Error(`Unclosed tags: ${stack.join(', ')}`);
        }
    }
}
exports.XmlParser = XmlParser;
exports.default = XmlParser;
