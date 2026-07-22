import { DocumentParser } from '../interfaces/documentParser.interface';
import { DocumentType } from '../../types/documentType';
import { ProcessingContext } from '../../processing/context/processingContext';
import { ParsedDocument } from '../../types/parsedDocument';
import { readFileToBuffer } from '../../utils/fileReader';
import { BadRequestError } from '../../utils/errors';
import { PptxExtractor } from './pptxExtractor';
import { PresentationNormalizer } from '../common/presentationNormalizer';

export class PptxParser implements DocumentParser {
  /**
   * Indicates if the parser supports the given DocumentType.
   */
  public supports(type: DocumentType): boolean {
    return type === DocumentType.PPTX;
  }

  /**
   * Reads a PPTX file, validates its structure, and transforms it into a ParsedDocument.
   */
  public async parse(context: ProcessingContext): Promise<ParsedDocument> {
    const buffer = await readFileToBuffer(context.filePath);

    if (buffer.length === 0) {
      throw new BadRequestError('Empty PPTX file.');
    }

    // Verify magic numbers for PPTX (ZIP container)
    const isZip = buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
    if (!isZip) {
      throw new BadRequestError('Corrupted or invalid PPTX file: Invalid header signature.');
    }

    let presentationData;
    try {
      const extractor = new PptxExtractor();
      presentationData = await extractor.extract(buffer);
    } catch (err: any) {
      throw new BadRequestError(`Corrupted or invalid PPTX file: ${err.message}`);
    }

    if (presentationData.slides.length === 0) {
      throw new BadRequestError('Invalid PPTX file: No slides found.');
    }

    const sections = PresentationNormalizer.normalizeSlides(presentationData.slides);

    return {
      documentId: context.documentId,
      documentType: DocumentType.PPTX,
      metadata: {
        title: context.originalFileName,
        sourceType: 'PPTX',
        slideCount: presentationData.slideCount,
        author: presentationData.author,
        totalPages: 1,
      },
      sections,
    };
  }
}
export default PptxParser;
