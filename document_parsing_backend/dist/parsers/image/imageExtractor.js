"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageExtractor = void 0;
const sharp_1 = __importDefault(require("sharp"));
const errors_1 = require("../../utils/errors");
class ImageExtractor {
    /**
     * Extracts dimensions, format, and color details from an image file buffer.
     */
    async extract(buffer) {
        if (buffer.length === 0) {
            throw new errors_1.BadRequestError('Empty image file.');
        }
        try {
            const meta = await (0, sharp_1.default)(buffer).metadata();
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
                depth: meta.depth,
            };
        }
        catch (err) {
            throw new errors_1.BadRequestError(`Invalid or corrupted image file: ${err.message}`);
        }
    }
}
exports.ImageExtractor = ImageExtractor;
exports.default = ImageExtractor;
