import fs from 'fs';
import path from 'path';
import { config, Config } from '../config/config';
import { ParsedDocument } from '../types/parsedDocument';
import { MarkdownExporter } from '../parsers/exporter/markdownExporter';
import { JsonExporter } from '../parsers/exporter/jsonExporter';
import { logger } from '../utils/logger';
import { MinioService } from '../utils/minio';

export class DocumentExportService {
  private configOverride?: Partial<Config>;

  constructor(configOverride?: Partial<Config>) {
    this.configOverride = configOverride;
  }

  /**
   * Exports a ParsedDocument to configured output formats on disk or MinIO.
   * Returns saved filepaths or object keys.
   */
  public async exportDocument(
    documentId: string,
    parsedDocument: ParsedDocument
  ): Promise<{ markdownPath?: string; jsonPath?: string }> {
    if (!parsedDocument) {
      throw new Error('Invalid ParsedDocument: Document content is null or undefined.');
    }

    const results: { markdownPath?: string; jsonPath?: string } = {};

    const enableMarkdown = this.configOverride?.enableMarkdownExport !== undefined
      ? this.configOverride.enableMarkdownExport
      : config.enableMarkdownExport;

    const enableJson = this.configOverride?.enableJsonExport !== undefined
      ? this.configOverride.enableJsonExport
      : config.enableJsonExport;

    try {
      if (config.storageProvider === 'minio') {
        const minio = MinioService.getInstance();

        // 1. Export to Markdown if enabled via MinIO
        if (enableMarkdown) {
          const exporter = new MarkdownExporter();
          const mdContent = await exporter.export(parsedDocument);
          const mdKey = `markdown/${documentId}.md`;
          
          await minio.uploadText(mdKey, mdContent, 'text/markdown; charset=utf-8');
          logger.debug(`[Export Service] Exported Markdown to MinIO key: ${mdKey}`);
          
          results.markdownPath = mdKey;
        }

        // 2. Export to JSON if enabled via MinIO
        if (enableJson) {
          const exporter = new JsonExporter();
          const jsonContent = await exporter.export(parsedDocument);
          const jsonKey = `json/${documentId}.json`;
          
          await minio.uploadText(jsonKey, jsonContent, 'application/json; charset=utf-8');
          logger.debug(`[Export Service] Exported JSON to MinIO key: ${jsonKey}`);
          
          results.jsonPath = jsonKey;
        }
      } else {
        const mdDir = path.join(config.uploadsDir, 'markdown');
        const jsonDir = path.join(config.uploadsDir, 'json');

        // 1. Export to Markdown if enabled locally
        if (enableMarkdown) {
          if (!fs.existsSync(mdDir)) {
            fs.mkdirSync(mdDir, { recursive: true });
          }
          const exporter = new MarkdownExporter();
          const mdContent = await exporter.export(parsedDocument);
          const mdFilePath = path.join(mdDir, `${documentId}.md`);
          
          fs.writeFileSync(mdFilePath, mdContent, 'utf-8');
          logger.debug(`[Export Service] Exported Markdown to local: ${mdFilePath}`);
          
          results.markdownPath = mdFilePath;
        }

        // 2. Export to JSON if enabled locally
        if (enableJson) {
          if (!fs.existsSync(jsonDir)) {
            fs.mkdirSync(jsonDir, { recursive: true });
          }
          const exporter = new JsonExporter();
          const jsonContent = await exporter.export(parsedDocument);
          const jsonFilePath = path.join(jsonDir, `${documentId}.json`);
          
          fs.writeFileSync(jsonFilePath, jsonContent, 'utf-8');
          logger.debug(`[Export Service] Exported JSON to local: ${jsonFilePath}`);
          
          results.jsonPath = jsonFilePath;
        }
      }
    } catch (error: any) {
      logger.error(`[Export Service] Failed to write exported files for document ${documentId}:`, error);
      throw new Error(`Document export failed: ${error.message}`);
    }

    return results;
  }
}
export default DocumentExportService;
