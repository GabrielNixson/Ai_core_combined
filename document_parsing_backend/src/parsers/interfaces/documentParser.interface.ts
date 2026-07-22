import { DocumentType } from '../../types/documentType';
import { ProcessingContext } from '../../processing/context/processingContext';
import { ParsedDocument } from '../../types/parsedDocument';

export interface DocumentParser {
  /**
   * Indicates whether the parser supports the given DocumentType.
   */
  supports(type: DocumentType): boolean;

  /**
   * Parses the file specified in the ProcessingContext and returns a Structured Document.
   */
  parse(context: ProcessingContext): Promise<ParsedDocument>;
}
export default DocumentParser;
