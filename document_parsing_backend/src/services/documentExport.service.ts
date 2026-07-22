import fs from 'fs';
import path from 'path';
import { config, Config } from '../config/config';
import { ParsedDocument } from '../types/parsedDocument';
import { MarkdownExporter } from '../parsers/exporter/markdownExporter';
import { JsonExporter } from '../parsers/exporter/jsonExporter';
import { logger } from '../utils/logger';

export class DocumentExportService {
  private configOverride?: Partial<Config>;

  constructor(configOverride?: Partial<Config>) {
    this.configOverride = configOverride;
  }

  /**
   * Exports a ParsedDocument to configured output formats on disk.
   * Returns saved filepaths.
   */
  public async exportDocument(
    documentId: string,
    parsedDocument: ParsedDocument
  ): Promise<{ markdownPath?: string; jsonPath?: string }> {
    if (!parsedDocument) {
      throw new Error('Invalid ParsedDocument: Document content is null or undefined.');
    }

    const results: { markdownPath?: string; jsonPath?: string } = {};

    const mdDir = path.join(config.uploadsDir, 'markdown');
    const jsonDir = path.join(config.uploadsDir, 'json');

    const enableMarkdown = this.configOverride?.enableMarkdownExport !== undefined
      ? this.configOverride.enableMarkdownExport
      : config.enableMarkdownExport;

    const enableJson = this.configOverride?.enableJsonExport !== undefined
      ? this.configOverride.enableJsonExport
      : config.enableJsonExport;

    try {
      // 1. Export to Markdown if enabled
      if (enableMarkdown) {
        if (!fs.existsSync(mdDir)) {
          fs.mkdirSync(mdDir, { recursive: true });
        }
        const exporter = new MarkdownExporter();
        const mdContent = await exporter.export(parsedDocument);
        const mdFilePath = path.join(mdDir, `${documentId}.md`);
        
        fs.writeFileSync(mdFilePath, mdContent, 'utf-8');
        logger.debug(`[Export Service] Exported Markdown to: ${mdFilePath}`);
        
        results.markdownPath = mdFilePath;
      }

      // 2. Export to JSON if enabled
      if (enableJson) {
        if (!fs.existsSync(jsonDir)) {
          fs.mkdirSync(jsonDir, { recursive: true });
        }
        const exporter = new JsonExporter();
        const jsonContent = await exporter.export(parsedDocument);
        const jsonFilePath = path.join(jsonDir, `${documentId}.json`);
        
        fs.writeFileSync(jsonFilePath, jsonContent, 'utf-8');
        logger.debug(`[Export Service] Exported JSON to: ${jsonFilePath}`);
        
        results.jsonPath = jsonFilePath;
      }
    } catch (error: any) {
      logger.error(`[Export Service] Failed to write exported files for document ${documentId}:`, error);
      throw new Error(`Document export failed: ${error.message}`);
    }

    return results;
  }
}
export default DocumentExportService;
