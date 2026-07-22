import * as cheerio from 'cheerio';
import { DocumentParser } from '../interfaces/documentParser.interface';
import { DocumentType } from '../../types/documentType';
import { ProcessingContext } from '../../processing/context/processingContext';
import { ParsedDocument } from '../../types/parsedDocument';
import { readFileToBuffer } from '../../utils/fileReader';
import { BadRequestError } from '../../utils/errors';
import { normalizeStructuredData } from '../common/structuredDataNormalizer';

export class XmlParser implements DocumentParser {
  /**
   * Indicates if the parser supports the given DocumentType.
   */
  public supports(type: DocumentType): boolean {
    return type === DocumentType.XML;
  }

  /**
   * Reads an XML file, validates its structure, and transforms it into a ParsedDocument.
   */
  public async parse(context: ProcessingContext): Promise<ParsedDocument> {
    const buffer = await readFileToBuffer(context.filePath);
    const rawContent = buffer.toString('utf-8').trim();

    if (rawContent === '') {
      throw new BadRequestError('Empty XML file.');
    }

    // Perform strict syntax validation for tag integrity
    try {
      this.validateXmlSyntax(rawContent);
    } catch (err: any) {
      throw new BadRequestError(`Invalid XML syntax: ${err.message}`);
    }

    let $: cheerio.CheerioAPI;
    try {
      $ = cheerio.load(rawContent, { xmlMode: true });
    } catch (err: any) {
      throw new BadRequestError(`Invalid XML parsing: ${err.message}`);
    }

    // Check for single root element constraint
    const rootChildren = $.root().children().filter((_, el) => el.type === 'tag');
    if (rootChildren.length === 0) {
      throw new BadRequestError('Malformed XML: Missing root node.');
    }
    if (rootChildren.length > 1) {
      throw new BadRequestError('Malformed XML: Multiple root elements.');
    }

    const rootEl = rootChildren.get(0)!;
    const { elementCount, attributeCount } = this.computeXmlMetrics($);

    // Recursively transform Cheerio DOM starting from the root element
    const rootTagName = rootEl.tagName || 'xml';
    const parsedData = this.parseXmlNode(rootEl, $);

    const sections = normalizeStructuredData(parsedData, rootTagName, 'xml');

    return {
      documentId: context.documentId,
      documentType: DocumentType.XML,
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
  private parseXmlNode(el: any, $: cheerio.CheerioAPI): any {
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
      if (value === 'true') return true;
      if (value === 'false') return false;
      if (value !== '' && !isNaN(Number(value))) return Number(value);
      return value;
    }

    // Parent node: Process nested children and group by tag name
    const childGroups = new Map<string, any[]>();
    children.each((_, child) => {
      const tagName = child.tagName;
      if (tagName) {
        const parsedChild = this.parseXmlNode(child, $);
        const group = childGroups.get(tagName) || [];
        group.push(parsedChild);
        childGroups.set(tagName, group);
      }
    });

    const rep: Record<string, any> = {};
    if (hasAttributes) {
      rep.attributes = attributes;
    }

    // Convert grouped children. Map single elements directly, repeated tags as arrays.
    for (const [tagName, group] of childGroups.entries()) {
      if (group.length === 1) {
        rep[tagName] = group[0];
      } else {
        rep[tagName] = group;
      }
    }

    return rep;
  }

  /**
   * Iteratively counts the total number of elements and attributes in the XML tree.
   */
  private computeXmlMetrics($: cheerio.CheerioAPI): { elementCount: number; attributeCount: number } {
    let elementCount = 0;
    let attributeCount = 0;

    $('*').each((_, el) => {
      const element = el as any;
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
  private validateXmlSyntax(xml: string): void {
    const cleanXml = xml
      .replace(/<!--[\s\S]*?-->/g, '') // remove comments
      .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '') // remove CDATA
      .replace(/<\?xml[\s\S]*?\?>/g, '') // remove declaration
      .replace(/<!DOCTYPE[\s\S]*?>/g, ''); // remove DOCTYPE

    const tagRegex = /<(\/?)([a-zA-Z0-9_-]+)([^>]*?)>/g;
    let match;
    const stack: string[] = [];

    while ((match = tagRegex.exec(cleanXml)) !== null) {
      const isClose = match[1] === '/';
      const tagName = match[2];
      const rest = match[3] || '';
      const isSelfClosing = rest.trim().endsWith('/');

      if (!tagName) continue;

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
      } else {
        stack.push(tagName);
      }
    }

    if (stack.length > 0) {
      throw new Error(`Unclosed tags: ${stack.join(', ')}`);
    }
  }
}
export default XmlParser;
