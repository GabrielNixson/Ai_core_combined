import { Tool } from './tool.interface';
import { RetrievalService } from '../../retrieval/services/retrieval.service';
import { logger } from '../../utils/logger';

export class SearchDocumentsTool implements Tool {
  public name = 'searchDocuments';
  public description = 'Performs semantic similarity search across document text chunks. Inputs: query (string), documentId (optional string), pageNumber (optional number).';
  
  private retrievalService: RetrievalService;

  constructor(retrievalService = new RetrievalService()) {
    this.retrievalService = retrievalService;
  }

  public async execute(input: { query: string; documentId?: string; pageNumber?: number }): Promise<any> {
    logger.info(`[Search Documents Tool] Executing query: "${input.query}"`);
    const filters: Record<string, any> = {};
    if (input.documentId) filters.documentId = input.documentId;
    if (input.pageNumber !== undefined && input.pageNumber !== null) {
      filters.pageNumber = Number(input.pageNumber);
    }

    const results = await this.retrievalService.retrieve(input.query, filters);
    return results;
  }
}

export default SearchDocumentsTool;
