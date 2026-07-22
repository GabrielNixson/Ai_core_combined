import { DocumentType } from '../../types/documentType';
import { DocumentParser } from '../interfaces/documentParser.interface';
import { logger } from '../../utils/logger';

export class ParserRegistry {
  private static parsers = new Map<DocumentType, DocumentParser>();

  /**
   * Registers a parser instance for a specific DocumentType.
   */
  public static register(type: DocumentType, parser: DocumentParser): void {
    this.parsers.set(type, parser);
    logger.debug(`Parser registered for type: ${type}`);
  }

  /**
   * Retrieves the registered parser instance for a DocumentType, or null if none exists.
   */
  public static getParser(type: DocumentType): DocumentParser | null {
    return this.parsers.get(type) || null;
  }

  /**
   * Clears all registrations. Primarily used for clean-up/testing.
   */
  public static clear(): void {
    this.parsers.clear();
    logger.debug('Parser registry cleared.');
  }
}
export default ParserRegistry;
