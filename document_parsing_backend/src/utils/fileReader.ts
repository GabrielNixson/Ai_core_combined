import fs from 'fs/promises';
import { NotFoundError, InternalServerError } from './errors';
import { logger } from './logger';
import { config } from '../config/config';
import { MinioService } from './minio';

/**
 * Reads a file from the local filesystem or MinIO object storage and returns its content as a Node.js Buffer.
 * Throws a NotFoundError if the file is missing, and an InternalServerError for other issues.
 */
export async function readFileToBuffer(filePath: string): Promise<Buffer> {
  try {
    if (config.storageProvider === 'minio') {
      const minio = MinioService.getInstance();
      return await minio.getObjectBuffer(filePath);
    }

    // Check file stats to ensure it exists and is a file
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      throw new Error(`Path is not a file: ${filePath}`);
    }

    const data = await fs.readFile(filePath);
    return data;
  } catch (error: any) {
    if (error.code === 'ENOENT' || error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      logger.error(`File read failed: File not found at path ${filePath}`);
      throw new NotFoundError(`File not found at path: ${filePath}`);
    }

    logger.error(`File read failed for path ${filePath}:`, error);
    throw new InternalServerError(`Failed to read file: ${error.message || String(error)}`);
  }
}
