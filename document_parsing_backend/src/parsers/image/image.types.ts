export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  fileSize: number;
  colorSpace?: string;
  channels?: number;
  depth?: number;
}

export type OcrStatusType = 'NOT_PROCESSED' | 'PROCESSED' | 'FAILED';

export interface ImageContentBlockPayload {
  fileName: string;
  width: number;
  height: number;
  ocrStatus: OcrStatusType;
  ocrText?: string;
  ocrProvider?: string;
}
