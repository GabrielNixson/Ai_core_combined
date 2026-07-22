import mammoth from 'mammoth';
import { DocumentParser } from '../interfaces/documentParser.interface';
import { DocumentType } from '../../types/documentType';
import { ProcessingContext } from '../../processing/context/processingContext';
import { ParsedDocument } from '../../types/parsedDocument';
import { HtmlParser } from '../html/htmlParser';
import { readFileToBuffer } from '../../utils/fileReader';
import { BadRequestError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export class DocxParser implements DocumentParser {
  private htmlParser: HtmlParser;

  constructor(htmlParser = new HtmlParser()) {
    this.htmlParser = htmlParser;
  }

  /**
   * Indicates if the parser supports the given DocumentType.
   */
  public supports(type: DocumentType): boolean {
    return type === DocumentType.DOCX;
  }

  /**
   * Reads and parses a DOCX file using mammoth, mapping structures
   * to clean semantic HTML, and then delegates traversal to HtmlParser.
   */
  public async parse(context: ProcessingContext): Promise<ParsedDocument> {
    const buffer = await readFileToBuffer(context.filePath);

    if (buffer.length === 0) {
      throw new BadRequestError('Empty DOCX file.');
    }

    try {
      // Mammoth extracts pure clean paragraphs, tables, lists, and headings as HTML tags
      const result = await mammoth.convertToHtml({ buffer });
      const htmlString = result.value;

      // Parse html output into structured ParsedDocument format
      const parsedDoc = this.htmlParser.parseHtmlString(htmlString, context);

      // Map docx specific document details
      parsedDoc.documentType = DocumentType.DOCX;
      parsedDoc.metadata.sourceType = 'DOCX';

      return parsedDoc;
    } catch (error: any) {
      logger.error(`Error parsing DOCX file: ${context.filePath}`, error);
      throw new BadRequestError(`Invalid or corrupted DOCX file: ${error.message || String(error)}`);
    }
  }
}
export default DocxParser;
