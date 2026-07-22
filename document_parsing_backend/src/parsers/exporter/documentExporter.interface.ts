import { ParsedDocument } from '../../types/parsedDocument';

export interface DocumentExporter {
  /**
   * Exports a ParsedDocument into a formatted string format.
   * @param parsedDocument The document representation to export.
   * @returns A promise that resolves to the formatted string representation.
   */
  export(parsedDocument: ParsedDocument): Promise<string>;
}
export default DocumentExporter;
