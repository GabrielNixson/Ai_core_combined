import { AgentState } from '../state';
import { SearchDocumentsTool } from '../../tools/searchDocuments.tool';
import { AskRAGTool } from '../../tools/askRAG.tool';
import { GetMetadataTool } from '../../tools/getMetadata.tool';
import { logger } from '../../../utils/logger';

export async function toolExecutionNode(state: AgentState): Promise<Partial<AgentState>> {
  const selectedTools = state.metadata.selectedTools || [];
  const results: any[] = [];

  const searchTool = new SearchDocumentsTool();
  const ragTool = new AskRAGTool();
  const metaTool = new GetMetadataTool();

  for (const toolName of selectedTools) {
    logger.info(`[Tool Execution Node] Executing tool: ${toolName}`);
    try {
      if (toolName === 'searchDocuments') {
        const docId = state.metadata.documentId || undefined;
        const pageNum = state.metadata.pageNumber !== undefined ? state.metadata.pageNumber : undefined;
        const res = await searchTool.execute({
          query: state.currentQuery,
          documentId: docId,
          pageNumber: pageNum,
        });
        results.push({ tool: toolName, output: res });
      } else if (toolName === 'askRAG') {
        const docId = state.metadata.documentId || undefined;
        const res = await ragTool.execute({
          query: state.currentQuery,
          documentId: docId,
        });
        results.push({ tool: toolName, output: res });
      } else if (toolName === 'getMetadata') {
        const docId = state.metadata.documentId || undefined;
        const chunkId = state.metadata.chunkId || undefined;
        const action = state.metadata.action || 'getDocumentMetadata';
        const res = await metaTool.execute({
          action,
          documentId: docId,
          chunkId,
        });
        results.push({ tool: toolName, output: res });
      }
    } catch (err: any) {
      logger.error(`[Tool Execution Node] Tool ${toolName} failed: ${err.message}`);
      results.push({ tool: toolName, error: err.message });
    }
  }

  // Extract sources and context elements from the execution results for response mappings
  let retrievedContext = '';
  let sources: any[] = [];
  
  const ragResult = results.find(r => r.tool === 'askRAG');
  if (ragResult && ragResult.output) {
    sources = ragResult.output.sources || [];
    retrievedContext = JSON.stringify(ragResult.output.retrievedChunks || '');
  }

  return {
    toolResults: results,
    sources,
    retrievedContext,
  };
}

export default toolExecutionNode;
