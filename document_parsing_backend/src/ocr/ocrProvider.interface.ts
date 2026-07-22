export interface OCRProvider {
  /**
   * Performs Optical Character Recognition (OCR) on an image file.
   * @param imagePath The absolute path to the image file to read.
   * @returns The full text extracted from the image.
   */
  extractText(imagePath: string): Promise<string>;
}
export default OCRProvider;
