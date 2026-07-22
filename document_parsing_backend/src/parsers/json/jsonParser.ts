import { DocumentParser } from '../interfaces/documentParser.interface';
import { DocumentType } from '../../types/documentType';
import { ProcessingContext } from '../../processing/context/processingContext';
import { ParsedDocument } from '../../types/parsedDocument';
import { readFileToBuffer } from '../../utils/fileReader';
import { BadRequestError } from '../../utils/errors';
import { normalizeStructuredData } from '../common/structuredDataNormalizer';

export class JsonParser implements DocumentParser {
  /**
   * Indicates if the parser supports the given DocumentType.
   */
  public supports(type: DocumentType): boolean {
    return type === DocumentType.JSON;
  }

  /**
   * Reads a JSON file, validates its structure, and transforms it into a ParsedDocument.
   */
  public async parse(context: ProcessingContext): Promise<ParsedDocument> {
    const buffer = await readFileToBuffer(context.filePath);
    const rawContent = buffer.toString('utf-8').trim();

    if (rawContent === '') {
      throw new BadRequestError('Empty JSON file.');
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(rawContent);
    } catch (err: any) {
      throw new BadRequestError(`Invalid JSON syntax: ${err.message}`);
    }

    const { objectCount, keysCount } = this.computeJsonMetrics(parsedData);

    // Extract title from original filename without extension
    const rootTitle = context.originalFileName.replace(/\.[^/.]+$/, '');
    const sections = normalizeStructuredData(parsedData, rootTitle, 'json');

    return {
      documentId: context.documentId,
      documentType: DocumentType.JSON,
      metadata: {
        title: context.originalFileName,
        sourceType: 'JSON',
        objectCount,
        keysCount,
        totalPages: 1,
      },
      sections,
    };
  }

  /**
   * Iteratively counts the total number of objects and keys in the JSON tree.
   * Operates iteratively to prevent call stack overflow on deep payloads.
   */
  private computeJsonMetrics(data: any): { objectCount: number; keysCount: number } {
    let objectCount = 0;
    let keysCount = 0;

    if (data === null || typeof data !== 'object') {
      return { objectCount, keysCount };
    }

    const stack: any[] = [data];
    while (stack.length > 0) {
      const current = stack.pop();

      if (Array.isArray(current)) {
        for (const item of current) {
          if (item !== null && typeof item === 'object') {
            stack.push(item);
          }
        }
      } else if (current !== null && typeof current === 'object') {
        objectCount++;
        const keys = Object.keys(current);
        keysCount += keys.length;
        for (const key of keys) {
          const val = current[key];
          if (val !== null && typeof val === 'object') {
            stack.push(val);
          }
        }
      }
    }

    return { objectCount, keysCount };
  }
}
export default JsonParser;
