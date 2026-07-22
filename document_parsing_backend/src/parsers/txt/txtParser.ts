import { DocumentParser } from '../interfaces/documentParser.interface';
import { DocumentType } from '../../types/documentType';
import { ProcessingContext } from '../../processing/context/processingContext';
import { ParsedDocument, DocumentSection } from '../../types/parsedDocument';
import { readFileToBuffer } from '../../utils/fileReader';
import { TextNormalizer } from '../common/textNormalizer';
import { BadRequestError } from '../../utils/errors';

export class TxtParser implements DocumentParser {
  /**
   * Indicates if the parser supports the given DocumentType.
   */
  public supports(type: DocumentType): boolean {
    return type === DocumentType.TXT;
  }

  /**
   * Reads plain text file, groups lines into sections and paragraphs, and maps to ParsedDocument.
   */
  public async parse(context: ProcessingContext): Promise<ParsedDocument> {
    const buffer = await readFileToBuffer(context.filePath);
    const rawText = buffer.toString('utf-8');

    if (rawText.trim() === '') {
      throw new BadRequestError('Empty TXT file.');
    }

    // 1. Normalize line breaks and clean whitespace
    const normalizedText = TextNormalizer.normalizeLineBreaks(rawText);

    // 2. Split content into logical blocks by double newlines (\n\n or more)
    const rawBlocks = normalizedText.split(/\n{2,}/);

    const sections: DocumentSection[] = [];
    let currentSection: DocumentSection | null = null;

    const createNewSection = (title: string, level: number): DocumentSection => {
      const section: DocumentSection = {
        title: TextNormalizer.normalizeWhitespace(title),
        level,
        content: [],
      };
      sections.push(section);
      return section;
    };

    // 3. Process blocks sequentially
    for (const block of rawBlocks) {
      const cleanBlock = block.trim();
      if (!cleanBlock) continue;

      const lines = cleanBlock.split('\n');

      // Basic heading detection heuristic:
      // If a block consists of a single line, is short (< 80 chars), has no ending punctuation,
      // and has uppercase/titlecase formatting or starts with numeric outline markers.
      const isSingleLine = lines.length === 1;
      const firstLine = lines[0] || '';
      const isShort = firstLine.length < 80;
      const noPunctuation = !/[.?!]$/.test(firstLine);
      const isNumbered = /^\d+(\.\d+)*\s/.test(firstLine);
      const isUppercase = firstLine === firstLine.toUpperCase() && /[A-Z]/.test(firstLine);

      const isHeading = isSingleLine && isShort && noPunctuation && (isNumbered || isUppercase || firstLine.length < 40);

      if (isHeading) {
        // Default heading level is 1 unless it starts with deep sub-numbering (e.g. 1.1.1 => H3)
        let level = 1;
        if (/^\d+\.\d+\.\d+/.test(firstLine)) {
          level = 3;
        } else if (/^\d+\.\d+/.test(firstLine)) {
          level = 2;
        }
        currentSection = createNewSection(firstLine, level);
      } else {
        // If a paragraph is parsed before any heading is encountered, initialize a default section
        if (!currentSection) {
          currentSection = createNewSection('Document Body', 1);
        }

        // Each line within the paragraph block can be appended as text
        const paragraphContent = lines
          .map((line) => TextNormalizer.normalizeWhitespace(line))
          .join(' ');

        if (paragraphContent) {
          currentSection.content.push({
            type: 'paragraph',
            content: paragraphContent,
            metadata: {
              page: 1, // Plain text is pageless, default page citation is 1
            },
          });
        }
      }
    }

    // Fallback if no sections were created
    if (sections.length === 0) {
      createNewSection('Document Body', 1);
    }

    return {
      documentId: context.documentId,
      documentType: DocumentType.TXT,
      metadata: {
        title: context.originalFileName,
        totalPages: 1,
        sourceType: 'TXT',
      },
      sections,
    };
  }
}
export default TxtParser;
