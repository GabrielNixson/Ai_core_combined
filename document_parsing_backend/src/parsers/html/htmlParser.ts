import * as cheerio from 'cheerio';
import { DocumentParser } from '../interfaces/documentParser.interface';
import { DocumentType } from '../../types/documentType';
import { ProcessingContext } from '../../processing/context/processingContext';
import { ParsedDocument, DocumentSection } from '../../types/parsedDocument';
import { readFileToBuffer } from '../../utils/fileReader';
import { TextNormalizer } from '../common/textNormalizer';
import { BadRequestError } from '../../utils/errors';

export class HtmlParser implements DocumentParser {
  /**
   * Indicates if the parser supports the given DocumentType.
   */
  public supports(type: DocumentType): boolean {
    return type === DocumentType.HTML;
  }

  /**
   * Reads the file from disk and parses it.
   */
  public async parse(context: ProcessingContext): Promise<ParsedDocument> {
    const buffer = await readFileToBuffer(context.filePath);
    const htmlString = buffer.toString('utf-8');

    if (htmlString.trim() === '') {
      throw new BadRequestError('Empty HTML file.');
    }

    return this.parseHtmlString(htmlString, context);
  }

  /**
   * Parsed raw HTML string into ParsedDocument.
   * This is exposed so that DocxParser and MarkdownParser can reuse the HTML traversal logic.
   */
  public parseHtmlString(htmlContent: string, context: ProcessingContext): ParsedDocument {
    const $ = cheerio.load(htmlContent);

    // Remove noise elements
    $('script, style, nav, footer, header, noscript, iframe, link, meta, comment').remove();

    // Extract Title
    let title = $('title').first().text().trim();
    if (!title) {
      title = $('h1').first().text().trim();
    }
    title = TextNormalizer.normalizeWhitespace(title || context.originalFileName);

    const sections: DocumentSection[] = [];
    let currentSection: DocumentSection | null = null;

    const createNewSection = (sectionTitle: string, level: number): DocumentSection => {
      const section: DocumentSection = {
        title: TextNormalizer.normalizeWhitespace(sectionTitle),
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
        const rows: string[][] = [];
        $el.find('tr').each((_, tr) => {
          const cells: string[] = [];
          $(tr)
            .find('th, td')
            .each((_, cell) => {
              cells.push(TextNormalizer.normalizeWhitespace($(cell).text()));
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
        const items: string[] = [];
        $el.find('li').each((_, li) => {
          const text = TextNormalizer.normalizeWhitespace($(li).text());
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
        const text = TextNormalizer.normalizeWhitespace($el.text());
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
      const fallbackText = TextNormalizer.cleanText(container.text());
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
      documentType: DocumentType.HTML,
      metadata: {
        title,
        totalPages: 1,
        sourceType: 'HTML',
      },
      sections,
    };
  }
}
export default HtmlParser;
