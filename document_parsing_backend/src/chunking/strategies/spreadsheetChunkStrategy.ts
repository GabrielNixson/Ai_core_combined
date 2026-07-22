import { ChunkStrategy, RawChunk, ChunkMetadataContext } from '../interfaces/chunkStrategy.interface';
import { ContentBlock } from '../../types/parsedDocument';

export class SpreadsheetChunkStrategy implements ChunkStrategy {
  private batchSize: number;

  constructor(batchSize = 50) {
    this.batchSize = batchSize;
  }

  /**
   * Decomposes spreadsheet data blocks into batch-sized GFM table chunks.
   */
  public chunk(block: ContentBlock, context: ChunkMetadataContext): RawChunk[] {
    const content = block.content || {};
    const sheetName = content.sheet || 'Sheet';
    const columns: string[] = content.columns || [];
    const rows: any[] = content.rows || [];

    if (columns.length === 0 && rows.length === 0) {
      return [];
    }

    const chunks: RawChunk[] = [];
    const totalRows = rows.length;

    // Empty sheet case (contains headers only)
    if (totalRows === 0) {
      const tableMd = this.formatRowsToMarkdown(columns, []);
      chunks.push({
        content: tableMd,
        contentType: 'SPREADSHEET',
        metadata: {
          sourceType: context.sourceType,
          sheet: sheetName,
          rowCount: 0,
        },
      });
      return chunks;
    }

    // Split rows into batches, preserving headers in each chunk
    for (let i = 0; i < totalRows; i += this.batchSize) {
      const batchRows = rows.slice(i, i + this.batchSize);
      const tableMd = this.formatRowsToMarkdown(columns, batchRows);

      chunks.push({
        content: tableMd,
        contentType: 'SPREADSHEET',
        metadata: {
          sourceType: context.sourceType,
          sheet: sheetName,
          rowCount: batchRows.length,
          rowOffset: i,
          totalRows,
        },
      });
    }

    return chunks;
  }

  /**
   * Translates batch rows and column headers into GFM table syntax.
   */
  private formatRowsToMarkdown(columns: string[], rows: any[]): string {
    const cleanHeaders = columns.map(c => String(c).trim() || ' ');
    const headerStr = '| ' + cleanHeaders.join(' | ') + ' |';
    const separatorStr = '| ' + cleanHeaders.map(() => '---').join(' | ') + ' |';

    const rowStrs = rows.map((row) => {
      const lineCells = cleanHeaders.map((col) => {
        const cell = row[col];
        if (cell === undefined || cell === null) {
          return '';
        }
        // Resolve XLSX cell details: { value, type }
        if (typeof cell === 'object' && cell.value !== undefined) {
          if (cell.value instanceof Date) {
            return cell.value.toISOString();
          }
          return String(cell.value);
        }
        return String(cell);
      });

      return '| ' + lineCells.map(c => c.replace(/\|/g, '\\|').trim()).join(' | ') + ' |';
    });

    return [headerStr, separatorStr, ...rowStrs].join('\n');
  }
}
export default SpreadsheetChunkStrategy;
