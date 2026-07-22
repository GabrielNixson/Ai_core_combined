import { DocumentExporter } from './documentExporter.interface';
import { ParsedDocument } from '../../types/parsedDocument';

export class JsonExporter implements DocumentExporter {
  /**
   * Serializes ParsedDocument into a pretty-printed JSON string.
   */
  public async export(doc: ParsedDocument): Promise<string> {
    return JSON.stringify(doc, null, 2);
  }
}
export default JsonExporter;
