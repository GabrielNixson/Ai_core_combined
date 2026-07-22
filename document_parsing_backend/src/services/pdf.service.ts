import path from 'path';
import { PdfParser } from '../parsers/pdf/pdfParser';
import { ParsedDocument } from '../types/parsedDocument';
import { getDocumentTypeFromExtension } from '../types/documentType';
import { BadRequestError } from '../utils/errors';

export class PdfService {
  private pdfParser: PdfParser;

  constructor(pdfParser = new PdfParser()) {
    this.pdfParser = pdfParser;
  }

  /**
   * Helper method to parse a PDF file directly given its file path and document ID.
   */
  public async parsePdfFile(filePath: string, documentId: string): Promise<ParsedDocument> {
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== '.pdf') {
      throw new BadRequestError(`File extension "${ext}" is not supported by PdfService.`);
    }

    const context = {
      documentId,
      documentType: getDocumentTypeFromExtension(ext),
      filePath,
      originalFileName: path.basename(filePath),
    };

    return this.pdfParser.parse(context);
  }
}
export default PdfService;
