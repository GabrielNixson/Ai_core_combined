import { Tool } from './tool.interface';
import { RAGService } from '../../rag/services/rag.service';
import { logger } from '../../utils/logger';

export class AskRAGTool implements Tool {
  public name = 'askRAG';
  public description = 'Asks questions using Retrieval Augmented Generation (RAG) which pulls context and generates responses using LLMs. Inputs: query (string), documentId (optional string).';

  private ragService: RAGService;

  constructor(ragService = new RAGService()) {
    this.ragService = ragService;
  }

  public async execute(input: { query: string; documentId?: string }): Promise<any> {
    logger.info(`[Ask RAG Tool] Asking: "${input.query}"`);
    const filters: Record<string, any> = {};
    if (input.documentId) filters.documentId = input.documentId;

    const response = await this.ragService.generateAnswer(input.query, filters);
    return response;
  }
}

export default AskRAGTool;
