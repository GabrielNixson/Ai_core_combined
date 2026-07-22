import { ChunkStrategy, RawChunk, ChunkMetadataContext } from '../interfaces/chunkStrategy.interface';
import { ContentBlock } from '../../types/parsedDocument';

export class TableChunkStrategy implements ChunkStrategy {
  /**
   * Conforms tabular shapes (DOCX matrices or CSV arrays) into raw table chunks.
   */
  public chunk(block: ContentBlock, context: ChunkMetadataContext): RawChunk[] {
    const tableMd = this.convertTableToMarkdown(block.content);
    if (!tableMd) return [];

    const page = block.metadata?.page !== undefined ? Number(block.metadata.page) : undefined;

    return [
      {
        content: tableMd,
        contentType: 'TABLE',
        pageStart: page,
        pageEnd: page,
        metadata: {
          sourceType: context.sourceType,
          ...block.metadata,
        },
      },
    ];
  }

  /**
   * Formats columns and row elements into standard GFM grid syntax.
   */
  private convertTableToMarkdown(content: any): string {
    if (!content) return '';
    const columns: string[] = content.columns || [];
    const rows: any[] = content.rows || [];

    if (columns.length === 0 && rows.length === 0) {
      return '';
    }

    let mdHeaders = [...columns];
    let mdRows: string[][] = [];

    if (Array.isArray(rows[0])) {
      // DOCX matrix array structure
      if (mdHeaders.length === 0) {
        mdHeaders = rows[0] || [];
        mdRows = rows.slice(1);
      } else {
        mdRows = rows;
      }
    } else {
      // CSV/JSON record structure
      mdRows = rows.map((row) => {
        return mdHeaders.map((col) => {
          const cell = row[col];
          return cell !== undefined && cell !== null ? String(cell) : '';
        });
      });
    }

    const cleanHeaders = mdHeaders.map(h => String(h).trim() || ' ');

    const headerStr = '| ' + cleanHeaders.join(' | ') + ' |';
    const separatorStr = '| ' + cleanHeaders.map(() => '---').join(' | ') + ' |';

    const rowStrs = mdRows.map((row) => {
      const paddedRow = cleanHeaders.map((_, i) => {
        const val = row[i] !== undefined ? String(row[i]) : '';
        return val.replace(/\|/g, '\\|').trim();
      });
      return '| ' + paddedRow.join(' | ') + ' |';
    });

    return [headerStr, separatorStr, ...rowStrs].join('\n');
  }
}
export default TableChunkStrategy;
