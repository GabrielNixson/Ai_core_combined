import fs from 'fs/promises';
import { NotFoundError, InternalServerError } from './errors';
import { logger } from './logger';

/**
 * Reads a file from the local filesystem and returns its content as a Node.js Buffer.
 * Throws a NotFoundError if the file is missing, and an InternalServerError for other issues.
 */
export async function readFileToBuffer(filePath: string): Promise<Buffer> {
  try {
    // Check file stats to ensure it exists and is a file
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      throw new Error(`Path is not a file: ${filePath}`);
    }

    const data = await fs.readFile(filePath);
    return data;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      logger.error(`File read failed: File not found at path ${filePath}`);
      throw new NotFoundError(`File not found at path: ${filePath}`);
    }

    logger.error(`File read failed for path ${filePath}:`, error);
    throw new InternalServerError(`Failed to read file from disk: ${error.message || String(error)}`);
  }
}
