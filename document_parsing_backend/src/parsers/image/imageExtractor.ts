import sharp from 'sharp';
import { ImageMetadata } from './image.types';
import { BadRequestError } from '../../utils/errors';

export class ImageExtractor {
  /**
   * Extracts dimensions, format, and color details from an image file buffer.
   */
  public async extract(buffer: Buffer): Promise<ImageMetadata> {
    if (buffer.length === 0) {
      throw new BadRequestError('Empty image file.');
    }

    try {
      const meta = await sharp(buffer).metadata();

      if (!meta.width || !meta.height || !meta.format) {
        throw new Error('Missing dimensions or format details in image header.');
      }

      return {
        width: meta.width,
        height: meta.height,
        format: meta.format.toUpperCase(),
        fileSize: buffer.length,
        colorSpace: meta.space,
        channels: meta.channels,
        depth: meta.depth as any,
      };
    } catch (err: any) {
      throw new BadRequestError(`Invalid or corrupted image file: ${err.message}`);
    }
  }
}
export default ImageExtractor;
