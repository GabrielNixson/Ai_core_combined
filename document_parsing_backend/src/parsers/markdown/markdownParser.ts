import { marked } from 'marked';
import { DocumentParser } from '../interfaces/documentParser.interface';
import { DocumentType } from '../../types/documentType';
import { ProcessingContext } from '../../processing/context/processingContext';
import { ParsedDocument } from '../../types/parsedDocument';
import { HtmlParser } from '../html/htmlParser';
import { readFileToBuffer } from '../../utils/fileReader';
import { BadRequestError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export class MarkdownParser implements DocumentParser {
  private htmlParser: HtmlParser;

  constructor(htmlParser = new HtmlParser()) {
    this.htmlParser = htmlParser;
  }

  /**
   * Indicates if the parser supports the given DocumentType.
   */
  public supports(type: DocumentType): boolean {
    return type === DocumentType.MARKDOWN;
  }

  /**
   * Reads and parses a Markdown file, compiles it to HTML, and delegates to HtmlParser.
   */
  public async parse(context: ProcessingContext): Promise<ParsedDocument> {
    const buffer = await readFileToBuffer(context.filePath);
    const markdownString = buffer.toString('utf-8');

    if (markdownString.trim() === '') {
      throw new BadRequestError('Empty Markdown file.');
    }

    try {
      // Marked translates markdown layout (headings, code blocks, lists) to standard HTML
      const htmlString = await marked.parse(markdownString);

      // Delegate semantic DOM traversing to HtmlParser
      const parsedDoc = this.htmlParser.parseHtmlString(htmlString, context);

      // Customize metadata properties for Markdown
      parsedDoc.documentType = DocumentType.MARKDOWN;
      parsedDoc.metadata.sourceType = 'MARKDOWN';

      return parsedDoc;
    } catch (error: any) {
      logger.error(`Error parsing Markdown file: ${context.filePath}`, error);
      throw new BadRequestError(`Invalid or corrupted Markdown file: ${error.message || String(error)}`);
    }
  }
}
export default MarkdownParser;
