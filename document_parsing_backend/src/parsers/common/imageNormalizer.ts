import { DocumentSection } from '../../types/parsedDocument';
import { ImageMetadata } from '../image/image.types';

export class ImageNormalizer {
  /**
   * Transforms extracted image properties into a structured section containing an image ContentBlock.
   */
  public static normalizeImage(metadata: ImageMetadata, fileName: string): DocumentSection[] {
    return [
      {
        title: `Image - ${fileName}`,
        level: 1,
        content: [
          {
            type: 'image',
            content: {
              fileName,
              width: metadata.width,
              height: metadata.height,
              ocrStatus: 'NOT_PROCESSED',
            },
          },
        ],
      },
    ];
  }
}
export default ImageNormalizer;
