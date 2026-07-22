"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageNormalizer = void 0;
class ImageNormalizer {
    /**
     * Transforms extracted image properties into a structured section containing an image ContentBlock.
     */
    static normalizeImage(metadata, fileName) {
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
exports.ImageNormalizer = ImageNormalizer;
exports.default = ImageNormalizer;
