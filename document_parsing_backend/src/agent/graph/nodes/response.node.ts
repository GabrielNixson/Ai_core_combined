import { AgentState } from '../state';
import { logger } from '../../../utils/logger';

export async function responseNode(state: AgentState): Promise<Partial<AgentState>> {
  logger.info('[Response Node] Processing sources and formatting output.');

  let sources = state.sources || [];
  if (sources.length === 0) {
    const searchResult = (state.toolResults || []).find(r => r.tool === 'searchDocuments');
    if (searchResult && Array.isArray(searchResult.output)) {
      sources = searchResult.output.map((chunk: any) => ({
        documentId: chunk.documentId,
        chunkId: chunk.chunkId,
        title: chunk.title,
        section: chunk.section || null,
        pageStart: chunk.pageStart || null,
        pageEnd: chunk.pageEnd || null,
        slideNumber: chunk.slideNumber || null,
      }));
    }
  }

  return { sources };
}

export default responseNode;
